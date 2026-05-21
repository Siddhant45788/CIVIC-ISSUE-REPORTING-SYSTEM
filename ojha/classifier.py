import sys
import json
import os
from PIL import Image, ImageFilter, ImageStat
import numpy as np

def analyze_civic_issue(img_path):
    try:
        img = Image.open(img_path).convert('RGB')
        w, h = img.size
        
        # --- 1. Selective ROI Detection ---
        grid_size = 12 
        cell_w, cell_h = w // grid_size, h // grid_size
        
        # We will map cells to their detected type
        grid_map = [[None for _ in range(grid_size)] for _ in range(grid_size)]

        for i in range(grid_size):
            for j in range(grid_size):
                left, top = j * cell_w, i * cell_h
                cell = img.crop((left, top, left + cell_w, top + cell_h))
                
                c_gray = cell.convert('L')
                c_lap = c_gray.filter(ImageFilter.Kernel((3, 3), [0, 1, 0, 1, -4, 1, 0, 1, 0], 1, 0))
                c_var = ImageStat.Stat(c_lap).var[0]
                
                cd = np.array(cell.resize((5, 5)))
                c_std = np.std([np.mean(cd[:,:,0]), np.mean(cd[:,:,1]), np.mean(cd[:,:,2])])
                
                if 250 < c_var < 800 and c_std < 10:
                    grid_map[i][j] = "pothole"
                elif c_var > 800 or c_std > 25:
                    grid_map[i][j] = "garbage"

        # Group connected cells into bounding boxes
        regions = []
        visited = set()

        def get_bbox(r, c, c_type):
            stack = [(r, c)]
            min_r, max_r = r, r
            min_c, max_c = c, c
            visited.add((r, c))
            
            while stack:
                curr_r, curr_c = stack.pop()
                min_r, max_r = min(min_r, curr_r), max(max_r, curr_r)
                min_c, max_c = min(min_c, curr_c), max(max_c, curr_c)
                
                for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
                    nr, nc = curr_r + dr, curr_c + dc
                    if 0 <= nr < grid_size and 0 <= nc < grid_size:
                        if (nr, nc) not in visited and grid_map[nr][nc] == c_type:
                            visited.add((nr, nc))
                            stack.append((nr, nc))
            return min_r, max_r, min_c, max_c

        for i in range(grid_size):
            for j in range(grid_size):
                if grid_map[i][j] and (i, j) not in visited:
                    c_type = grid_map[i][j]
                    min_r, max_r, min_c, max_c = get_bbox(i, j, c_type)
                    
                    # Convert grid coordinates to percentages
                    regions.append({
                        "x": (min_c * cell_w / w) * 100,
                        "y": (min_r * cell_h / h) * 100,
                        "w": (((max_c - min_c + 1) * cell_w) / w) * 100,
                        "h": (((max_r - min_r + 1) * cell_h) / h) * 100,
                        "type": c_type
                    })

        # --- 2. Global Classification ---
        img_gray = img.convert('L')
        img_laplacian = img_gray.filter(ImageFilter.Kernel((3, 3), [0, 1, 0, 1, -4, 1, 0, 1, 0], 1, 0))
        global_var = ImageStat.Stat(img_laplacian).var[0]
        
        img_hsv = img.convert('HSV')
        mean_sat = np.mean(np.array(img_hsv.resize((50, 50)))[:, :, 1])
        
        img_small = np.array(img.resize((50, 50)))
        std_rgb = np.std([np.mean(img_small[:,:,0]), np.mean(img_small[:,:,1]), np.mean(img_small[:,:,2])])

        # Detection Logic
        scores = []
        if std_rgb < 15 and mean_sat < 50 and global_var > 40:
            scores.append({"class": "Road Repair / Pothole", "conf": min(96, 60 + (global_var / 15))})
        if std_rgb > 20 or global_var > 600:
            scores.append({"class": "Garbage / Sanitation", "conf": min(95, 45 + (std_rgb * 1.2))})

        top = sorted(scores, key=lambda x: x['conf'], reverse=True)[0] if scores else {"class": "Urban Environment", "conf": 65.0}

        return {
            "prediction": top["class"],
            "confidence": f"{top['conf']:.1f}%",
            "ai_suggested_type": top["class"],
            "regions": regions,
            "all_detections": [{"class": s["class"], "confidence": f"{s['conf']:.1f}%"} for s in scores]
        }

    except Exception as e:
        return {"prediction": "Error", "confidence": "0%", "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        if os.path.exists(img_path):
            print(json.dumps(analyze_civic_issue(img_path)))
