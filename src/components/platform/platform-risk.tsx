'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { api, type PlatformRiskReport } from '@/lib/api';
import { Panel, SectionLabel, StatTile } from '@/components/platform/console';
import { Center, ErrorState } from '@/app/(platform)/platform/_shared/ui';

const LEVEL_TONE: Record<PlatformRiskReport['level'], 'positive' | 'caution' | 'critical' | 'neutral'> = {
  healthy: 'positive',
  watch: 'caution',
  elevated: 'caution',
  high: 'critical',
  critical: 'critical',
};

const LEVEL_ICON = {
  healthy: CheckCircle2,
  watch: AlertTriangle,
  elevated: AlertTriangle,
  high: ShieldAlert,
  critical: ShieldAlert,
};

export default function PlatformRiskCentre() {
  const [report, setReport] = useState<PlatformRiskReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (fresh = false) => {
    if (fresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const result = await api.commandCenter.risk(fresh);
      setReport(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform risk');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Center><RefreshCw size={24} className="animate-spin" /></Center>;
  if (error) return <ErrorState error={error} onRetry={() => load()} />;
  if (!report) return null;

  const Icon = LEVEL_ICON[report.level];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <SectionLabel>Platform Intelligence</SectionLabel>
          <h2 className="text-xl font-semibold">Risk & Action</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Deterministic platform risk backed by telemetry and Guardian evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Platform Risk" value={`${Math.round(report.score)}/100`} sub={report.label} tone={LEVEL_TONE[report.level]} icon={<Icon size={15} />} />
        <StatTile label="Coverage" value={`${Math.round(report.confidence * 100)}%`} sub="observed domain weight" tone="neutral" icon={<CheckCircle2 size={15} />} />
        <StatTile label="Active Findings" value={String(report.findings.length)} sub="Guardian findings" tone={report.findings.length ? 'critical' : 'positive'} icon={<ShieldAlert size={15} />} />
        <StatTile label="Unknown Domains" value={String(report.unknown_domains.length)} sub={report.unknown_domains.length ? 'telemetry gaps' : 'full coverage'} tone={report.unknown_domains.length ? 'caution' : 'positive'} icon={<HelpCircle size={15} />} />
      </div>

      <Panel padded={false} className="overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="text-sm font-semibold">Risk domains</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Every contribution is traceable to a measured domain.</div>
        </div>
        {report.domains.map((domain, index) => (
          <div key={domain.name} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 sm:grid-cols-[1fr_auto_auto]" style={{ borderTop: index ? '1px solid var(--border)' : undefined }}>
            <div>
              <div className="text-xs font-semibold capitalize">{domain.name}</div>
              <div className="mt-0.5 text-[11px]" style={{ color: domain.available ? 'var(--text-muted)' : 'var(--text-disabled)' }}>
                {domain.available ? 'Telemetry available' : domain.reason}
              </div>
            </div>
            <div className="text-right text-xs font-semibold">{domain.available ? `${Math.round(domain.score)}/100` : '—'}</div>
            <div className="hidden text-right text-[11px] sm:block" style={{ color: 'var(--text-muted)' }}>
              weight {domain.weight}% · contribution {domain.contribution.toFixed(1)}
            </div>
          </div>
        ))}
      </Panel>

      {report.findings.length > 0 && (
        <Panel padded={false} className="overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="text-sm font-semibold">Guardian findings</div>
          </div>
          {report.findings.map((finding, index) => (
            <div key={finding.id} className="px-4 py-3" style={{ borderTop: index ? '1px solid var(--border)' : undefined }}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold">{finding.title}</div>
                <div className="text-[10px] font-bold uppercase" style={{ color: finding.severity === 'critical' ? 'var(--danger-text)' : 'var(--warning-text)' }}>
                  {finding.severity}
                </div>
              </div>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Confidence {Math.round(finding.confidence * 100)}%
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
