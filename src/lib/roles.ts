export type Role = 'admin' | 'manager' | 'staff' | 'trainer' | 'reception' | 'receptionist' | 'member';

export const ROLES: readonly Role[] = [
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
  if (!required) return true;
  if (role === 'admin') return true;
  const list = Array.isArray(required) ? required : [required];
  return !!role && (list as string[]).includes(role);
}

export function isAdminOrManager(userRole: string | undefined | null): boolean {
  return hasRole(userRole, ['admin', 'manager']);
}
