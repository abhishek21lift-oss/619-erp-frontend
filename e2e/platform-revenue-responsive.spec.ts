import { test, expect } from '@playwright/test';
import { PLATFORM_STORAGE_STATE } from './helpers/session';

/**
 * Revenue console — horizontal-overflow guard.
 *
 * The visual-polish spec takes screenshots but asserts nothing about width, so
 * a card that pushed the page sideways at 320px would still produce a green
 * run and a PNG nobody diffs. This checks the property that actually breaks on
 * a phone: the document must not scroll horizontally on any Revenue surface.
 *
 * Tables and tab rows are allowed to scroll INSIDE their own `overflow-x-auto`
 * box; that is intentional. What is forbidden is the page itself growing wider
 * than the viewport, which is what makes a phone pan the whole layout.
 *
 * Widths match the brief: 320, 375, 390, 430, 768, 1024, 1440, 1920.
 */

const VIEWPORTS = [
  { width: 320, height: 720 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const SURFACES = [
  '/platform?tab=finance',
  '/platform?tab=finance&sub=payments',
  '/platform?tab=finance&sub=invoices',
  '/platform?tab=finance&sub=coupons',
  '/platform?tab=analytics',
];

test.use({ storageState: PLATFORM_STORAGE_STATE });

test.describe('Command Center revenue – no horizontal page scroll', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const vp of VIEWPORTS) {
    test(`${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);

      for (const surface of SURFACES) {
        await page.goto(surface, { waitUntil: 'domcontentloaded' });
        // The revenue sub-navigation is the last thing that appears once the
        // route and its shell have settled; waiting on it avoids measuring a
        // loading skeleton.
        await page.getByRole('group', { name: 'Revenue views' }).waitFor({
          state: 'visible', timeout: 45_000,
        });

        const widths = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          viewport: Math.max(document.documentElement.clientWidth, window.innerWidth),
        }));

        expect(
          Math.max(widths.document, widths.body),
          `${surface} overflows at ${vp.width}px (document ${widths.document}, body ${widths.body}, viewport ${widths.viewport})`,
        ).toBeLessThanOrEqual(widths.viewport + 1);
      }
    });
  }
});
