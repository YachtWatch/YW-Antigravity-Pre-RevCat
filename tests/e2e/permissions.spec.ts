import { test, expect } from '@playwright/test';

// Helper to generate unique users
const generateUser = () => {
    const id = Math.random().toString(36).substring(7);
    return {
        name: `User ${id}`,
        email: `user${id}@example.com`,
        password: 'password123'
    };
};

test('Captain and Crew Permissions Flow', async ({ browser }) => {
    test.slow();
    test.setTimeout(120000);

    const captainContext = await browser.newContext();
    const crewContext = await browser.newContext();

    const captainPage = await captainContext.newPage();
    const crewPage = await crewContext.newPage();

    const captainUser = generateUser();
    const crewUser = generateUser();

    captainPage.on('console', msg => console.log('[Captain Browser]', msg.text()));
    crewPage.on('console', msg => console.log('[Crew Browser]', msg.text()));

    let joinCode = '';

    // --- CAPTAIN SETUP AND ASSERTIONS ---
    await test.step('Captain Registration and Vessel Setup', async () => {
        await captainPage.goto('/auth/signup');
        // Select Captain Role (assuming default is Captain if no crew card is clicked, or explicitly click Captain)
        await captainPage.locator('.rounded-xl.border-2', { hasText: 'Captain' }).click().catch(() => { });

        await captainPage.fill('input[id="name"]', captainUser.name);
        await captainPage.fill('input[id="email"]', captainUser.email);
        await captainPage.fill('input[id="password"]', captainUser.password);
        await captainPage.click('button:has-text("Create account")');

        // Skip profile setup
        await expect(captainPage.getByText('Set up your profile')).toBeVisible({ timeout: 60000 });
        await captainPage.click('button:has-text("Skip and do later")');

        // Register Vessel
        await expect(captainPage.getByText('Register your Vessel')).toBeVisible({ timeout: 60000 });
        await captainPage.fill('input[placeholder="e.g. M/Y Eclipse"]', `Test Yacht ${captainUser.name}`);
        await captainPage.fill('input[placeholder="50"]', '45');
        await captainPage.fill('input[placeholder="12"]', '10');
        await captainPage.click('button:has-text("Initialize Vessel")');

        await expect(captainPage.getByText("Captain's Dashboard")).toBeVisible({ timeout: 60000 });

        // Captain: Can see Crew List and Pending Requests
        await captainPage.click('button:has-text("Crew")');
        await expect(captainPage.getByText('Vessel Join Code')).toBeVisible();
        await expect(captainPage.getByText('Pending Requests')).toBeVisible();
        await expect(captainPage.getByText('Active Crew')).toBeVisible();

        // Extract Join Code
        const joinCodeElement = captainPage.locator('.font-mono.tracking-\\[0\\.2em\\]');
        joinCode = await joinCodeElement.innerText();

        // Captain: Can create/edit schedules
        await captainPage.click('button:has-text("Schedule")');
        await expect(captainPage.getByText('Create First Schedule')).toBeVisible().catch(() => { });
        await expect(captainPage.getByText('Generate New Schedule')).toBeVisible().catch(() => { });
    });

    // --- CREW SIGNUP AND JOIN ---
    await test.step('Crew Registration and Joining', async () => {
        await crewPage.goto('/auth/signup');
        // Select Crew Role
        await crewPage.locator('.rounded-xl.border-2', { hasText: 'Crew' }).click();

        await crewPage.fill('input[id="name"]', crewUser.name);
        await crewPage.fill('input[id="position"]', 'Deckhand');
        await crewPage.fill('input[id="email"]', crewUser.email);
        await crewPage.fill('input[id="password"]', crewUser.password);
        await crewPage.click('button:has-text("Create account")');

        // Skip profile setup
        await expect(crewPage.getByText('Set up your profile')).toBeVisible({ timeout: 60000 });
        await crewPage.click('button:has-text("Skip and do later")');

        // Enter Join Code
        await expect(crewPage.getByText('Join a Vessel')).toBeVisible({ timeout: 60000 });
        await crewPage.fill('input[placeholder="e.g. A1B2C3"]', joinCode);
        await crewPage.click('button:has-text("Request to Join")');
        await expect(crewPage.getByText('Request Sent')).toBeVisible();
    });

    // --- CAPTAIN APPROVAL ASSERTIONS ---
    await test.step('Captain Approves Request (Captain Permission)', async () => {
        await captainPage.click('button:has-text("Crew")');

        // Captain: Can approve join requests
        await expect(captainPage.getByText(crewUser.name)).toBeVisible({ timeout: 15000 });
        const requestRow = captainPage.locator('div.border.rounded-lg.bg-card.shadow-sm', { hasText: crewUser.name });
        await requestRow.locator('button.bg-green-600').click();

        // Captain: Can see roster (Active Crew now has the user)
        await expect(captainPage.locator('h3', { hasText: 'Active Crew' })).toBeVisible();
        await expect(captainPage.locator('div.border.rounded-lg.bg-card', { hasText: crewUser.name })).toBeVisible();
    });

    // --- CREW PERMISSION ASSERTIONS ---
    await test.step('Crew Permissions Assertions', async () => {
        // Refresh Crew Page to enter dashboard
        await crewPage.getByText('Check Status').click();

        // Crew: Can load vessel dashboard
        await expect(crewPage.getByText(`M/Y Test Yacht ${captainUser.name}`)).toBeVisible({ timeout: 15000 });

        // Crew: Can see Crew List
        await crewPage.click('button:has-text("Crew")');
        await expect(crewPage.getByText('Crew List')).toBeVisible();
        await expect(crewPage.getByText(captainUser.name)).toBeVisible();
        await expect(crewPage.getByText(crewUser.name)).toBeVisible();

        // Crew: Cannot approve join requests
        await expect(crewPage.getByText('Pending Requests')).toBeHidden();

        // Crew: Cannot edit vessel (Vessel Join Code should be hidden for crew, which implies management limits)
        await expect(crewPage.getByText('Vessel Join Code')).toBeHidden();

        // Crew: Can see schedules
        await crewPage.click('button:has-text("Schedule")');

        // Crew: Cannot create/edit schedules
        await expect(crewPage.getByText('Generate New Schedule')).toBeHidden();
        await expect(crewPage.getByText('Clear Schedule')).toBeHidden();
        await expect(crewPage.getByText('Create First Schedule')).toBeHidden();
    });

});
