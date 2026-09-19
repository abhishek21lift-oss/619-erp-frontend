export type Role = 'super_admin' | 'trainer' | 'member';

export const ROLES: readonly Role[] = ['super_admin', 'trainer', 'member'] as const;

export function normaliseRole(role: string | undefined | null): Role | undefined {
  if (!role) return undefined;
  if (role === 'admin' || role === 'manager' || role === 'staff' || role === 'reception' || role === 'receptionist') {
    return 'trainer';
  }
  if (role === 'super_admin' || role === 'trainer' || role === 'member') return role;
  return undefined;
}

export function hasRole(
  userRole: string | undefined | null,
  required: Role | Role[] | undefined
): boolean {
  const role = normaliseRole(userRole);
  if (!required || !role) return false;
  const list = Array.isArray(required) ? required : [required];
  if (role === 'super_admin') return true;
  return list.includes(role);
}

export function isStudioOwner(user: { role?: string | null; is_owner?: boolean | null } | null | undefined): boolean {
  return normaliseRole(user?.role) === 'trainer' && user?.is_owner === true;
}

export function isAdminOrManager(userRole: string | undefined | null): boolean {
  return normaliseRole(userRole) === 'trainer';
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Admin',
  trainer: 'Trainer',
  member: 'Member',
};

export function roleLabel(role: string | undefined | null): string {
  if (!role) return '';
  const normalised = normaliseRole(role);
  return (normalised && ROLE_LABELS[normalised]) || role;
}

export const ASSIGNABLE_ROLES: readonly Role[] = ['trainer'] as const;
