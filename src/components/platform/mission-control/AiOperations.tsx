'use client';
/**
 * AI operations: one operator view of "is AI working, and is what we
 * configured what is actually happening".
 *
 * ── Where every number comes from ──────────────────────────────────────────
 *
 * Nothing here is fetched on a timer of its own. The two AI cards (`ai` and
 * `freellmapi`) already ride the snapshot MissionControl holds, so this deck
 * reads them from there — a second poll would double the load on the gateway
 * the console is supposed to be watching. The full model catalog is the one
 * exception: it runs to hundreds of entries, so it is read when the operator
 * asks for it and not before.
 *
 * Each block names its source in small print (ai_usage_log, GET /v1/providers,
 * "this API process") because the four sources disagree for good reasons, and
 * an operator reconciling them needs to know which one a number came from.
 *
 * ── Honesty rules this file keeps ──────────────────────────────────────────
 *
 *   missing is "—" or a sentence, never 0
 *   configured is never shown as active
 *   a configured model is "available" only when the catalog says so
 *   key health the gateway does not expose is said to be unavailable
 *
 * The two actions are the server's own allow-listed commands (`ai.test`,
 * `ai.gateway.check`), run through the same endpoint as the Recovery deck, so
 * they carry its guard, cooldown and audit. Nothing here can pick a host, a
 * provider or a model.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Bot, Loader2, Network, Play, RefreshCw, Search, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { errorMessage } from '@/lib/forms/errors';
import { ago } from '@/lib/attendance-view';
import type {
  AiConfiguredModelState, AiModelInventory, AiModelInventoryEntry, AiReconciliationFinding,
  AiTelemetry, AiTestOutput, AiTier, CommandCenterCard, CommandCenterSnapshot, FreeLlmApiTelemetry,
} from '@/lib/api';
import { RECONCILIATION_LABEL } from '@/components/platform/Card';
import { fmtDuration, fmtMs, fmtNum, fmtPct } from '@/components/platform/command-center-utils';
import { surface, toneFor } from './tokens';

const TIERS: AiTier[] = ['primary', 'secondary', 'fallback'];

const SOURCE_LABEL: Record<string, string> = {
  override: 'Control Centre override',
  env: 'environment variable',
  default: 'built-in default',
};

const PROVIDER_STATUS: Record<string, string> = {
  healthy: 'healthy',
  rate_limited: 'warning',
  invalid: 'critical',
  unknown: 'unavailable',
};

const PROVIDER_LABEL: Record<string, string> = {
  healthy: 'Healthy',
  rate_limited: 'Cooling down',
  invalid: 'Key rejected',
  unknown: 'Unknown',
};

/** Reconciliation state → the console's status vocabulary. */
const RECONCILIATION_TONE: Record<string, string> = {
  consistent: 'healthy',
  mismatch: 'warning',
  runtime_failure: 'critical',
  not_verified: 'unavailable',
};

/** "just now", "12 min ago" — lower-cased, because it sits mid-sentence. */
const when = (iso: string | null | undefined) => {
  const a = ago(iso);
  return a ? a.charAt(0).toLowerCase() + a.slice(1) : '—';
};

/**
 * How a configured model stands in the gateway's catalog. Exported for tests:
 * this is the line that must never call an unverified model "available".
 */
export function catalogState(c: Pick<AiConfiguredModelState, 'id' | 'router' | 'in_catalog' | 'available' | 'unavailable_reason'> | undefined): { label: string; status: string } {
  if (!c || !c.id) return { label: 'Not set', status: 'unavailable' };
  if (c.in_catalog === null) return { label: 'Not verified', status: 'unavailable' };
  if (c.in_catalog === false) return { label: 'Not in catalog', status: 'warning' };
  if (c.available === true) return { label: c.router ? 'Router available' : 'Available', status: 'healthy' };
  if (c.available === false) return { label: `Unavailable${c.unavailable_reason ? ` · ${c.unavailable_reason}` : ''}`, status: 'warning' };
  return { label: 'Listed, availability not reported', status: 'unavailable' };
}

/** One line for an `ai.test` result, success or failure. */
export function describeAiTest(o: AiTestOutput): string {
  if (!o.ok) return o.summary ?? 'AI test failed';
  const served = o.model ?? 'an unreported model';
  const asked = o.requested_model && o.requested_model !== o.model ? ` (asked for ${o.requested_model})` : '';
  const via = o.provider ? ` via ${o.provider}` : '';
  const fb = o.used_fallback ? ', after falling back a tier' : '';
  return `Answered by ${served}${asked}${via} in ${fmtMs(o.latency_ms)}${fb}`;
}

// ── Small pieces ────────────────────────────────────────────────────────────

const Dot: React.FC<{ status: string }> = ({ status }) => (
  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: toneFor(status).color }} aria-hidden />
);

const Pill: React.FC<{ status: string; children: React.ReactNode }> = ({ status, children }) => {
  const t = toneFor(status);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-[750]"
      style={{ background: t.bg, color: t.text }}>
      <Dot status={status} />{children}
    </span>
  );
};

/** A label/value line. Dense on purpose: this is a reading surface. */
const Fact: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="flex items-baseline justify-between gap-3 py-1">
    <dt className="shrink-0 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{label}</dt>
    <dd className="min-w-0 truncate text-right text-[12px] font-[700] tabular-nums" style={{ color: 'var(--text-primary)' }} title={hint}>
      {value}
    </dd>
  </div>
);

const Block: React.FC<{ title: string; source: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ title, source, children, aside }) => (
  <section className="min-w-0 rounded-[14px] p-3.5" style={surface.inset}>
    <header className="mb-2 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="text-[12.5px] font-[850]" style={{ color: 'var(--text-primary)' }}>{title}</h4>
        <p className="truncate text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{source}</p>
      </div>
      {aside}
    </header>
    {children}
  </section>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>{children}</p>
);

const actionStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)',
};

// ── Commands ────────────────────────────────────────────────────────────────

type CommandName = 'ai.test' | 'ai.gateway.check';
interface CommandOutcome { status: string; text: string; detail?: AiTestOutput }

function useAiCommand(onRan: () => void) {
  const [running, setRunning] = useState<CommandName | null>(null);
  const [outcome, setOutcome] = useState<Partial<Record<CommandName, CommandOutcome>>>({});

  const run = useCallback(async (name: CommandName) => {
    setRunning(name);
    try {
      const res = await api.superAdmin.runCommandCenterCommand(name);
      const data = res.data;
      const output = 'output' in data ? data.output : null;
      let next: CommandOutcome;
      if (name === 'ai.test' && output && typeof output === 'object') {
        const o = output as AiTestOutput;
        next = { status: o.ok ? 'healthy' : 'critical', text: describeAiTest(o), detail: o };
      } else {
        const o = (output ?? {}) as { status?: string; reason?: string | null };
        next = { status: o.status ?? 'healthy', text: o.reason ?? 'Gateway re-read. The cards below show what it found.' };
      }
      setOutcome((prev) => ({ ...prev, [name]: next }));
      onRan();
    } catch (e: unknown) {
      // A failed ai.test still carries its diagnosis on the error payload:
      // each attempt's class, and what the gateway says about itself.
      const diag = e instanceof ApiError
        ? (e.payload as { data?: { output?: AiTestOutput } } | undefined)?.data?.output
        : undefined;
      const cooldown = e instanceof ApiError && e.status === 429;
      const absent = e instanceof ApiError && e.status === 503;
      const status = cooldown ? 'warning' : absent ? 'unavailable' : 'critical';
      // For a cooldown or an absent capability the server's own sentence is
      // the useful one (how long, or what is missing); the generic mapper
      // would turn a cooldown into "too many attempts".
      const text = (cooldown || absent) && e instanceof ApiError && e.message
        ? e.message
        : errorMessage(e, 'Command failed');
      setOutcome((prev) => ({
        ...prev,
        [name]: diag && typeof diag === 'object' && 'attempts' in diag
          ? { status: 'critical', text: describeAiTest(diag), detail: diag }
          : { status, text },
      }));
      onRan();
    } finally {
      setRunning(null);
    }
  }, [onRan]);

  return { running, outcome, run };
}

const TestResult: React.FC<{ o: CommandOutcome }> = ({ o }) => (
  <div className="rounded-[12px] px-3 py-2" style={{ background: toneFor(o.status).bg }} role="status">
    <p className="flex items-start gap-2 text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>
      <span className="mt-1.5"><Dot status={o.status} /></span>{o.text}
    </p>
    {o.detail?.ok && (
      <p className="mt-1 text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>
        Requested {o.detail.requested_model ?? '—'} ({o.detail.requested_tier ?? '—'}) · served {o.detail.model ?? '—'}
        {o.detail.served_tier ? ` (${o.detail.served_tier})` : ''} · provider {o.detail.provider ?? 'not reported'}
        {o.detail.provider_source ? ` — ${o.detail.provider_source}` : ''}
      </p>
    )}
    {o.detail && !o.detail.ok && Array.isArray(o.detail.attempts) && (
      <ul className="mt-1 space-y-0.5 text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>
        {o.detail.attempts.map((a, i) => (
          <li key={i} className="truncate">
            {a.tier ?? '—'} · {a.model ?? '—'} · {a.error_class}{a.http_status ? ` ${a.http_status}` : ''} — {a.error}
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ── Sections ────────────────────────────────────────────────────────────────

const Reconciliation: React.FC<{ ai: AiTelemetry | null; status: string | null }> = ({ ai, status }) => {
  const rec = ai?.reconciliation;
  if (!rec) {
    return <Note>Configuration-versus-reality was not computed: the AI card has no reading{status ? ` (${toneFor(status).label.toLowerCase()})` : ''}.</Note>;
  }
  const findings = rec.findings ?? [];
  const sevStatus = (f: AiReconciliationFinding) => (f.severity === 'info' ? 'degraded' : f.severity);
  const unverified = [
    !rec.verified.catalog && 'the gateway catalog could not be read',
    !rec.verified.traffic && 'no request was served in the last 24h',
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Pill status={RECONCILIATION_TONE[rec.state] ?? 'unavailable'}>{RECONCILIATION_LABEL[rec.state] ?? rec.state}</Pill>
        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          Routing settings, environment, ai_usage_log and the gateway, compared
        </span>
      </div>
      {findings.length > 0 ? (
        <ul className="space-y-1">
          {findings.map((f) => (
            <li key={`${f.code}:${f.message}`} className="flex items-start gap-2 text-[11.5px] leading-snug">
              <span className="mt-1.5"><Dot status={sevStatus(f)} /></span>
              <span className="min-w-0">
                <span style={{ color: 'var(--text-primary)' }}>{f.message}</span>
                <span className="block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{f.source}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : rec.state === 'not_verified' ? (
        <Note>Nothing contradicts the configuration, but nothing confirms it either: {unverified.join(' and ') || 'no source could be checked'}.</Note>
      ) : (
        <Note>Every configured model checked out against {[rec.verified.catalog && 'the catalog', rec.verified.traffic && 'served traffic'].filter(Boolean).join(' and ')}.</Note>
      )}
    </div>
  );
};

const Routing: React.FC<{ ai: AiTelemetry | null; gw: FreeLlmApiTelemetry | null }> = ({ ai, gw }) => {
  if (!ai) return <Note>Routing is unavailable while the AI card has no reading.</Note>;
  const byTier = new Map((gw?.models?.configured ?? []).map((c) => [c.tier, c]));
  return (
    <>
      <table className="w-full table-fixed text-[11.5px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            <th className="w-[72px] pb-1 font-[750]">Tier</th>
            <th className="pb-1 font-[750]">Configured model</th>
            <th className="hidden w-[150px] pb-1 font-[750] sm:table-cell">Gateway catalog</th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((t) => {
            const st = catalogState(byTier.get(t) ?? (ai.routing[t] ? { id: ai.routing[t], router: false, in_catalog: null, available: null, unavailable_reason: null } : undefined));
            return (
              <tr key={t} className="align-top" style={{ borderTop: '1px solid var(--border)' }}>
                <td className="py-1.5 font-[700] capitalize" style={{ color: 'var(--text-secondary)' }}>{t}</td>
                <td className="min-w-0 py-1.5">
                  <span className="block truncate font-[700]" style={{ color: 'var(--text-primary)' }} title={ai.routing[t] ?? undefined}>{ai.routing[t] ?? '—'}</span>
                  <span className="block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{SOURCE_LABEL[ai.routing.sources?.[t]] ?? '—'}</span>
                  <span className="mt-0.5 sm:hidden"><Pill status={st.status}>{st.label}</Pill></span>
                </td>
                <td className="hidden py-1.5 sm:table-cell"><Pill status={st.status}>{st.label}</Pill></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <dl className="mt-2 border-t pt-1.5" style={{ borderColor: 'var(--border)' }}>
        <Fact label="Active model (served last)" value={ai.active_model ?? 'Nothing served yet'} hint={ai.active_model ?? undefined} />
        <Fact label="Last served" value={when(ai.active_model_at ?? ai.last_request_at)}
          hint={ai.active_used_fallback ? 'That request fell back off the primary tier' : undefined} />
      </dl>
      {ai.served_models_24h && ai.served_models_24h.length > 0 && (
        <div className="mt-1.5">
          <p className="text-[10px] font-[750] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Served in the last 24h</p>
          <ul className="mt-1 space-y-0.5">
            {ai.served_models_24h.slice(0, 5).map((s) => (
              <li key={s.model} className="flex justify-between gap-3 text-[11px]">
                <span className="truncate" style={{ color: 'var(--text-secondary)' }} title={s.model}>{s.model}</span>
                <span className="shrink-0 tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{fmtNum(s.requests)} req · {when(s.last_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

const Traffic: React.FC<{ ai: AiTelemetry | null }> = ({ ai }) => {
  if (!ai) return <Note>Traffic is unavailable while the AI card has no reading.</Note>;
  const t = ai.today; const h = ai.last_hour; const o = ai.observed;
  const cost = typeof t?.cost_inr === 'number' ? `₹${t.cost_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';
  return (
    <>
      {ai.usage_readable === false && <Note>ai_usage_log could not be read, so the request figures are unavailable.</Note>}
      <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
        <Fact label="Requests today" value={fmtNum(t?.requests)} />
        <Fact label="Requests last hour" value={fmtNum(h?.requests)} />
        <Fact label="Latency today, avg" value={fmtMs(t?.avg_latency_ms)} />
        <Fact label="p95 / max" value={`${fmtMs(t?.p95_latency_ms)} / ${fmtMs(t?.max_latency_ms)}`} />
        <Fact label="Fallbacks today" value={t ? `${fmtNum(t.fallbacks)} · ${fmtPct(t.fallback_rate)}` : '—'} />
        <Fact label="Fallback rate, 1h" value={fmtPct(h?.fallback_rate)} />
        <Fact label="Tokens today" value={fmtNum(t?.tokens)} />
        <Fact label={t?.cost_is_floor ? 'Cost today (floor)' : 'Cost today'} value={cost}
          hint={t?.cost_is_floor ? 'Some models have no rate, so this undercounts' : undefined} />
      </dl>
      <div className="mt-2 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[10px] font-[750] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          This API process, last 15 min
        </p>
        {o ? (
          <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
            <Fact label="Calls / failures" value={`${fmtNum(o.calls_15m)} / ${fmtNum(o.failures_15m)}`} />
            <Fact label="Failing in a row" value={fmtNum(o.consecutive_failures)} />
            <Fact label="Last success" value={o.last_success ? `${when(o.last_success.at)}${o.last_success.provider ? ` · ${o.last_success.provider}` : ''}` : 'None seen'}
              hint={o.last_success?.served_model ?? undefined} />
            <Fact label="Last failure" value={o.last_failure ? `${when(o.last_failure.at)} · ${o.last_failure.error_class}${o.last_failure.http_status ? ` ${o.last_failure.http_status}` : ''}` : 'None seen'}
              hint={o.last_failure?.error ?? undefined} />
          </dl>
        ) : <Note>Not reported by this API version.</Note>}
        <Note>Failures are only seen by the process that made the call; the usage log records returned calls only.</Note>
      </div>
    </>
  );
};

const Gateway: React.FC<{ card: CommandCenterCard | undefined; gw: FreeLlmApiTelemetry | null }> = ({ card, gw }) => {
  if (!card) return <Note>This API version does not report the AI gateway.</Note>;
  if (!gw || gw.gateway?.kind !== 'freellmapi') {
    return <Note>{card.reason ?? 'The gateway at AI_BASE_URL has no status surface to read.'}</Note>;
  }
  const svc = gw.service; const ready = gw.readiness; const pr = gw.providers; const keys = gw.keys;
  return (
    <>
      <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
        <Fact label="Service" value={svc?.live === true ? 'Live' : svc?.reachable === false ? 'Unreachable' : svc?.live === false ? 'Not live' : '—'} />
        <Fact label="Ready" value={ready?.ready === true ? `Yes · ${fmtNum(ready.ready_upstreams)} upstreams` : ready?.ready === false ? `No${ready.reason ? ` · ${ready.reason}` : ''}` : '—'} />
        <Fact label="Version / uptime" value={`${svc?.version ?? '—'} · ${fmtDuration(svc?.uptime_s)}`} />
        <Fact label="Probe latency" value={fmtMs(svc?.latency_ms)} />
        <Fact label="Endpoint" value={gw.gateway.endpoint ?? '—'} hint={gw.gateway.endpoint ?? undefined} />
        <Fact label="Models available" value={gw.models?.total != null ? `${fmtNum(gw.models.available)} of ${fmtNum(gw.models.total)}` : (gw.models?.reason ?? '—')} />
      </dl>

      <div className="mt-2 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
        {pr?.items && pr.items.length > 0 ? (
          <table className="w-full table-fixed text-[11.5px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                <th className="pb-1 font-[750]">Provider</th>
                <th className="w-[118px] pb-1 font-[750]">State</th>
                <th className="w-[72px] pb-1 text-right font-[750]">Models</th>
                <th className="hidden w-[56px] pb-1 text-right font-[750] sm:table-cell">Keys</th>
              </tr>
            </thead>
            <tbody>
              {pr.items.map((p) => (
                <tr key={p.id} className="align-top" style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="min-w-0 py-1.5">
                    <span className="block truncate font-[700]" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    {p.last_error && <span className="block truncate text-[10px]" style={{ color: 'var(--text-tertiary)' }} title={p.last_error}>{p.last_error}</span>}
                    {p.status === 'rate_limited' && p.resume_at && <span className="block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>resumes {new Date(p.resume_at).toLocaleTimeString()}</span>}
                  </td>
                  <td className="py-1.5"><Pill status={PROVIDER_STATUS[p.status] ?? 'unavailable'}>{PROVIDER_LABEL[p.status] ?? p.status}</Pill></td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {p.models_total == null ? '—' : `${p.models_available ?? 0}/${p.models_total}`}
                  </td>
                  <td className="hidden py-1.5 text-right tabular-nums sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{fmtNum(p.enabled_keys)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Note>{pr?.reason ?? 'The gateway listed no provider.'}</Note>}
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-[10px] px-2.5 py-2" style={{ background: 'var(--surface)' }}>
        <KeyRound size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} aria-hidden />
        <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
          {fmtNum(keys?.total)} enabled key{keys?.total === 1 ? '' : 's'} across providers. {keys?.healthy_unavailable_reason ?? 'Key health unavailable from provider.'}
        </p>
      </div>
    </>
  );
};

type AvailabilityFilter = 'all' | 'available' | 'unavailable' | 'configured';

const Inventory: React.FC = () => {
  const [inv, setInv] = useState<AiModelInventory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<AvailabilityFilter>('configured');

  const load = useCallback(async (fresh = false) => {
    setLoading(true); setError('');
    try {
      const res = await api.superAdmin.commandCenterAiModels({ fresh });
      setInv(res.data);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Could not read the model inventory.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const rows = useMemo(() => {
    const all: AiModelInventoryEntry[] = [...(inv?.routers ?? []), ...(inv?.models ?? [])];
    const needle = q.trim().toLowerCase();
    return all.filter((mm) => {
      if (needle && !`${mm.id} ${mm.provider ?? ''}`.toLowerCase().includes(needle)) return false;
      if (filter === 'available') return mm.available === true;
      if (filter === 'unavailable') return mm.available === false;
      if (filter === 'configured') return mm.configured_tiers.length > 0;
      return true;
    });
  }, [inv, q, filter]);

  if (!inv) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>The full catalog is read on request, not on every tick. It lists every model the gateway can route to, with the tiers that name it and when it last served.</Note>
        <button type="button" onClick={() => load(false)} disabled={loading}
          className="flex min-h-[36px] items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] disabled:opacity-60" style={actionStyle}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Load inventory
        </button>
        {error && <p className="w-full text-[11.5px]" style={{ color: toneFor('critical').text }} role="alert">{error}</p>}
      </div>
    );
  }

  if (!inv.models) {
    return (
      <div className="space-y-2">
        <Note>{inv.reason ?? 'The gateway catalog is not readable.'}</Note>
        <button type="button" onClick={() => load(true)} disabled={loading}
          className="flex min-h-[36px] items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] disabled:opacity-60" style={actionStyle}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Try again
        </button>
      </div>
    );
  }

  const FILTERS: Array<{ id: AvailabilityFilter; label: string }> = [
    { id: 'configured', label: 'Configured' },
    { id: 'available', label: 'Available' },
    { id: 'unavailable', label: 'Unavailable' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-[10px] p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="group" aria-label="Filter models">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
              className="rounded-[8px] px-2.5 py-1 text-[11px] font-[700]"
              style={filter === f.id ? { background: 'var(--bg-subtle)', color: 'var(--text-primary)' } : { color: 'var(--text-tertiary)' }}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex min-w-[160px] flex-1 items-center gap-1.5 rounded-[10px] px-2.5 py-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Model or provider"
            aria-label="Search models" className="w-full bg-transparent text-[11.5px] outline-none" style={{ color: 'var(--text-primary)' }} />
        </label>
        <button type="button" onClick={() => load(true)} disabled={loading} aria-label="Re-read the catalog"
          className="flex min-h-[30px] items-center gap-1.5 rounded-[10px] px-2.5 text-[11px] font-[700] disabled:opacity-60" style={actionStyle}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Re-read
        </button>
      </div>
      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        {fmtNum(inv.models.filter((mm) => mm.available === true).length)} of {fmtNum(inv.models.length)} models available · {inv.source} · read {when(inv.checked_at)}
        {!inv.usage_readable && ' · usage log unreadable, so last-used is unknown'}
      </p>
      <div className="max-h-[360px] overflow-y-auto">
        {rows.length === 0 ? (
          <Note>{filter === 'configured' ? 'No configured model is in the catalog.' : 'No model matches.'}</Note>
        ) : (
          <table className="w-full table-fixed text-[11.5px]">
            <thead className="sticky top-0" style={{ background: 'var(--bg-subtle)' }}>
              <tr className="text-left text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                <th className="pb-1 font-[750]">Model</th>
                <th className="w-[124px] pb-1 font-[750]">Availability</th>
                <th className="hidden w-[96px] pb-1 font-[750] md:table-cell">Tier</th>
                <th className="hidden w-[110px] pb-1 text-right font-[750] sm:table-cell">Last served</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 300).map((mm) => {
                const st = mm.available === true ? 'healthy' : mm.available === false ? 'warning' : 'unavailable';
                const label = mm.available === true ? 'Available' : mm.available === false ? (mm.unavailable_reason ?? 'Unavailable') : 'Not reported';
                return (
                  <tr key={mm.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="min-w-0 py-1.5">
                      <span className="block truncate font-[700]" style={{ color: 'var(--text-primary)' }} title={mm.id}>{mm.id}</span>
                      <span className="block truncate text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{mm.provider ?? 'provider not reported'}</span>
                    </td>
                    <td className="py-1.5"><Pill status={st}>{label}</Pill></td>
                    <td className="hidden py-1.5 capitalize md:table-cell" style={{ color: 'var(--text-secondary)' }}>{mm.configured_tiers.join(', ') || '—'}</td>
                    <td className="hidden py-1.5 text-right tabular-nums sm:table-cell" style={{ color: 'var(--text-tertiary)' }}>
                      {mm.last_used_at ? when(mm.last_used_at) : mm.requests_30d === null ? 'unknown' : 'not in 30d'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {inv.served_not_in_catalog && inv.served_not_in_catalog.length > 0 && (
        <Note>
          Served in the last 30 days but not in the catalog: {inv.served_not_in_catalog.map((s) => s.id).join(', ')}.
          Retired upstream, renamed, or served by a different gateway.
        </Note>
      )}
    </div>
  );
};

// ── The deck ────────────────────────────────────────────────────────────────

export const AiOperations: React.FC<{ snap: CommandCenterSnapshot; onRefresh: () => void }> = ({ snap, onRefresh }) => {
  const aiCard = snap.cards?.ai;
  const gwCard = snap.cards?.freellmapi;
  const ai = (aiCard?.data ?? null) as AiTelemetry | null;
  const gw = (gwCard?.data ?? null) as FreeLlmApiTelemetry | null;
  const { running, outcome, run } = useAiCommand(onRefresh);

  return (
    <section style={surface.panel} className="space-y-3 p-4" aria-label="AI operations">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-[900] tracking-[-.02em]" style={{ color: 'var(--text-primary)' }}>AI operations</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <Bot size={13} aria-hidden /> AI <Pill status={aiCard?.status ?? 'unavailable'}>{toneFor(aiCard?.status).label}</Pill>
            </span>
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <Network size={13} aria-hidden /> Gateway <Pill status={gwCard?.status ?? 'unavailable'}>{toneFor(gwCard?.status).label}</Pill>
            </span>
          </div>
          {(aiCard?.reason || gwCard?.reason) && (
            <p className="mt-1.5 max-w-[75ch] text-[11.5px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
              {[aiCard?.reason, gwCard?.reason].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => run('ai.test')} disabled={running !== null}
            title="Sends one short prompt through the real routing and gateway. Costs a few tokens. Audited."
            className="flex min-h-[36px] items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] disabled:opacity-60" style={actionStyle}>
            {running === 'ai.test' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Test AI
          </button>
          <button type="button" onClick={() => run('ai.gateway.check')} disabled={running !== null}
            title="Re-reads the gateway's health, providers and catalog now. Read-only, no tokens. Audited."
            className="flex min-h-[36px] items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] disabled:opacity-60" style={actionStyle}>
            {running === 'ai.gateway.check' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Check gateway
          </button>
        </div>
      </header>

      {(outcome['ai.test'] || outcome['ai.gateway.check']) && (
        <div className="space-y-1.5">
          {outcome['ai.test'] && <TestResult o={outcome['ai.test']} />}
          {outcome['ai.gateway.check'] && <TestResult o={outcome['ai.gateway.check']} />}
        </div>
      )}

      <Block title="Configuration versus reality" source="Server-side reconciliation of four sources">
        <Reconciliation ai={ai} status={aiCard?.status ?? null} />
      </Block>

      <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
        <Block title="Routing" source="Effective tiers · catalog from GET /v1/models · served from ai_usage_log">
          <Routing ai={ai} gw={gw} />
        </Block>
        <Block title="Traffic" source="ai_usage_log, and this API process's own calls">
          <Traffic ai={ai} />
        </Block>
      </div>

      <Block title="Gateway, providers and keys" source="FreeLLMAPI /livez, /readyz, GET /v1/providers"
        aside={gw?.gateway?.checked_at ? <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>read {when(gw.gateway.checked_at)}</span> : undefined}>
        <Gateway card={gwCard} gw={gw} />
      </Block>

      <Block title="Model inventory" source="GET /command-center/ai/models">
        <Inventory />
      </Block>
    </section>
  );
};

export default AiOperations;
