'use client';

// Activity Log — a studio's own read of its business-write audit trail.
//
// Distinct from the platform's Audit Centre (super-admin only, cross-studio,
// with a real search/date-range/export): this is the same activity_log table
// but read through GET /api/pt-os/activity-log, which the backend scopes
// unconditionally to the caller's own organization. So there is no org
// picker, no cross-tenant search — just "what changed here, and what was it
// before" for the write paths a studio's own admins and managers actually
// care about: clients created/edited/removed, payments recorded/deleted,
// trainer commissions changed.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ScrollText, ChevronDown, ChevronLeft, ChevronRight, Filter, RotateCcw, Loader2, AlertTriangle,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import type { ActivityLogEntry } from '@/lib/api';

const PAGE_SIZE = 50;

/* Every action this page can see is spelled `entity.verb` (client.create,
   payment.delete, trainer.commission_update, …) — coarse colour cues by verb
   so a page of edits doesn't read the same as a page of deletions. */
function actionTone(action: string): { bg: string; fg: string } {
  if (/delete|cancel/i.test(action)) return { bg: 'rgba(239,68,68,0.12)', fg: '#dc2626' };
  if (/create/i.test(action)) return { bg: 'rgba(16,185,129,0.12)', fg: '#059669' };
  return { bg: 'rgba(245,158,11,0.14)', fg: '#b45309' };
}

function fmtWhen(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
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

function Row({ entry }: { entry: ActivityLogEntry }) {
  const [open, setOpen] = useState(false);
  const tone = actionTone(entry.action);
  const hasDetail = Boolean(entry.old_data || entry.new_data);

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
            <div className="flex flex-col gap-3 px-3 pb-3.5 sm:flex-row sm:px-4">
              <Payload label="Previous value" value={entry.old_data} />
              <Payload label="New value" value={entry.new_data} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ActivityLogPage() {
  return (
    <Guard roles={['admin', 'manager']}>
      <Inner />
    </Guard>
  );
}

function Inner() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [rows, setRows] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = useMemo(() => ({
    action: action || undefined,
    entity_type: entityType || undefined,
    limit: PAGE_SIZE,
    offset,
  }), [action, entityType, offset]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.pt.activityLog(query)
      .then((r) => { setRows(r.data ?? []); setTotal(r.paging?.total ?? 0); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the activity log.'))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setAction(''); setEntityType(''); setOffset(0); };
  const activeFilters = [action, entityType].filter(Boolean).length;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
  } as const;

  return (
    <>
      <PageHeader
        title="Activity Log"
        subtitle="Every client, payment and commission change made in your studio, and the value before."
        icon={<ScrollText size={19} />}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
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
        </div>

        <AnimatePresence initial={false}>
          {showFilters && (
            <m.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }} className="overflow-hidden"
            >
              <div
                className="grid grid-cols-1 gap-3 rounded-[14px] p-3.5 sm:grid-cols-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Action</span>
                  <input
                    value={action}
                    onChange={(e) => { setAction(e.target.value); setOffset(0); }}
                    placeholder="e.g. client.create, payment.delete"
                    className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none"
                    style={selectStyle}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Module</span>
                  <input
                    value={entityType}
                    onChange={(e) => { setEntityType(e.target.value); setOffset(0); }}
                    placeholder="e.g. pt_client, pt_payment, pt_trainer"
                    className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none"
                    style={selectStyle}
                  />
                </label>
                <div className="sm:col-span-2">
                  <button onClick={reset} className="flex min-h-[36px] items-center gap-1.5 text-[12px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                    <RotateCcw size={12} /> Reset filters
                  </button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

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
              <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Loading activity log…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-2.5 py-14 text-center">
              <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
              <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
              <button onClick={load} className="mt-1 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Try again</button>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <ScrollText size={22} style={{ color: 'var(--text-disabled)' }} />
              <p className="text-[13px] font-[650]" style={{ color: 'var(--text-secondary)' }}>No events match these filters</p>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Clear a filter to widen the search.</p>
            </div>
          )}

          {rows.map((e) => <Row key={String(e.id)} entry={e} />)}
        </div>
      </div>
    </>
  );
}
