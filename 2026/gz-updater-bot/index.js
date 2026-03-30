const puppeteer = require('puppeteer');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

const results = [];
function loadContactsFromCSV(filePath) {
    return new Promise((resolve, reject) => {
        const contacts = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                // Ensure ContactId exists and format matches
                if (row.ContactId && row['License Expiration Date']) {
                    contacts.push(row);
                }
            })
            .on('end', () => resolve(contacts))
            .on('error', reject);
    });
}

async function updateGrowthZoneLicense(page, contact) {
    const profileUrl = `https://bonitaspringsesterorealtorsfl.growthzoneapp.com/a#/ContactInfo/${contact.ContactId}/ContactOverview`;
    console.log(`\nNavigating to ${contact.Name} profile: ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });

    console.log(`Waiting for Professional widget to load inside iframes...`);
    let targetFrame = null;
    let licenseRowFound = false;

    const startTime = Date.now();
    while (!licenseRowFound && (Date.now() - startTime) < 20000) {
        for (const frame of page.frames()) {
            try {
                const found = await frame.evaluate(() => {
                    const rows = document.querySelectorAll('.widget-row');
                    for (let row of rows) {
                        const text = row.innerText;
                        if (text.includes('License') && text.includes('DBPR')) {
                            return true;
                        }
                    }
                    return false;
                });
                if (found) {
                    targetFrame = frame;
                    licenseRowFound = true;
                    break;
                }
            } catch (e) { } // Ignore cross-origin frame errors
        }
        if (!licenseRowFound) await new Promise(r => setTimeout(r, 1000));
    }

    if (!targetFrame) {
        throw new Error('Could not find the Professional widget containing the License inside any iframe.');
    }

    console.log(`Finding Matching License rows in frame: ${targetFrame.url()}`);
    // Identify all rows that match "License" and "DBPR"
    const matchingIndices = await targetFrame.evaluate(() => {
        const rows = document.querySelectorAll('.widget-row');
        const found = [];
        rows.forEach((row, i) => {
            const text = row.innerText;
            if (text.includes('License') && text.includes('DBPR')) {
                found.push(i);
            }
        });
        return found;
    });

    let editFound = false;

    if (matchingIndices.length > 1) {
        console.log(`⚠️ Found ${matchingIndices.length} redundant license entries. Removing extras...`);
        // Keep the first one, delete the rest
        for (let i = matchingIndices.length - 1; i > 0; i--) {
            const rowIndex = matchingIndices[i];
            console.log(`Deleting redundant row at index ${rowIndex}...`);
            
            await targetFrame.evaluate((idx) => {
                const rows = document.querySelectorAll('.widget-row');
                const row = rows[idx];
                if (!row) return;
                // Try common delete icon selectors in GrowthZone
                const delBtn = row.querySelector('.fal.fa-times') || row.querySelector('.fa-times') || row.querySelector('.delete-dialog');
                if (delBtn) delBtn.click();
            }, rowIndex);

            // Wait for confirmation modal and click Delete / Remove / Yes
            await new Promise(r => setTimeout(r, 2000));
            
            async function findAndClickConfirmButton(scope) {
                return await scope.evaluate(() => {
                    const buttons = document.querySelectorAll('.modal-footer button, .btn-danger, .confirm-button, button.blue');
                    for (let btn of buttons) {
                        const txt = btn.innerText.trim().toLowerCase();
                        if (['delete', 'yes', 'confirm', 'remove', 'ok'].includes(txt)) {
                            console.log(`Clicking confirmation button: "${txt}"`);
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                });
            }

            let confirmed = await findAndClickConfirmButton(targetFrame);
            if (!confirmed) {
                console.log(`Note: Confirmation button not found in iframe, checking main page...`);
                // Sometimes modals are rendered in the main page context rather than the iframe
                confirmed = await findAndClickConfirmButton(page);
            }
            
            if (confirmed) {
                console.log(`Successfully confirmed deletion of row ${i + 1}`);
                await new Promise(r => setTimeout(r, 3000)); // Wait for row to be removed from UI
            } else {
                console.log(`⚠️ Warning: Could not find confirmation button ("Delete", "Remove", "Yes") for row ${i + 1}`);
            }
        }
    }

    if (matchingIndices.length === 0) {
        console.log(`💡 No existing license found. Adding a new one...`);
        // Find the plus (+) button in the header of the Professional widget
        const addClicked = await targetFrame.evaluate(() => {
            const headers = document.querySelectorAll('.widget-header');
            for (let h of headers) {
                if (h.innerText.includes('Professional')) {
                    const addBtn = h.querySelector('.fal.fa-plus') || h.querySelector('.fa-plus');
                    if (addBtn) {
                        addBtn.click();
                        return true;
                    }
                }
            }
            return false;
        });
        if (!addClicked) throw new Error('Could not find the (+) Add button in the Professional widget header.');
        editFound = true;
    } else {
        // Now find the (remaining) row to edit
        editFound = await targetFrame.evaluate(() => {
            const rows = document.querySelectorAll('.widget-row');
            for (let row of rows) {
                const text = row.innerText;
                if (text.includes('License') && text.includes('DBPR')) {
                    const editBtn = row.querySelector('.fal.fa-pen.edit-dialog') || row.querySelector('.fa-pen');
                    if (editBtn) {
                        editBtn.click();
                        return true;
                    }
                }
            }
            return false;
        });
    }

    if (!editFound) {
        throw new Error('Could not initiate Add or Edit for the license.');
    }

    console.log('Waiting for Modal to appear...');
    // The modal fieldset id="License"
    const modalSelector = 'fieldset#License';
    await targetFrame.waitForSelector(modalSelector, { visible: true, timeout: 5000 });
    
    // Fallback: wait a moment for the content to fully load
    await new Promise(r => setTimeout(r, 3000));

    // Handle New License category selection
    if (matchingIndices.length === 0) {
        console.log('Setting Category to "License"...');
        await targetFrame.evaluate(() => {
            const selects = document.querySelectorAll('div[data-ng-model="vm.model.License.CategoryGUID"] select');
            if (selects.length > 0) {
                const select = selects[0];
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].text.includes('License')) {
                        select.selectedIndex = i;
                        select.dispatchEvent(new Event('change'));
                        return;
                    }
                }
            }
        });
        await new Promise(r => setTimeout(r, 1000));
    }

    // Set License Number, Type, Authority (especially for new ones)
    const fillField = async (name, value) => {
        if (!value) return;
        await targetFrame.evaluate((n, v) => {
            const input = document.querySelector(`div[data-ng-model="vm.model.License.${n}"] input`);
            if (input) {
                input.value = v;
                input.dispatchEvent(new Event('input'));
                input.dispatchEvent(new Event('change'));
            }
        }, name, value);
    };

    if (matchingIndices.length === 0) {
        await fillField('LicenseNumber', contact['License Number']);
        await fillField('LicenseType', contact['License Type']);
        await fillField('Authority', 'DBPR');
    }

    // Use the datetime attribute to find the correct date input
    const dateInputSelector = 'div[datetime="vm.model.License.EndDate"] input.form-control';
    await targetFrame.waitForSelector(dateInputSelector, { visible: true });
    
    console.log(`Setting expiration date to: ${contact['License Expiration Date']}`);
    await targetFrame.click(dateInputSelector);
    await new Promise(r => setTimeout(r, 500));

    // Clear and type
    await page.keyboard.press('Home');
    await page.keyboard.down('Shift');
    await page.keyboard.press('End');
    await page.keyboard.up('Shift');
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 500));
    await targetFrame.type(dateInputSelector, contact['License Expiration Date'], { delay: 100 });

    console.log('Clicking Done...');
    // Find the Done button by matching its text inside the modal-footer
    await targetFrame.evaluate(() => {
        const buttons = document.querySelectorAll('.modal-footer button');
        for (let btn of buttons) {
            const txt = btn.innerText.trim();
            if (txt === 'Done' || txt === 'Add' || txt === 'Ok') {
                btn.click();
                return;
            }
        }
    });

    // Wait for the modal to disappear
    await targetFrame.waitForSelector(modalSelector, { hidden: true, timeout: 5000 });
    console.log(`Successfully updated/added license for ${contact.Name}`);
}

(async () => {
    const csvFile = process.argv[2];
    if (!csvFile) {
        console.error('Error: Please provide a CSV file containing the GrowthZone updates.');
        console.log('Usage: node index.js path/to/GrowthZone_License_Updates.csv');
        process.exit(1);
    }

    if (!fs.existsSync(csvFile)) {
        console.error(`Error: Could not find CSV file: ${csvFile}`);
        process.exit(1);
    }

    console.log(`Loading contacts from ${csvFile}...`);
    const contactsToUpdate = await loadContactsFromCSV(csvFile);
    console.log(`Found ${contactsToUpdate.length} contacts with valid IDs and Expiration Dates.\n`);

    if (contactsToUpdate.length === 0) {
        console.log('No valid contacts to update. Exiting.');
        process.exit(0);
    }

    console.log('Launching browser (visible mode for testing)...');
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
    const page = await browser.newPage();

    // Automatically handle any browser-native confirmation dialogs (confirm / alert)
    page.on('dialog', async dialog => {
        console.log(`[Dialog] ${dialog.type()} appeared: "${dialog.message()}" - Accepting.`);
        await dialog.accept();
    });

    console.log('Navigating to login...');
    await page.goto('https://growthzoneapp.com/auth?ReturnUrl=%2fa', { waitUntil: 'domcontentloaded' });

    console.log('Entering username...');
    await page.waitForSelector('#check-user-name-field', { visible: true });
    await page.type('#check-user-name-field', 'kevin@bonitaesterorealtors.com', { delay: 50 });

    console.log('Clicking Next and waiting for redirect...');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#check-user-name-button')
    ]);

    console.log('Entering password...');
    await page.waitForSelector('#password', { visible: true });
    await page.type('#password', 'Goalie29', { delay: 50 });

    console.log('Clicking Submit and waiting for Dashboard load...');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click('button.blue.button')
    ]);

    console.log('Waiting 15 seconds for GrowthZone to fully log in and load dashboard...');
    await new Promise(r => setTimeout(r, 15000));

    console.log('\n--- Starting Updates ---');
    for (const contact of contactsToUpdate) {
        try {
            await updateGrowthZoneLicense(page, contact);
            // Brief pause between contacts
            await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
            console.error(`Failed to update ${contact.Name}: ${err.message}`);
        }
    }

    console.log('Updates complete! Keeping browser open for 10 seconds to verify...');
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();
})();
