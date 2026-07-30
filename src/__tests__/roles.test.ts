import { describe, it, expect } from 'vitest';
import {
  ROLES, normaliseRole, hasRole, isAdminOrManager,
  ROLE_LABELS, roleLabel, ASSIGNABLE_ROLES,
} from '@/lib/roles';

describe('roles', () => {
  it('ROLES contains the canonical role list', () => {
    expect(ROLES).toContain('admin');
    expect(ROLES).toContain('manager');
    expect(ROLES).toContain('reception');
    expect(ROLES).toContain('receptionist');
    expect(ROLES).toContain('trainer');
    expect(ROLES).toContain('member');
  });

  describe('normaliseRole', () => {
    it('maps receptionist to reception', () => {
      expect(normaliseRole('receptionist')).toBe('reception');
    });
    it('leaves reception unchanged', () => {
      expect(normaliseRole('reception')).toBe('reception');
    });
    it('passes through admin/manager/trainer/member/staff', () => {
      expect(normaliseRole('admin')).toBe('admin');
      expect(normaliseRole('manager')).toBe('manager');
      expect(normaliseRole('trainer')).toBe('trainer');
      expect(normaliseRole('member')).toBe('member');
      expect(normaliseRole('staff')).toBe('staff');
    });
    it('returns undefined for null/undefined/empty', () => {
      expect(normaliseRole(undefined)).toBeUndefined();
      expect(normaliseRole(null)).toBeUndefined();
      expect(normaliseRole('')).toBeUndefined();
    });
    it('passes through unknown roles unchanged', () => {
      expect(normaliseRole('hr')).toBe('hr');
      expect(normaliseRole('accountant')).toBe('accountant');
    });
  });

  describe('hasRole', () => {
    it('admin satisfies any TENANT role requirement', () => {
      expect(hasRole('admin', 'member')).toBe(true);
      expect(hasRole('admin', ['trainer', 'reception'])).toBe(true);
    });

    it('admin does NOT satisfy a super_admin gate', () => {
      // The security property this whole function exists for. A tenant admin
      // is a superuser inside their own workspace but is not the platform
      // operator, so it must never clear a platform-only gate. This test
      // previously asserted the opposite ("admin always passes regardless")
      // and failed for months — anyone who had "fixed" the code to make it
      // pass would have opened a privilege-escalation path.
      expect(hasRole('admin', 'super_admin')).toBe(false);
      expect(hasRole('admin', ['super_admin'])).toBe(false);
      expect(hasRole('admin', ['super_admin', 'manager'])).toBe(false);
      // super_admin itself clears everything.
      expect(hasRole('super_admin', 'super_admin')).toBe(true);
      expect(hasRole('super_admin', 'member')).toBe(true);
    });

    it('returns false when no role is required — callers must skip the check', () => {
      // Not "open to anyone": undefined means "no constraint expressed", and
      // this function answers a narrower question ("does this role satisfy
      // that requirement?") which is unanswerable without a requirement.
      // Guard.tsx relies on exactly this and skips calling hasRole at all
      // when neither `role` nor `roles` was passed.
      expect(hasRole('member', undefined)).toBe(false);
      expect(hasRole('admin', undefined)).toBe(false);
      expect(hasRole(undefined, undefined)).toBe(false);
    });
    it('matches single required role', () => {
      expect(hasRole('manager', 'manager')).toBe(true);
      expect(hasRole('admin', 'manager')).toBe(true);
      expect(hasRole('trainer', 'manager')).toBe(false);
    });
    it('matches any of multiple required roles', () => {
      expect(hasRole('manager', ['admin', 'manager'])).toBe(true);
      expect(hasRole('reception', ['admin', 'manager', 'reception'])).toBe(true);
      expect(hasRole('trainer', ['admin', 'manager', 'reception'])).toBe(false);
    });
    it('normalises the user role before matching', () => {
      expect(hasRole('receptionist', 'reception')).toBe(true);
      expect(hasRole('receptionist', ['admin', 'reception'])).toBe(true);
    });
    it('returns false for missing user role when required is set', () => {
      expect(hasRole(undefined, 'admin')).toBe(false);
      expect(hasRole(null, ['admin', 'manager'])).toBe(false);
    });
  });

  describe('isAdminOrManager', () => {
    it('is true for admin and manager', () => {
      expect(isAdminOrManager('admin')).toBe(true);
      expect(isAdminOrManager('manager')).toBe(true);
    });
    it('is false for other roles', () => {
      expect(isAdminOrManager('trainer')).toBe(false);
      expect(isAdminOrManager('reception')).toBe(false);
      expect(isAdminOrManager('receptionist')).toBe(false);
      expect(isAdminOrManager('member')).toBe(false);
      expect(isAdminOrManager('staff')).toBe(false);
    });
    it('is false for nullish', () => {
      expect(isAdminOrManager(undefined)).toBe(false);
      expect(isAdminOrManager(null)).toBe(false);
    });
  });

  // ── Labels ────────────────────────────────────────────────────────────────
  //
  // The product is sold to individual personal trainers, so the operator reads
  // "Admin" and the studio owner reads "Trainer". The identifiers underneath
  // are unchanged, and the hasRole suite above is what proves it: if renaming
  // had touched a gate, those tests would fail, not these.

  describe('labels', () => {
    it('names the two roles that exist', () => {
      expect(roleLabel('super_admin')).toBe('Admin');
      expect(roleLabel('admin')).toBe('Trainer');
    });

    it('gives every role a label, so none can reach the UI as an identifier', () => {
      for (const role of ROLES) {
        expect(ROLE_LABELS[role], `${role} has no label`).toBeTruthy();
        // Identifiers are snake_case; a label that still contains an
        // underscore is an identifier that escaped, which is the exact bug
        // this map exists to prevent — the AppShell badge used to render
        // `user.role` raw and read "super_admin" on every page.
        expect(ROLE_LABELS[role], `${role}'s label looks like an identifier`)
          .not.toMatch(/_/);
      }
    });

    it('resolves the receptionist alias before labelling', () => {
      // Otherwise the same person reads differently depending on which spelling
      // the row happens to carry.
      expect(roleLabel('receptionist')).toBe(roleLabel('reception'));
    });

    it('falls back to the raw value rather than inventing one', () => {
      // Seeing an unknown role is how anyone finds out it exists. A friendly
      // placeholder would hide it.
      expect(roleLabel('accountant')).toBe('accountant');
      expect(roleLabel('')).toBe('');
      expect(roleLabel(null)).toBe('');
      expect(roleLabel(undefined)).toBe('');
    });

    it('keeps "Trainer" meaning exactly one thing', () => {
      // There is also a `trainer` LOGIN ROLE (no accounts, still in the gates)
      // and a `trainers` TABLE of staff records. If the old role were also
      // labelled "Trainer", two different permission levels would share a word
      // in the same UI. It is labelled Assistant Coach instead.
      expect(ROLE_LABELS.trainer).not.toBe(ROLE_LABELS.admin);
      const labels = ROLES.map((r) => ROLE_LABELS[r]);
      expect(labels.filter((l) => l === 'Trainer')).toHaveLength(1);
    });

    it('offers exactly one assignable role', () => {
      expect([...ASSIGNABLE_ROLES]).toEqual(['admin']);
      // Never offer the platform operator's own role from a studio screen.
      expect(ASSIGNABLE_ROLES).not.toContain('super_admin');
    });

    it('labelling a role does not grant it anything', () => {
      // The point of the whole exercise: labels and gates are separate. `admin`
      // now reads "Trainer" and still must not clear a platform-only gate, and
      // the old `trainer` role still must not clear an admin gate.
      expect(hasRole('admin', 'super_admin')).toBe(false);
      expect(hasRole('trainer', 'admin')).toBe(false);
    });
  });
});
