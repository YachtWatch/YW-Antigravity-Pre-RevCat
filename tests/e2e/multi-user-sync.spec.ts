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

test('Captain and Crew synchronization flow', async ({ browser }) => {
    test.slow(); // Mark test as slow (triples timeout)
    test.setTimeout(120000);

    // 1. Create two isolated browser contexts
    const captainContext = await browser.newContext();
    const crewContext = await browser.newContext();

    const captainPage = await captainContext.newPage();
    const crewPage = await crewContext.newPage();

    const captainUser = generateUser();
    const crewUser = generateUser();

    // --- CAPTAIN FLOW ---
    await test.step('Captain Registration and Setup', async () => {
        console.log(`[Captain] Navigating to signup with ${captainUser.email}...`);
        await captainPage.goto('/auth/signup');
        await captainPage.fill('input[id="name"]', captainUser.name);
        await captainPage.fill('input[id="email"]', captainUser.email);
        await captainPage.fill('input[id="password"]', captainUser.password);
        console.log('[Captain] Clicking Create account...');
        await captainPage.click('button:has-text("Create account")');

        // Handle Complete Profile Page with Debugging
        console.log('[Captain] Waiting for Profile Setup...');
        try {
            await expect(captainPage.getByText('Set up your profile')).toBeVisible({ timeout: 30000 });
        } catch (e) {
            console.log('[Captain] Failed to find "Set up your profile". Checking page content...');
            try {
                const content = await captainPage.content();
                if (content.includes('Check your email')) {
                    console.error('[Captain] ERROR: Email confirmation is required!');
                    throw new Error('Email confirmation required - cannot proceed with E2E test');
                }
                await captainPage.screenshot({ path: 'captain-signup-failure.png' });
            } catch (err) {
                console.error('Failed to capture debug info:', err);
            }
            throw e;
        }

        console.log('[Captain] Profile page found. Clicking Skip...');
        await captainPage.click('button:has-text("Skip and do later")');

        // Expect to land on dashboard or vessel registration
        console.log('[Captain] Waiting for Register Vessel...');
        await expect(captainPage.getByText('Register your Vessel')).toBeVisible({ timeout: 30000 });

        // Register Vessel
        console.log('[Captain] Registering vessel...');
        await captainPage.fill('input[placeholder="e.g. M/Y Eclipse"]', `Test Yacht ${captainUser.name}`);
        await captainPage.fill('input[placeholder="50"]', '45');
        await captainPage.fill('input[placeholder="12"]', '10');
        await captainPage.click('button:has-text("Initialize Vessel")');

        // Verify Dashboard Loaded
        console.log('[Captain] Waiting for Dashboard...');
        await expect(captainPage.getByText("Captain's Dashboard")).toBeVisible({ timeout: 30000 });

        // Go to Crew Tab to get Join Code
        console.log('[Captain] Getting Join Code...');
        await captainPage.click('button:has-text("Crew")');
        // Wait for the join code card
        await expect(captainPage.getByText('Vessel Join Code')).toBeVisible();
    });

    // Extract Join Code
    const joinCodeElement = captainPage.locator('.font-mono.tracking-\\[0\\.2em\\]');
    const joinCode = await joinCodeElement.innerText();
    console.log('Join Code:', joinCode);
    expect(joinCode).toMatch(/^[A-Z0-9]{6}$/);

    // --- CREW FLOW ---
    await test.step('Crew Registration and Joining', async () => {
        console.log(`[Crew] Navigating to signup with ${crewUser.email}...`);
        await crewPage.goto('/auth/signup');
        // Select Crew Role
        const crewRoleCard = crewPage.locator('.rounded-xl.border-2', { hasText: 'Crew' });
        await crewRoleCard.click();

        await crewPage.fill('input[id="name"]', crewUser.name);
        await crewPage.fill('input[id="position"]', 'Deckhand');
        await crewPage.fill('input[id="email"]', crewUser.email);
        await crewPage.fill('input[id="password"]', crewUser.password);

        console.log('[Crew] Clicking Create account...');
        await crewPage.click('button:has-text("Create account")');

        // Handle Complete Profile Page
        console.log('[Crew] Waiting for Profile Setup...');
        try {
            await expect(crewPage.getByText('Set up your profile')).toBeVisible({ timeout: 30000 });
        } catch (e) {
            console.log('[Crew] Failed to find profile setup.');
            await crewPage.screenshot({ path: 'crew-signup-failure.png' });
            throw e;
        }
        await crewPage.click('button:has-text("Skip and do later")');

        // Crew should see "Join a Vessel" since they have no vessel
        console.log('[Crew] Waiting for Join Vessel screen...');
        await expect(crewPage.getByText('Join a Vessel')).toBeVisible({ timeout: 30000 });

        // Enter Join Code
        console.log(`[Crew] Entering Join Code: ${joinCode}...`);
        await crewPage.fill('input[placeholder="e.g. A1B2C3"]', joinCode);
        await crewPage.click('button:has-text("Request to Join")');

        // Crew should see "Request Sent"
        await expect(crewPage.getByText('Request Sent')).toBeVisible();
    });

    // --- CAPTAIN APPROVAL ---
    await test.step('Captain Approves Request', async () => {
        console.log('[Captain] Waiting for request to appear (Realtime)...');
        // Do NOT reload. Wait for the realtime subscription to trigger the update.
        await expect(captainPage.getByText(crewUser.name)).toBeVisible({ timeout: 30000 });
        await captainPage.click('button:has-text("Crew")'); // Ensure we are on Crew tab

        // Check for pending request
        console.log(`[Captain] Checking for request from ${crewUser.name}...`);
        await expect(captainPage.getByText(crewUser.name)).toBeVisible({ timeout: 10000 });

        // Approve
        console.log('[Captain] Approving request...');
        const requestRow = captainPage.locator('div.border.rounded-lg.bg-card.shadow-sm', { hasText: crewUser.name });
        await requestRow.locator('button.bg-green-600').click();

        // Verify moved to Active Crew
        console.log('[Captain] Verifying active crew...');
        await expect(captainPage.locator('h3', { hasText: 'Active Crew' })).toContainText(crewUser.name);
    });

    // --- CREW VERIFICATION ---
    await test.step('Crew Dashboard Access', async () => {
        console.log('[Crew] Checking status...');
        await crewPage.getByText('Check Status').click();

        // Should now see the Dashboard
        console.log('[Crew] Verifying dashboard access...');
        await expect(crewPage.getByText(`M/Y Test Yacht ${captainUser.name}`)).toBeVisible();
        await expect(crewPage.getByText("No upcoming watches")).toBeVisible();
    });

});
