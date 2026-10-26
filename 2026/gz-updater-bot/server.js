const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
require('dotenv').config();

const app = express();
const allowedOrigins = new Set([
    'https://ccor-license-checker.pages.dev',
    'http://localhost:8788',
    'http://127.0.0.1:8788',
]);
const jobs = new Map();

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin) || /^https:\/\/[a-z0-9-]+\.ccor-license-checker\.pages\.dev$/i.test(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Origin not allowed.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '64kb' }));

function csvValue(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function validRecord(record) {
    return record
        && /^\d+$/.test(String(record.contactId || ''))
        && /^\d{1,20}$/.test(String(record.licenseNumber || ''))
        && /^\d{4}-\d{2}-\d{2}$/.test(String(record.expirationDate || ''));
}

function usDate(isoDate) {
    const [year, month, day] = isoDate.split('-');
    return `${Number(month)}/${Number(day)}/${year}`;
}

app.get('/health', (_request, response) => response.json({ ok: true, service: 'ccor-growthzone-license-updater' }));

app.post('/run-updater', (request, response) => {
    const records = request.body?.records;
    if (!Array.isArray(records) || records.length < 1 || records.length > 100 || records.some((record) => !validRecord(record))) {
        response.status(400).json({ error: 'records must contain 1-100 valid Contact ID, license number, and ISO expiration date entries.' });
        return;
    }
    if ([...jobs.values()].some((job) => job.status === 'running')) {
        response.status(409).json({ error: 'A license update job is already running on this computer.' });
        return;
    }

    const jobId = crypto.randomUUID();
    const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccor-gz-license-'));
    const csvPath = path.join(jobDir, 'updates.csv');
    const headers = ['Name', 'ContactId', 'License Number', 'License Expiration Date'];
    const lines = [headers.map(csvValue).join(',')];
    for (const record of records) {
        lines.push([record.name, record.contactId, record.licenseNumber, usDate(record.expirationDate)].map(csvValue).join(','));
    }
    fs.writeFileSync(csvPath, lines.join('\r\n'), { encoding: 'utf8', flag: 'wx' });

    const job = { jobId, status: 'running', startedAt: new Date().toISOString(), completedAt: null, results: [], logs: [] };
    jobs.set(jobId, job);
    let child;
    try {
        child = spawn(process.execPath, [path.join(__dirname, 'index.js'), csvPath], {
            // Run outside Documents so unrelated parent package metadata cannot affect Puppeteer's config search.
            cwd: jobDir,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });
    } catch (error) {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.logs.push({ level: 'error', line: error.message });
        fs.rm(jobDir, { recursive: true, force: true }, () => {});
        response.status(500).json({ error: 'The local browser process could not be started.' });
        return;
    }

    const capture = (chunk, level) => {
        for (const line of String(chunk).split(/\r?\n/).filter(Boolean)) {
            job.logs.push({ level, line });
            if (job.logs.length > 250) job.logs.shift();
            if (line.startsWith('CCOR_RESULT ')) {
                try { job.results.push(JSON.parse(line.slice('CCOR_RESULT '.length))); } catch { /* keep raw log */ }
            }
        }
    };
    child.stdout.on('data', (chunk) => capture(chunk, 'info'));
    child.stderr.on('data', (chunk) => capture(chunk, 'error'));
    child.on('error', (error) => {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.logs.push({ level: 'error', line: error.message });
        fs.rm(jobDir, { recursive: true, force: true }, () => {});
    });
    child.on('close', (code) => {
        job.status = code === 0 ? 'complete' : 'failed';
        job.exitCode = code;
        job.completedAt = new Date().toISOString();
        fs.rm(jobDir, { recursive: true, force: true }, () => {});
    });

    response.status(202).json({ ok: true, jobId, status: job.status });
});

app.get('/jobs/:jobId', (request, response) => {
    const job = jobs.get(request.params.jobId);
    if (!job) {
        response.status(404).json({ error: 'Job not found.' });
        return;
    }
    response.json(job);
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, '127.0.0.1', () => {
    console.log(`CCOR GrowthZone license updater ready at http://127.0.0.1:${PORT}`);
});
