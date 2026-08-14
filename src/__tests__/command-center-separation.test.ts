// The Command Center is a separate portal, and the separation is asymmetric.
//
// It used to be a page of the studio app: /platform under the `(chrome)` route
// group, rendered inside the studio's own sidebar and bottom nav, reached with
// the studio's own session, divided from the customer's product by a role
// comparison in Guard. One forgotten `role ===` anywhere in that shared shell
// and a tenant admin is looking at platform furniture.
//
// It is now its own portal — own route group, own shell, own sign-in door, own
// hostname — and these tests pin the three rules that make that true rather
// than decorative:
//
//   1. Roles and pages each belong to exactly one portal.
//   2. The gate between portals is one-directional.
//   3. In production the console is not SERVED on the studio's hostname.
//
// The server enforces all of this independently (see the backend's
// middleware/platformAuth.js). Nothing here is the only thing standing between
// a tenant and the control plane — but a bug in any of it puts a studio user
// in front of a console they should never see the frame of.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  portalForRole, portalForPage, homeFor, mayEnterPortal, postSignInPath,
  isPlatformAppPage, isMemberAppPage, type Portal,
} from '@/lib/portals';
import { signInPathFor } from '@/lib/public-paths';
import { isCommandCenterPath, isHostNeutralPath, isPublicProxyPath } from '@/proxy';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const STUDIO_ROLES = ['admin', 'manager', 'trainer', 'reception', 'receptionist', 'staff'];

describe('every role belongs to exactly one portal', () => {
  it('puts the platform operator in the platform portal', () => {
    expect(portalForRole('super_admin')).toBe('platform');
  });

  it('leaves every studio role on the staff side', () => {
    for (const role of STUDIO_ROLES) {
      expect([role, portalForRole(role)]).toEqual([role, 'staff']);
    }
  });

  it('defaults an unknown or absent role to staff, never to platform', () => {
    // The direction a mistake must fall. A role added tomorrow lands in the
    // studio app; nothing but the literal string 'super_admin' reaches the
    // control plane.
    expect(portalForRole('some_future_role')).toBe('staff');
    expect(portalForRole(null)).toBe('staff');
    expect(portalForRole(undefined)).toBe('staff');
  });
});

describe('every page belongs to exactly one portal', () => {
  it('classifies the console', () => {
    expect(portalForPage('/platform')).toBe('platform');
    expect(portalForPage('/platform/anything')).toBe('platform');
  });

  it('does not swallow the sign-in door that guards it', () => {
    // '/platform-login'.startsWith('/platform') is true. Folding the door into
    // the app behind it would make signing in require being signed in.
    expect(isPlatformAppPage('/platform-login')).toBe(false);
    expect(portalForPage('/platform-login')).toBe('staff');
  });

  it('does not swallow an unrelated page that shares the prefix', () => {
    expect(isPlatformAppPage('/platforms')).toBe(false);
  });

  it('leaves the member app and the studio app where they were', () => {
    expect(portalForPage('/member/dashboard')).toBe('member');
    expect(portalForPage('/pt-os/clients')).toBe('staff');
    expect(portalForPage('/')).toBe('staff');
    expect(isMemberAppPage('/member-login')).toBe(false);
  });
});

describe('the gate between portals is one-directional', () => {
  it('lets the operator walk into a studio', () => {
    // The support job. They arrive by impersonation (which mints a studio
    // session and writes an audit row) or with the org-switcher pinned to one
    // tenant, and the server scopes them either way.
    expect(mayEnterPortal('platform', 'staff')).toBe(true);
  });

  it('refuses every studio account at the Command Center', () => {
    expect(mayEnterPortal('staff', 'platform')).toBe(false);
    expect(mayEnterPortal('member', 'platform')).toBe(false);
  });

  it('keeps clients and staff out of each other', () => {
    expect(mayEnterPortal('member', 'staff')).toBe(false);
    expect(mayEnterPortal('staff', 'member')).toBe(false);
  });

  it('does not let the operator into the member app either', () => {
    // The exception is the studio app specifically, not "the operator may go
    // anywhere". A client's own portal is not a support surface.
    expect(mayEnterPortal('platform', 'member')).toBe(false);
  });

  it('is reflexive, so nobody is locked out of their own portal', () => {
    for (const p of ['staff', 'member', 'platform'] as Portal[]) {
      expect([p, mayEnterPortal(p, p)]).toEqual([p, true]);
    }
  });
});

describe('a lapsed session comes back to the right door', () => {
  it('sends the operator to the Command Center sign-in', () => {
    // Not /login: that mints a STUDIO session, which the control plane now
    // refuses — so the operator would sign in successfully and still be
    // locked out, with nothing on screen explaining why.
    expect(signInPathFor('/platform')).toBe('/platform-login');
    expect(signInPathFor('/platform-login')).toBe('/platform-login');
  });

  it('still routes the other two doors as it did', () => {
    expect(signInPathFor('/member/dashboard')).toBe('/member-login');
    expect(signInPathFor('/pt-os/clients')).toBe('/login');
    expect(signInPathFor('/login')).toBe('/login');
  });

  it('sends each portal home to its own home', () => {
    expect(homeFor('platform')).toBe('/platform');
    expect(homeFor('member')).toBe('/member/dashboard');
    expect(homeFor('staff')).toBe('/');
  });
});

describe('host isolation at the edge', () => {
  it('counts the console and its door as Command Center paths', () => {
    expect(isCommandCenterPath('/platform')).toBe(true);
    expect(isCommandCenterPath('/platform/finance')).toBe(true);
    expect(isCommandCenterPath('/platform-login')).toBe(true);
  });

  it('counts studio pages as not-Command-Center, so they 404 on that host', () => {
    // The rule runs both ways. The operator's hostname must not quietly become
    // a second front door to the customer app — that would put the studio
    // login on a host none of its cookie, CORS or CSP config expects.
    for (const p of ['/', '/login', '/pt-os/clients', '/member/dashboard', '/start-free']) {
      expect([p, isCommandCenterPath(p)]).toEqual([p, false]);
    }
  });

  it('exempts the shared assets both sites need', () => {
    // The proxy matcher lets .js and .json through, so these reach the host
    // rule. Without the exemption the console would 404 its own theme script
    // and flash the wrong theme on every load — a symptom a long way from
    // anything that would make somebody suspect a hostname check.
    for (const p of ['/_next/static/chunk.js', '/theme-init.js', '/no-zoom.js', '/manifest.json', '/icons/icon.png', '/api/auth/me']) {
      expect([p, isHostNeutralPath(p)]).toEqual([p, true]);
    }
  });

  it('does not exempt pages, which is what the rule exists to separate', () => {
    // If the neutral list reused PUBLIC_PREFIXES it would exempt /login and
    // /start-free too, and the studio's sign-in would answer on the operator's
    // domain.
    for (const p of ['/login', '/platform', '/start-free', '/']) {
      expect([p, isHostNeutralPath(p)]).toEqual([p, false]);
    }
  });
});

describe('the impersonation hand-off across origins', () => {
  // sessionStorage is scoped to an origin. Once the console and the studio app
  // are on different hostnames, a token written by the console is simply not
  // there when the studio app looks — the operator would land on a studio home
  // as themselves, get a 403 on every panel, and see nothing explaining why.
  //
  // So the console passes it in the URL fragment, which is never sent to a
  // server: not to nginx's access log, not to Next.js, not in a Referer. That
  // is the only reason a live access token may travel this way at all.

  const IMP = {
    token: 'imp-token-abc', readonly: true,
    adminId: 'usr-1', adminName: 'Studio Owner',
    orgId: 'org-1', orgName: 'A Studio',
    returnTo: 'https://admin.example.com/platform',
  };

  const load = async () => {
    vi.resetModules();
    return import('@/lib/http');
  };

  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('round-trips through the fragment', async () => {
    const { encodeImpersonationHandoff, getImpersonation } = await load();
    window.history.replaceState(null, '', `/#imp=${encodeImpersonationHandoff(IMP)}`);
    expect(getImpersonation()).toEqual(IMP);
  });

  it('carries the way back, so the operator is not stranded in a studio', async () => {
    const { encodeImpersonationHandoff, getImpersonation } = await load();
    window.history.replaceState(null, '', `/#imp=${encodeImpersonationHandoff(IMP)}`);
    expect(getImpersonation()?.returnTo).toBe('https://admin.example.com/platform');
  });

  it('strips the token out of the address bar once consumed', async () => {
    // Otherwise it sits in the URL, in back/forward history, and in whatever
    // the operator pastes into a support ticket next.
    const { encodeImpersonationHandoff, getImpersonation } = await load();
    window.history.replaceState(null, '', `/dashboard?a=1#imp=${encodeImpersonationHandoff(IMP)}`);
    getImpersonation();
    expect(window.location.hash).toBe('');
    expect(window.location.pathname + window.location.search).toBe('/dashboard?a=1');
  });

  it('persists it, so the next reader does not need the fragment', async () => {
    const { encodeImpersonationHandoff, getImpersonation } = await load();
    window.history.replaceState(null, '', `/#imp=${encodeImpersonationHandoff(IMP)}`);
    getImpersonation();
    expect(getImpersonation()).toEqual(IMP);
  });

  it('prefers an existing session over a fragment', async () => {
    // A stored impersonation is the live one. A fragment arriving on top of it
    // — a stale link, a back-button — must not replace it.
    const { encodeImpersonationHandoff, getImpersonation, setImpersonation } = await load();
    setImpersonation({ ...IMP, orgId: 'org-live', token: 'live' });
    window.history.replaceState(null, '', `/#imp=${encodeImpersonationHandoff(IMP)}`);
    expect(getImpersonation()?.orgId).toBe('org-live');
  });

  it('drops a malformed payload rather than storing it', async () => {
    // The fragment is attacker-controllable: anybody can send the operator a
    // link. Nothing here can GRANT access — the API only honours tokens it
    // signed itself — but a half-parsed object must not become the session.
    const { getImpersonation } = await load();
    for (const junk of ['not-base64!!', btoa('{"token":123}'), btoa('nonsense'), btoa('{}')]) {
      sessionStorage.clear();
      window.history.replaceState(null, '', `/#imp=${junk}`);
      expect([junk, getImpersonation()]).toEqual([junk, null]);
    }
  });

  it('ignores a fragment that is not a hand-off', async () => {
    const { getImpersonation } = await load();
    window.history.replaceState(null, '', '/#section=billing');
    expect(getImpersonation()).toBeNull();
    expect(window.location.hash).toBe('#section=billing');
  });
});

describe('where signing in lands you', () => {
  // The regression this exists for: an operator signed in at the Command
  // Center's own door and arrived in the studio app.
  //
  // SignInScreen routed with an inline role ladder that had no super_admin
  // case, so the operator fell through its `else` to /pt-os. It was invisible
  // while the studio dashboard bounced super_admins to /platform — and removing
  // that redirect (it 404s once the console has its own hostname) left no path
  // to the console at all.
  //
  // These call the function. The old behaviour could only be checked by
  // matching the component's source, which is exactly how a routing table with
  // a missing branch passed review twice.

  it('sends the platform operator to the Command Center', () => {
    expect(postSignInPath('super_admin')).toBe('/platform');
  });

  it('never sends the operator into the studio app', () => {
    // Stated separately from the line above because this is the property that
    // actually broke, and it stays true even if the console moves.
    expect(postSignInPath('super_admin')).not.toBe('/pt-os');
    expect(postSignInPath('super_admin')).not.toBe('/');
  });

  it('sends a client to the member app', () => {
    expect(postSignInPath('member')).toBe('/member/dashboard');
  });

  it('leaves every studio role exactly where it was', () => {
    // This change was allowed to move the operator and nobody else.
    expect(postSignInPath('trainer')).toBe('/trainer/dashboard');
    for (const role of ['admin', 'manager', 'reception', 'receptionist', 'staff']) {
      expect([role, postSignInPath(role)]).toEqual([role, '/pt-os']);
    }
  });

  it('lands every role inside the portal it belongs to', () => {
    // The invariant behind all of the above: whatever destination is chosen, a
    // person must not be dropped into a portal their account cannot enter.
    // Without this, adding a role and forgetting its destination sends them to
    // a page Guard immediately bounces them off.
    for (const role of ['super_admin', 'admin', 'manager', 'trainer', 'reception', 'staff', 'member']) {
      const dest = postSignInPath(role);
      const userPortal = portalForRole(role);
      expect([role, dest, mayEnterPortal(userPortal, portalForPage(dest))])
        .toEqual([role, dest, true]);
    }
  });
});

describe('the two installable apps', () => {
  // Installing /platform to a home screen produced an icon that opened the
  // STUDIO app. Browsers ignore the page you installed from and honour the
  // manifest's start_url, and the only manifest on the origin said "/".
  //
  // These parse the real files rather than asserting on the layouts' source,
  // for the same reason the sign-in tests post real requests: a source match
  // cannot tell a declared manifest from a served one.
  const read = (p: string) =>
    JSON.parse(readFileSync(join(process.cwd(), 'public', p), 'utf8'));
  const studio = read('manifest.json');
  const console_ = read('platform-manifest.json');

  it('opens the console at the console', () => {
    expect(console_.start_url).toBe('/platform');
    expect(portalForPage(console_.start_url)).toBe('platform');
  });

  it('leaves the studio app opening where it did', () => {
    expect(studio.start_url).toBe('/');
    expect(portalForPage(studio.start_url)).toBe('staff');
  });

  it('keeps the two installs distinct', () => {
    // Same origin, so start_url and id are what stop a browser treating them
    // as one app and replacing the other's icon.
    expect(console_.start_url).not.toBe(studio.start_url);
    expect(console_.id).toBe('/platform');
    // Deliberately absent on the studio manifest: adding an id to a manifest
    // whose app is already installed can orphan that install.
    expect(studio.id).toBeUndefined();
  });

  it('names them differently, since they share an icon', () => {
    expect(console_.short_name).not.toBe(studio.short_name);
  });

  it('points only at icons that exist', () => {
    for (const m of [studio, console_]) {
      for (const icon of m.icons) {
        expect([icon.src, existsSync(join(process.cwd(), 'public', icon.src))])
          .toEqual([icon.src, true]);
      }
    }
  });

  it('serves the console manifest without a session', () => {
    // It is fetched by the browser before anyone signs in. Left out of the
    // proxy's public list it 307s to /login, never parses, and "Add to Home
    // Screen" silently falls back to the page URL — the original bug, one
    // layer down. Found by requesting it, not by reading the list.
    expect(isPublicProxyPath('/platform-manifest.json')).toBe(true);
  });

  it('serves the console manifest on the Command Center host', () => {
    // isCommandCenterPath does not match it, so without a host-neutral
    // exemption the host rule 404s the console's own manifest on the console's
    // own hostname.
    expect(isHostNeutralPath('/platform-manifest.json')).toBe(true);
  });
});
