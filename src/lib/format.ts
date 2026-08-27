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

/**
 * A Postgres TIME as HH:MM.
 *
 * time columns come back as "06:00:00", while <input type="time">, the slot
 * labels and any time comparison in the app all speak "06:00". Comparing the
 * two forms directly silently never matches, which is how the Schedule
 * Session page's duplicate-booking guard managed to never fire once.
 */
export function toHHMM(value?: string | null): string {
  if (!value) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value).trim());
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/**
 * "06:00" / "06:00:00" → "6:00 AM".
 *
 * Lives here rather than in a component because two screens render the same
 * field: the dashboard's Today card and the /pt-os/today list it links to.
 * They had a private copy each and only one of them had it, so the same 6am
 * slot read "6:00 AM" on the card and "06:00" on the page you reached by
 * tapping the card. Returns the input unchanged if it is not a time.
 */
export function fmtTime12(value?: string | null): string | null {
  if (!value) return null;
  const [h, m] = String(value).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return String(value);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
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

/**
 * Simple date-only formatter — strips the time portion off ISO/Date inputs.
 *
 * Use when you want a plain YYYY-MM-DD string with no localization
 * (e.g. for backend payloads, log lines, or filenames).
 *
 *   formatDate("2026-05-06T00:00:00.000Z") → "2026-05-06"
 *   formatDate(new Date())                 → "2026-05-06"
 *
 * For UI rendering prefer `fmtDate` (DD-MM-YYYY) or `formatDateLocal`
 * (browser locale).
 */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Localized date formatter — uses the browser's default locale.
 *
 *   formatDateLocal("2026-05-06T00:00:00.000Z") → "5/6/2026" (en-US)
 *                                                or "06/05/2026" (en-IN)
 */
export function formatDateLocal(value?: string | Date | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}


