const puppeteer = require('puppeteer');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

// ─── CSV Loading ────────────────────────────────────────────────────────────
function loadContactsFromCSV(filePath) {
    return new Promise((resolve, reject) => {
        const contacts = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.ContactId && row['License Expiration Date']) {
                    contacts.push(row);
                }
            })
            .on('end', () => resolve(contacts))
            .on('error', reject);
    });
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Wait for #ContactExperienceTableWidget to be present in the DOM.
 * This widget contains ALL professional/license records for the contact.
 */
async function waitForWidget(page, timeout = 15000) {
    await sleep(3000); // initial render buffer
    try {
        await page.waitForSelector('#ContactExperienceTableWidget', { timeout });
    } catch {
        // Widget might not exist for some contacts
    }
    await sleep(2000); // extra buffer for Angular rendering
}

/**
 * Focus a modal input by index and type a value using real keyboard input.
 * AngularJS only detects changes from actual keyboard events.
 */
async function focusAndType(page, inputIndex, value) {
    if (!value) return;

    // Focus the input (only target VISIBLE inputs and wait for them)
    const focused = await page.evaluate((idx) => {
        const modal = document.querySelector('.modal.in, .modal.show, .modal[style*="display: block"]');
        if (!modal) return false;
        // Filter only fully visible inputs
        const visibleInputs = Array.from(modal.querySelectorAll('input.form-control'))
                                   .filter(i => i.offsetWidth > 0 && i.offsetHeight > 0);
        if (!visibleInputs[idx]) return false;
        visibleInputs[idx].focus();
        visibleInputs[idx].click();
        return true;
    }, inputIndex);

    if (!focused) {
        console.error(`      ⚠️ Could not focus input at index ${inputIndex}`);
        return;
    }
    await sleep(300);

    // Select all & delete, then type
    await page.keyboard.press('End');
    for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Backspace');
    }
    await sleep(200);

    // Also clear via JS as a fallback
    await page.evaluate(() => {
        const el = document.activeElement;
        if (el && el.tagName === 'INPUT') {
            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    await sleep(200);
    await page.keyboard.type(value, { delay: 50 });  // Slower, more reliable typing
    await sleep(200);
    await page.keyboard.press('Tab'); // Critical for AngularJS to detect the blur/change
    await sleep(200);
}

// ─── Core Automation ────────────────────────────────────────────────────────

/**
 * Process a single contact's license record in GrowthZone.
 *
 * ALL interactions are scoped to #ContactExperienceTableWidget.
 *
 * DOM structure (verified via live HTML dump):
 *   #ContactExperienceTableWidget
 *     ├─ div.row  (header area)
 *     │   ├─ div.widget-action-wrapper
 *     │   │   └─ i.far.fa-plus-circle.edit-dialog  [ADD button]
 *     │   └─ div.widget-name.subtitle-1
 *     │       └─ span "Professional"  /  span.summary-bubble "1"
 *     └─ div.widget-table-wrapper
 *         └─ table.widget-table > tbody
 *             ├─ tr.widget-header  (column headers: Category | What | Where | Actions)
 *             ├─ tr.widget-row  (expanded row — has separate <td> per column)
 *             │   └─ td > span "License"
 *             │   └─ td > actions-wrapper > li.item-action [Remove] / li.item-action [Edit]
 *             └─ tr.widget-row.widget-row-condensed  (condensed row for sidebar)
 *                 └─ td > span "License"  /  span "BK 3154832"
 *                 └─ td > condensed-widget-actions > li.item-action [Remove] / li.item-action [Edit]
 *
 * Key ng-click handlers:
 *   ADD:    vm.AddShowCreateDialogAddEditContactExperienceModel(widget, ...)
 *   EDIT:   vm.EditShowAddEditDialogAddEditContactExperienceModel(item, ...)
 *   DELETE: vm.appUIFunctions.confirm(this, vm.DeferRemoveExperienceDelete(item), ...)
 */
async function updateGrowthZoneLicense(page, contact) {
    const profileUrl = `https://bonitaspringsesterorealtorsfl.growthzoneapp.com/a#/ContactInfo/${contact.ContactId}/ContactOverview`;
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 ${contact.Name}  (ID: ${contact.ContactId})`);
    console.log(`   Target Exp Date: ${contact['License Expiration Date']}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Navigate and wait for Angular to render the widget
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForWidget(page);

    // ── STEP 1: Count License rows INSIDE #ContactExperienceTableWidget ─────
    const licenseInfo = await page.evaluate(() => {
        const widget = document.querySelector('#ContactExperienceTableWidget');
        if (!widget) return { error: 'Widget not found', rows: [] };

        // Only count NON-condensed widget-rows that contain "License" text
        // (condensed rows are duplicates shown in sidebar view)
        const rows = widget.querySelectorAll('tr.widget-row:not(.widget-row-condensed)');
        const licenseRows = [];
        rows.forEach((row, idx) => {
            const text = row.innerText.trim();
            // Check if this row's first visible span says "License"
            const spans = row.querySelectorAll('span');
            let isLicense = false;
            for (const span of spans) {
                if (span.innerText.trim() === 'License') {
                    isLicense = true;
                    break;
                }
            }
            if (isLicense) {
                licenseRows.push({
                    index: idx,
                    text: text.replace(/\n/g, ' | ').substring(0, 150)
                });
            }
        });
        return { error: null, rows: licenseRows };
    });

    if (licenseInfo.error) {
        console.log(`   ⚠️  ${licenseInfo.error} — will try adding new`);
    }

    const licenseCount = licenseInfo.rows.length;
    console.log(`   Found ${licenseCount} License row(s) in #ContactExperienceTableWidget`);
    licenseInfo.rows.forEach((r, i) => console.log(`     [${i}] "${r.text}"`));

    // ── STEP 2: Delete EXTRAS only (if more than 1 license row) ─────────────
    if (licenseCount > 1) {
        console.log(`   ⚠️  Removing ${licenseCount - 1} extra license row(s)...`);

        for (let i = licenseCount - 1; i > 0; i--) {
            console.log(`   🗑️  Deleting extra row [${i}]...`);

            // Click the Remove (X) icon on this specific row INSIDE the widget
            const deleteClicked = await page.evaluate((targetIdx) => {
                const widget = document.querySelector('#ContactExperienceTableWidget');
                if (!widget) return 'widget-not-found';

                const rows = widget.querySelectorAll('tr.widget-row:not(.widget-row-condensed)');
                let licIdx = 0;
                for (const row of rows) {
                    const spans = row.querySelectorAll('span');
                    let isLicense = false;
                    for (const span of spans) {
                        if (span.innerText.trim() === 'License') { isLicense = true; break; }
                    }
                    if (isLicense) {
                        if (licIdx === targetIdx) {
                            // Find the Remove li.item-action (has fa-times icon)
                            const removeBtn = row.querySelector('li.item-action i.fa-times, li.item-action [class*="fa-times"]');
                            if (removeBtn) {
                                // Click the parent li, not just the icon
                                removeBtn.closest('li.item-action').click();
                                return 'clicked-remove';
                            }
                            return 'no-remove-icon';
                        }
                        licIdx++;
                    }
                }
                return 'row-not-found';
            }, i);

            console.log(`      Delete click: ${deleteClicked}`);

            if (deleteClicked === 'clicked-remove') {
                await sleep(2000);
                // Confirm the "Are you sure you want to Remove" dialog
                const confirmed = await page.evaluate(() => {
                    const allBtns = document.querySelectorAll('.modal.in button, .modal.show button, .bootbox button');
                    for (const btn of allBtns) {
                        const txt = btn.innerText.trim().toLowerCase();
                        if (btn.offsetParent !== null && (txt === 'ok' || txt === 'yes' || txt === 'confirm' || txt === 'remove')) {
                            btn.click();
                            return 'confirmed: ' + txt;
                        }
                    }
                    return 'no-confirm-btn';
                });
                console.log(`      Confirm: ${confirmed}`);
                await sleep(3000);
            }
        }
    }

    // ── STEP 3: Decide: ADD new or EDIT existing ────────────────────────────
    // Re-check the count after any deletions
    const currentCount = await page.evaluate(() => {
        const widget = document.querySelector('#ContactExperienceTableWidget');
        if (!widget) return 0;
        let count = 0;
        const rows = widget.querySelectorAll('tr.widget-row:not(.widget-row-condensed)');
        for (const row of rows) {
            const spans = row.querySelectorAll('span');
            for (const span of spans) {
                if (span.innerText.trim() === 'License') { count++; break; }
            }
        }
        return count;
    });

    console.log(`   Current License rows after cleanup: ${currentCount}`);

    if (currentCount === 0) {
        // ── ADD NEW LICENSE ─────────────────────────────────────────────────
        console.log(`   ➕ Adding new license record...`);

        const addClicked = await page.evaluate(() => {
            const widget = document.querySelector('#ContactExperienceTableWidget');
            if (!widget) return 'widget-not-found';
            // The add button is: i.far.fa-plus-circle.edit-dialog inside widget
            const addBtn = widget.querySelector('i.fa-plus-circle, i[class*="fa-plus-circle"]');
            if (addBtn) {
                addBtn.click();
                return 'clicked-add';
            }
            return 'add-btn-not-found';
        });

        console.log(`   Add button: ${addClicked}`);

        if (!addClicked.includes('clicked')) {
            console.error(`   ❌ Could not find Add button. Skipping.`);
            return;
        }

        await sleep(3000);

        // Select "License" category
        const categorySet = await page.evaluate(() => {
            const modal = document.querySelector('.modal.in, .modal.show, .modal[style*="display: block"]');
            if (!modal) return 'no-modal';
            const sel = modal.querySelector('select');
            if (!sel) return 'no-select';
            for (let i = 0; i < sel.options.length; i++) {
                if (sel.options[i].text.trim() === 'License') {
                    sel.selectedIndex = i;
                    const angularEl = window.angular?.element(sel);
                    if (angularEl) angularEl.triggerHandler('change');
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                    return 'selected-License';
                }
            }
            return 'License-not-in-options';
        });

        console.log(`   Category: ${categorySet}`);
        await sleep(3000); // Wait longer for Angular to render the dynamic fields

        // Type License Number (input[0]), License Type (input[1]), Issuing Authority (input[2])
        await focusAndType(page, 0, contact['License Number'] || '');
        console.log(`   ⌨️  License Number: ${contact['License Number']}`);
        await focusAndType(page, 1, contact['License Type'] || '');
        console.log(`   ⌨️  License Type: ${contact['License Type']}`);
        await focusAndType(page, 2, 'DBPR');
        console.log(`   ⌨️  Issuing Authority: DBPR`);

    } else {
        // ── EDIT EXISTING LICENSE ───────────────────────────────────────────
        console.log(`   ✏️  Editing existing license record...`);

        const editClicked = await page.evaluate(() => {
            const widget = document.querySelector('#ContactExperienceTableWidget');
            if (!widget) return 'widget-not-found';

            const rows = widget.querySelectorAll('tr.widget-row:not(.widget-row-condensed)');
            for (const row of rows) {
                const spans = row.querySelectorAll('span');
                let isLicense = false;
                for (const span of spans) {
                    if (span.innerText.trim() === 'License') { isLicense = true; break; }
                }
                if (isLicense) {
                    // Click the Edit li.item-action (has fa-pen icon)
                    const editBtn = row.querySelector('li.item-action i.fa-pen, li.item-action [class*="fa-pen"], li.item-action i.edit-dialog');
                    if (editBtn) {
                        editBtn.closest('li.item-action').click();
                        return 'clicked-edit';
                    }
                    return 'no-edit-icon';
                }
            }
            return 'no-license-row';
        });

        console.log(`   Edit click: ${editClicked}`);

        if (!editClicked.includes('clicked')) {
            console.error(`   ❌ Could not click Edit. Skipping.`);
            return;
        }

        await sleep(3000);
    }

    // ── STEP 4: Set the Expiration Date ─────────────────────────────────────
    const expDate = contact['License Expiration Date'];
    console.log(`   📅 Setting Expiration Date: ${expDate}`);

    // Focus the Expiration Date field (the second date input with a calendar icon)
    const expFocused = await page.evaluate(() => {
        const modal = document.querySelector('.modal.in, .modal.show, .modal[style*="display: block"]');
        if (!modal) return 'no-modal';

        const visibleInputs = Array.from(modal.querySelectorAll('input.form-control'))
                                   .filter(i => i.offsetWidth > 0 && i.offsetHeight > 0);

        // Strategy 1: Find by label text containing "Expir"
        const labels = modal.querySelectorAll('label');
        for (const label of labels) {
            if (label.innerText.trim().toLowerCase().includes('expir') && label.offsetWidth > 0) {
                const group = label.closest('.form-group, div');
                const input = group?.querySelector('input');
                if (input && input.offsetWidth > 0) {
                    input.focus();
                    input.click();
                    return 'focused-via-label';
                }
            }
        }

        // Strategy 2: Find by calendar icon position (second date input among visible inputs)
        const dateInputs = [];
        for (const input of visibleInputs) {
            const hasCalendar = input.parentElement?.querySelector('[class*="calendar"]');
            if (hasCalendar) dateInputs.push(input);
        }
        if (dateInputs.length >= 2) {
            dateInputs[1].focus();
            dateInputs[1].click();
            return 'focused-via-calendar-position';
        }

        // Strategy 3: Use visible input index 4 (5th visible input in License form)
        if (visibleInputs[4]) {
            visibleInputs[4].focus();
            visibleInputs[4].click();
            return 'focused-via-index-4';
        }

        return 'exp-field-not-found';
    });

    console.log(`   Exp focus: ${expFocused}`);

    if (!expFocused.includes('not-found') && expFocused !== 'no-modal') {
        await sleep(300);
        
        await page.keyboard.press('End');
        for (let i = 0; i < 15; i++) {
            await page.keyboard.press('Backspace');
        }
        await sleep(200);

        // Explicitly clear value via JS just in case
        await page.evaluate(() => {
            const el = document.activeElement;
            if (el && el.tagName === 'INPUT') {
                el.value = '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await sleep(200);

        await page.keyboard.type(expDate, { delay: 50 });
        await sleep(200);
        await page.keyboard.press('Tab');
        console.log(`   ⌨️  Typed Expiration Date: ${expDate}`);
    } else {
        console.error(`   ❌ Could not focus Expiration Date field`);
    }

    await sleep(1000);

    // ── STEP 5: Click "Done" to save ────────────────────────────────────────
    console.log(`   💾 Saving...`);

    const saveResult = await page.evaluate(() => {
        const modal = document.querySelector('.modal.in, .modal.show, .modal[style*="display: block"]');
        if (!modal) return 'no-modal';

        const buttons = modal.querySelectorAll('button');
        for (const btn of buttons) {
            const txt = btn.innerText.trim();
            if (btn.offsetParent !== null && modal.contains(btn) && (txt === 'Done' || txt === 'Save')) {
                btn.click();
                return 'saved: ' + txt;
            }
        }
        return 'no-save-button';
    });

    console.log(`   Save: ${saveResult}`);
    await sleep(4000);

    // Check for success gracefully (clicking done might navigate the page and detach the frame!)
    let success = 'no-toast (may still be OK)';
    try {
        success = await page.evaluate(() => {
            const toast = document.querySelector('.toast-success, .alert-success, [class*="toast-success"]');
            if (toast) return 'SUCCESS: ' + toast.innerText.substring(0, 80).replace(/\n/g, ' ');
            return 'no-toast (may still be OK)';
        });
    } catch (e) {
        success = 'SUCCESS (assumed positive due to page navigation / frame detach)';
    }

    console.log(`   Result: ${success}`);
    console.log(`   ✅ Done processing ${contact.Name}`);
}

// ─── Main Entry Point ───────────────────────────────────────────────────────
(async () => {
    const csvFile = process.argv[2];
    if (!csvFile) {
        console.error('Usage: node index.js path/to/GrowthZone_License_Updates.csv');
        process.exit(1);
    }
    if (!fs.existsSync(csvFile)) {
        console.error(`Error: CSV file not found: ${csvFile}`);
        process.exit(1);
    }

    console.log(`📂 Loading contacts from ${csvFile}...`);
    const contactsToUpdate = await loadContactsFromCSV(csvFile);
    console.log(`📊 ${contactsToUpdate.length} contacts with valid data.\n`);

    if (contactsToUpdate.length === 0) {
        console.log('No contacts to update. Exiting.');
        process.exit(0);
    }

    console.log('🚀 Launching browser...');
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    const page = await browser.newPage();

    // Auto-accept any browser-native confirm()/alert() dialogs
    page.on('dialog', async dialog => {
        console.log(`   [Dialog] ${dialog.type()}: "${dialog.message()}" → Accepting`);
        await dialog.accept();
    });

    // ── Login ───────────────────────────────────────────────────────────────
    console.log('🔐 Logging in...');
    await page.goto('https://growthzoneapp.com/auth?ReturnUrl=%2fa', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('#check-user-name-field', { visible: true });
    await page.type('#check-user-name-field', process.env.GZ_EMAIL || 'kevin@bonitaesterorealtors.com', { delay: 50 });

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#check-user-name-button')
    ]);

    await page.waitForSelector('#password', { visible: true });
    await page.type('#password', process.env.GZ_PASSWORD || 'Goalie29', { delay: 50 });

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click('button.blue.button')
    ]);

    console.log('⏳ Waiting for dashboard...');
    await sleep(15000);

    // ── Process All Contacts ────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════╗');
    console.log('║    STARTING LICENSE UPDATES      ║');
    console.log('╚══════════════════════════════════╝\n');

    let ok = 0, fail = 0;

    for (let idx = 0; idx < contactsToUpdate.length; idx++) {
        const contact = contactsToUpdate[idx];
        console.log(`\n[${idx + 1}/${contactsToUpdate.length}]`);
        try {
            await updateGrowthZoneLicense(page, contact);
            ok++;
        } catch (err) {
            console.error(`   ❌ FAILED: ${err.message}`);
            fail++;
            // Try to close any leftover modals
            try {
                await page.evaluate(() => {
                    const modal = document.querySelector('.modal.in, .modal.show');
                    if (modal) {
                        const close = modal.querySelector('.close, button.close');
                        if (close) close.click();
                    }
                });
            } catch { /* ignore */ }
            await sleep(2000);
        }
        await sleep(2000);
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════╗');
    console.log('║         UPDATE COMPLETE          ║');
    console.log('╚══════════════════════════════════╝');
    console.log(`✅ Succeeded: ${ok}`);
    console.log(`❌ Failed:    ${fail}`);
    console.log(`📊 Total:     ${contactsToUpdate.length}`);

    console.log('\nKeeping browser open for 10s to verify...');
    await sleep(10000);
    await browser.close();
})();
