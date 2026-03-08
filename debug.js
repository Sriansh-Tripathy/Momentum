import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log(`[Browser Console ${msg.type()}]`, msg.text()));
    page.on('pageerror', error => console.error(`[Browser Error]`, error.message));

    console.log('Navigating to http://localhost:5174/ ...');
    await page.goto('http://localhost:5174/');

    await page.waitForTimeout(3000); // 3 seconds

    await browser.close();
})();
