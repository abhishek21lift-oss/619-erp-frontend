export type Role = 'super_admin' | 'trainer' | 'member';

export const ROLES: readonly Role[] = [
  'super_admin',
  'trainer',
  'member',
] as const;

const ROLE_ALIASES: Record<string, Role> = {
  admin: 'trainer',
  manager: 'trainer',
  staff: 'trainer',
  reception: 'trainer',
  receptionist: 'trainer',
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
  // Platform super_admin satisfies any requirement.
  if (role === 'super_admin') return true;
  // Studio trainer satisfies any studio/tenant requirement (not platform super_admin).
  if (role === 'trainer') return !(list as string[]).includes('super_admin');
  return !!role && (list as string[]).includes(role);
}

export function isAdminOrManager(userRole: string | undefined | null): boolean {
  return hasRole(userRole, ['trainer']);
}

// ── What people are called ──────────────────────────────────────────────────

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Admin',
  trainer: 'Trainer',
  member: 'Member',
};

/**
 * What to print for a role.
 */
export function roleLabel(role: string | undefined | null): string {
  if (!role) return '';
  const normalised = normaliseRole(role);
  return (normalised && ROLE_LABELS[normalised]) || role;
}

/**
 * The roles a studio user can actually be given.
 * In the 1 Studio = 1 Trainer model, the assignable studio owner/operator role is 'trainer'.
 */
export const ASSIGNABLE_ROLES: readonly Role[] = ['trainer'] as const;
