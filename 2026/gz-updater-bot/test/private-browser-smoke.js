'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { findBrowserExecutable } = require('../browser-runtime');

// Keep Puppeteer's configuration search outside Documents, where unrelated parent package files may exist.
process.chdir(os.tmpdir());
const puppeteer = require('puppeteer');

const CHECKER_URL = 'https://ccor-license-checker.pages.dev/?smoke=private-browser';

async function main() {
    const workbookPath = path.resolve(process.argv[2] || '');
    if (!workbookPath || !fs.existsSync(workbookPath)) {
        throw new Error('Pass the absolute path to a GrowthZone Excel or CSV export.');
    }
    const executablePath = findBrowserExecutable();
    if (!executablePath) throw new Error('Google Chrome or Microsoft Edge was not found.');

    const browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    let context;
    try {
        context = await browser.createBrowserContext();
        await context.setPermission(
            'https://ccor-license-checker.pages.dev',
            { permission: { name: 'local-network-access' }, state: 'granted' },
            { permission: { name: 'loopback-network' }, state: 'granted' },
        );
        const page = await context.newPage();
        const browserErrors = [];
        page.on('requestfailed', (request) => browserErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'failed'}`));
        page.on('console', (message) => {
            if (message.type() === 'error') browserErrors.push(message.text());
        });
        await page.goto(CHECKER_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        try {
            await page.waitForFunction(() => document.querySelector('#helperStatus')?.classList.contains('online'), { timeout: 15000 });
        } catch {
            const helperStatus = await page.$eval('#helperStatus', (element) => element.textContent);
            throw new Error(`Private browser could not reach the helper: ${helperStatus}. ${browserErrors.join(' | ')}`);
        }
        const fileInput = await page.$('#fileInput');
        if (!fileInput) throw new Error('The workbook file input was not found.');
        await fileInput.uploadFile(workbookPath);
        await page.waitForFunction(() => /\d+ records/.test(document.querySelector('#fileLabel')?.textContent || ''), { timeout: 15000 });
        await page.click('#checkButton');
        await page.waitForFunction(() => /^Checked \d+ licenses\./.test(document.querySelector('#message')?.textContent || ''), { timeout: 120000 });
        const result = await page.evaluate(() => ({
            message: document.querySelector('#message')?.textContent,
            helper: document.querySelector('#helperStatus')?.textContent,
            total: Number(document.querySelector('#totalStat')?.textContent || 0),
            licenseUpdates: Number(document.querySelector('#licenseStat')?.textContent || 0),
            coeReady: Number(document.querySelector('#coeReadyStat')?.textContent || 0),
            manualReview: Number(document.querySelector('#reviewStat')?.textContent || 0),
            updateEnabled: !document.querySelector('#syncButton')?.disabled,
        }));
        if (!result.total || !result.updateEnabled) throw new Error(`Private-browser workflow did not become update-ready: ${JSON.stringify(result)}`);
        console.log(JSON.stringify(result));
    } finally {
        if (context) await context.close();
        await browser.close();
    }
}

main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
});
