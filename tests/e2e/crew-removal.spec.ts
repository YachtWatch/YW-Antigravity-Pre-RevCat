
import { test, expect } from '@playwright/test';

const generateUser = () => {
    const id = Math.random().toString(36).substring(7);
    return {
        name: `User ${id}`,
        email: `user${id}@example.com`,
        password: 'password123'
    };
};

test('Captain can remove a crew member', async ({ browser }) => {
    test.slow();

    // 1. Setup Captain and Crew
    const captainContext = await browser.newContext();
    const crewContext = await browser.newContext();
    const captainPage = await captainContext.newPage();
    const crewPage = await crewContext.newPage();

    const captainUser = generateUser();
    const crewUser = generateUser();

    // --- CAPTAIN SETUP ---
    await captainPage.goto('/auth/signup');
    await captainPage.fill('input[id="name"]', captainUser.name);
    await captainPage.fill('input[id="email"]', captainUser.email);
    await captainPage.fill('input[id="password"]', captainUser.password);
    await captainPage.click('button:has-text("Create account")');
    await captainPage.click('button:has-text("Skip and do later")');

    // Register Vessel
    await captainPage.fill('input[placeholder="e.g. M/Y Eclipse"]', `Test Yacht ${captainUser.name}`);
    await captainPage.fill('input[placeholder="50"]', '45');
    await captainPage.fill('input[placeholder="12"]', '10');
    await captainPage.click('button:has-text("Initialize Vessel")');
    await expect(captainPage.getByText("Captain's Dashboard")).toBeVisible({ timeout: 15000 });

    // Get Request Code
    await captainPage.click('button:has-text("Crew")');
    const joinCode = await captainPage.locator('.font-mono.tracking-\\[0\\.2em\\]').innerText();
    expect(joinCode).toHaveLength(6);

    // --- CREW JOIN ---
    await crewPage.goto('/auth/signup');
    await crewPage.locator('.rounded-xl.border-2', { hasText: 'Crew' }).click();
    await crewPage.fill('input[id="name"]', crewUser.name);
    await crewPage.fill('input[id="position"]', 'Deckhand');
    await crewPage.fill('input[id="email"]', crewUser.email);
    await crewPage.fill('input[id="password"]', crewUser.password);
    await crewPage.click('button:has-text("Create account")');
    await crewPage.click('button:has-text("Skip and do later")');

    await crewPage.fill('input[placeholder="e.g. A1B2C3"]', joinCode);
    await crewPage.click('button:has-text("Request to Join")');
    await expect(crewPage.getByText('Request Sent')).toBeVisible();

    // --- CAPTAIN APPROVE ---
    await expect(captainPage.getByText(crewUser.name)).toBeVisible({ timeout: 15000 });
    const requestRow = captainPage.locator('div.border.rounded-lg.bg-card.shadow-sm', { hasText: crewUser.name });
    await expect(requestRow.locator('button.bg-green-600')).toBeVisible();
    await requestRow.locator('button.bg-green-600').click();

    // Check Crew is Active
    await expect(captainPage.locator('h3', { hasText: 'Active Crew' }).locator('xpath=..')).toContainText(crewUser.name);

    // --- CAPTAIN REMOVE ---
    console.log("Removing Crew Member...");

    // Handle specific confirm dialog
    captainPage.on('dialog', dialog => dialog.accept());

    const crewRow = captainPage.locator('div.flex.items-center.gap-3', { hasText: crewUser.name });
    await crewRow.getByText('Remove').click();

    // Verify Removal
    // It should disappear from the list
    await expect(crewRow).toBeHidden({ timeout: 5000 });

    // Double check it doesn't come back on reload
    await captainPage.reload();
    await captainPage.click('button:has-text("Crew")');
    await expect(captainPage.getByText(crewUser.name)).toBeHidden();
});
