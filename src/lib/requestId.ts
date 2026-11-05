/**
 * A per-attempt id the server can use to recognise a retry.
 *
 * Payment and workout writes both accept one: a lost response must not turn
 * one tap into two rows. Generate it when the form opens, not per submit —
 * the retry has to send the same value.
 */
export function newRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
