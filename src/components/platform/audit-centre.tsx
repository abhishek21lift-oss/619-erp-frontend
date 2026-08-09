'use client';

// Audit Centre — the Control Centre's investigative view of activity_log.
//
// Distinct from the dashboard's Activity feed, which answers "what happened
// lately". This answers "what did this operator change on that studio last
// Tuesday, and what was the value before?" — so it carries a time window,
// entity/action filters, free-text search, real pagination, per-row before/
// after payloads, and CSV export of exactly the filtered set.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, ScrollText, Loader2, AlertTriangle, Monitor, Globe,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AuditEntry, AuditQuery } from '@/lib/api';

const PAGE_SIZE = 50;

/* Presets cover how operators actually reach for a time window; the custom
   inputs stay available underneath for a specific incident date. */
const RANGES = [
  { id: '24h', label: '24h', days: 1 },
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: 'all', label: 'All', days: null },
] as const;

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtWhen(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/* The API stores the raw user agent; operators want "Chrome on macOS", not a
   120-character string. Deliberately coarse — this is for recognising a
   session at a glance, not device fingerprinting. */
function parseAgent(ua?: string | null): { browser: string; os: string } {
  if (!ua) return { browser: '—', os: '—' };
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\//.test(ua) ? 'Opera' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari' :
    /Firefox\//.test(ua) ? 'Firefox' : 'Other';
  const os =
    /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
    /Android/.test(ua) ? 'Android' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Windows/.test(ua) ? 'Windows' :
    /Linux/.test(ua) ? 'Linux' : '—';
  return { browser, os };
}

/* Destructive/sensitive actions are tinted so a page of routine edits does not
   read the same as a page of deletions. Colour is a secondary cue only — the
   action name is always spelled out. */
function actionTone(action: string): { bg: string; fg: string } {
  if (/delete|revoke|suspend|cancel|refund|reject/i.test(action)) return { bg: 'rgba(239,68,68,0.12)', fg: '#dc2626' };
  if (/create|activate|approve|grant/i.test(action)) return { bg: 'rgba(16,185,129,0.12)', fg: '#059669' };
  if (/impersonat|password|mfa|export/i.test(action)) return { bg: 'rgba(245,158,11,0.14)', fg: '#b45309' };
  return { bg: 'var(--bg-subtle)', fg: 'var(--text-secondary)' };
}

function Payload({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!text || text === '{}' || text === 'null') return null;
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[9.5px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
        {label}
      </p>
      <pre
        className="overflow-x-auto rounded-[9px] p-2.5 text-[11px] leading-relaxed"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        {text}
      </pre>
    </div>
  );
}

function Row({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const tone = actionTone(entry.action);
  const agent = parseAgent(entry.user_agent);
  const hasDetail = Boolean(entry.old_data || entry.new_data || entry.ip_address || entry.user_agent);

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)] sm:px-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="rounded-[7px] px-2 py-0.5 text-[10.5px] font-[750]"
              style={{ background: tone.bg, color: tone.fg }}
            >
              {entry.action}
            </span>
            {entry.entity_type && (
              <span className="text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                {entry.entity_type}
                {entry.entity_id ? ` · ${String(entry.entity_id).slice(0, 12)}` : ''}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span className="font-[650]" style={{ color: 'var(--text-secondary)' }}>{entry.user_name || 'System'}</span>
            {entry.organization_name && <span>· {entry.organization_name}</span>}
            <span>· {fmtWhen(entry.created_at)}</span>
          </div>
        </div>
        {hasDetail && (
          <ChevronDown
            size={15}
            className="shrink-0 transition-transform"
            style={{ color: 'var(--text-disabled)', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-3 pb-3.5 sm:px-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Payload label="Previous value" value={entry.old_data} />
                <Payload label="New value" value={entry.new_data} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {entry.ip_address && (
                  <span className="flex items-center gap-1.5"><Globe size={11} />{entry.ip_address}</span>
                )}
                {entry.user_agent && (
                  <span className="flex items-center gap-1.5"><Monitor size={11} />{agent.browser} · {agent.os}</span>
                )}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AuditCentre() {
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('7d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opts, setOpts] = useState<{ actions: string[]; entity_types: string[] }>({ actions: [], entity_types: [] });

  // Debounced so typing in the search box does not fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    api.superAdmin.auditFilters().then(setOpts).catch(() => { /* filters are a nicety, not required */ });
  }, []);

  const query: AuditQuery = useMemo(() => {
    const preset = RANGES.find((r) => r.id === range);
    const computedFrom = preset?.days ? ymd(new Date(Date.now() - preset.days * 86400000)) : '';
    return {
      from: from || computedFrom || undefined,
      to: to || undefined,
      action: action || undefined,
      entity_type: entityType || undefined,
      q: debouncedQ || undefined,
      limit: PAGE_SIZE,
      offset,
    };
  }, [range, from, to, action, entityType, debouncedQ, offset]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.superAdmin.audit(query)
      .then((r) => { setRows(r.data ?? []); setTotal(r.paging?.total ?? 0); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the audit log.'))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setRange('7d'); setFrom(''); setTo(''); setAction(''); setEntityType('');
    setQ(''); setDebouncedQ(''); setOffset(0);
  };

  const activeFilters = [action, entityType, from, to, debouncedQ].filter(Boolean).length;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
  } as const;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search actor, action, studio…"
            aria-label="Search the audit log"
            className="h-10 w-full rounded-[11px] pl-9 pr-3 text-[12.5px] outline-none"
            style={selectStyle}
          />
        </div>

        <div className="flex gap-1 rounded-[11px] p-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => { setRange(r.id); setFrom(''); setTo(''); setOffset(0); }}
              className="min-h-[32px] rounded-[8px] px-2.5 text-[11px] font-[700] transition-colors"
              style={range === r.id && !from && !to
                ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(15,23,42,0.10)' }
                : { color: 'var(--text-muted)' }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[650]"
          style={selectStyle}
        >
          <Filter size={13} />
          Filters
          {activeFilters > 0 && (
            <span className="rounded-full px-1.5 text-[10px] font-[800]" style={{ background: 'var(--brand)', color: '#fff' }}>
              {activeFilters}
            </span>
          )}
        </button>

        <a
          href={api.superAdmin.auditExportUrl(query)}
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[650] text-white"
          style={{ background: 'var(--brand)' }}
        >
          <Download size={13} /> Export
        </a>
      </div>

      {/* Filter drawer */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <m.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden"
          >
            <div
              className="grid grid-cols-1 gap-3 rounded-[14px] p-3.5 sm:grid-cols-2 lg:grid-cols-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Action</span>
                <select value={action} onChange={(e) => { setAction(e.target.value); setOffset(0); }}
                  className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={selectStyle}>
                  <option value="">All actions</option>
                  {opts.actions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Module</span>
                <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setOffset(0); }}
                  className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={selectStyle}>
                  <option value="">All modules</option>
                  {opts.entity_types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>From</span>
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }}
                  className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={selectStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>To</span>
                <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }}
                  className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={selectStyle} />
              </label>
              <div className="sm:col-span-2 lg:col-span-4">
                <button onClick={reset} className="flex min-h-[36px] items-center gap-1.5 text-[12px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                  <RotateCcw size={12} /> Reset filters
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="overflow-hidden rounded-[16px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${total.toLocaleString('en-IN')} event${total === 1 ? '' : 's'}`}
          </p>
          {total > PAGE_SIZE && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] disabled:opacity-40"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-1.5 text-[11.5px] font-[650] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {page} / {pages}
              </span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] disabled:opacity-40"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2.5 py-14">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Loading audit trail…</p>
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
            <ScrollText size={22} style={{ color: 'var(--text-disabled)' }} />
            <p className="text-[13px] font-[650]" style={{ color: 'var(--text-secondary)' }}>No events match these filters</p>
            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Widen the date range or clear a filter.</p>
          </div>
        )}

        {rows.map((e) => <Row key={String(e.id)} entry={e} />)}
      </div>
    </div>
  );
}
