'use client';

// AI Control Centre — who is spending the AI budget, and what are they allowed?
//
// ── Cost is shown only where it is known ─────────────────────────────────────
//
// Model rates are operator-entered; nothing here guesses a price. When any
// model in the window has no rate, the API returns it in `unpriced_models` and
// this panel labels the cost a FLOOR rather than a total. An understated
// number presented as complete is worse than no number, because it will be
// budgeted against.
//
// ── The limits are visible before they bite ──────────────────────────────────
//
// Enforcement ships off. An operator can set caps, see exactly who would be
// cut off, and only then switch enforcement on — at which point the confirm
// says how many studios are ALREADY over, because that is how many stop
// working the moment the switch flips.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot, Loader2, AlertTriangle, Coins, Zap, Building2, Timer,
  ShieldAlert, Info, Save, Settings2, RotateCcw, Route,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  AiOverview, AiStudioUsage, AiModelUsage, AiTrendPoint, AiSettings, AiRouting,
} from '@/lib/api';
import { Panel, SectionLabel, StatTile, Reveal } from './console';
import { useToast } from '@/lib/toast';

const RANGES = [7, 30, 90];

const nf = (n: number) => n.toLocaleString('en-IN');

/** Tokens get large fast; a raw count stops being readable past a million. */
function fmtTokens(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return nf(n);
}

function fmtINR(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtWhen(iso: string | null) {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

/* ── Trend ───────────────────────────────────────────────────────────────────
   One measure, one hue — the house convention set by the Analytics tab. Its
   own y-scale anchored at zero, so the height of the line means the value and
   not its distance from an arbitrary floor. */
function TokenTrend({ points }: { points: AiTrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 100; const H = 32;
  const max = Math.max(1, ...points.map((p) => p.tokens));
  const step = points.length > 1 ? W / (points.length - 1) : W;

  const xy = points.map((p, i) => ({
    x: points.length > 1 ? i * step : W / 2,
    y: H - (p.tokens / max) * (H - 3) - 1.5,
  }));
  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = xy.length ? `${line} L${xy[xy.length - 1].x.toFixed(2)},${H} L${xy[0].x.toFixed(2)},${H} Z` : '';
  const active = hover !== null ? points[hover] : null;
  const total = points.reduce((a, p) => a + p.tokens, 0);

  return (
    <Panel>
      <p className="text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>Tokens per day</p>
      {/* The headline reads the hovered day when there is one, so the number
          and the mark can never disagree. */}
      <p className="mt-1 text-[20px] font-[800] tabular-nums leading-tight" style={{ color: 'var(--text-primary)' }}>
        {fmtTokens(active ? active.tokens : total)}
      </p>
      <p className="mb-2 h-[14px] text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
        {active ? `${active.day} · ${nf(active.requests)} requests` : `across ${points.length} days`}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        className="h-[46px] w-full overflow-visible" role="img"
        aria-label={`Tokens per day: ${fmtTokens(total)} across ${points.length} days`}
        onMouseLeave={() => setHover(null)}
      >
        <path d={area} fill="color-mix(in srgb, var(--brand) 14%, transparent)" />
        {/* vectorEffect keeps the stroke 2px after the non-uniform scale that
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
    </Panel>
  );
}

/* ── Per-studio usage against allowance ─────────────────────────────────── */
function StudioTable({ rows, onChanged }: { rows: AiStudioUsage[]; onChanged: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState('');

  const setLimit = async (r: AiStudioUsage) => {
    const raw = window.prompt(
      `Monthly token allowance for ${r.organization_name}.\n\n`
      + `Used this month: ${nf(r.tokens_this_month)}\n`
      + 'Enter a number, or leave blank to exempt this studio entirely.',
      r.limit === null ? '' : String(r.limit),
    );
    if (raw === null) return;
    const trimmed = raw.trim();
    // Blank is meaningful: it exempts, which is different from clearing.
    const monthly = trimmed === '' ? null : Number(trimmed);
    if (monthly !== null && (!Number.isFinite(monthly) || monthly < 0)) {
      toast.error('Enter a non-negative number, or leave blank to exempt.');
      return;
    }
    const reason = window.prompt('Why? (recorded in the audit trail)') ?? '';
    setBusy(r.organization_id);
    try {
      await api.superAdmin.setOrgAiLimit(r.organization_id, { monthly_tokens: monthly, reason: reason.trim() });
      toast.success(monthly === null ? `${r.organization_name} is now exempt.` : `Cap set for ${r.organization_name}.`);
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not set the allowance'); }
    finally { setBusy(''); }
  };

  const clearLimit = async (r: AiStudioUsage) => {
    setBusy(r.organization_id);
    try {
      await api.superAdmin.clearOrgAiLimit(r.organization_id);
      toast.success(`${r.organization_name} follows the platform default again.`);
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not clear the allowance'); }
    finally { setBusy(''); }
  };

  if (!rows.length) {
    return <Panel><p className="py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>No studio has used the AI Suite in this window.</p></Panel>;
  }

  return (
    <Panel padded={false}>
      {/* Scrolls inside its own box rather than pushing the page sideways. */}
      <div className="overflow-x-auto p-3.5 sm:p-5">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr style={{ color: 'var(--text-disabled)' }}>
              {['Studio', 'Requests', 'Tokens', 'Cost', 'This month vs allowance', ''].map((h, i) => (
                <th key={h || i} className={`whitespace-nowrap pb-2 text-[10px] font-[750] uppercase tracking-wider ${i === 0 || i === 5 ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.organization_id} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="py-2 pr-3">
                  <p className="truncate font-[650]" style={{ color: 'var(--text-primary)' }}>{r.organization_name}</p>
                  <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                    {r.plan_code || '—'} · {fmtWhen(r.last_used_at)}
                  </p>
                </td>
                <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{nf(r.requests)}</td>
                <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtTokens(r.tokens)}</td>
                <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {r.cost_inr > 0 ? fmtINR(r.cost_inr) : '—'}
                </td>
                <td className="py-2 pl-3 text-right">
                  {r.limit === null ? (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {fmtTokens(r.tokens_this_month)} · {r.limit_source === 'studio' ? 'exempt' : 'unlimited'}
                    </span>
                  ) : (
                    <>
                      <span className="tabular-nums" style={{ color: r.over ? 'var(--danger-text)' : 'var(--text-secondary)' }}>
                        {fmtTokens(r.tokens_this_month)} / {fmtTokens(r.limit)}
                        {r.used_pct !== null && <span className="ml-1.5 text-[10.5px]">{r.used_pct}%</span>}
                      </span>
                      <span className="ml-1.5 text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                        {r.limit_source === 'default' ? '(default)' : ''}
                      </span>
                    </>
                  )}
                </td>
                <td className="py-2 pl-3 text-right whitespace-nowrap">
                  {busy === r.organization_id ? (
                    <Loader2 size={13} className="inline animate-spin" style={{ color: 'var(--brand)' }} />
                  ) : (
                    <>
                      <button onClick={() => setLimit(r)} className="text-[11px] font-[650]" style={{ color: 'var(--brand)' }}>
                        {r.limit_source === 'studio' ? 'Edit' : 'Set cap'}
                      </button>
                      {r.limit_source === 'studio' && (
                        <button onClick={() => clearLimit(r)} className="ml-2 text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                          Clear
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ── Models ──────────────────────────────────────────────────────────────── */
function ModelTable({ rows, onRate }: { rows: AiModelUsage[]; onRate: (m: AiModelUsage) => void }) {
  if (!rows.length) {
    return <Panel><p className="py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>No AI requests in this window.</p></Panel>;
  }
  return (
    <Panel padded={false}>
      <div className="overflow-x-auto p-3.5 sm:p-5">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr style={{ color: 'var(--text-disabled)' }}>
              {['Model', 'Requests', 'Tokens', 'Cost', 'Latency', 'Fallbacks'].map((h, i) => (
                <th key={h} className={`whitespace-nowrap pb-2 text-[10px] font-[750] uppercase tracking-wider ${i ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.provider}:${r.model}`} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="py-2 pr-3">
                  <p className="truncate font-mono font-[650]" style={{ color: 'var(--text-primary)' }}>{r.model || '—'}</p>
                  <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{r.provider || '—'}</p>
                </td>
                <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{nf(r.requests)}</td>
                <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtTokens(r.tokens)}</td>
                <td className="py-2 text-right tabular-nums">
                  {r.priced ? (
                    <span style={{ color: 'var(--text-secondary)' }}>{fmtINR(r.cost_inr)}</span>
                  ) : (
                    // Not "₹0" — that would read as free rather than unknown.
                    <button onClick={() => onRate(r)} className="text-[11px] font-[650]" style={{ color: '#b45309' }}>
                      no rate set
                    </button>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{r.avg_latency_ms}ms</td>
                <td className="py-2 text-right tabular-nums" style={{ color: r.fallbacks ? '#b45309' : 'var(--text-muted)' }}>
                  {r.fallbacks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ── Settings ────────────────────────────────────────────────────────────── */
function SettingsPanel({ settings, onChanged }: { settings: AiSettings; onChanged: () => void }) {
  const { toast } = useToast();
  const [dflt, setDflt] = useState(settings.default_monthly_tokens === null ? '' : String(settings.default_monthly_tokens));
  const [warn, setWarn] = useState(String(settings.warn_at_pct));
  const [saving, setSaving] = useState(false);

  const save = async (patch: Parameters<typeof api.superAdmin.saveAiSettings>[0], confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setSaving(true);
    try {
      const r = await api.superAdmin.saveAiSettings(patch);
      toast.success(
        r.studios_already_over
          ? `Enforcement on — ${r.studios_already_over} studio${r.studios_already_over === 1 ? ' is' : 's are'} already over and will be refused.`
          : 'Saved.',
      );
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setSaving(false); }
  };

  const field = { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' } as const;

  return (
    <Panel>
      <p className="flex items-center gap-1.5 text-[12.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>
        <Settings2 size={13} style={{ color: 'var(--text-disabled)' }} /> Allowances
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-2">
        <input
          type="checkbox" checked={settings.enforcement_enabled} className="mt-0.5 h-4 w-4"
          onChange={(e) => save(
            { enforcement_enabled: e.target.checked },
            e.target.checked
              ? 'Switch on enforcement?\n\nStudios already over their allowance will start being refused immediately.'
              : undefined,
          )}
        />
        <span>
          <span className="text-[12.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>Enforce allowances</span>
          <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Off means limits are recorded and reported but never refuse a request.
          </span>
        </span>
      </label>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            Default monthly tokens
          </span>
          <input
            value={dflt} onChange={(e) => setDflt(e.target.value)} placeholder="unlimited"
            inputMode="numeric" className="h-9 w-40 rounded-[9px] px-2.5 text-[12.5px] outline-none" style={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Warn at %</span>
          <input
            value={warn} onChange={(e) => setWarn(e.target.value)} inputMode="numeric"
            className="h-9 w-20 rounded-[9px] px-2.5 text-[12.5px] outline-none" style={field}
          />
        </label>
        <button
          onClick={() => save({
            default_monthly_tokens: dflt.trim() === '' ? null : Number(dflt),
            warn_at_pct: Number(warn),
          })}
          disabled={saving}
          className="flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-[700] text-white disabled:opacity-50"
          style={{ background: 'var(--brand)' }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
        </button>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
        <Info size={11} className="mt-0.5 shrink-0" />
        Blank means unlimited. A studio with its own cap ignores this; a studio explicitly
        exempted stays exempt.
      </p>
    </Panel>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
/* ── Model routing ───────────────────────────────────────────────────────── */

const TIERS = ['primary', 'secondary', 'fallback'] as const;
type Tier = (typeof TIERS)[number];

const TIER_BLURB: Record<Tier, string> = {
  primary: 'Coaching, workouts, diet — everything client-facing.',
  secondary: 'Operational lookups: attendance, clients, sessions.',
  fallback: 'Business reporting, and the safety net when a tier fails.',
};

/**
 * Which model each tier resolves to. Separate from Settings above, which
 * governs how much a studio may spend rather than what it spends it on —
 * a blank field here is not "no model", it is "follow the deploy's
 * environment variable", so the effective value is always shown beneath.
 */
function RoutingPanel({ routing, onChanged }: { routing: AiRouting; onChanged: () => void }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<Tier, string>>({
    primary: routing.override.primary ?? '',
    secondary: routing.override.secondary ?? '',
    fallback: routing.override.fallback ?? '',
  });
  const [busy, setBusy] = useState(false);

  const dirty = TIERS.some((t) => (draft[t].trim() || null) !== (routing.override[t] ?? null));

  const reset = () => setDraft({
    primary: routing.override.primary ?? '',
    secondary: routing.override.secondary ?? '',
    fallback: routing.override.fallback ?? '',
  });

  const save = async () => {
    setBusy(true);
    try {
      await api.superAdmin.saveAiRouting({
        // '' means "clear this override" and is sent as null, so the server can
        // tell it apart from "leave it alone" — an omitted field.
        primary_model: draft.primary.trim() || null,
        secondary_model: draft.secondary.trim() || null,
        fallback_model: draft.fallback.trim() || null,
      });
      toast.success('Model routing updated');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not update model routing.');
    } finally { setBusy(false); }
  };

  return (
    <Panel>
      <div className="mb-3 flex items-start gap-2 rounded-[10px] p-2.5"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        <Info size={13} className="mt-[2px] shrink-0" style={{ color: 'var(--text-muted)' }} />
        <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Leave a tier blank to follow the deploy&rsquo;s environment variable. A model id is passed
          to the provider verbatim — one that does not exist there will fail every request on that
          tier until it is corrected, so change these one at a time and watch the fallback rate.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {TIERS.map((tier) => {
          const overridden = !!routing.override[tier];
          return (
            <div key={tier}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-[12.5px] font-[750] capitalize" style={{ color: 'var(--text-primary)' }}>
                  {tier}
                </span>
                <span className="text-[10px] font-[700] uppercase"
                  style={{ letterSpacing: '0.1em', color: overridden ? 'var(--brand)' : 'var(--text-disabled)' }}>
                  {overridden ? 'operator override' : routing.from_env[tier] ? 'from environment' : 'built-in default'}
                </span>
              </div>
              <p className="mb-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{TIER_BLURB[tier]}</p>
              <input
                value={draft[tier]}
                onChange={(e) => setDraft((d) => ({ ...d, [tier]: e.target.value }))}
                placeholder={routing.from_env[tier] ?? routing.defaults[tier]}
                spellCheck={false} autoComplete="off" aria-label={`${tier} model`}
                className="w-full rounded-[10px] px-3 py-2 text-[12.5px] outline-none"
                style={{
                  background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontFamily: 'ui-monospace, monospace',
                }}
              />
              <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                In force now: <span style={{ fontFamily: 'ui-monospace, monospace' }}>{routing.effective[tier]}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={save} disabled={!dirty || busy}
          className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-[700] transition-opacity disabled:opacity-40"
          style={{ background: 'var(--brand)', color: '#fff' }}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save routing
        </button>
        {dirty && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-[650]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <RotateCcw size={13} /> Discard
          </button>
        )}
        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
          <Route size={11} />
          {routing.updated_at
            ? `Last changed by ${routing.updated_by_name ?? 'an operator'} ${fmtWhen(routing.updated_at)}`
            : 'Never changed — every tier is following the deploy'}
        </span>
      </div>
    </Panel>
  );
}

export default function AiControlCentre() {
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<AiOverview | null>(null);
  const [studios, setStudios] = useState<AiStudioUsage[]>([]);
  const [models, setModels] = useState<AiModelUsage[]>([]);
  const [trend, setTrend] = useState<AiTrendPoint[]>([]);
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [routing, setRouting] = useState<AiRouting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([
      api.superAdmin.aiOverview(days), api.superAdmin.aiByStudio(days),
      api.superAdmin.aiByModel(days), api.superAdmin.aiTrend(days),
      api.superAdmin.aiSettings(), api.superAdmin.aiRouting(),
    ])
      .then(([o, s, m, t, cfg, route]) => {
        setOverview(o.data); setStudios(s.data); setModels(m.data);
        setTrend(t.data); setSettings(cfg.data); setRouting(route.data);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load AI usage.'))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const setRate = async (m: AiModelUsage) => {
    if (!m.model) return;
    const p = window.prompt(`Prompt cost per 1,000 tokens for ${m.model} (₹):`, '0');
    if (p === null) return;
    const c = window.prompt(`Completion cost per 1,000 tokens for ${m.model} (₹):`, '0');
    if (c === null) return;
    if (![p, c].every((v) => Number.isFinite(Number(v)) && Number(v) >= 0)) {
      toast.error('Rates must be non-negative numbers.');
      return;
    }
    try {
      await api.superAdmin.saveAiRate(m.model, {
        provider: m.provider, prompt_per_1k_inr: Number(p), completion_per_1k_inr: Number(c),
      });
      toast.success(`Rate saved for ${m.model}.`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save the rate'); }
  };

  const overCount = useMemo(() => studios.filter((s) => s.over).length, [studios]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Reading AI usage…</p>
      </div>
    );
  }

  if (error || !overview || !settings) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16 text-center">
        <AlertTriangle size={22} style={{ color: 'var(--danger-text)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error || 'Could not load AI usage.'}</p>
        <button onClick={load} className="mt-1 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Try again</button>
      </div>
    );
  }

  const partialCost = overview.unpriced_models.length > 0;

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

      {overCount > 0 && (
        <div className="rounded-[14px] p-3.5"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)' }}>
          <p className="flex items-start gap-2 text-[12.5px] font-[700]" style={{ color: '#b45309' }}>
            <ShieldAlert size={15} className="mt-0.5 shrink-0" />
            <span>
              {overCount} studio{overCount === 1 ? ' is' : 's are'} over the monthly allowance
              {settings.enforcement_enabled
                ? ' and being refused.'
                : ' — enforcement is off, so nothing is being refused.'}
            </span>
          </p>
        </div>
      )}

      <div>
        <SectionLabel hint={`last ${days} days`}>Usage</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Requests" value={nf(overview.requests)}
            sub={`${overview.users} people · ${overview.studios} studios`} icon={<Bot size={15} />} />
          <StatTile label="Tokens" value={fmtTokens(overview.tokens)}
            sub={`${fmtTokens(overview.tokens_prompt)} in · ${fmtTokens(overview.tokens_completion)} out`}
            tone="brand" icon={<Zap size={15} />} delay={0.04} />
          <StatTile
            label={partialCost ? 'Cost (partial)' : 'Cost'}
            value={fmtINR(overview.cost_inr)}
            // The honesty valve: the API told us some models have no rate, so
            // this figure is a floor and the tile says which ones are missing.
            sub={partialCost ? `excludes ${overview.unpriced_models.length} unpriced model${overview.unpriced_models.length === 1 ? '' : 's'}` : 'all models priced'}
            tone={partialCost ? 'caution' : 'positive'} icon={<Coins size={15} />} delay={0.08} />
          <StatTile label="Avg latency" value={`${overview.avg_latency_ms}ms`}
            sub={`${overview.fallback_pct}% fell back to a backup model`}
            tone={overview.fallback_pct > 10 ? 'critical' : 'neutral'} icon={<Timer size={15} />} delay={0.12} />
        </div>
        {partialCost && (
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
            No rate set for {overview.unpriced_models.join(', ')} — their tokens are counted, their cost is not.
            Set a rate from the Models table below.
          </p>
        )}
      </div>

      <Reveal delay={0.06}><TokenTrend points={trend} /></Reveal>

      <div>
        <SectionLabel hint="ranked by tokens">By studio</SectionLabel>
        <Reveal delay={0.1}><StudioTable rows={studios} onChanged={load} /></Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionLabel hint="click an unpriced model to set its rate">Models</SectionLabel>
          <Reveal delay={0.14}><ModelTable rows={models} onRate={setRate} /></Reveal>
        </div>
        <div>
          <SectionLabel>Settings</SectionLabel>
          <Reveal delay={0.18}><SettingsPanel settings={settings} onChanged={load} /></Reveal>
        </div>
      </div>

      {routing && (
        <div>
          <SectionLabel hint="platform-wide, live within a minute, no redeploy">
            Model routing
          </SectionLabel>
          <Reveal delay={0.22}><RoutingPanel routing={routing} onChanged={load} /></Reveal>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
        <Building2 size={11} className="mt-0.5 shrink-0" />
        Usage is attributed through the user account, so a trainer who moves studios takes
        their history with them — a sudden jump may be a transfer rather than a spike.
      </p>
    </div>
  );
}
