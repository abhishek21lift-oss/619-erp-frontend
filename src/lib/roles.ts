/**
 * The three roles an account can hold, and nothing else.
 *
 *   trainer      owns the studio — the highest authority inside a tenant
 *   member       a client of that studio, reaching only their own record
 *   super_admin  the platform operator; lives in the Command Center only and
 *                enters a studio solely through audited impersonation (which
 *                hands the browser the studio trainer's own session)
 *
 * The backend enforces exactly this set (users_role_check, migration 208) and
 * refuses a session to anything outside it. This module mirrors that rule
 * rather than softening it: there are no aliases for the retired staff roles
 * (admin / manager / reception / staff) and no role that satisfies every
 * requirement. An unknown role is simply not a role — it passes no gate.
 */
export type Role = 'super_admin' | 'trainer' | 'member';

export const ROLES: readonly Role[] = ['super_admin', 'trainer', 'member'] as const;

/** The roles that live inside a studio — mirrors the backend's TENANT_ROLES. */
export const TENANT_ROLES: readonly Role[] = ['trainer', 'member'] as const;

/** True only for one of the three roles above. */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Does this account hold one of the required roles?
 *
 * Exact membership, deliberately. The platform operator does not satisfy a
 * studio requirement and the trainer does not satisfy a platform one — each
 * plane has its own door — and a missing requirement grants nothing.
 */
export function hasRole(
  userRole: string | undefined | null,
  required: Role | readonly Role[] | undefined
): boolean {
  if (!required || !isRole(userRole)) return false;
  const list: readonly Role[] = Array.isArray(required) ? required : [required as Role];
  return list.includes(userRole);
}

// ── What people are called ──────────────────────────────────────────────────

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Platform operator',
  trainer: 'Trainer',
  member: 'Member',
};

/** What to print for a role. Unknown values print as nothing rather than raw. */
export function roleLabel(role: string | undefined | null): string {
  return isRole(role) ? ROLE_LABELS[role] : '';
}
