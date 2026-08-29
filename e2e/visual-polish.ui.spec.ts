import { test, expect } from '@playwright/test';

// Viewport list (width × height) as required by the prompt
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 375, height: 812 },
];

test.describe('Command Center visual polish – screenshots', () => {
  for (const vp of viewports) {
    test(`screenshot @ ${vp.width}x${vp.height}`, { timeout: 60_000 }, async ({ page }) => {
      // Set viewport size
      page.setViewportSize({ width: vp.width, height: vp.height });
      // Navigate to the Command Center page
      await page.goto('/platform?tab=health', { waitUntil: 'networkidle', timeout: 60000 });
          // Ensure all network requests have settled before screenshot
          await page.waitForLoadState('networkidle');
      // Wait for the Command Center root to appear (spinner gone)
      await page.waitForSelector('[data-test-id="command-center-root"]', { timeout: 30_000 });
      // Capture a clean screenshot of the viewport.
      await page.screenshot({ path: `e2e/screenshots/command-center-${vp.width}x${vp.height}.png`, fullPage: true });
    });
  }
});