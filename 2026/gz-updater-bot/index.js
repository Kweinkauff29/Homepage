'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { enabled, normalizeLicenseNumber, toIsoDate, usDate } = require('./core');
require('dotenv').config();

const GZ_BASE_URL = 'https://bonitaspringsesterorealtorsfl.growthzoneapp.com';
const MODAL_SELECTOR = '.modal.in, .modal.show, .modal[style*="display: block"]';
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function emitResult(kind, contact, action, reason, details = {}) {
    const result = {
        kind,
        contactId: String(contact.ContactId || ''),
        licenseNumber: normalizeLicenseNumber(contact['License Number']),
        action,
        reason,
        ...details,
    };
    console.log(`CCOR_RESULT ${JSON.stringify(result)}`);
    return result;
}

function loadContactsFromCSV(filePath) {
    return new Promise((resolve, reject) => {
        const contacts = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                const wantsLicense = enabled(row['Update License']);
                const wantsCoe = enabled(row['Update COE']);
                if (row.ContactId && row['License Number'] && (wantsLicense || wantsCoe)) contacts.push(row);
            })
            .on('end', () => resolve(contacts))
            .on('error', reject);
    });
}

function findBrowserExecutable() {
    const candidates = process.platform === 'win32'
        ? [
            path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ]
        : [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ];
    return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

async function isLoginPage(page) {
    try {
        const url = page.url().toLowerCase();
        if (url.includes('/auth') || url.includes('/login') || url.includes('/oauth2/authorize') || url.includes('/connect/authorize')) return true;
        return page.evaluate(() => {
            const username = document.querySelector('#check-user-name-field, #loginId, input[name="Username"], input[name="loginId"], input[type="email"]');
            const password = document.querySelector('#password, #Password, input[name="password"], input[name="Password"], input[type="password"]');
            const app = document.querySelector('[ng-app], .app-content, #ContactExperienceTableWidget');
            return !app && Boolean(username || password);
        });
    } catch {
        return false;
    }
}

async function ensureLoggedIn(page, targetUrl) {
    if (!(await isLoginPage(page))) return;
    console.log('GrowthZone sign-in is required.');
    const username = process.env.GZ_USERNAME;
    const password = process.env.GZ_PASSWORD;

    if (username && password) {
        const usernameSelector = '#check-user-name-field, #loginId, input[name="Username"], input[name="loginId"]';
        const passwordSelector = '#password, #Password, input[name="password"], input[name="Password"], input[type="password"]';
        const usernameField = await page.$(usernameSelector);
        if (usernameField) {
            await usernameField.click({ clickCount: 3 });
            await usernameField.type(username, { delay: 25 });
            const next = await page.$('#check-user-name-button, button[type="submit"]');
            if (next) await next.click();
            await sleep(1500);
        }
        await page.waitForSelector(passwordSelector, { visible: true, timeout: 15000 }).catch(() => {});
        const passwordField = await page.$(passwordSelector);
        if (passwordField) {
            await passwordField.click({ clickCount: 3 });
            await passwordField.type(password, { delay: 25 });
            const submit = await page.$('button.blue.button, button[type="submit"], input[type="submit"], #sign-up-button');
            if (submit) await submit.click();
        }
    } else {
        console.log('Sign in in the opened browser window. Waiting up to 5 minutes...');
    }

    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline && await isLoginPage(page)) await sleep(1000);
    if (await isLoginPage(page)) throw new Error('GrowthZone login timed out.');
    if (targetUrl) {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(2500);
    }
}

async function navigateTo(page, contactId, route, readySelector) {
    const url = `${GZ_BASE_URL}/a#/ContactInfo/${encodeURIComponent(contactId)}/${route}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    if (await isLoginPage(page)) await ensureLoggedIn(page, url);
    await page.waitForSelector(readySelector, { visible: true, timeout: 30000 });
    await sleep(700);
}

async function cancelOpenModal(page) {
    await page.evaluate((selector) => {
        const modal = document.querySelector(selector);
        if (!modal) return;
        const button = [...modal.querySelectorAll('button')].find((item) => ['Cancel', 'Close'].includes(item.innerText.trim()));
        button?.click();
    }, MODAL_SELECTOR).catch(() => {});
    await sleep(250);
}

async function fillInputWithKeyboard(page, handle, value) {
    await handle.click({ clickCount: 3 });
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(value, { delay: 35 });
    await page.keyboard.press('Tab');
    await sleep(250);
}

async function clickModalDone(page) {
    const outcome = await page.evaluate((selector) => {
        const modal = document.querySelector(selector);
        if (!modal) return 'modal_missing';
        const button = [...modal.querySelectorAll('button')].find((item) => ['Done', 'Save'].includes(item.innerText.trim()) && item.offsetParent !== null);
        if (!button) return 'save_button_missing';
        if (button.disabled) return 'save_button_disabled';
        button.click();
        return 'clicked';
    }, MODAL_SELECTOR);
    if (outcome !== 'clicked') throw new Error(outcome);
    await page.waitForFunction((selector) => !document.querySelector(selector), { timeout: 20000 }, MODAL_SELECTOR).catch(() => {});
    await sleep(1200);
    const error = await page.evaluate((selector) => {
        const modal = document.querySelector(selector);
        if (!modal) return null;
        const box = modal.querySelector('#grumpyCatError, .alert-danger');
        return box && box.offsetParent !== null ? box.innerText.trim().replace(/\s+/g, ' ').slice(0, 240) : 'GrowthZone kept the editor open after Save.';
    }, MODAL_SELECTOR);
    if (error) {
        await cancelOpenModal(page);
        throw new Error(error);
    }
}

async function openMatchingLicense(page, expectedLicense) {
    return page.evaluate((licenseNumber) => {
        const widget = document.querySelector('#ContactExperienceTableWidget');
        if (!widget) return { error: 'growthzone_license_widget_missing' };
        const licenseRows = [...widget.querySelectorAll('tr.widget-row:not(.widget-row-condensed)')].filter((row) =>
            [...row.querySelectorAll('span')].some((span) => span.innerText.trim() === 'License'));
        if (licenseRows.length !== 1) return { error: licenseRows.length ? 'multiple_growthzone_license_rows' : 'growthzone_license_missing' };
        const row = licenseRows[0];
        const spanValues = [...row.querySelectorAll('span')].map((span) => span.innerText.trim()).filter(Boolean);
        const categoryIndex = spanValues.indexOf('License');
        const displayedLicense = categoryIndex >= 0 ? spanValues[categoryIndex + 1] : '';
        const numberMatches = String(displayedLicense).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^[A-Z]+/, '').replace(/^0+/, '') === licenseNumber;
        if (!numberMatches) return { error: 'growthzone_license_mismatch' };
        const edit = row.querySelector('li.item-action i.fa-pen, li.item-action [class*="fa-pen"], li.item-action i.edit-dialog');
        if (!edit) return { error: 'growthzone_license_edit_missing' };
        edit.closest('li.item-action').click();
        return { opened: true };
    }, expectedLicense);
}

async function readLicenseExpiration(page) {
    return page.evaluate((selector) => {
        const modal = document.querySelector(selector);
        if (!modal) return null;
        const label = [...modal.querySelectorAll('label')].find((item) => item.innerText.trim().toLowerCase().includes('expir'));
        return label?.closest('.form-group')?.querySelector('input')?.value || null;
    }, MODAL_SELECTOR);
}

async function expirationInput(page) {
    const handle = await page.evaluateHandle((selector) => {
        const modal = document.querySelector(selector);
        const label = [...(modal?.querySelectorAll('label') || [])].find((item) => item.innerText.trim().toLowerCase().includes('expir'));
        return label?.closest('.form-group')?.querySelector('input') || null;
    }, MODAL_SELECTOR);
    return handle.asElement();
}

async function updateGrowthZoneLicense(page, contact) {
    const expectedLicense = normalizeLicenseNumber(contact['License Number']);
    const targetDate = toIsoDate(contact['License Expiration Date']);
    console.log(`License: ${contact.Name || contact.ContactId} -> ${targetDate}`);
    if (!targetDate) return emitResult('license', contact, 'blocked', 'invalid_dbpr_expiration');

    await navigateTo(page, contact.ContactId, 'ContactOverview', '#ContactExperienceTableWidget');
    const opened = await openMatchingLicense(page, expectedLicense);
    if (opened.error) return emitResult('license', contact, 'blocked', opened.error);
    await page.waitForSelector(MODAL_SELECTOR, { visible: true, timeout: 15000 });
    await sleep(500);

    const currentDate = toIsoDate(await readLicenseExpiration(page));
    if (currentDate && currentDate >= targetDate) {
        await cancelOpenModal(page);
        return emitResult('license', contact, 'skipped', 'growthzone_license_already_current', { savedDate: currentDate });
    }

    const input = await expirationInput(page);
    if (!input) {
        await cancelOpenModal(page);
        return emitResult('license', contact, 'blocked', 'growthzone_expiration_field_missing');
    }
    await fillInputWithKeyboard(page, input, usDate(targetDate));
    await clickModalDone(page);

    await page.waitForSelector('#ContactExperienceTableWidget', { visible: true, timeout: 20000 });
    const verifyOpened = await openMatchingLicense(page, expectedLicense);
    if (verifyOpened.error) return emitResult('license', contact, 'blocked', 'growthzone_save_not_verified', { previousDate: currentDate });
    await page.waitForSelector(MODAL_SELECTOR, { visible: true, timeout: 15000 });
    const savedDate = toIsoDate(await readLicenseExpiration(page));
    await cancelOpenModal(page);

    if (savedDate !== targetDate) {
        return emitResult('license', contact, 'blocked', 'growthzone_save_not_verified', { previousDate: currentDate, savedDate });
    }
    return emitResult('license', contact, 'updated', 'dbpr_expiration_verified', { previousDate: currentDate, savedDate });
}

async function realEstateGuard(page, expectedLicense) {
    return page.evaluate((licenseNumber) => {
        const section = document.querySelector('.NRDSInformation')?.closest('.gzui-tableformfield');
        if (!section) return { error: 'growthzone_real_estate_data_missing' };
        const values = {};
        for (const row of section.querySelectorAll('tr')) {
            const cells = [...row.querySelectorAll('td')].map((cell) => cell.innerText.trim());
            if (cells.length >= 2) values[cells[0]] = cells[1];
        }
        const currentLicense = String(values['M1 License Number'] || '').replace(/\D/g, '').replace(/^0+/, '');
        if (String(values.Status || '').trim().toLowerCase() !== 'active') return { error: 'growthzone_contact_not_active' };
        if (String(values['Sync to M1'] || '').trim().toLowerCase() !== 'yes') return { error: 'growthzone_m1_sync_disabled' };
        if (!currentLicense || currentLicense !== licenseNumber) return { error: 'growthzone_license_mismatch' };
        return { ok: true };
    }, expectedLicense);
}

async function latestCoeDateOnPage(page) {
    return page.evaluate(() => {
        const dates = [...document.querySelectorAll('#CodesOfEthics tbody tr')]
            .map((row) => row.querySelector('td')?.innerText.trim() || '')
            .map((value) => {
                const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
                return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : null;
            })
            .filter(Boolean)
            .sort();
        return dates.at(-1) || null;
    });
}

async function openCoeEditor(page) {
    const opened = await page.evaluate(() => {
        const button = document.querySelector('.CodesOfEthics a[title="Code of Ethics"]');
        if (!button || button.offsetParent === null) return false;
        button.click();
        return true;
    });
    if (!opened) throw new Error('growthzone_coe_editor_missing');
    await page.waitForSelector('#AddEditNARCodeOfEthicsModel', { visible: true, timeout: 15000 });
    await sleep(500);
}

async function editableCoeRow(page) {
    let row = await page.evaluateHandle(() => {
        const rows = [...document.querySelectorAll('#CodeOfEthicsList tbody tr.dynamic-list-body')];
        return rows.find((item) => {
            const input = item.querySelector('input[ng-model="ctrl.localDate"]');
            return input && !input.readOnly && !input.disabled;
        }) || null;
    });
    if (row.asElement()) return row.asElement();
    await row.dispose();

    const added = await page.evaluate(() => {
        const button = document.querySelector('#CodeOfEthicsList button.gzui-add-button');
        if (!button || button.disabled) return false;
        button.click();
        return true;
    });
    if (!added) return null;
    await sleep(400);
    row = await page.evaluateHandle(() => {
        const rows = [...document.querySelectorAll('#CodeOfEthicsList tbody tr.dynamic-list-body')];
        return rows.findLast((item) => {
            const input = item.querySelector('input[ng-model="ctrl.localDate"]');
            return input && !input.readOnly && !input.disabled;
        }) || null;
    });
    return row.asElement();
}

async function fillCoeRow(page, row, targetDate, cycle) {
    const dateInput = await row.$('input[ng-model="ctrl.localDate"]');
    const courseCode = await row.$('select[ng-model="itemCodeOfEthicsList.EducationCourseCode"]');
    const cycleSelect = await row.$('select[ng-model="itemCodeOfEthicsList.Cycle"]');
    if (!dateInput || !courseCode || !cycleSelect) throw new Error('growthzone_coe_fields_missing');

    await fillInputWithKeyboard(page, dateInput, usDate(targetDate));
    await courseCode.select('number:1');
    await sleep(250);
    await cycleSelect.select(`number:${cycle}`);
    await sleep(350);

    const derived = await row.evaluate((element) => element.innerText.replace(/\s+/g, ' '));
    const year = targetDate.slice(0, 4);
    if (!derived.includes(`${year}C${cycle}`) || !derived.includes(year)) throw new Error('growthzone_coe_course_derivation_failed');
}

async function updateGrowthZoneCoe(page, contact) {
    const expectedLicense = normalizeLicenseNumber(contact['License Number']);
    const targetDate = toIsoDate(contact['Confirmed COE Date']);
    const cycle = Number(contact['COE Cycle']);
    console.log(`COE: ${contact.Name || contact.ContactId} -> ${targetDate} (Cycle ${cycle})`);
    if (!targetDate || !Number.isInteger(cycle) || cycle < 1 || cycle > 25) {
        return emitResult('coe', contact, 'blocked', 'invalid_confirmed_coe');
    }

    await navigateTo(page, contact.ContactId, 'NAREditionFieldsV2', '.CodesOfEthics');
    const guard = await realEstateGuard(page, expectedLicense);
    if (guard.error) return emitResult('coe', contact, 'blocked', guard.error);

    const currentDate = await latestCoeDateOnPage(page);
    if (currentDate && currentDate >= targetDate) {
        return emitResult('coe', contact, 'skipped', 'growthzone_already_current', { savedDate: currentDate });
    }

    await openCoeEditor(page);
    const row = await editableCoeRow(page);
    if (!row) {
        await cancelOpenModal(page);
        return emitResult('coe', contact, 'blocked', 'growthzone_coe_row_add_failed', { previousDate: currentDate });
    }
    await fillCoeRow(page, row, targetDate, cycle);
    await page.waitForFunction((selector) => {
        const modal = document.querySelector(selector);
        const button = [...(modal?.querySelectorAll('button') || [])].find((item) => item.innerText.trim() === 'Done');
        return Boolean(button && !button.disabled);
    }, { timeout: 10000 }, MODAL_SELECTOR);
    await clickModalDone(page);

    await page.waitForSelector('.CodesOfEthics', { visible: true, timeout: 20000 });
    let savedDate = null;
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        savedDate = await latestCoeDateOnPage(page);
        if (savedDate && savedDate >= targetDate) break;
        await sleep(750);
    }
    if (savedDate !== targetDate) {
        return emitResult('coe', contact, 'blocked', 'growthzone_save_not_verified', { previousDate: currentDate, savedDate });
    }
    return emitResult('coe', contact, 'updated', 'confirmed_dbpr_coe_verified', {
        previousDate: currentDate,
        savedDate,
        cycle,
        courseNumber: `${targetDate.slice(0, 4)}C${cycle}`,
    });
}

async function recoverModal(page) {
    await cancelOpenModal(page).catch(() => {});
}

async function main() {
    const csvFile = process.argv[2];
    if (!csvFile || !fs.existsSync(csvFile)) {
        console.error('Usage: node index.js path/to/GrowthZone_Updates.csv');
        process.exitCode = 1;
        return;
    }

    const contacts = await loadContactsFromCSV(csvFile);
    console.log(`Loaded ${contacts.length} GrowthZone contact(s).`);
    if (!contacts.length) return;

    const executablePath = findBrowserExecutable();
    if (!executablePath) throw new Error('Google Chrome or Microsoft Edge was not found on this computer.');
    const browser = await puppeteer.launch({
        executablePath,
        headless: false,
        defaultViewport: null,
        userDataDir: path.join(__dirname, '.chrome-session'),
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const page = await browser.newPage();
    page.on('dialog', async (dialog) => dialog.accept());

    try {
        await page.goto('https://growthzoneapp.com/auth?ReturnUrl=%2fa', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
        await sleep(1500);
        await ensureLoggedIn(page, `${GZ_BASE_URL}/a`);

        for (let index = 0; index < contacts.length; index += 1) {
            const contact = contacts[index];
            console.log(`[${index + 1}/${contacts.length}] ${contact.Name || contact.ContactId}`);
            if (enabled(contact['Update License'])) {
                try {
                    await updateGrowthZoneLicense(page, contact);
                } catch (error) {
                    console.error(`License update failed: ${error.message}`);
                    await recoverModal(page);
                    emitResult('license', contact, 'blocked', 'automation_error', { detail: String(error.message).slice(0, 240) });
                }
            }
            if (enabled(contact['Update COE'])) {
                try {
                    await updateGrowthZoneCoe(page, contact);
                } catch (error) {
                    console.error(`COE update failed: ${error.message}`);
                    await recoverModal(page);
                    emitResult('coe', contact, 'blocked', 'automation_error', { detail: String(error.message).slice(0, 240) });
                }
            }
        }
        console.log('GrowthZone update job complete.');
        await sleep(2500);
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
});
