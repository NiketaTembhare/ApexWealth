const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('upload verification', async ({ page }) => {
    fs.writeFileSync('dummy.jpg', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00]));
    
    let capturedRequest = null;
    let capturedResponse = null;
    let responseBody = null;

    page.on('request', request => {
        if (request.url().includes('/upload-statement') && request.method() === 'POST') {
            capturedRequest = request;
            console.log('--- INTERCEPTED UPLOAD REQUEST ---');
            console.log('URL:', request.url());
            console.log('Method:', request.method());
            console.log('Headers:');
            for (const [key, value] of Object.entries(request.headers())) {
                console.log(`  ${key}: ${value}`);
            }
            const postData = request.postData();
            console.log('FormData Payload exists?', postData ? 'Yes' : 'No');
            if (postData) {
                console.log('FormData keys/content preview:', postData.substring(0, 200).replace(/\r\n/g, '\\n'));
            }
        }
    });

    page.on('response', async response => {
        if (response.url().includes('/upload-statement') && response.request().method() === 'POST') {
            capturedResponse = response;
            console.log('--- BACKEND RESPONSE ---');
            console.log('Status:', response.status());
            responseBody = await response.text();
            console.log('Response Body:', responseBody);
        }
    });

    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Register or login first? The easiest way is to mock localStorage with a valid token, or just register via the backend API using page.evaluate
    await page.evaluate(async () => {
        try {
            const res = await fetch('http://localhost:8000/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'testuser_' + Date.now(), password: 'password123', name: 'Test User' })
            });
            const data = await res.json();
            if (data.access_token) {
                localStorage.setItem('apex_token', data.access_token);
                localStorage.setItem('apex_user', JSON.stringify(data));
            }
        } catch (e) { console.error(e); }
    });
    
    await page.reload();
    await page.waitForTimeout(1000);

    // If it auto-navigated to dashboard, switch back to Import Data
    const uploadTab = page.locator('button[title="Import Data"]');
    if (await uploadTab.isVisible()) {
        await uploadTab.click();
        await page.waitForTimeout(1000);
    }
    
    // Attach file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#stmt-input').evaluate(node => node.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('dummy.jpg');
    
    // Wait for response
    await page.waitForTimeout(3000);
});
