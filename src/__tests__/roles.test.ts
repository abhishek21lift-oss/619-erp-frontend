import { describe, it, expect } from 'vitest';
import {
  ROLES, normaliseRole, hasRole, isAdminOrManager,
  ROLE_LABELS, roleLabel, ASSIGNABLE_ROLES,
} from '@/lib/roles';

describe('roles', () => {
  it('ROLES contains the canonical role list', () => {
    expect(ROLES).toContain('super_admin');
    expect(ROLES).toContain('trainer');
    expect(ROLES).toContain('member');
  });

  describe('normaliseRole', () => {
    it('maps legacy roles to trainer', () => {
      expect(normaliseRole('admin')).toBe('trainer');
      expect(normaliseRole('manager')).toBe('trainer');
      expect(normaliseRole('staff')).toBe('trainer');
      expect(normaliseRole('reception')).toBe('trainer');
      expect(normaliseRole('receptionist')).toBe('trainer');
    });
    it('leaves trainer, member, super_admin unchanged', () => {
      expect(normaliseRole('super_admin')).toBe('super_admin');
      expect(normaliseRole('trainer')).toBe('trainer');
      expect(normaliseRole('member')).toBe('member');
    });
    it('returns undefined for null/undefined/empty', () => {
      expect(normaliseRole(undefined)).toBeUndefined();
      expect(normaliseRole(null)).toBeUndefined();
      expect(normaliseRole('')).toBeUndefined();
    });
  });

  describe('hasRole', () => {
    it('trainer satisfies any TENANT role requirement', () => {
      expect(hasRole('trainer', 'member')).toBe(false);
      expect(hasRole('trainer', 'trainer')).toBe(true);
      expect(hasRole('trainer', ['trainer', 'member'])).toBe(true);
    });

    it('trainer does NOT satisfy a super_admin gate', () => {
      expect(hasRole('trainer', 'super_admin')).toBe(false);
      expect(hasRole('trainer', ['super_admin'])).toBe(false);
      expect(hasRole('admin', 'super_admin')).toBe(false);
      // super_admin itself clears everything.
      expect(hasRole('super_admin', 'super_admin')).toBe(true);
      expect(hasRole('super_admin', 'member')).toBe(true);
      expect(hasRole('super_admin', 'trainer')).toBe(true);
    });

    it('returns false when no role is required — callers must skip the check', () => {
      expect(hasRole('member', undefined)).toBe(false);
      expect(hasRole('trainer', undefined)).toBe(false);
      expect(hasRole(undefined, undefined)).toBe(false);
    });
  });

  describe('isAdminOrManager', () => {
    it('is true for trainer, admin and manager', () => {
      expect(isAdminOrManager('trainer')).toBe(true);
      expect(isAdminOrManager('admin')).toBe(true);
      expect(isAdminOrManager('manager')).toBe(true);
    });
    it('is false for member', () => {
      expect(isAdminOrManager('member')).toBe(false);
    });
    it('is false for nullish', () => {
      expect(isAdminOrManager(undefined)).toBe(false);
      expect(isAdminOrManager(null)).toBe(false);
    });
  });

  describe('labels', () => {
    it('names the roles properly', () => {
      expect(roleLabel('super_admin')).toBe('Admin');
      expect(roleLabel('trainer')).toBe('Trainer');
      expect(roleLabel('member')).toBe('Member');
      expect(roleLabel('admin')).toBe('Trainer');
    });

    it('gives every role a label, so none can reach the UI as an identifier', () => {
      for (const role of ROLES) {
        expect(ROLE_LABELS[role], `${role} has no label`).toBeTruthy();
        expect(ROLE_LABELS[role], `${role}'s label looks like an identifier`)
          .not.toMatch(/_/);
      }
    });

    it('offers trainer as assignable role', () => {
      expect([...ASSIGNABLE_ROLES]).toEqual(['trainer']);
      expect(ASSIGNABLE_ROLES).not.toContain('super_admin');
    });
  });
});
