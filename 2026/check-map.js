const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('file:///Users/kevinweinkauff/Homepage/2026/Education.html', {waitUntil: 'networkidle0'});
    
    // Wait for initial render
    await new Promise(r => setTimeout(r, 2000));
    
    // Find Zillow
    const cards = await page.$$('.swiss-card');
    for (let c of cards) {
        let title = await c.$eval('.card-title', el => el.textContent);
        if (title.includes('Zillow')) {
            await c.$eval('.btn-swiss', el => el.click());
            break;
        }
    }
    
    await new Promise(r => setTimeout(r, 2000));
    const iframeHtml = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.outerHTML : 'NO_IFRAME_FOUND';
    });
    console.log("Iframe Check:", iframeHtml);
    await browser.close();
})();
