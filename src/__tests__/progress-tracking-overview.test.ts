// /pt-os/progress-tracking-setup is a read-only baseline-completion
// dashboard: it fetches five record sets for a client, shows a completion
// donut and "Smart Alerts" for what's missing, and links out to the five
// real entry points. It has never let anyone log or configure anything.
//
// Found in a static audit of the Screening sidebar section wearing FOUR
// different names across the app at once: the sidebar called it "Progress
// Tracking Session" (implies a data-entry screen), the page's own client
// picker agreed with the sidebar, its loaded-view eyebrow said "Progress
// Tracking Setup" instead, and a link to it from a client's profile called it
// "Progress tracking setup" with the hint "Choose what to measure" — a
// configuration option that does not exist anywhere on the page.
//
// The fix is not new functionality, it's one true name used everywhere the
// page is named or linked to, chosen to say what the page actually is: a
// status overview, not a session or a setup wizard.

import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {NAV_GROUPS} from '@/lib/nav-config';
import {srcPath} from '@/__tests__/helpers/app-routes';

const src = (...p: string[]) => readFileSync(srcPath(...p), 'utf8');

describe('Progress Tracking Overview is named consistently everywhere', () => {
  const screening = NAV_GROUPS.find((g) => g.id === 'progress-tracking')!;
  const page = src('app', 'pt-os', 'progress-tracking-setup', 'page.tsx');
  const clientDetail = src('app', 'pt-os', 'clients', '[id]', 'page.tsx');

  it('the sidebar no longer calls it a session', () => {
    const item = screening.items.find((i) => i.href === '/pt-os/progress-tracking-setup');
    expect(item?.label).toBe('Progress Tracking Overview');
  });

  it('the client picker matches the sidebar', () => {
    expect(page).toContain('title="Progress Tracking Overview"');
  });

  it('the loaded dashboard\'s eyebrow matches too', () => {
    expect(page).toContain('>Progress Tracking Overview<');
  });

  it('nothing on the page still calls it a Session or a Setup', () => {
    expect(page).not.toContain('Progress Tracking Session');
    expect(page).not.toMatch(/>Progress Tracking Setup</);
  });

  it('is no longer linked from a client\'s profile, which now goes straight to Measurements', () => {
    // The Measurements tab used to open a panel of three links — Measurements,
    // Record a fitness test, and this one. The tab goes straight to
    // Measurements now, so the panel and its links are gone.
    //
    // The naming assertions above still carry this screen: they are about the
    // page, the nav entry and the heading, none of which moved. What this one
    // guards is only that the profile does not resurrect a link the tab
    // replaced.
    expect(clientDetail).not.toContain("label: 'Progress tracking overview'");
    expect(clientDetail).not.toContain('Choose what to measure');
  });
});
