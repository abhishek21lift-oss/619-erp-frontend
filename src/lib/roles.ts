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

// ── What people are called ──────────────────────────────────────────────────
//
// The identifiers above are SaaS plumbing: `super_admin` is the platform
// operator, `admin` is the superuser of one studio. The product is sold to
// individual personal trainers, so those are the wrong words to show anyone.
// The operator is the Admin; the customer who bought a studio is the Trainer.
//
// LABELS ONLY. Nothing here is ever compared, stored, sent to the API or put
// in a token — `hasRole`, the Guard gates, the JWT claims and the
// users_role_check constraint all keep the identifiers. That separation is
// what makes this reversible in one file instead of a migration across two
// repos and four live studios.

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Admin',
  admin: 'Trainer',
  // Below here: no account has ever held one of these roles, and none is
  // offered in any picker (see ASSIGNABLE_ROLES). They keep entries so that a
  // row written by hand, or a role added back later, still renders as a word
  // rather than as a raw identifier.
  manager: 'Manager',
  staff: 'Staff',
  trainer: 'Assistant Coach',
  reception: 'Reception',
  receptionist: 'Reception',
  member: 'Member',
};

/**
 * What to print for a role.
 *
 * Falls back to the raw value rather than to a placeholder: if an unknown role
 * ever reaches the UI, seeing it is how anyone finds out. Aliases are resolved
 * first, so `receptionist` and `reception` cannot print differently.
 */
export function roleLabel(role: string | undefined | null): string {
  if (!role) return '';
  const normalised = normaliseRole(role);
  return (normalised && ROLE_LABELS[normalised]) || role;
}

/**
 * The roles a studio user can actually be given.
 *
 * One, deliberately. The product has two kinds of people — the operator and
 * the trainer who owns a studio — and the operator's role is not something you
 * hand out from a studio screen. Every other role has zero accounts, so
 * offering them only invites someone to create an account that no part of the
 * product was designed around.
 */
export const ASSIGNABLE_ROLES: readonly Role[] = ['admin'] as const;
