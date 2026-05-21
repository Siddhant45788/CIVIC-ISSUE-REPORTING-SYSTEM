const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Content Security Policy (CSP) Middleware
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://rsms.me; font-src https://rsms.me; img-src 'self' data: /uploads; connect-src 'self';"
    );
    next();
});

// Serve static files from root (for index.html, script.js, style.css)
app.use(express.static(__dirname));
// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Database File ---
const DB_FILE = path.join(__dirname, 'complaints.json');

// Ensure database file exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// --- Multer Setup for File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

const { spawn } = require('child_process');

// --- API Routes ---

// Helper function to run AI classification
const runAIClassification = (imagePath) => {
    return new Promise((resolve) => {
        const fullPath = path.join(__dirname, imagePath);
        
        // Detect OS command: 'python3' for Linux/Mac, 'python' for Windows
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        
        const pythonProcess = spawn(pythonCmd, [path.join(__dirname, 'classifier.py'), fullPath]);
        
        pythonProcess.on('error', (err) => {
            console.error(`Failed to start Python process (${pythonCmd}):`, err.message);
            resolve({ 
                prediction: "System Error", 
                confidence: "0%", 
                ai_suggested_type: `Python (${pythonCmd}) not found` 
            });
        });
        
        let stdoutData = '';
        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            try {
                // Try to extract only the JSON part (last line of output)
                const lines = stdoutData.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const result = JSON.parse(lastLine);
                resolve(result);
            } catch (e) {
                console.error("AI Parse Error:", stdoutData);
                resolve({ 
                    prediction: "System Error", 
                    confidence: "0%", 
                    ai_suggested_type: "Processing Error" 
                });
            }
        });
    });
};

// Report an issue
app.post('/api/report', upload.single('issueImage'), async (req, res) => {
    const { name, email, issueType, severity, description, address, location } = req.body;
    
    // AI Classification
    let aiResults = null;
    if (req.file) {
        aiResults = await runAIClassification(`/uploads/${req.file.filename}`);
    }

    // Category Validation Logic (Multi-Class Support)
    let isValid = true;
    if (aiResults && issueType !== 'Other') {
        // Check if the user category is present in any of the AI detections
        const matchFound = aiResults.all_detections ? 
            aiResults.all_detections.some(d => d.class === issueType) :
            aiResults.ai_suggested_type === issueType;
            
        if (!matchFound) {
            isValid = false;
        }
    }

    const newComplaint = {
        id: `CIV-${Date.now()}`,
        timestamp: new Date().toISOString(),
        name,
        email,
        issueType,
        severity,
        description,
        address,
        location: location || 'Not provided',
        imagePath: req.file ? `/uploads/${req.file.filename}` : null,
        status: isValid ? 'Submitted' : 'Invalid',
        aiPrediction: {
            ...aiResults,
            validationMatch: isValid
        }
    };

    const complaints = JSON.parse(fs.readFileSync(DB_FILE));
    complaints.push(newComplaint);
    fs.writeFileSync(DB_FILE, JSON.stringify(complaints, null, 2));

    res.status(201).json({
        message: 'Report submitted successfully!',
        complaintId: newComplaint.id,
        aiPrediction: newComplaint.aiPrediction
    });
});

// Track a complaint
app.get('/api/track/:id', (req, res) => {
    const { id } = req.params;
    const complaints = JSON.parse(fs.readFileSync(DB_FILE));
    const complaint = complaints.find(c => c.id === id);

    if (complaint) {
        res.json(complaint);
    } else {
        res.status(404).json({ message: 'Complaint not found' });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
