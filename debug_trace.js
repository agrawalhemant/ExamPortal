const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen to console logs
    page.on('console', msg => {
        if (msg.type() === 'trace' || msg.type() === 'log') {
            console.log(`[BROWSER]: ${msg.text()}`);
        }
    });

    try {
        console.log("Navigating to login...");
        await page.goto('http://localhost:4173/student/login');

        // Login
        await page.fill('input[type="email"]', 'test@test.com');
        await page.fill('input[type="password"]', 'fVy9!prPx');
        await page.click('button:has-text("Login")');

        console.log("Waiting for dashboard...");
        await page.waitForNavigation();

        // Start Test
        console.log("Starting test...");
        await page.click('button:has-text("Start Test")');
        await page.waitForSelector('text=Welcome to the Exam');
        await page.click('button:has-text("Start Test")'); // modal start

        // Quick answer to Q1
        console.log("Inside Exam...");
        await page.waitForSelector('text=Question 1');

        // We don't even need to answer, just click Finish Exam
        console.log("Clicking Finish Exam...");
        await page.click('button:has-text("Finish Exam")');

        // Wait for a second to let any logs flush
        await page.waitForTimeout(2000);

        // Did it submit? Let's check if we see ResultPage or the Modal
        const hasModal = await page.isVisible('text=Are you sure you want to finish the exam?');
        console.log(`Modal visible? ${hasModal}`);

        const hasResult = await page.isVisible('text=Exam Completed');
        console.log(`Result Page visible? ${hasResult}`);

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
