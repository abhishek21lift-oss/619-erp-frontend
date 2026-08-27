'use client';

// Tenancy Health card — the honest-state card on the new home.
//
// Five independent sections, each with its own status. The card NEVER rolls
// them up into one green/yellow/red dot, because "RLS is dormant" is not the
// same kind of warning as "12 cross-tenant attempts in 30 days" — and an
// operator who sees one red light on the home page will look in the wrong
// place. Each section expands to its own drilldown.
//
// The backend returns status strings as HEALTHY / WARNING / CRITICAL / UNKNOWN.
// UNKNOWN is real: a 24h-old snapshot with zero data is not the same as
// HEALTHY, and pretending it is would defeat the point of the card.
//
// The "Run isolation tests" button hits the only mutation here, and the
// backend enforces a 5-minute per-user cooldown. We render whatever
// cooldown_remaining_s the run came back with so the button text reflects
// reality rather than the optimistic value we passed in.

import { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, HelpCircle, ShieldOff, Play, RefreshCw } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { Panel, Reveal } from '@/components/platform/console';
import { api } from '@/lib/api';
import type { TenancyHealth, TenancySectionStatus, TenancyIsolationRunResult } from '@/lib/api';
import { Center, ErrorState } from '../../_shared/ui';

const STATUS_TONE: Record<TenancySectionStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  HEALTHY: 'success',
  WARNING: 'warning',
  CRITICAL: 'danger',
  UNKNOWN: 'neutral',
};

const STATUS_ICON: Record<TenancySectionStatus, React.ReactNode> = {
  HEALTHY: <CheckCircle2 size={14} />,
  WARNING: <AlertTriangle size={14} />,
  CRITICAL: <ShieldOff size={14} />,
  UNKNOWN: <HelpCircle size={14} />,
};

const STATUS_COLOR: Record<TenancySectionStatus, { bg: string; fg: string }> = {
  HEALTHY:   { bg: 'var(--success)15', fg: 'var(--success-text)' },
  WARNING:   { bg: 'var(--warning)15', fg: 'var(--warning-text)' },
  CRITICAL:  { bg: 'var(--danger)15',  fg: 'var(--danger-text)' },
  UNKNOWN:   { bg: 'var(--bg-subtle)', fg: 'var(--text-muted)' },
};

// One row in the card. Click expands an inline detail panel so the card
// itself stays compact — most operators want a glance, not a scroll.
function HealthRow({ label, status, primary, secondary, children }: {
  label: string;
  status: TenancySectionStatus;
  primary: string;
  secondary?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const expandable = !!children;
  const tone = STATUS_TONE[status];
  const color = STATUS_COLOR[status];
  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => expandable && setOpen((s) => !s)}
        disabled={!expandable}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-default"
        style={{ background: open ? 'var(--bg-hover)' : 'transparent' }}
        onMouseEnter={(e) => { if (expandable) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = open ? 'var(--bg-hover)' : 'transparent'; }}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: color.bg, color: color.fg }}>
          {STATUS_ICON[status]}
        </span>
        <span className="flex-1 text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>{label}</span>
        <span className="text-[12.5px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>{primary}</span>
        {secondary && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{secondary}</span>}
        <Badge tone={tone} dot>{status}</Badge>
      </button>
      {open && children && (
        <div className="px-4 pb-4 pt-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function fmtCooldown(seconds: number): string {
  if (seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `Run again in ${m}m ${s.toString().padStart(2, '0')}s`;
}

export function TenancyHealthCard() {
  const [data, setData] = useState<TenancyHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<TenancyIsolationRunResult | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.tenancyHealth()
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load tenancy health'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Tick the cooldown down so the button text is honest.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onRun = async () => {
    setRunning(true);
    try {
      const r = await api.superAdmin.runIsolationTests();
      setLastRun(r.data);
      setCooldown(r.data.cooldown_remaining_s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Isolation test run failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <Center><Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  // The five sections in the order the brief specified. Order is signal, not
  // aesthetic: rls first because it's the platform's own posture, isolation
  // second because it's the layer the platform actually relies on today.
  return (
    <div className="space-y-3">
      <Reveal delay={0.04}>
        <Panel padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
            <p className="text-[13px] font-[720]" style={{ color: 'var(--text-primary)' }}>Tenancy Health</p>
            <Button
              size="sm"
              variant="outline"
              iconLeft={running ? <Loader2 size={12} className="animate-spin" /> : cooldown > 0 ? <RefreshCw size={12} /> : <Play size={12} />}
              onClick={onRun}
              disabled={running || cooldown > 0}
            >
              {running ? 'Running…' : cooldown > 0 ? fmtCooldown(cooldown) : 'Run isolation tests'}
            </Button>
          </div>

          <HealthRow
            label="Row-level security"
            status={data.rls.status}
            primary={`${data.rls.org_scoped_count}/${data.rls.policy_count} org-scoped`}
          >
            <p>
              Today: <strong>{data.rls.policy_count}</strong> RLS policies on <code>public</code>,
              {' '}<strong>{data.rls.org_scoped_count}</strong> of them scoped to <code>organization_id</code>.
              {' '}The platform enforces tenancy at the application layer
              (<code>tenantScope()</code>), not at the database. Until RLS becomes
              org-scoped, a single missed <code>WHERE</code> clause is a
              cross-tenant read.
            </p>
          </HealthRow>

          <HealthRow
            label="Tenant-scope chain"
            status={data.isolation.status}
            primary={`${data.isolation.tables_under_scope} tables`}
          >
            <p>
              Every business-table read goes through <code>tenantScope()</code>,
              which adds a <code>WHERE organization_id = $org</code> clause. The
              count above is the number of tables the convention test enforces
              this for; a new tenant table added without a scope check is
              silent until the next audit.
            </p>
          </HealthRow>

          <HealthRow
            label="Orphan rows"
            status={data.orphans.status}
            primary={String(data.orphans.total)}
            secondary={data.orphans.top_table ? `top: ${data.orphans.top_table}` : undefined}
          >
            <p>
              Rows across tenant tables with a NULL <code>organization_id</code>.
              They don&apos;t belong to any studio, so the platform-level overview
              excludes them, but a buggy migration can quietly produce more and
              the count here is the only place you&apos;d see it.
            </p>
          </HealthRow>

          <HealthRow
            label="Cross-tenant attempts"
            status={data.cross_tenant.status}
            primary={String(data.cross_tenant.attempts_30d)}
            secondary="last 30d"
          >
            <p>
              Activity-log rows whose action indicates an attempt to read or
              write across tenants (e.g. <code>cross_tenant_blocked</code>).
              Zero is the goal; non-zero means a user, a request, or a script
              bumped into the boundary and was refused.
            </p>
          </HealthRow>

          <HealthRow
            label="Known unfixed gaps"
            status={data.known_gaps.status}
            primary={String(data.known_gaps.open)}
            secondary={`${data.known_gaps.high} high`}
          >
            <p>
              Tables that the convention test has flagged but not yet fixed
              (see <code>tenancy_known_gaps</code>). Each row carries a
              <em> reason</em> and a <em>severity</em>. A <code>closed_at</code>
              {' '}date means the gap was acknowledged and worked around.
            </p>
          </HealthRow>
        </Panel>
      </Reveal>

      {lastRun && (
        <Reveal delay={0.06}>
          <Panel padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
              <p className="text-[13px] font-[720]" style={{ color: 'var(--text-primary)' }}>
                Isolation run #{lastRun.run_id}
              </p>
              <Badge tone={lastRun.passed ? 'success' : 'danger'} dot>
                {lastRun.passed ? `${lastRun.total_tests} passed` : `${lastRun.failed_tests} of ${lastRun.total_tests} failed`}
              </Badge>
            </div>
            <p className="px-4 pb-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              Ran in {lastRun.duration_ms} ms · {lastRun.cooldown_remaining_s > 0 ? fmtCooldown(lastRun.cooldown_remaining_s) : 'no cooldown'}
            </p>
            <ul className="space-y-1.5 px-4 pb-4 text-[12.5px]">
              {lastRun.cases.map((c) => (
                <li key={c.name} className="flex items-start gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: c.passed ? 'var(--success)' : 'var(--danger)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{c.name}</strong>
                    {c.detail && <span style={{ color: 'var(--text-muted)' }}> — {c.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
      )}
    </div>
  );
}
