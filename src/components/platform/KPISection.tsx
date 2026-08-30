import React, { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/http';
import type { PlatformKpis } from '@/lib/api';
import { PremiumMetricCard } from '@/components/visualizations';
import { fmtINR } from '@/app/(platform)/platform/_shared/format';
import { ErrorState } from '@/app/(platform)/platform/_shared/ui';
import { Loader2 } from 'lucide-react';

export const KPISection: React.FC<{ refreshToken?: number }> = ({ refreshToken = 0 }) => {
  const [kpis, setKpis] = useState<PlatformKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchKpis = useCallback(async (fresh: boolean) => {
    setLoading(true);
    try {
      const res = await http<{ data: PlatformKpis; cached: boolean }>(
        `/api/platform/overview/kpis${fresh ? '?fresh=1' : ''}`,
        { cacheMs: 0 },
      );
      setKpis(res.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchKpis(refreshToken > 0);
  }, [fetchKpis, refreshToken]);

  if (loading && !kpis) return <div className="flex items-center justify-center py-4"><Loader2 size={24} className="animate-spin" /></div>;
  if (error && !kpis) return <ErrorState error={error} onRetry={() => void fetchKpis(true)} />;
  if (!kpis) return null;

  const { platform_revenue, operations, security } = kpis;
  const cards = [
    { label: 'MRR', value: fmtINR(platform_revenue.mrr_inr) },
    { label: 'Failed payments (30d)', value: String(operations.failed_payments_30d) },
    { label: 'Open critical alerts', value: String(security.critical_alerts) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4">
      {cards.map((c) => <PremiumMetricCard key={c.label} label={c.label} value={c.value} bordered={false} density="compact" />)}
      {error && <p className="sm:col-span-2 lg:col-span-3 text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>Latest refresh failed; showing the last known KPI values.</p>}
    </div>
  );
};
