'use client';

// Billing Centre — Finance › Invoices.
//
// The tax record, as opposed to the Billing sub-tab next door, which is the
// *lifecycle* view (who is trialling, who is due, who is frozen). This one
// answers the accountant's questions: what did we invoice in Q1, how much of
// it was tax, give me the CSV, give me that one invoice as a PDF.
//
// Everything shown is read off the stored invoice. Nothing is recomputed in
// the browser — an invoice whose total is derived at render time would drift
// from the document the studio was actually sent.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, FileText, ChevronLeft, ChevronRight, RotateCcw,
  Receipt, Loader2, AlertTriangle, Settings2, Check, Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  SubscriptionInvoice, InvoiceTotals, InvoiceQuery, PlatformBillingSettings,
} from '@/lib/api';

const PAGE_SIZE = 50;

/* Financial years, because that is the unit an Indian filing is done in.
   April→March, so "this FY" in July 2026 means Apr 2026 → Mar 2027. */
function fyBounds(offsetYears = 0) {
  const now = new Date();
  const startYear = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) + offsetYears;
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31`, label: `FY ${String(startYear).slice(2)}–${String(startYear + 1).slice(2)}` };
}

function monthBounds() {
  const n = new Date();
  const first = new Date(n.getFullYear(), n.getMonth(), 1);
  const last = new Date(n.getFullYear(), n.getMonth() + 1, 0);
  return { from: ymd(first), to: ymd(last) };
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtINR(v: number | string | null | undefined) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* The tax on one invoice, summed from whichever heads apply. Returns null —
   not 0 — when the invoice predates tax itemisation, so the UI can say "not
   itemised" instead of claiming zero tax was charged. */
function invoiceTax(inv: SubscriptionInvoice): number | null {
  if (inv.taxable_value_inr == null) return null;
  return Number(inv.cgst_inr ?? 0) + Number(inv.sgst_inr ?? 0) + Number(inv.igst_inr ?? 0);
}

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' } as const;
const inputStyle = { ...cardStyle, color: 'var(--text-primary)' } as const;

/* `subTone` tints the caption only. The figure itself stays neutral even when
   there is a caveat: colouring ₹3,114.92 of correctly collected GST red reads
   as "this number is wrong", when what is actually being flagged is that a few
   rows are missing from it. */
function Tile({ label, value, sub, tone, subTone }: {
  label: string; value: string; sub?: string;
  tone?: 'positive' | 'neutral' | 'critical'; subTone?: 'caution';
}) {
  const colour = tone === 'positive' ? 'var(--success-text)' : tone === 'critical' ? 'var(--danger-text)' : 'var(--text-primary)';
  return (
    <div className="rounded-[14px] p-3.5" style={cardStyle}>
      <p className="text-[10px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>{label}</p>
      <p className="mt-1 text-[19px] font-[800] tabular-nums leading-tight" style={{ color: colour }}>{value}</p>
      {sub && (
        <p className="mt-0.5 text-[11px]" style={{ color: subTone === 'caution' ? '#b45309' : 'var(--text-muted)', fontWeight: subTone ? 650 : 400 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Row({ inv }: { inv: SubscriptionInvoice }) {
  const tax = invoiceTax(inv);
  const refunded = inv.status === 'refunded';
  const gstin = inv.buyer_snapshot?.gstin || inv.billing_gstin;

  return (
    <div className="flex min-h-[62px] items-center gap-3 px-3 py-2.5 sm:px-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[12px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            {inv.invoice_number}
          </span>
          {refunded && (
            <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[750]"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
              Refunded
            </span>
          )}
          {tax === null && (
            /* Stated plainly rather than shown as ₹0 — these are pre-migration
               rows whose tax was never itemised, and a zero would read as a
               zero-rated sale. */
            <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[700]"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              Tax not itemised
            </span>
          )}
        </div>
        {/* One truncating line, not a wrapping one: on a phone the wrap put a
            lone "· 27BBBBB…" on its own row, which reads as a stray bullet. */}
        <p className="mt-1 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="font-[650]" style={{ color: 'var(--text-secondary)' }}>
            {inv.organization_name || '—'}
          </span>
          {' · '}{fmtDate(inv.issued_at)}
          {inv.plan_name ? ` · ${inv.plan_name}` : ''}
          {gstin ? ` · ${gstin}` : ''}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[13.5px] font-[800] tabular-nums" style={{ color: refunded ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          {fmtINR(inv.amount_inr)}
        </p>
        <p className="text-[10.5px] tabular-nums" style={{ color: 'var(--text-disabled)' }}>
          {tax === null ? '—' : `incl. ${fmtINR(tax)} GST`}
        </p>
      </div>

      <a
        href={api.superAdmin.invoicePdfUrl(inv.id)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open invoice ${inv.invoice_number} as PDF`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <FileText size={14} />
      </a>
    </div>
  );
}

/* ── Seller identity ─────────────────────────────────────────────────────── */
const SETTING_FIELDS: { key: keyof PlatformBillingSettings; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: 'legal_name', label: 'Registered name', placeholder: 'MY PT STUDIO PRIVATE LIMITED', wide: true },
  { key: 'gstin', label: 'GSTIN', placeholder: '27AAACM1234A1Z5' },
  { key: 'pan', label: 'PAN', placeholder: 'AAACM1234A' },
  { key: 'address_line1', label: 'Address line 1', wide: true },
  { key: 'address_line2', label: 'Address line 2', wide: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'state_code', label: 'GST state code', placeholder: '27' },
  { key: 'postal_code', label: 'PIN' },
  { key: 'email', label: 'Billing email' },
  { key: 'phone', label: 'Phone' },
  { key: 'invoice_prefix', label: 'Invoice prefix', placeholder: 'MPT' },
  { key: 'invoice_notes', label: 'Invoice footer note', wide: true },
];

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<Partial<PlatformBillingSettings> | null>(null);
  const [rate, setRate] = useState('18');
  const [inclusive, setInclusive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.superAdmin.billingSettings()
      .then((r) => {
        setForm(r.data);
        setRate(String(Number(r.data.gst_percent ?? 18)));
        setInclusive(r.data.prices_include_gst !== false);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load billing settings.'));
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const patch: Partial<PlatformBillingSettings> = {};
      for (const f of SETTING_FIELDS) patch[f.key] = form[f.key] as never;
      patch.gst_percent = Number(rate);
      patch.prices_include_gst = inclusive;
      const r = await api.superAdmin.saveBillingSettings(patch);
      setForm(r.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof PlatformBillingSettings, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="rounded-[16px] p-4" style={cardStyle}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>Seller identity</p>
          <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Printed on every invoice issued from now on.
          </p>
        </div>
        <button onClick={onClose} className="text-[12px] font-[650]" style={{ color: 'var(--text-muted)' }}>Close</button>
      </div>

      {!form && !error && (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} /></div>
      )}

      {form && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SETTING_FIELDS.map((f) => (
              <label key={String(f.key)} className={`flex flex-col gap-1 ${f.wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
                  {f.label}
                </span>
                <input
                  value={(form[f.key] as string) ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none"
                  style={inputStyle}
                />
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-[12px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>GST rate %</span>
                <input
                  type="number" min={0} max={100} step="0.01"
                  value={rate} onChange={(e) => setRate(e.target.value)}
                  className="h-10 w-24 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={inputStyle}
                />
              </label>
              <label className="flex min-h-[40px] cursor-pointer items-center gap-2">
                <input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} className="h-4 w-4" />
                <span className="text-[12.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
                  Plan prices already include GST
                </span>
              </label>
            </div>
            {/* The single most important thing an operator needs to know before
                touching the rate, so it sits next to the input, not in a doc. */}
            <p className="mt-2 flex items-start gap-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              <Info size={12} className="mt-0.5 shrink-0" />
              Changing these affects invoices issued from now on. Invoices already issued keep the
              rate and split recorded on them.
            </p>
          </div>

          {error && (
            <p className="mt-3 text-[12px] font-[650]" style={{ color: 'var(--danger-text)' }}>{error}</p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={save} disabled={saving}
              className="flex h-10 items-center gap-1.5 rounded-[11px] px-4 text-[12.5px] font-[700] text-white disabled:opacity-60"
              style={{ background: 'var(--brand)' }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
            {form.updated_by && (
              <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                Last changed by {form.updated_by}
              </span>
            )}
          </div>
        </>
      )}

      {error && !form && (
        <p className="py-6 text-center text-[12.5px]" style={{ color: 'var(--danger-text)' }}>{error}</p>
      )}
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
export default function InvoicesPanel() {
  const thisFy = useMemo(() => fyBounds(0), []);
  const lastFy = useMemo(() => fyBounds(-1), []);

  const [from, setFrom] = useState(thisFy.from);
  const [to, setTo] = useState(thisFy.to);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [rows, setRows] = useState<SubscriptionInvoice[]>([]);
  const [totals, setTotals] = useState<InvoiceTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const query: InvoiceQuery = useMemo(() => ({
    from: from || undefined,
    to: to || undefined,
    status: status || undefined,
    q: debouncedQ || undefined,
    limit: PAGE_SIZE,
    offset,
  }), [from, to, status, debouncedQ, offset]);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.invoices(query)
      .then((r) => { setRows(r.data ?? []); setTotals(r.totals ?? null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load invoices.'))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const applyRange = (f: string, t: string) => { setFrom(f); setTo(t); setOffset(0); };
  const reset = () => { applyRange(thisFy.from, thisFy.to); setStatus(''); setQ(''); setDebouncedQ(''); };

  const month = monthBounds();
  const presets = [
    { label: 'This month', from: month.from, to: month.to },
    { label: thisFy.label, from: thisFy.from, to: thisFy.to },
    { label: lastFy.label, from: lastFy.from, to: lastFy.to },
    { label: 'All', from: '', to: '' },
  ];

  const total = totals?.count ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilters = [status, debouncedQ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Totals for the whole filtered set, not just this page. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Invoiced" value={fmtINR(totals?.gross_inr)} sub={`${total.toLocaleString('en-IN')} invoice${total === 1 ? '' : 's'}`} tone="positive" />
        <Tile label="Taxable value" value={fmtINR(totals?.taxable_inr)} sub="excluding GST" />
        <Tile
          label="GST"
          value={fmtINR(totals?.tax_inr)}
          sub={totals?.untaxed_count
            ? `excludes ${totals.untaxed_count} not itemised`
            : 'CGST + SGST + IGST'}
          subTone={totals?.untaxed_count ? 'caution' : undefined}
        />
        <Tile label="Refunded" value={fmtINR(totals?.refunded_inr)} sub="excluded from the total above" tone={totals?.refunded_inr ? 'critical' : 'neutral'} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Invoice no., studio, reference…"
            aria-label="Search invoices"
            className="h-10 w-full rounded-[11px] pl-9 pr-3 text-[12.5px] outline-none" style={inputStyle}
          />
        </div>

        <div className="flex gap-1 rounded-[11px] p-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyRange(p.from, p.to)}
              className="min-h-[32px] rounded-[8px] px-2.5 text-[11px] font-[700] transition-colors"
              style={from === p.from && to === p.to
                ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(15,23,42,0.10)' }
                : { color: 'var(--text-muted)' }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[650]" style={inputStyle}
        >
          <Filter size={13} /> Filters
          {activeFilters > 0 && (
            <span className="rounded-full px-1.5 text-[10px] font-[800]" style={{ background: 'var(--brand)', color: '#fff' }}>
              {activeFilters}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}
          aria-label="Seller identity and GST settings"
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[650]" style={inputStyle}
        >
          <Settings2 size={13} /> Identity
        </button>

        <a
          href={api.superAdmin.invoicesExportUrl(query)}
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[650] text-white"
          style={{ background: 'var(--brand)' }}
        >
          <Download size={13} /> Export CSV
        </a>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="grid grid-cols-1 gap-3 rounded-[14px] p-3.5 sm:grid-cols-2 lg:grid-cols-4" style={cardStyle}>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Status</span>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}
                  className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={inputStyle}>
                  <option value="">All</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>From</span>
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }}
                  className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>To</span>
                <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }}
                  className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={inputStyle} />
              </label>
              <div className="flex items-end">
                <button onClick={reset} className="flex min-h-[36px] items-center gap-1.5 text-[12px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showSettings && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </m.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="overflow-hidden rounded-[16px]" style={cardStyle}>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${total.toLocaleString('en-IN')} invoice${total === 1 ? '' : 's'}`}
          </p>
          {total > PAGE_SIZE && (
            <div className="flex items-center gap-1">
              <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}
                aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-[8px] disabled:opacity-40"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <ChevronLeft size={14} />
              </button>
              <span className="px-1.5 text-[11.5px] font-[650] tabular-nums" style={{ color: 'var(--text-muted)' }}>{page} / {pages}</span>
              <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total}
                aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-[8px] disabled:opacity-40"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2.5 py-14">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Loading invoices…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-2.5 py-14 text-center">
            <AlertTriangle size={22} style={{ color: 'var(--danger-text)' }} />
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button onClick={load} className="mt-1 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Try again</button>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Receipt size={22} style={{ color: 'var(--text-disabled)' }} />
            <p className="text-[13px] font-[650]" style={{ color: 'var(--text-secondary)' }}>No invoices in this range</p>
            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Widen the dates or clear a filter.</p>
          </div>
        )}

        {rows.map((inv) => <Row key={inv.id} inv={inv} />)}
      </div>
    </div>
  );
}
