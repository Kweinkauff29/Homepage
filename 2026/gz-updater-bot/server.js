const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors()); // Allow requests from LicenseChecker.html
app.use(express.json());

app.post('/run-updater', (req, res) => {
    const { csvPath } = req.body;

    if (!csvPath || !fs.existsSync(csvPath)) {
        return res.status(400).json({ error: 'File not found or missing path.' });
    }

    console.log(`Starting Puppeteer script with file: ${csvPath}`);

    // Spawn the index.js script as a child process
    const scriptPath = path.join(__dirname, 'index.js');
    const child = spawn('node', [scriptPath, csvPath], {
        cwd: __dirname,
        stdio: 'inherit', // Route logs directly to this server's terminal
        detached: true    // Allow it to run independently
    });

    child.unref(); // Don't block the server loop

    res.json({ message: 'Puppeteer script started successfully! Check the terminal for progress.' });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`GrowthZone Automator Server running on http://localhost:${PORT}`);
    console.log(`Ensure this server is running when you click the 'Run Puppeteer Updates' button in the UI.`);
});
