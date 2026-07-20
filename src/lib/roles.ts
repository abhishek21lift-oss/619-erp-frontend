export type Role = 'super_admin' | 'admin' | 'manager' | 'staff' | 'trainer' | 'reception' | 'receptionist' | 'member';

export const ROLES: readonly Role[] = [
  'super_admin',
  'admin',
  'manager',
  'staff',
  'trainer',
  'reception',
  'receptionist',
  'member',
] as const;

const ROLE_ALIASES: Record<string, Role> = {
  receptionist: 'reception',
};

export function normaliseRole(role: string | undefined | null): Role | undefined {
  if (!role) return undefined;
  return (ROLE_ALIASES[role] ?? (role as Role));
}

export function hasRole(
  userRole: string | undefined | null,
  required: Role | Role[] | undefined
): boolean {
  const role = normaliseRole(userRole);
  if (!required) return false;
  const list = Array.isArray(required) ? required : [required];
  // Platform super_admin (multi-tenant SaaS) satisfies any requirement.
  if (role === 'super_admin') return true;
  // Tenant admin is a superuser within their own workspace, but is NOT the
  // platform operator — it must never pass a super_admin-only gate.
  if (role === 'admin') return !(list as string[]).includes('super_admin');
  return !!role && (list as string[]).includes(role);
}

export function isAdminOrManager(userRole: string | undefined | null): boolean {
  return hasRole(userRole, ['admin', 'manager']);
}
