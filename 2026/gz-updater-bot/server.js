'use strict';

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { normalizeJobRecord, usDate } = require('./core');
const { checkBrowserRuntime } = require('./browser-runtime');
require('dotenv').config();

const app = express();
const allowedOrigins = new Set([
    'https://ccor-license-checker.pages.dev',
    'http://localhost:8788',
    'http://127.0.0.1:8788',
]);
const jobs = new Map();
const browserRuntimePromise = checkBrowserRuntime();

app.use((_request, response, next) => {
    // Chrome's Private Network Access preflight requires this for an HTTPS page calling localhost.
    response.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
});
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
app.use(express.json({ limit: '96kb' }));

function csvValue(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

app.get('/health', async (_request, response) => {
    const browserRuntime = await browserRuntimePromise;
    response.json({
        ok: true,
        service: 'ccor-growthzone-updater',
        capabilities: ['license', 'coe', 'both'],
        browserReady: browserRuntime.ready,
        browser: browserRuntime.browser,
        issue: browserRuntime.issue,
    });
});

app.post('/run-updater', async (request, response) => {
    const input = request.body?.records;
    const records = Array.isArray(input) ? input.map(normalizeJobRecord) : [];
    if (!Array.isArray(input) || input.length < 1 || input.length > 100 || records.some((record) => !record)) {
        response.status(400).json({ error: 'records must contain 1-100 valid Contact ID/license entries and at least one requested update with its verified ISO date.' });
        return;
    }
    if ([...jobs.values()].some((job) => job.status === 'running')) {
        response.status(409).json({ error: 'A GrowthZone update job is already running on this computer.' });
        return;
    }
    const browserRuntime = await browserRuntimePromise;
    if (!browserRuntime.ready) {
        response.status(503).json({
            error: browserRuntime.issue,
            code: 'browser_runtime_blocked',
        });
        return;
    }

    const jobId = crypto.randomUUID();
    const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccor-gz-update-'));
    const csvPath = path.join(jobDir, 'updates.csv');
    const headers = [
        'Name', 'ContactId', 'License Number', 'Update License', 'License Expiration Date',
        'Update COE', 'Confirmed COE Date', 'COE Cycle', 'COE Course Number', 'COE Course Name',
    ];
    const lines = [headers.map(csvValue).join(',')];
    for (const record of records) {
        lines.push([
            record.name,
            record.contactId,
            record.licenseNumber,
            record.updateLicense ? 'Yes' : 'No',
            record.updateLicense ? usDate(record.expirationDate) : '',
            record.updateCoe ? 'Yes' : 'No',
            record.updateCoe ? usDate(record.coeDate) : '',
            record.updateCoe ? record.coeCycle : '',
            record.coeCourseNumber,
            record.coeCourseName,
        ].map(csvValue).join(','));
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
        console.error(`Could not start local updater process: ${error.message}`);
        fs.rm(jobDir, { recursive: true, force: true }, () => {});
        response.status(500).json({
            error: 'The local updater process could not start. Close this helper and launch start-windows.cmd or start-mac.command directly, then retry.',
            code: 'updater_process_start_failed',
        });
        return;
    }

    const capture = (chunk, level) => {
        for (const line of String(chunk).split(/\r?\n/).filter(Boolean)) {
            job.logs.push({ level, line });
            if (job.logs.length > 300) job.logs.shift();
            if (line.startsWith('CCOR_RESULT ')) {
                try { job.results.push(JSON.parse(line.slice('CCOR_RESULT '.length))); } catch { /* retain the raw log */ }
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
    console.log(`CCOR GrowthZone updater ready at http://127.0.0.1:${PORT} (license, COE, or both)`);
});
