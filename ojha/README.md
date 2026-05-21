# CivicReport: AI-Powered Issue Tracking System

CivicReport is a modern, full-stack web application designed to bridge the gap between citizens and municipal authorities. It allows users to report infrastructure issues (like potholes, garbage, or broken streetlights) with real-time AI verification and GPS tracking.

## 🚀 Key Features

*   **AI Vision Engine:** A custom-built heuristic image analysis system that verifies if the uploaded photo matches the reported category (e.g., distinguishing a real pothole from a smooth indoor floor).
*   **Real-time Tracking:** A visual status timeline (Submitted -> In Review -> Assigned -> Resolved) for every report.
*   **Automatic Flagging:** Improper or mismatched reports are automatically flagged as "Invalid" by the AI to prevent system abuse.
*   **Modern UX:** A sleek "Glassmorphism" interface with animated mesh gradients and responsive design.
*   **Geolocation:** Automatic GPS coordinate capture for precise issue mapping.

---

## 📂 File Structure & Descriptions

### **Backend (Node.js & Express)**
*   **`server.js`**: The core of the application. It handles API routing, serves static frontend files, manages image uploads via `multer`, and triggers the Python AI classifier.
*   **`complaints.json`**: The project's lightweight database. It stores all user reports, including timestamps, contact info, GPS data, and AI analysis results.
*   **`package.json`**: Defines project dependencies (`express`, `cors`, `multer`) and the start script.
*   **`uploads/`**: A directory where all user-submitted images are securely stored.

### **AI Engine (Python)**
*   **`classifier.py`**: A specialized "Civic Fingerprinting" engine. It uses **Laplacian Variance** (for texture/roughness analysis) and **HSV Saturation Checks** to verify images without the overhead of heavy deep-learning models. It detects:
    *   **Road Infrastructure:** High-roughness, neutral-grey surfaces.
    *   **Varied Waste:** Chaotic, high-color-variation textures.
    *   **Luminous Sources:** High-intensity light patterns for streetlights.

### **Frontend (HTML, CSS, JS)**
*   **`index.html`**: The main user interface. It contains the reporting form, the hero section, and the dynamic tracking dashboard.
*   **`script.js`**: Handles all frontend logic, including Browser Geolocation, asynchronous API calls to the server, and the dynamic rendering of the tracking timeline.
*   **`style.css`**: Contains the custom "Glassmorphism" design system, mesh gradient animations, and status-specific coloring (e.g., Red for Invalid, Green for Resolved).

### **Documentation & Assets**
*   **`Civic_Issue_Reporting_Bot_Synopsis_Expanded[1].pdf`**: A detailed synopsis and project overview.
*   **`Smart-Civic-Issue-Reporting-System.pptx`**: The official project presentation deck.
*   **`presentation.txt`**: Quick-reference notes for project demonstrations.
*   **`Paper2659.pdf`**: Supporting research/academic paper related to the project's concept.

## 🧠 Under the Hood: The Vision Engine

While traditional Deep Learning CNNs (Convolutional Neural Networks) are powerful, they often encounter version-dependency issues and require significant system resources. CivicReport uses a **High-Speed Heuristic Vision Engine** that mimics the fundamental "Feature Extraction" layers of a CNN to identify issues instantly and reliably.

### **How it "Sees" Your Photos:**

1.  **Texture Mapping (Laplacian Variance):**
    The engine applies a **Laplacian Kernel** to the image. This is a mathematical filter that calculates the "second derivative" of pixel brightness, similar to the initial layers of a CNN that detect edges and textures. It calculates the **Variance of the Laplacian**: a high variance indicates rough surfaces like potholes or chaotic garbage, while a low variance means the surface is smooth (e.g., a floor or wall).

2.  **Color-Space Decomposition (HSV):**
    The engine converts images to the **HSV (Hue, Saturation, Value)** color space to better distinguish between natural and artificial materials. By analyzing **Saturation**, it can reliably tell the difference between the neutral grey of a road and the vibrant colors found in waste or indoor objects.

3.  **The Decision Matrix:**
    The engine combines these features to reach a classification:
    *   **Roads/Potholes:** `Low Saturation` + `Neutral Hue` + `Moderate Roughness`.
    *   **Garbage/Waste:** `High Texture Chaos` + `High Color Variance`.
    *   **Streetlights:** `Extreme Brightness` + `Centralized Intensity`.

---

## 🛠️ Installation & Setup

1.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

2.  **Install Python Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Start the Server:**
    ```bash
    npm start
    ```

4.  **Access the App:**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 How the AI Validation Works

The system performs a "Category Mismatch" check:
1.  **User Input:** User selects "Road Repair / Pothole" and uploads a photo.
2.  **Analysis:** `classifier.py` scans the photo. If it finds a high `texture_roughness` and low `color_saturation`, it confirms it as a road.
3.  **Validation:** If the user's category does not match the AI's detection (e.g., they uploaded a photo of a dog but selected "Pothole"), the report is automatically flagged as **Invalid** and the status is set to **Rejected**.
