// There is one way to check a member in, and this is what holds it to one.
//
// The app had four: /checkin/qr-scanner and /checkin/kiosk (identical QR scans
// against the same endpoint, differing only in chrome), /checkin/mark (an
// orphan GPS + fingerprint route reachable only by typing the URL), and a
// fingerprint / member-code panel on the Attendance Records page. All four
// wrote the same attendance_logs rows, so a studio could produce the same
// check-in by four routes and reconcile the difference by hand.
//
// These are cheap structural assertions on purpose: the failure mode here is
// not a subtle bug, it is someone adding a second check-in screen back without
// noticing there already is one.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { NAV_GROUPS, QUICK_ACTIONS } from '@/lib/nav-config';

const APP = join(process.cwd(), 'src/app');

/** Every href in the nav tree, groups and quick actions alike. */
function allHrefs(): string[] {
  const fromGroups = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
  return [...fromGroups, ...QUICK_ACTIONS.map((q) => q.href)];
}

describe('there is exactly one check-in system', () => {
  it('ships exactly one route under /checkin that checks anyone in', () => {
    // /checkin/dashboard is read-only stats, not a way in — hence the filter.
    const routes = readdirSync(APP + '/checkin', { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => name !== 'dashboard');
    expect(routes).toEqual(['qr-scanner']);
  });

  it('has no nav entry pointing at a removed check-in route', () => {
    const dead = allHrefs().filter((h) => h === '/checkin/kiosk' || h === '/checkin/mark');
    expect(dead).toEqual([]);
  });

  it('every /checkin nav entry resolves to a page that exists', () => {
    // A nav item outliving its route is exactly how a tile starts 404ing while
    // still looking perfectly healthy in the sidebar.
    const missing = allHrefs()
      .filter((h) => h.startsWith('/checkin'))
      .filter((h) => !existsSync(join(APP, h, 'page.tsx')));
    expect(missing).toEqual([]);
  });

  it('nothing calls a check-in endpoint other than the QR scan', () => {
    // The removed screens posted to /api/biometric-attend/mark and
    // /api/attendance/biometric, and identified the member through the member
    // WebAuthn routes at /api/webauthn/*. All three are gone from the backend;
    // a caller left behind would fail at runtime, not at build time. This is
    // what found the six Next API proxy routes under src/app/api that the
    // grep for `api.biometricAttend` did not.
    //
    // '/api/auth/webauthn' — staff passkey *login* — does not contain
    // '/api/webauthn' as a substring, so it is untouched by this check, which
    // is deliberate: it is a different system and it stays.
    const dead = ['/api/biometric-attend', '/api/attendance/biometric', '/api/webauthn'];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '__tests__') walk(full);
        } else if (/\.tsx?$/.test(entry.name)) {
          const src = readFileSync(full, 'utf8');
          if (dead.some((path) => src.includes(path))) {
            offenders.push(full.replace(process.cwd() + '/', ''));
          }
        }
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(offenders).toEqual([]);
  });
});
