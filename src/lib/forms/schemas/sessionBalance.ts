/**
 * Creating a client's session balance.
 *
 * A balance is what the studio has sold: `total_sessions` becomes the
 * entitlement every "Use 1" click draws down, and `remaining_sessions` is a
 * generated `total_sessions - used_sessions`. The old form sent
 * `parseInt(totalSessions)` behind a truthiness guard, so the only checks were
 * "the box is non-empty" and "the string is not '0'" — `2.5` was silently
 * truncated to 2 sessions, and an empty box never reached the API at all.
 *
 * ── The bounds, and where they come from ───────────────────────────────────
 *
 * `total_sessions` is 1 or more: the create route rejects a falsy count, and a
 * balance of zero is a package nobody bought. It is also capped at the
 * database column's INT ceiling — the column is `INT`, so anything above
 * 2,147,483,647 is a request the server cannot store. That is a contract
 * bound, not a sales limit: the studio decides how many sessions it sells.
 *
 * `package_name` and `end_date` are optional because the route treats them as
 * optional (`package_name || null`, `end_date || null`). A blank name is
 * absent, not an empty label, and a blank end date means no expiry. The name
 * cap matches the package catalogue's own 120 characters: the column is
 * unbounded TEXT, so this is a paste guard rather than a server rule.
 *
 * The client id is required but not shape-checked — ids are TEXT and a
 * database-restored legacy id must remain acceptable; the route owns the
 * tenant check.
 */

import { z } from 'zod';
import { textField, integerField, dateField } from '../primitives';

/** The `total_sessions` INT column's own ceiling. */
export const MAX_TOTAL_SESSIONS = 2_147_483_647;

/** The same package-name ceiling the catalogue form uses. */
export const MAX_PACKAGE_NAME = 120;

export const sessionBalanceSchema = z.object({
  client_id: textField({ label: 'Client', required: true }),
  total_sessions: integerField({
    label: 'Total sessions',
    required: true,
    min: 1,
    max: MAX_TOTAL_SESSIONS,
  }),
  package_name: textField({ label: 'Package name', maxLength: MAX_PACKAGE_NAME }),
  end_date: dateField({ label: 'Valid until' }),
});

export type SessionBalanceValues = z.output<typeof sessionBalanceSchema>;

/** The form's raw state — strings, because that is what controls produce. */
export type SessionBalanceState = {
  client_id: string;
  total_sessions: string;
  package_name: string;
  end_date: string;
};

/**
 * A blank create form, optionally seeded with the client the page was linked
 * to. Seeding here rather than in an effect means the first render is already
 * the right form (§11), and the operator can still change the selection.
 */
export function blankSessionBalance(clientId = ''): SessionBalanceState {
  return { client_id: clientId, total_sessions: '', package_name: '', end_date: '' };
}

/** The create payload, in exactly the shape the endpoint already received. */
export function toSessionBalancePayload(v: SessionBalanceValues) {
  return {
    client_id: v.client_id as string,
    total_sessions: v.total_sessions as number,
    // Absent optionals are omitted rather than sent as null; the route turns
    // both into NULL, but the old payload used `undefined` and it stays.
    package_name: v.package_name ?? undefined,
    end_date: v.end_date ?? undefined,
  };
}
