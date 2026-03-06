import { test, expect } from '@playwright/test';

test('debug login screen', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    const signInBtn = page.locator('text=Sign In').first();
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();

    await page.waitForTimeout(1000);
    console.log("URL after clicking Sign In:", page.url());

    const hasForm = await page.locator('text=Enter your email to sign in').isVisible();
    console.log("Shows login form?", hasForm);

    if (hasForm) {
        // Fill in a dummy user
        await page.fill('input[type="email"]', 'captain@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Sign in")');
        await page.waitForTimeout(8000); // Wait for the timeout to trigger or succeed
        console.log("URL after submitting login form:", page.url());

        // Check for spinner
        const spinner = await page.locator('.animate-spin').isVisible();
        console.log("Shows spinner after login?", spinner);
    }
});
