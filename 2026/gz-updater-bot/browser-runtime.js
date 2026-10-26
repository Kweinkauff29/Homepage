'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function findBrowserExecutable(platform = process.platform, env = process.env) {
    const candidates = platform === 'win32'
        ? [
            path.join(env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ]
        : [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ];
    return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

function probeChildProcess(nodeExecutable = process.execPath, spawnProcess = spawn) {
    return new Promise((resolve) => {
        const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccor-gz-probe-'));
        const probeFile = path.join(probeDir, 'probe.txt');
        fs.writeFileSync(probeFile, 'probe', { encoding: 'utf8', flag: 'wx' });
        let settled = false;
        let timer;
        const finish = (ready) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            fs.rm(probeDir, { recursive: true, force: true }, () => {});
            resolve(ready);
        };
        let child;
        try {
            child = spawnProcess(nodeExecutable, [path.join(__dirname, 'spawn-probe.js'), probeFile], {
                cwd: probeDir,
                env: process.env,
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true,
            });
        } catch {
            finish(false);
            return;
        }
        child.once('error', () => finish(false));
        child.once('close', (code) => finish(code === 0));
        timer = setTimeout(() => {
            child.kill();
            finish(false);
        }, 5000);
        timer.unref?.();
    });
}

async function checkBrowserRuntime(options = {}) {
    const executablePath = options.executablePath === undefined ? findBrowserExecutable() : options.executablePath;
    if (!executablePath) {
        return {
            ready: false,
            browser: null,
            issue: 'Google Chrome or Microsoft Edge was not found. Install one, then restart the helper.',
        };
    }

    const runProbe = options.probe || probeChildProcess;
    let canSpawn = false;
    try {
        canSpawn = await runProbe(options.nodeExecutable || process.execPath, options.spawnProcess || spawn);
    } catch {
        canSpawn = false;
    }
    if (!canSpawn) {
        return {
            ready: false,
            browser: path.basename(executablePath),
            issue: 'Windows or macOS is blocking the helper from opening a child browser. Close this helper and start start-windows.cmd or start-mac.command directly.',
        };
    }

    return { ready: true, browser: path.basename(executablePath), issue: null };
}

module.exports = { checkBrowserRuntime, findBrowserExecutable, probeChildProcess };
