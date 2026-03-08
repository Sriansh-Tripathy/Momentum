import { chromium } from 'playwright';

(async () => {
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

        console.log('Navigating...');
        await page.goto('http://localhost:5175/');
        await page.waitForTimeout(3000);

        const content = await page.content();
        console.log("--- HTML CONTENT ---");
        if (content.includes('React App Crashed')) {
            const errorText = await page.evaluate(() => document.body.innerText);
            console.log(errorText);
        } else {
            console.log("App rendered without error boundary.");
            console.log(await page.evaluate(() => document.body.innerText));
        }

        await browser.close();
    } catch (e) {
        console.error("Script err:", e);
    }
})();
