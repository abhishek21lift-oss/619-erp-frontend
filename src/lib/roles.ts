// Canonical studio role model.
// super_admin = platform operator; trainer = the single studio owner; member = client.
// Legacy role identifiers are accepted only at the boundary so old sessions/data can
// be normalised safely during rollout. They are never assignable or persisted after migration.
export type Role = 'super_admin' | 'trainer' | 'member' | (string & {});

export const ROLES: readonly Role[] = ['super_admin', 'trainer', 'member'] as const;

const LEGACY_ROLE_MAP: Record<string, Role> = {
  admin: 'trainer',
  manager: 'trainer',
  staff: 'trainer',
  reception: 'trainer',
  receptionist: 'trainer',
};

export function normaliseRole(role: string | undefined | null): Role | undefined {
  if (!role) return undefined;
  return LEGACY_ROLE_MAP[role] ?? (role as Role);
}

export function hasRole(userRole: string | undefined | null, required: string | string[] | undefined): boolean {
  const role = normaliseRole(userRole);
  if (!required) return false;
  const list = Array.isArray(required) ? required : [required];
  if (role === 'super_admin') return true;
  const canonicalRequired = list.map((r) => LEGACY_ROLE_MAP[r] ?? r);
  return !!role && canonicalRequired.includes(role);
}

/** Backward-compatible helper name; semantics are now studio-owner/trainer. */
export function isAdminOrManager(userRole: string | undefined | null): boolean {
  return normaliseRole(userRole) === 'trainer';
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin',
  trainer: 'Trainer',
  member: 'Member',
  admin: 'Trainer',
  manager: 'Trainer',
  staff: 'Trainer',
  reception: 'Trainer',
  receptionist: 'Trainer',
};

export function roleLabel(role: string | undefined | null): string {
  if (!role) return '';
  return ROLE_LABELS[role] ?? ROLE_LABELS[normaliseRole(role) as string] ?? role;
}

export const ASSIGNABLE_ROLES: readonly Role[] = ['trainer'] as const;
