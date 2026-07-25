// src/lib/sheet-import.ts
// -------------------------------------------------------------
// Browser-side helper that lets the user import a sheet (xlsx /
// xls / csv) ONCE and then auto-fills the Add-Member form by
// looking up rows by mobile number.
//
// • Loads SheetJS (xlsx) from CDN on first use - no npm install
// • Heuristic header → form-field mapper, so column names like
//   "Mobile", "Phone No", "Contact" all map to `mobile`, etc.
// • Caches the parsed rows in sessionStorage, encrypted with a
//   per-tab AES-GCM key (Web Crypto). The key is non-extractable
//   and held in module scope, so the cache is unreadable after
//   the tab closes — that's the whole point of sessionStorage.
// -------------------------------------------------------------

const STORAGE_KEY = '619erp.sheetData.v1';

// SECURITY / KNOWN ISSUE — pinned version carries unpatched CVEs.
// 0.18.5 is affected by prototype pollution (CVE-2023-30533, fixed in 0.19.3)
// and ReDoS (CVE-2024-22363, fixed in 0.20.2). Both are reachable from exactly
// what this module does: parsing a user-supplied spreadsheet in the browser.
//
// It cannot simply be bumped here: SheetJS left the public npm registry after
// 0.18.5, so cdnjs hosts no fixed release. The fix is to pull >= 0.20.2 from
// the vendor registry (https://cdn.sheetjs.com/) and self-host the asset —
// which also lets the CSP drop the third-party script origin entirely.
// Doing so requires recomputing the SRI hash below for the new file.
const SHEETJS_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

// Web Crypto key is held in module scope: lives for the lifetime of
// the tab, never persisted, never extractable. We also keep the most
// recently imported cache in memory so synchronous lookups (during
// the same tick the import was triggered) still work.
let sheetKey: CryptoKey | null = null;
let lastCache: SheetCache | null = null;
function getSheetKey(): CryptoKey | null {
  if (sheetKey) return sheetKey;
  if (typeof window === 'undefined') return null;
  const c = window.crypto?.subtle;
  if (!c) return null;
  // Fire-and-forget: synchronously return null while the key is being
  // generated; the next call (after the microtask) will pick it up.
  c.generateKey({ name: 'AES-GCM', length: 256 }, false /* non-extractable */, ['encrypt', 'decrypt'])
    .then((k) => { sheetKey = k; })
    .catch(() => { sheetKey = null; });
  return sheetKey;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function encryptCache(cache: SheetCache): Promise<string | null> {
  const key = getSheetKey();
  if (!key || !window.crypto?.subtle) return null;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(cache));
  const ct = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const ivCt = new Uint8Array(iv.length + ct.byteLength);
  ivCt.set(iv, 0);
  ivCt.set(new Uint8Array(ct), iv.length);
  return bytesToB64(ivCt);
}

async function decryptCache(b64: string): Promise<SheetCache | null> {
  const key = getSheetKey();
  if (!key || !window.crypto?.subtle) return null;
  const ivCt = b64ToBytes(b64);
  const iv = ivCt.slice(0, 12);
  const ct = ivCt.slice(12);
  const pt = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt)) as SheetCache;
}

// ── Public types ─────────────────────────────────────────────
export interface SheetMember {
  // keys mirror the New-Member form fields
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  mobile?: string;
  alt_mobile?: string;
  emergency_no?: string;
  dob?: string;          // YYYY-MM-DD
  anniversary?: string;  // YYYY-MM-DD
  gender?: 'Male' | 'Female' | 'Other' | '';
  reference_no?: string;
  aadhaar_no?: string;
  pan_no?: string;
  gst_no?: string;
  company_name?: string;
  weight?: string;
  interested_in?: string;  // primary fitness goal
  trainer_name?: string;   // assigned trainer
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  package_type?: string;   // subscription plan name
  pt_start_date?: string;
  pt_end_date?: string;
  base_amount?: string;
  discount?: string;
  final_amount?: string;
  paid_amount?: string;    // selling price
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  // anything we couldn't map ends up here for transparency
  _raw?: Record<string, unknown>;
}

export interface SheetCache {
  rows: SheetMember[];
  importedAt: string; // ISO
  fileName: string;
  rowCount: number;
}

// ── SheetJS loader (singleton) ───────────────────────────────
let xlsxPromise: Promise<any> | null = null;
function loadSheetJS(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('SSR');
  if ((window as any).XLSX) return Promise.resolve((window as any).XLSX);
  if (xlsxPromise) return xlsxPromise;
  xlsxPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SHEETJS_CDN;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.integrity = 'sha512-LfS4E5NKQ+U6HrDqphY54ZmR1wX/AVT8BiNCJ2vFRCgY/JkPE3n8KBksHpmj2vwS+CGjWQ38QzJ6nY+zBGw9g==';
    s.onload = () => resolve((window as any).XLSX);
    s.onerror = () =>
      reject(new Error('Failed to load SheetJS from CDN'));
    document.head.appendChild(s);
  });
  return xlsxPromise;
}

// ── Header → field mapping ───────────────────────────────────
const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const HEADER_RULES: { field: keyof SheetMember; match: RegExp }[] = [
  { field: 'first_name',     match: /\b(first name|fname|first)\b/ },
  { field: 'last_name',      match: /\b(last name|lname|surname|last)\b/ },
  { field: 'name',           match: /\b(full name|member name|client name|name)\b/ },
  { field: 'alt_mobile',     match: /\b(alt|alternate|secondary)\b.*\b(mob|phone|contact)\b/ },
  { field: 'emergency_no',   match: /\bemergency\b/ },
  { field: 'mobile',         match: /\b(mobile|mob|phone number|phone|contact|whatsapp|cell)\b/ },
  { field: 'email',          match: /\b(email|e mail|mail|gmail)\b/ },
  { field: 'dob',            match: /\b(dob|date of birth|birth date|birthday)\b/ },
  { field: 'anniversary',    match: /\banniversary\b/ },
  { field: 'gender',         match: /\b(gender|sex)\b/ },
  { field: 'aadhaar_no',     match: /\b(aadhaar|aadhar|uid)\b/ },
  { field: 'pan_no',         match: /\bpan\b/ },
  { field: 'gst_no',         match: /\b(gst|gstin)\b/ },
  { field: 'company_name',   match: /\b(company|firm|organisation|organization)\b/ },
  { field: 'reference_no',   match: /\b(reference|ref no|ref|referred by)\b/ },
  { field: 'weight',         match: /\bweight|wt\b/ },
  { field: 'interested_in',  match: /\b(primary fitness goal|fitness goal|goal|interested in|interest)\b/ },
  { field: 'trainer_name',   match: /\b(select trainer|trainer name|trainer|coach|assigned trainer)\b/ },
  { field: 'address',        match: /\b(address|flat|house|building)\b/ },
  { field: 'street',         match: /\b(street|area|locality|road)\b/ },
  { field: 'city',           match: /\bcity\b/ },
  { field: 'state',          match: /\bstate\b/ },
  { field: 'country',        match: /\bcountry\b/ },
  { field: 'pincode',        match: /\b(pincode|pin code|pin|zip|postal)\b/ },
  { field: 'package_type',   match: /\b(subscription plan|package|membership type|plan)\b/ },
  { field: 'pt_start_date',  match: /\b(start date|join date|joining|enrolled)\b/ },
  { field: 'pt_end_date',    match: /\b(end date|expiry|expires|valid till)\b/ },
  { field: 'final_amount',   match: /\b(total amount|net amount|final amount|grand total)\b/ },
  { field: 'discount',       match: /\bdiscount\b/ },
  { field: 'paid_amount',    match: /\b(selling price|sale price|paid|amount paid)\b/ },
  { field: 'base_amount',    match: /\b(base price|base|fee|price|amount|cost)\b/ },
  { field: 'payment_method', match: /\b(payment method|payment mode|mode of payment|mode)\b/ },
  { field: 'payment_date',   match: /\b(payment date|paid on)\b/ },
  { field: 'notes',          match: /\b(notes|remarks|comments|description)\b/ },
];

function mapHeader(header: string): keyof SheetMember | null {
  const h = norm(header);
  for (const r of HEADER_RULES) if (r.match.test(h)) return r.field;
  return null;
}

// ── Value normalisers ────────────────────────────────────────
export function normalizeMobile(v: unknown): string {
  if (v == null) return '';
  const digits = String(v).replace(/\D+/g, '');
  // strip leading country code if 11-12 digits and starts with 91
  if (digits.length >= 11 && digits.startsWith('91'))
    return digits.slice(-10);
  return digits.slice(-10); // last 10 always
}

function toIsoDate(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(v.getTime()))
    return v.toISOString().split('T')[0];
  // Excel serial number?
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  // dd/mm/yyyy or dd-mm-yyyy
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const [, dd, mm, rawYear] = m;
    let yy = rawYear;
    if (yy.length === 2) yy = (parseInt(yy, 10) > 50 ? '19' : '20') + yy;
    return `${yy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  // already iso?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return '';
}

function toGender(v: unknown): SheetMember['gender'] {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s.startsWith('m')) return 'Male';
  if (s.startsWith('f')) return 'Female';
  return 'Other';
}

function toStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  return String(v).trim();
}

// ── Convert one sheet row → SheetMember ──────────────────────
function rowToMember(
  row: Record<string, unknown>,
  headerMap: Record<string, keyof SheetMember>
): SheetMember {
  const m: SheetMember = { _raw: row };
  for (const [origHeader, field] of Object.entries(headerMap)) {
    const raw = row[origHeader];
    if (raw == null || raw === '') continue;
    if (field === 'mobile' || field === 'alt_mobile' || field === 'emergency_no')
      (m as any)[field] = normalizeMobile(raw);
    else if (field === 'dob' || field === 'anniversary' || field === 'pt_start_date' ||
             field === 'pt_end_date' || field === 'payment_date')
      (m as any)[field] = toIsoDate(raw);
    else if (field === 'gender') m.gender = toGender(raw);
    else (m as any)[field] = toStr(raw);
  }
  // derive first_name/last_name from name when missing
  if ((!m.first_name || !m.last_name) && m.name) {
    const parts = m.name.trim().split(/\s+/);
    if (!m.first_name) m.first_name = parts[0] || '';
    if (!m.last_name && parts.length > 1) m.last_name = parts.slice(1).join(' ');
  }
  return m;
}

// ── Public API ───────────────────────────────────────────────
export async function importSheetFile(file: File): Promise<SheetCache> {
  const XLSX = await loadSheetJS();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const allRows: SheetMember[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });
    if (!json.length) continue;
    // build header map from first row's keys
    const headerMap: Record<string, keyof SheetMember> = {};
    for (const k of Object.keys(json[0])) {
      const f = mapHeader(k);
      if (f) headerMap[k] = f;
    }
    if (!headerMap || Object.keys(headerMap).length === 0) continue;
    for (const row of json) allRows.push(rowToMember(row, headerMap));
  }

  // de-dup by mobile (keep last occurrence — usually the most recent row)
  const seen = new Map<string, SheetMember>();
  for (const r of allRows) {
    const key = r.mobile || `_${seen.size}`;
    seen.set(key, r);
  }
  const rows = Array.from(seen.values());

  const cache: SheetCache = {
    rows,
    importedAt: new Date().toISOString(),
    fileName: file.name,
    rowCount: rows.length,
  };
  // Per-tab encrypted cache. If Web Crypto is unavailable we still
  // surface the data to the caller, but the cache isn't persisted.
  // Residual risk: an attacker with same-origin script access can
  // read the in-memory key; this only protects against passive
  // inspection of the storage layer (e.g. shared kiosk profiles).
  lastCache = cache;
  try {
    if (window.crypto?.subtle) {
      getSheetKey();
      encryptCache(cache).then((b64) => {
        if (b64) sessionStorage.setItem(STORAGE_KEY, b64);
      });
    } else {
      console.warn('[sheet-import] Web Crypto unavailable — sheet cache not persisted');
    }
  } catch {/* quota — ignore */}
  return cache;
}

export function getSheetCacheSync(): SheetCache | null {
  if (typeof window === 'undefined') return null;
  if (lastCache) return lastCache;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw.startsWith('{')) return JSON.parse(raw) as SheetCache;
    return null;
  } catch {
    return null;
  }
}

export async function getSheetCache(): Promise<SheetCache | null> {
  if (typeof window === 'undefined') return null;
  if (lastCache) return lastCache;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw.startsWith('{')) return JSON.parse(raw) as SheetCache;
    return await decryptCache(raw);
  } catch {
    return null;
  }
}

export function clearSheetCache() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(STORAGE_KEY);
  lastCache = null;
}

export function lookupByMobile(mobile: string): SheetMember | null {
  const m = normalizeMobile(mobile);
  if (m.length < 10) return null;
  const cache = getSheetCacheSync();
  if (!cache) return null;
  return cache.rows.find(r => r.mobile === m) ?? null;
}

export function searchByName(query: string, limit = 10): SheetMember[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const cache = getSheetCacheSync();
  if (!cache) return [];
  const out: SheetMember[] = [];
  for (const r of cache.rows) {
    const n = ((r.name || '') + ' ' + (r.first_name || '') + ' ' + (r.last_name || ''))
      .toLowerCase();
    if (n.includes(q)) {
      out.push(r);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Fields we are willing to auto-fill from the sheet. */
export const AUTOFILL_FIELDS: (keyof SheetMember)[] = [
  'first_name', 'last_name', 'email', 'mobile', 'alt_mobile', 'emergency_no',
  'dob', 'anniversary', 'gender', 'reference_no', 'aadhaar_no', 'pan_no',
  'gst_no', 'company_name', 'weight', 'interested_in', 'trainer_name',
  'address', 'street', 'city', 'state', 'country', 'pincode',
  'package_type', 'pt_start_date', 'pt_end_date',
  'base_amount', 'discount', 'final_amount', 'paid_amount',
  'payment_method', 'payment_date', 'notes',
];

/**
 * Merge a SheetMember into an existing form state, only filling
 * fields that are currently empty/zero/falsy. Returns:
 *   { merged, filledFields }
 */
export function mergeEmptyOnly<F extends Record<string, any>>(
  current: F,
  sheet: SheetMember
): { merged: F; filledFields: string[] } {
  const merged: any = { ...current };
  const filled: string[] = [];
  for (const k of AUTOFILL_FIELDS) {
    const incoming = (sheet as any)[k];
    if (incoming === undefined || incoming === null || incoming === '') continue;
    const existing = merged[k];
    const isEmpty =
      existing === undefined || existing === null || existing === '' ||
      (k === 'discount' && (existing === '0' || existing === 0));
    if (isEmpty) {
      merged[k] = incoming;
      filled.push(k);
    }
  }
  return { merged, filledFields: filled };
}
