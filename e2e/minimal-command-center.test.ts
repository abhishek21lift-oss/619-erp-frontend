import { test, expect } from '@playwright/test';

// Simple test to verify the Command Center loads and shows the header.
// This test will be used to trigger the webServer and capture screenshots.

test('Command Center loads', async ({ page }) => {
  // The webServer in playwright.config.ts will start Next.js on http://127.0.0.1:3101
  const baseURL = 'http://127.0.0.1:3101';
  // Navigate to the Command Center page
  await page.goto(`${baseURL}/platform?tab=health`);
  // Wait for the page to load (spinner disappears)
  await page.waitForSelector('[data-test-id="command-center-root"]', { timeout: 20000 });
  // Verify the header is present
  const header = await page.locator('[data-testid="command-center-header"]');
  await expect(header).toBeVisible({ timeout: 10000 });
  // Take a screenshot for visual verification (will be captured by Playwright artifacts)
  await page.screenshot({ path: `e2e/screenshots/command-center-load.png`, fullPage: true });
});
