const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    await page.goto('http://localhost:3000/GunGame.PC/index.html');
    await page.waitForSelector('#btnTester', { visible: true });
    await page.click('#btnTester');
    await page.waitForSelector('#startBtn', { visible: true });
    await page.click('#startBtn');
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
