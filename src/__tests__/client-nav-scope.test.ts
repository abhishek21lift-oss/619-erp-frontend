// What a logged-in client is offered in the navigation.
//
// `isGroupVisibleForRole` defaulted to "an untagged group is for everyone",
// which was true for as long as every account in the system belonged to the
// studio. Client logins end that. Without a rule for `member`, a client's
// sidebar lists Finance and Insights.
//
// The API refuses all of those (requireTrainer, backend), so nothing leaks — but
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

  it('shares nothing with the trainer unless a group is tagged for both', () => {
    // Written as an overlap rule rather than "the client set is a subset of
    // the trainer set", which is false: the client's own group is tagged
    // `['member']`, so the trainer does not see it either. The two navs are
    // near-disjoint by design, and the property worth pinning is that anything
    // in BOTH was deliberately tagged for both.
    const client = visibleTo('member');
    const trainer = new Set(visibleTo('trainer'));
    for (const id of client.filter((g) => trainer.has(g))) {
      const roles = NAV_GROUPS.find((g) => g.id === id)!.roles ?? [];
      expect([id, roles.includes('member') && roles.includes('trainer')]).toEqual([id, true]);
    }
    expect(client.length).toBeLessThan(trainer.size);
  });
});

describe('the studio nav is the trainer\'s', () => {
  it('has no control-plane group left in the studio nav at all', () => {
    // The Command Center is its own portal: its own route group, shell,
    // sign-in door and hostname. There is no platform group here for anyone.
    expect(NAV_GROUPS.map((g) => g.id)).not.toContain('platform');
    for (const role of ['super_admin', 'trainer', 'member']) {
      expect(visibleTo(role)).not.toContain('platform');
    }
  });

  it('gives the trainer the studio nav', () => {
    expect(visibleTo('trainer').length).toBeGreaterThan(5);
  });

  it('gives the platform operator no studio nav — they are never in the studio app as themselves', () => {
    // It used to mirror the studio owner's nav, because the operator walked
    // into studios with an org-switcher. Impersonation now makes them the
    // studio's trainer for the session, so their own role sees nothing here.
    expect(visibleTo('super_admin')).toEqual([]);
  });

  it('gives a retired staff role nothing at all', () => {
    // No alias table: admin / manager / reception are not roles any more, so
    // they do not "become" the trainer and inherit the whole studio nav.
    for (const role of ['admin', 'manager', 'reception', 'receptionist', 'staff', '']) {
      expect(visibleTo(role), role).toEqual([]);
    }
  });

  it('shows an untagged group to the trainer and to nobody else', () => {
    const untagged = NAV_GROUPS.find((g) => !g.roles?.length);
    expect(untagged).toBeTruthy();
    expect(isGroupVisibleForRole(untagged!, 'trainer')).toBe(true);
    expect(isGroupVisibleForRole(untagged!, 'member')).toBe(false);
    expect(isGroupVisibleForRole(untagged!, 'super_admin')).toBe(false);
  });
});
