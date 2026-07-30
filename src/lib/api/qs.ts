// Query-string helpers for the endpoint modules.
//
// Two of them, because api.ts always had two. buildQs is what nearly every
// namespace calls; qsOf accepts unknown values and can omit keys, and is used
// only by the super-admin endpoints in platform.ts — the invoices export is
// the one caller that passes `omit`, to drop limit/offset when exporting the
// whole set rather than a page. Merging them would mean re-typing call sites,
// which is not what this refactor is for.
//
// Not re-exported from index.ts: both were private to api.ts, and they stay
// private to this directory.

/** Query string from a params object, dropping empties so `?status=` never
 *  reaches the server as a filter for the empty string. `omit` is for keys
 *  that make sense on a paged request but not on an export of the whole set. */
export function qsOf(params: Record<string, unknown>, omit: string[] = []): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && !omit.includes(k)) qs.set(k, String(v));
  }
  const q = qs.toString();
  return q ? `?${q}` : '';
}

export function buildQs(params?: Record<string, string | number>): string {
  if (!params) return '';
  const entries = Object.entries(params).map(([k, v]) => [k, String(v)] as [string, string]);
  return '?' + new URLSearchParams(entries).toString();
}
