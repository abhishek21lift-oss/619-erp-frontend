'use client';

// Storage Centre — what is in object storage, and whose is it?
//
// ── Every number on this screen is partial, and the screen says so ──────────
//
// Attribution happens at write time (there is no studio in an object key), so
// anything uploaded before the ledger existed has no row. The API returns
// `measuring_since` and this panel leads with it. The same discipline as the
// Billing Centre's un-itemised invoices and the AI Control Centre's unpriced
// models: a partial figure presented as a total gets budgeted against.
//
// ── Live, deleted and unattributed are three separate numbers ───────────────
//
// "What am I paying for" (live), "what could I reclaim" (soft-deleted) and
// "what could I not attribute" (no studio in scope at write time) answer
// different questions. Netting them together answers none of them, so they are
// never summed into one headline.
//
// ── Read-only, by construction ─────────────────────────────────────────────
//
// There is no delete button here and no way to fetch an object. This panel
// reports on the ledger; it cannot touch the bucket. Purging is a decision
// with no undo, and it does not belong behind a hover state on a table row.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HardDrive, Loader2, AlertTriangle, Building2, Trash2, FileQuestion,
  TrendingUp, Info, Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  StorageOverview, StorageStudio, StorageTrendPoint, StorageObject,
} from '@/lib/api';
import { Panel, SectionLabel, StatTile, Reveal } from './console';

const RANGES = [7, 30, 90];

const nf = (n: number) => n.toLocaleString('en-IN');

/**
 * Binary units, because that is what object storage bills in and what every
 * other tool an operator has open will show. Two significant places below a
 * gigabyte and one above it — past that the extra digit is noise.
 */
function fmtBytes(n: number) {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / 1024 ** i;
  return `${v.toFixed(i === 0 ? 0 : v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

function fmtWhen(iso: string | null) {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDate(iso: string | null) {
  if (!iso) return 'unknown';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** `parq/pdf` → `Parq / Pdf`. The keys are internal; the labels are not. */
function prettyCategory(c: string) {
  return c.split('/').map((p) => p.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())).join(' / ');
}

/* ── Coverage banner ─────────────────────────────────────────────────────────
   Deliberately the first thing on the page rather than a footnote. Everything
   below it is conditional on this sentence being read. */
function CoverageNote({ since }: { since: string | null }) {
  return (
    <div
      className="rounded-[14px] p-3.5"
      style={{ background: 'color-mix(in srgb, var(--brand) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 24%, transparent)' }}
    >
      <p className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--brand)' }} />
        <span>
          {since ? (
            <>
              These are bytes <strong style={{ color: 'var(--text-primary)' }}>accounted since {fmtDate(since)}</strong>,
              not everything in the bucket. Objects written before then were never
              recorded against a studio and are not counted here.
            </>
          ) : (
            <>
              Coverage is <strong style={{ color: 'var(--text-primary)' }}>unknown</strong> — the accounting
              start date could not be read, so treat every total below as a lower bound.
            </>
          )}
        </span>
      </p>
    </div>
  );
}

/* ── Bytes accounted per day ─────────────────────────────────────────────────
   What ARRIVED each day, not a running total of what is stored. A cumulative
   line only ever rises, which hides the one thing worth seeing: the day
   something unusual landed. One measure, one hue — the house convention. */
function StorageTrend({ points, days }: { points: StorageTrendPoint[]; days: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 100; const H = 32;
  const max = Math.max(1, ...points.map((p) => p.bytes));
  const step = points.length > 1 ? W / (points.length - 1) : W;

  const xy = points.map((p, i) => ({
    x: points.length > 1 ? i * step : W / 2,
    y: H - (p.bytes / max) * (H - 3) - 1.5,
  }));
  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = xy.length ? `${line} L${xy[xy.length - 1].x.toFixed(2)},${H} L${xy[0].x.toFixed(2)},${H} Z` : '';
  const active = hover !== null ? points[hover] : null;
  const total = points.reduce((a, p) => a + p.bytes, 0);

  return (
    <Panel>
      <p className="text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>Accounted per day</p>
      {/* The headline reads the hovered day when there is one, so the number
          and the mark can never disagree. */}
      <p className="mt-1 text-[20px] font-[800] tabular-nums leading-tight" style={{ color: 'var(--text-primary)' }}>
        {fmtBytes(active ? active.bytes : total)}
      </p>
      <p className="mb-2 h-[14px] text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
        {active ? `${active.day} · ${nf(active.objects)} object${active.objects === 1 ? '' : 's'}` : `over ${days} days`}
      </p>
      {points.length === 0 ? (
        <p className="py-5 text-center text-[12px]" style={{ color: 'var(--text-disabled)' }}>
          Nothing uploaded in this window.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
          className="h-[46px] w-full overflow-visible" role="img"
          aria-label={`Storage accounted per day: ${fmtBytes(total)} over ${days} days`}
          onMouseLeave={() => setHover(null)}
        >
          <path d={area} fill="color-mix(in srgb, var(--brand) 14%, transparent)" />
          {/* vectorEffect keeps the stroke 2px after the non-uniform scale
              preserveAspectRatio="none" applies. */}
          <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {hover !== null && (
            <circle cx={xy[hover].x} cy={xy[hover].y} r={3} fill="var(--brand)"
              stroke="var(--bg-elevated)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          )}
          {/* Hit bands far bigger than the marks — a 2px line is not a target. */}
          {points.map((p, i) => (
            <rect key={p.day} x={i * step - step / 2} y={0} width={step} height={H}
              fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
      )}
    </Panel>
  );
}

/* ── What kind of file is it ─────────────────────────────────────────────────
   A sorted bar list, not a stacked bar or a donut. The question is "which
   category is biggest, and by how much" — lengths from a common baseline
   answer that; angles and stacked segments do not. It also means one hue does
   the whole chart, so nothing here depends on telling six colours apart. */
function CategoryBars({ rows, total }: { rows: StorageOverview['by_category']; total: number }) {
  if (!rows.length) {
    return (
      <Panel>
        <p className="py-6 text-center text-[12px]" style={{ color: 'var(--text-disabled)' }}>
          No objects accounted yet.
        </p>
      </Panel>
    );
  }
  const max = Math.max(...rows.map((r) => r.bytes), 1);
  return (
    <Panel>
      <p className="mb-3 text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>By category</p>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.category}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-[12px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
                {prettyCategory(r.category)}
              </span>
              <span className="shrink-0 tabular-nums text-[11.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                {fmtBytes(r.bytes)}
                <span className="ml-1.5 font-[600]" style={{ color: 'var(--text-disabled)' }}>
                  {total > 0 ? `${Math.round((r.bytes / total) * 100)}%` : '—'}
                </span>
              </span>
            </div>
            <div className="h-[6px] w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
              {/* Scaled to the LARGEST category, not to the total: with one
                  dominant category every other bar would be a sliver and the
                  comparison between them — the actual question — would be
                  unreadable. */}
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (r.bytes / max) * 100)}%`, background: 'var(--brand)' }}
              />
            </div>
            <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
              {nf(r.objects)} object{r.objects === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Per-studio ──────────────────────────────────────────────────────────── */
function StudioTable({ rows }: { rows: StorageStudio[] }) {
  if (!rows.length) {
    return (
      <Panel>
        <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          No studio has stored anything since accounting began.
        </p>
      </Panel>
    );
  }
  const max = Math.max(...rows.map((r) => r.bytes), 1);
  return (
    <Panel padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Studio', 'Stored', 'Objects', 'Reclaimable', 'Last upload'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[10px] font-[750] uppercase ${i === 0 ? '' : 'text-right'}`}
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.organization_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3">
                  <p className="truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                    {r.organization_name}
                  </p>
                  <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                    {r.plan_code || 'no plan'} · {r.categories} categor{r.categories === 1 ? 'y' : 'ies'}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="tabular-nums text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                    {fmtBytes(r.bytes)}
                  </p>
                  {/* A bar under the figure, scaled to the largest studio: the
                      ranking is the point, and a column of numbers alone makes
                      "twice as much" something you have to work out. */}
                  <div className="mt-1 ml-auto h-[4px] w-[72px] overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.max(3, (r.bytes / max) * 100)}%`, background: 'var(--brand)' }} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  {nf(r.objects)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[12px]"
                  style={{ color: r.deleted_bytes > 0 ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>
                  {r.deleted_bytes > 0 ? fmtBytes(r.deleted_bytes) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {fmtWhen(r.last_upload_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ── The objects actually driving the bill ───────────────────────────────── */
function LargestTable({ rows }: { rows: StorageObject[] }) {
  if (!rows.length) {
    return (
      <Panel>
        <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          Nothing accounted yet.
        </p>
      </Panel>
    );
  }
  return (
    <Panel padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Object', 'Studio', 'Size', 'Uploaded'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[10px] font-[750] uppercase ${i >= 2 ? 'text-right' : ''}`}
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="max-w-[300px] px-4 py-2.5">
                  {/* The key, not a link. Nothing on this screen can serve a
                      file, and a link that looked like one would invite the
                      operator to open a client's signed consent form. */}
                  <p className="truncate font-mono text-[11.5px]" style={{ color: 'var(--text-primary)' }} title={r.key}>
                    {r.key}
                  </p>
                  <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                    {prettyCategory(r.category)}{r.content_type ? ` · ${r.content_type}` : ''}
                  </p>
                </td>
                <td className="px-4 py-2.5 text-[12px]"
                  style={{ color: r.organization_name ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>
                  {r.organization_name || 'unattributed'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                  {fmtBytes(r.bytes)}
                </td>
                <td className="px-4 py-2.5 text-right text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {fmtWhen(r.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function StorageCentre() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<StorageOverview | null>(null);
  const [studios, setStudios] = useState<StorageStudio[]>([]);
  const [trend, setTrend] = useState<StorageTrendPoint[]>([]);
  const [largest, setLargest] = useState<StorageObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([
      api.superAdmin.storageOverview(days),
      api.superAdmin.storageByStudio(),
      api.superAdmin.storageTrend(days),
      api.superAdmin.storageLargest(20),
    ])
      .then(([o, s, t, l]) => {
        setOverview(o.data); setStudios(s.data); setTrend(t.data); setLargest(l.data);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load storage usage.'))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  // The share of live bytes that could not be attributed to any studio. Worth
  // naming as a percentage because it is the accuracy of every per-studio
  // figure below, not a curiosity.
  const unattributedPct = useMemo(() => {
    if (!overview || overview.bytes <= 0) return 0;
    return Math.round((overview.unattributed_bytes / overview.bytes) * 100);
  }, [overview]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Reading storage usage…</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16 text-center">
        <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error || 'Could not load storage usage.'}</p>
        <button onClick={load} className="mt-1 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-[11px] p-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          {RANGES.map((d) => (
            <button
              key={d} onClick={() => setDays(d)}
              className="min-h-[32px] rounded-[8px] px-2.5 text-[11px] font-[700] transition-colors"
              style={days === d
                ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(15,23,42,0.10)' }
                : { color: 'var(--text-muted)' }}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <CoverageNote since={overview.measuring_since} />

      <div>
        <SectionLabel hint={overview.measuring_since ? `since ${fmtDate(overview.measuring_since)}` : 'coverage unknown'}>
          Stored
        </SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Live storage" value={fmtBytes(overview.bytes)}
            sub={`${nf(overview.objects)} object${overview.objects === 1 ? '' : 's'} · ${overview.studios} studio${overview.studios === 1 ? '' : 's'}`}
            icon={<HardDrive size={15} />}
          />
          <StatTile
            label={`Added · ${days}d`} value={fmtBytes(overview.bytes_added)}
            sub={`${nf(overview.objects_added)} new object${overview.objects_added === 1 ? '' : 's'}`}
            tone="brand" icon={<TrendingUp size={15} />} delay={0.04}
          />
          <StatTile
            label="Reclaimable" value={fmtBytes(overview.deleted_bytes)}
            // Deleted here means "the app deleted it and the row was kept".
            // Whether the bytes have actually left the bucket is R2's business,
            // so this is framed as what could be reclaimed, not what was.
            sub={`${nf(overview.deleted_objects)} deleted object${overview.deleted_objects === 1 ? '' : 's'}`}
            tone={overview.deleted_bytes > 0 ? 'caution' : 'brand'} icon={<Trash2 size={15} />} delay={0.08}
          />
          <StatTile
            label="Unattributed" value={fmtBytes(overview.unattributed_bytes)}
            // Shown even at zero: an operator needs to know this figure exists
            // and is being watched, not discover it the first time it is not
            // zero. It is exactly the gap between the platform total and the
            // sum of the per-studio rows below.
            sub={overview.unattributed_bytes > 0
              ? `${unattributedPct}% of live bytes have no studio`
              : 'every byte is attributed'}
            // Amber only once the gap is big enough to distort the per-studio
            // figures; below that it is brand like every other tile, so colour on
            // this screen always means "look here".
            tone={unattributedPct >= 10 ? 'caution' : 'brand'}
            icon={<FileQuestion size={15} />} delay={0.12}
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Reveal delay={0.04}><StorageTrend points={trend} days={days} /></Reveal>
        <Reveal delay={0.08}><CategoryBars rows={overview.by_category} total={overview.bytes} /></Reveal>
      </div>

      <div>
        <SectionLabel hint={`${studios.length} studio${studios.length === 1 ? '' : 's'} with stored objects`}>
          By studio
        </SectionLabel>
        <Reveal delay={0.04}><StudioTable rows={studios} /></Reveal>
        {overview.unattributed_bytes > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
            <Layers size={12} className="mt-0.5 shrink-0" />
            <span>
              These rows sum to {fmtBytes(overview.bytes - overview.unattributed_bytes)} — the
              remaining {fmtBytes(overview.unattributed_bytes)} was written with no studio in
              scope, or belonged to a studio that has since been deleted.
            </span>
          </p>
        )}
      </div>

      <div>
        <SectionLabel hint="largest first">Biggest objects</SectionLabel>
        <Reveal delay={0.04}><LargestTable rows={largest} /></Reveal>
      </div>

      <p className="flex items-start gap-1.5 pb-2 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
        <Building2 size={12} className="mt-0.5 shrink-0" />
        <span>
          Read-only. Nothing on this screen deletes an object or opens a file —
          it reports what the upload ledger recorded.
        </span>
      </p>
    </div>
  );
}
