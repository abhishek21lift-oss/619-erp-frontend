'use client';

/**
 * Tenancy — is one studio's data still walled off from every other?
 *
 * The backend has served five tenancy endpoints since the isolation work
 * (health, orphans, cross-tenant attempts, known gaps, and an on-demand
 * isolation run) and the console never had a screen for any of them: the
 * only way to run the isolation proof was a hand-written POST. This is that
 * screen. Every line is read from those endpoints; the run button creates two
 * throwaway probe studios server-side, never touches a real one, and is
 * rate-limited there (a 429 here is the cooldown, shown as such).
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FlaskConical, Layers, Loader2, Play, ShieldCheck, ShieldX, TableProperties, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { TenancyAttemptRow, TenancyHealth, TenancyIsolationRunResult, TenancyKnownGap, TenancySectionStatus } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { Center, ErrorState } from '@/app/(platform)/platform/_shared/ui';
import { CcCard, CcChip, CcDonut, CcEmpty, CcHBars, CcRing, nfIN } from './cc-viz';
import { ccState } from './ccTheme';

const STATE: Record<TenancySectionStatus, string> = {
  HEALTHY: ccState.healthy, WARNING: ccState.warning, CRITICAL: ccState.critical, UNKNOWN: ccState.unknown,
};

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const pretty = (name: string) => name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function TenancyCentre() {
  const [health, setHealth] = useState<TenancyHealth | null>(null);
  const [gaps, setGaps] = useState<TenancyKnownGap[]>([]);
  const [attempts, setAttempts] = useState<{ rows: TenancyAttemptRow[]; total: number }>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<TenancyIsolationRunResult | null>(null);
  const [runError, setRunError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [h, g, a] = await Promise.all([
        api.superAdmin.tenancyHealth(),
        api.superAdmin.tenancyKnownGaps(),
        api.superAdmin.tenancyCrossTenantAttempts(20, 0),
      ]);
      setHealth(h.data); setGaps(g.data); setAttempts({ rows: a.data, total: a.total });
    } catch (e) {
      setError(errorMessage(e, 'Tenancy health could not be loaded'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const runTests = async () => {
    setRunning(true); setRunError('');
    try {
      const r = await api.superAdmin.runIsolationTests();
      setRun(r.data);
      await load();
    } catch (e) {
      setRunError(errorMessage(e, 'The isolation run failed'));
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <Center><Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} /></Center>;
  if (error || !health) return <ErrorState error={error || 'Tenancy health could not be loaded'} onRetry={() => { setLoading(true); void load(); }} />;

  const last = health.isolation.last_run;
  const shown = run ?? null;
  const passPct = last ? (last.total_tests ? (100 * (last.total_tests - last.failed_tests)) / last.total_tests : null) : null;
  const orphanRows = health.orphans.breakdown.filter((r) => r.count > 0);
  const openGaps = gaps.filter((g) => !g.closed_at);
  const sections: { key: string; label: string; status: TenancySectionStatus; value: string; reason: string }[] = [
    { key: 'isolation', label: 'Isolation proof', status: health.isolation.status, value: last ? `${last.total_tests - last.failed_tests}/${last.total_tests}` : '—', reason: health.isolation.reason },
    { key: 'rls', label: 'Row-level security', status: health.rls.status, value: nfIN(health.rls.policy_count), reason: health.rls.reason },
    { key: 'orphans', label: 'Orphan rows', status: health.orphans.status, value: nfIN(health.orphans.total), reason: health.orphans.reason },
    { key: 'cross', label: 'Cross-tenant · 24h', status: health.cross_tenant.status, value: nfIN(health.cross_tenant.attempts_24h), reason: health.cross_tenant.reason },
    { key: 'gaps', label: 'Known gaps', status: health.known_gaps.status, value: nfIN(health.known_gaps.open_count), reason: health.known_gaps.reason },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {sections.map((s) => (
          <div key={s.key} className="relative min-w-0 overflow-hidden rounded-[22px] p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: STATE[s.status] }} />
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10.5px] font-[800] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
            <p className="mt-1.5 text-[24px] font-[850] tabular-nums tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            <div className="mt-1"><CcChip color={STATE[s.status]}>{s.status.toLowerCase()}</CcChip></div>
            <p className="mt-2 line-clamp-3 text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>{s.reason}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <CcCard tone="pink" eyebrow="Isolation proof" title="Can studio B see studio A?" icon={<FlaskConical size={16} />}
          action={
            <button type="button" onClick={runTests} disabled={running}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-[750] text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 60%, black))' }}>
              {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} {running ? 'Running' : 'Run now'}
            </button>
          }>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <CcRing pct={passPct} tone="pink" size={124} label={last ? 'checks passed' : 'never run'}
              color={last ? (last.passed ? ccState.healthy : ccState.critical) : undefined}
              sub={last ? `${when(last.ran_at)} · ${last.duration_ms} ms` : undefined} />
            <div className="w-full min-w-0 flex-1 space-y-2">
              <p className="text-[12px] leading-5" style={{ color: 'var(--text-muted)' }}>
                Creates two throwaway probe studios, writes under one, then reads, updates and deletes under the other.
                Nothing on a real studio is touched, and the probes are removed afterwards.
              </p>
              {last?.by_user_name && <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Last run by <b style={{ color: 'var(--text-primary)' }}>{last.by_user_name}</b></p>}
              {runError && <p role="alert" className="text-[12px] font-[650]" style={{ color: 'var(--danger-text)' }}>{runError}</p>}
              {shown && (
                <ul className="space-y-1.5">
                  {shown.tests.map((t) => (
                    <li key={t.name} className="flex items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                      {t.passed ? <CheckCircle2 size={14} style={{ color: ccState.healthy }} /> : <XCircle size={14} style={{ color: ccState.critical }} />}
                      <span className="min-w-0 flex-1 truncate">{pretty(t.name)}</span>
                    </li>
                  ))}
                  {shown.cleanup_failed && <li className="text-[11.5px]" style={{ color: 'var(--danger-text)' }}>The probe studios could not be removed — see the audit log.</li>}
                </ul>
              )}
            </div>
          </div>
        </CcCard>

        <CcCard tone="orange" eyebrow="Known gaps" title="Tables not yet studio-scoped" icon={<Layers size={16} />}>
          {openGaps.length === 0 ? <CcEmpty title="No open gap" body="Every tenant table carries its studio." /> : (
            <div className="grid gap-4 md:grid-cols-[auto_1fr]">
              <CcDonut size={130} legend={false} centerLabel="open" data={[
                { label: 'High', value: openGaps.filter((g) => g.severity === 'high').length, color: ccState.critical },
                { label: 'Medium', value: openGaps.filter((g) => g.severity === 'medium').length, color: ccState.warning },
                { label: 'Low', value: openGaps.filter((g) => g.severity === 'low').length, color: ccState.unknown },
              ]} />
              <ul className="min-w-0 space-y-2">
                {openGaps.map((g) => (
                  <li key={g.table_name} className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <code className="truncate text-[12px] font-[750]" style={{ color: 'var(--text-primary)' }}>{g.table_name}</code>
                      <CcChip color={g.severity === 'high' ? ccState.critical : g.severity === 'medium' ? ccState.warning : ccState.unknown}>{g.severity}</CcChip>
                    </div>
                    <p className="mt-1 text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>{g.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CcCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <CcCard tone="teal" eyebrow="Orphans" title="Rows that belong to no studio" icon={<TableProperties size={16} />}>
          {orphanRows.length === 0
            ? <CcEmpty title="No orphan rows" body={`Checked ${health.orphans.breakdown.length} tenant tables.`} />
            : <CcHBars rows={orphanRows.map((r) => ({ label: r.table, value: r.count }))} />}
        </CcCard>

        <CcCard tone="purple" eyebrow="Cross-tenant attempts" title={`Blocked access · ${nfIN(attempts.total)} recorded`} icon={attempts.total ? <ShieldX size={16} /> : <ShieldCheck size={16} />}>
          {attempts.rows.length === 0 ? <CcEmpty title="No attempt recorded" body="No request has tried to reach another studio's data." /> : (
            <ul className="space-y-2">
              {attempts.rows.map((a) => (
                <li key={a.id} className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{a.user_name ?? a.user_id ?? 'Unknown account'}</p>
                    <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>{when(a.created_at)}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{pretty(a.action)}{a.entity_type ? ` · ${a.entity_type}` : ''}{a.ip_address ? ` · ${a.ip_address}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </CcCard>
      </div>
    </div>
  );
}
