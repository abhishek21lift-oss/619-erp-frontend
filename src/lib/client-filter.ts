/**
 * Server-side filter for the client-list pill row.
 *
 * 'expired' is not a stored status: the badge is status expired OR a past end
 * date, because the sweep that flips the status runs later. `term=ended`
 * carries that derived meaning; every other pill maps straight to `status`.
 */
export function serverFilter(statusFilter: string) {
  if (statusFilter === 'expired') return { term: 'ended' as const };
  if (statusFilter === 'all') return {};
  return { status: statusFilter };
}
