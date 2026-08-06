// What a logged-in client is offered in the navigation.
//
// `isGroupVisibleForRole` defaulted to "an untagged group is for everyone",
// which was true for as long as every account in the system belonged to studio
// staff. Client logins end that. Without a rule for `member`, a client's
// sidebar lists Finance, Trainer Management and Insights.
//
// The API refuses all of those (requireStaff, backend), so nothing leaks — but
// a nav full of doors that answer 403 is its own kind of broken, and it hands
// a client a map of exactly what to go probing at. These tests pin the rule
// from the other side.
import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, isGroupVisibleForRole } from '@/lib/nav-config';

const visibleTo = (role: string) =>
  NAV_GROUPS.filter((g) => isGroupVisibleForRole(g, role)).map((g) => g.id);

describe('a client sees only their own surfaces', () => {
  it('gets nothing that is not explicitly tagged for them', () => {
    for (const id of visibleTo('member')) {
      const group = NAV_GROUPS.find((g) => g.id === id)!;
      expect([id, group.roles?.includes('member')]).toEqual([id, true]);
    }
  });

  it('does get something — the rule must not be an accidental blanket deny', () => {
    // A client with an empty sidebar is as broken as one with the studio's.
    // This is the half of the assertion that stops the fix overshooting.
    expect(visibleTo('member').length).toBeGreaterThan(0);
    expect(visibleTo('member')).toContain('my-account');
  });

  it('is offered none of the back office', () => {
    const seen = visibleTo('member');
    for (const id of ['finance', 'trainer-management', 'insights', 'platform', 'subscription']) {
      expect([id, seen.includes(id)]).toEqual([id, false]);
    }
  });

  it('shares nothing with a studio admin unless a group is tagged for both', () => {
    // Written as an overlap rule rather than "the client set is a subset of
    // the admin set", which was the first attempt here and is false: the
    // client's own group is tagged `['member']`, so an admin does not see it
    // either. The two navs are near-disjoint by design, and the property
    // worth pinning is that anything in BOTH was deliberately tagged for
    // both — not that one contains the other.
    const client = visibleTo('member');
    const admin = new Set(visibleTo('admin'));
    for (const id of client.filter((g) => admin.has(g))) {
      const roles = NAV_GROUPS.find((g) => g.id === id)!.roles ?? [];
      expect([id, roles.includes('member') && roles.includes('admin')]).toEqual([id, true]);
    }
    expect(client.length).toBeLessThan(admin.size);
  });
});

describe('the other roles are unchanged', () => {
  it('still gives a platform operator only the control plane', () => {
    expect(visibleTo('super_admin')).toEqual(['platform']);
  });

  it('still gives a studio admin the studio nav and not the control plane', () => {
    const admin = visibleTo('admin');
    expect(admin).not.toContain('platform');
    expect(admin.length).toBeGreaterThan(5);
  });

  it('still shows an untagged group to staff', () => {
    // The default this change did NOT touch. A group with no `roles` is for
    // every staff role, and only the two explicitly-scoped roles opt out.
    const untagged = NAV_GROUPS.find((g) => !g.roles?.length);
    expect(untagged).toBeTruthy();
    expect(isGroupVisibleForRole(untagged!, 'trainer')).toBe(true);
    expect(isGroupVisibleForRole(untagged!, 'member')).toBe(false);
    expect(isGroupVisibleForRole(untagged!, 'super_admin')).toBe(false);
  });
});
