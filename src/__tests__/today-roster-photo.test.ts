// The Today roster shows the client's face on every row.
//
// This screen was the ONE place in the app that withheld a photo it already
// had: rest-day rows passed photoUrl={null} so the tile could render a moon
// instead. On any given weekday most of the roster is rest days, so the screen
// a trainer opens on the gym floor was a column of identical grey moons — the
// one thing that tells two rows apart at a glance had been removed from
// exactly the rows that needed it most.
//
// Guarded at the source rather than through a render, for the same reason the
// backend's clientPhoto.exposure.test.js is: the failure is a prop quietly
// going back to null, nothing throws, and the screen still looks deliberate.
// The API already returns client_photo — see workout-log.routes.js — so there
// is no server-side half to keep in step.

import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {appPath} from '@/__tests__/helpers/app-routes';

const page = readFileSync(
  appPath('pt-os', 'today', 'page.tsx'),
  'utf8',
);

describe('Today roster avatars', () => {
  it('passes the photo through unconditionally', () => {
    expect(page).toContain('photoUrl={c.client_photo}');
  });

  it('does not blank the photo for a rest day', () => {
    // The exact shape of the old bug. Written as a regex rather than a literal
    // so a reformat cannot smuggle it back past the assertion.
    expect(page).not.toMatch(/photoUrl=\{[^}]*is_rest_day[^}]*\}/);
  });

  it('still marks a rest day, just not by spending the whole tile on it', () => {
    // Removing the moon entirely would trade one lost signal for another —
    // "nothing scheduled" has to stay visible at a glance.
    expect(page).toMatch(/is_rest_day\s*&&/);
    expect(page).toContain('<Moon');
  });

  it('keeps initials as the fallback when a client has no photo', () => {
    // Not every client has uploaded one. The tile must still say who the row
    // is about rather than going blank.
    expect(page).toContain('initials(c.client_name)');
  });
});
