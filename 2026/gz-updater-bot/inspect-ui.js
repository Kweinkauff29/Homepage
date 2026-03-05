const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();

(async () => {
    console.log('Launching browser (visible mode)...');
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
    const page = await browser.newPage();

    console.log('Navigating to login... PLEASE LOG IN MANUALLY in the Chrome window!');
    await page.goto('https://growthzoneapp.com/auth?ReturnUrl=%2fa', { waitUntil: 'domcontentloaded' });

    // Wait for user to log in manually
    console.log('You have 60 seconds to log in and navigate to Kevin Weinkauff\'s profile...');
    console.log('Or click this link in the browser: https://bonitaspringsesterorealtorsfl.growthzoneapp.com/a#/ContactInfo/4159518/ContactOverview');
    await new Promise(r => setTimeout(r, 60000));

    console.log('Dumping HTML of the current page...');
    const html = await page.content();
    fs.writeFileSync('profile.html', html);

    console.log('Done. Saved to profile.html');
    await browser.close();
})();
