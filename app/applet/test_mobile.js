const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    await page.goto('http://localhost:3000/GunGame.mobile/index.html', { waitUntil: 'networkidle0' });
    
    console.log("Page loaded. Clicking btnTester...");
    await page.click('#btnTester');
    await page.waitForTimeout(1000);
    
    console.log("Clicking startBtn...");
    await page.click('#startBtn');
    await page.waitForTimeout(2000);

    await browser.close();
})();
