import { describe, it, expect } from 'vitest';
import { ROLES, normaliseRole, hasRole, isAdminOrManager } from '@/lib/roles';

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
    it('admin always passes regardless of required', () => {
      expect(hasRole('admin', 'member')).toBe(true);
      expect(hasRole('admin', ['trainer', 'reception'])).toBe(true);
      expect(hasRole('admin', undefined)).toBe(true);
    });
    it('no required means open to anyone (even logged out) — caller decides', () => {
      expect(hasRole('member', undefined)).toBe(true);
      expect(hasRole(undefined, undefined)).toBe(true);
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
});
