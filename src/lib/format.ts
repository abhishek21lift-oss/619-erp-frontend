// src/lib/format.ts
// Single source of truth for how the app shows dates and money.
// Rule: every visible date is rendered DD-MM-YYYY. We never leak ISO
// timestamps like "2026-05-03T00:00:00.000Z" into the UI.

/** Strip a trailing time-of-day off an ISO string ("...T00:00:00.000Z"). */
function stripTime(s: string): string {
  return s.replace(/T.*$/, '');
}

/**
 * Render any date-ish input as DD-MM-YYYY.
 *
 * Accepts:
 *  - ISO strings ("2026-05-03", "2026-05-03T00:00:00.000Z")
 *  - DD-MM-YYYY strings (returned untouched)
 *  - Date objects
 *  - null / undefined / empty → "—"
 */
export function fmtDate(value?: string | Date | null): string {
  if (!value) return '—';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—';
    return toDDMMYYYY(value);
  }

  const raw = String(value).trim();
  if (!raw) return '—';

  // Already DD-MM-YYYY?
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw;

  // YYYY-MM-DD or with timestamp
  const noTime = stripTime(raw);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(noTime);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // Fall back to Date parsing
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return toDDMMYYYY(d);
  return raw;
}

function toDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Convert a DD-MM-YYYY string into the YYYY-MM-DD shape the backend
 * expects. Pass-through if it's already YYYY-MM-DD or empty.
 */
export function toApiDate(value?: string | null): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return raw;
}

/**
 * The value an <input type="date"> needs is YYYY-MM-DD. Accepts any of
 * the formats fmtDate accepts and returns the input-friendly version.
 */
export function toInputDate(value?: string | Date | null): string {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const raw = stripTime(String(value).trim());
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
}

/** ₹ formatter with Indian grouping. */
export function fmtMoney(n: number | string | null | undefined): string {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/**
 * Today's date as DD-MM-YYYY (handy for top-of-page subtitles).
 */
export function todayDDMM(): string {
  return toDDMMYYYY(new Date());
}
