// The role model: exactly trainer, member and super_admin, and nothing that
// stands in for anything else.
//
// These are regression tests for the model the backend enforces
// (users_role_check, migration 208). The client mirror used to soften it —
// an alias table mapped admin / manager / staff / reception onto trainer, and
// super_admin satisfied every requirement — so a retired role, or the
// platform operator, passed studio gates the server would refuse.
import { describe, it, expect } from 'vitest';
import * as roles from '@/lib/roles';
import { ROLES, TENANT_ROLES, hasRole, isRole, ROLE_LABELS, roleLabel } from '@/lib/roles';

const RETIRED = ['admin', 'manager', 'staff', 'reception', 'receptionist', 'coach', 'owner'];

describe('the role set', () => {
  it('is exactly the three roles', () => {
    expect([...ROLES].sort()).toEqual(['member', 'super_admin', 'trainer']);
  });

  it('keeps the platform operator out of the tenant roles', () => {
    expect([...TENANT_ROLES].sort()).toEqual(['member', 'trainer']);
  });

  it('has no alias table or normaliser left to soften it', () => {
    const exported = Object.keys(roles);
    expect(exported).not.toContain('normaliseRole');
    expect(exported).not.toContain('isAdminOrManager');
    expect(exported).not.toContain('ASSIGNABLE_ROLES');
  });

  it('isRole accepts the three and nothing else', () => {
    for (const r of ROLES) expect(isRole(r)).toBe(true);
    for (const r of [...RETIRED, '', 'TRAINER', ' trainer', null, undefined, 1]) {
      expect(isRole(r), String(r)).toBe(false);
    }
  });
});

describe('hasRole — exact membership', () => {
  it('passes the role that is required', () => {
    expect(hasRole('trainer', 'trainer')).toBe(true);
    expect(hasRole('member', 'member')).toBe(true);
    expect(hasRole('super_admin', 'super_admin')).toBe(true);
    expect(hasRole('trainer', ['trainer', 'member'])).toBe(true);
  });

  it('gives the platform operator no studio pass', () => {
    // It used to "clear everything". Each plane has its own door.
    expect(hasRole('super_admin', 'trainer')).toBe(false);
    expect(hasRole('super_admin', 'member')).toBe(false);
    expect(hasRole('super_admin', [...TENANT_ROLES])).toBe(false);
  });

  it('gives the trainer no platform pass, and no member pass', () => {
    expect(hasRole('trainer', 'super_admin')).toBe(false);
    expect(hasRole('trainer', 'member')).toBe(false);
  });

  it('refuses every retired staff role, whatever is required', () => {
    for (const r of RETIRED) {
      expect(hasRole(r, 'trainer'), r).toBe(false);
      expect(hasRole(r, [...ROLES]), r).toBe(false);
    }
  });

  it('grants nothing when no role is required — callers must skip the check', () => {
    expect(hasRole('member', undefined)).toBe(false);
    expect(hasRole('trainer', undefined)).toBe(false);
    expect(hasRole(undefined, undefined)).toBe(false);
  });

  it('grants nothing to a missing role', () => {
    expect(hasRole(undefined, 'trainer')).toBe(false);
    expect(hasRole(null, [...ROLES])).toBe(false);
    expect(hasRole('', 'trainer')).toBe(false);
  });
});

describe('labels', () => {
  it('names the roles properly', () => {
    expect(roleLabel('super_admin')).toBe('Platform operator');
    expect(roleLabel('trainer')).toBe('Trainer');
    expect(roleLabel('member')).toBe('Member');
  });

  it('prints nothing for a role that is not one — never the raw identifier', () => {
    for (const r of RETIRED) expect(roleLabel(r), r).toBe('');
    expect(roleLabel(undefined)).toBe('');
  });

  it('gives every role a label, so none can reach the UI as an identifier', () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role], `${role} has no label`).toBeTruthy();
      expect(ROLE_LABELS[role], `${role}'s label looks like an identifier`).not.toMatch(/_/);
    }
  });
});
