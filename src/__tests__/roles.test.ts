import { describe, it, expect } from 'vitest';
import { ROLES, normaliseRole, hasRole, isAdminOrManager, ROLE_LABELS, roleLabel, ASSIGNABLE_ROLES } from '@/lib/roles';

describe('canonical role model', () => {
  it('exposes only platform admin, studio trainer-owner and member', () => {
    expect([...ROLES]).toEqual(['super_admin', 'trainer', 'member']);
    expect([...ASSIGNABLE_ROLES]).toEqual(['trainer']);
  });

  it('normalises legacy role identifiers to trainer', () => {
    expect(normaliseRole('admin')).toBe('trainer');
    for (const retired of ['manager', 'staff', 'reception', 'receptionist']) {
      expect(normaliseRole(retired)).toBe('member');
    }
    expect(normaliseRole('trainer')).toBe('trainer');
    expect(normaliseRole('member')).toBe('member');
    expect(normaliseRole(undefined)).toBeUndefined();
  });

  it('keeps super_admin above the studio role', () => {
    expect(hasRole('super_admin', 'trainer')).toBe(true);
    expect(hasRole('super_admin', 'member')).toBe(true);
    expect(hasRole('trainer', 'super_admin')).toBe(false);
  });

  it('treats trainer as the studio owner role', () => {
    expect(hasRole('trainer', 'trainer')).toBe(true);
    expect(hasRole('admin', 'trainer')).toBe(true); // legacy boundary compatibility
    expect(hasRole('manager', 'trainer')).toBe(false); // retired role boundary
    expect(isAdminOrManager('trainer')).toBe(true);
    expect(isAdminOrManager('admin')).toBe(true);
  });

  it('does not elevate members', () => {
    expect(hasRole('member', 'trainer')).toBe(false);
    expect(isAdminOrManager('member')).toBe(false);
  });

  it('labels canonical and legacy identifiers consistently', () => {
    expect(roleLabel('super_admin')).toBe('Admin');
    expect(roleLabel('trainer')).toBe('Trainer');
    expect(roleLabel('admin')).toBe('Trainer');
    expect(roleLabel('manager')).toBe('Member');
    expect(ROLE_LABELS.trainer).toBe('Trainer');
  });
});
