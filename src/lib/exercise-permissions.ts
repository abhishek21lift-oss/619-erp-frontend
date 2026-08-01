// Who may do what to an exercise, on the client.
//
// Mirrors modules/exercises/exercises.service.js on the server. The server is
// the authority — this exists so the UI does not offer an action that will
// come back 403, which is what the old library did: it showed Add/Edit/Delete
// to every authenticated user including staff, who were then refused.
//
// Kept as pure functions in one file so the rule is stated once rather than
// re-derived in each component that needs it.

import type { LibraryExercise } from '@/lib/api/types';

type UserLike = { id?: string; role?: string } | null | undefined;

const WRITE_ROLES = ['admin', 'manager', 'trainer', 'super_admin'];

/** May this user create custom exercises at all? Staff and members may not. */
export function canCreateExercise(user: UserLike): boolean {
  return !!user?.role && WRITE_ROLES.includes(user.role);
}

/**
 * May this user edit this exercise?
 *
 * Two rules beyond the role gate:
 *  - the shared platform library (organization_id === null) is editable by
 *    nobody: those rows are read by every studio, so one studio's "fix" would
 *    silently rewrite them for all of them. Duplicating is the way in.
 *  - a trainer may only edit what they created.
 */
export function canEditExercise(user: UserLike, exercise: Pick<LibraryExercise, 'organization_id' | 'created_by'> | null | undefined): boolean {
  if (!exercise || !canCreateExercise(user)) return false;
  if (exercise.organization_id === null) return false;
  if (user?.role === 'trainer') return exercise.created_by === user.id;
  return true;
}

/** Deletion and archiving follow editing exactly. */
export const canDeleteExercise = canEditExercise;

/** Why an edit is unavailable, for a tooltip. Null when it IS available. */
export function editBlockedReason(user: UserLike, exercise: Pick<LibraryExercise, 'organization_id' | 'created_by'> | null | undefined): string | null {
  if (!exercise) return null;
  if (!canCreateExercise(user)) return 'Your role does not allow editing exercises';
  if (exercise.organization_id === null) return 'Shared library exercise — duplicate it to make an editable copy';
  if (user?.role === 'trainer' && exercise.created_by !== user.id) {
    return 'Only the trainer who created this exercise can edit it';
  }
  return null;
}
