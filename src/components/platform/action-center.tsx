'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { api, type PlatformActionCenterReport } from '@/lib/api';
import { Panel, SectionLabel } from '@/components/platform/console';
import { Center } from '@/app/(platform)/platform/_shared/ui';

const severityColor = (severity: string) => {
  if (severity === 'critical') return 'var(--danger-text)';
  if (severity === 'warning') return 'var(--warning-text)';
  return 'var(--text-muted)';
};

export default function ActionCenter() {
  const [report, setReport] = useState<PlatformActionCenterReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.commandCenter.actionCenter();
      setReport(result.data);
    } catch {
      // Action Center is supplementary. A failure must never blank the live
      // infrastructure console above it.
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Center><RefreshCw size={20} className="animate-spin" /></Center>;
  if (!report) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <SectionLabel>Operator</SectionLabel>
          <h2 className="text-xl font-semibold">Action Center</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Verified issues that need attention, without executing anything automatically.
          </p>
        </div>
        <button type="button" onClick={load} className="rounded-xl border p-2" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}><div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Critical</div><div className="mt-1 text-xl font-semibold">{report.counts.critical}</div></div>
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}><div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Warning</div><div className="mt-1 text-xl font-semibold">{report.counts.warning}</div></div>
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}><div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Open</div><div className="mt-1 text-xl font-semibold">{report.counts.total}</div></div>
      </div>

      <Panel padded={false} className="overflow-hidden">
        {report.items.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-5 text-sm" style={{ color: 'var(--text-muted)' }}>
            <CheckCircle2 size={17} /> No verified action required right now.
          </div>
        ) : report.items.map((item, index) => (
          <div key={item.id} className="px-4 py-4" style={{ borderTop: index ? '1px solid var(--border)' : undefined }}>
            <div className="flex items-start gap-3">
              {item.severity === 'critical' ? <ShieldAlert size={17} style={{ color: severityColor(item.severity) }} /> : <AlertCircle size={17} style={{ color: severityColor(item.severity) }} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <span className="text-[10px] font-bold uppercase" style={{ color: severityColor(item.severity) }}>{item.severity}</span>
                  <span className="text-[10px] uppercase" style={{ color: 'var(--text-disabled)' }}>{item.source}</span>
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{item.description}</div>
                {item.recommended_commands.length > 0 && (
                  <div className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Recommended: {item.recommended_commands.join(', ')}
                  </div>
                )}
                {item.recovery_available && (
                  <div className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--success-text)' }}>
                    One-click recovery capability available after normal confirmation.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
