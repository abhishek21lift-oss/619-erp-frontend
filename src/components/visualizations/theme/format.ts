/** Formats a number the same way across every chart unless a caller overrides it. */
export function defaultFormat(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}
