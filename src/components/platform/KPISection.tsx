import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { PlatformKpis } from '@/lib/api';
import { PremiumMetricCard } from '@/components/visualizations';
import { fmtINR } from '@/app/(platform)/platform/_shared/format';
import { Center, ErrorState } from '@/app/(platform)/platform/_shared/ui';
import { Loader2 } from 'lucide-react';

/**
 * KPISection – shows top‑level platform metrics using the real
 * `/api/platform/overview/kpis` endpoint. No mock data; if the endpoint is
 * unavailable we render a friendly placeholder.
 */
export const KPISection: React.FC = () => {
  const [kpis, setKpis] = useState<PlatformKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.superAdmin.kpis();
        setKpis(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load KPIs');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => { setLoading(true); setError(''); setKpis(null); }} />;
  }

  if (!kpis) return null;

  const { platform_revenue, operations, security } = kpis;

  const cards = [
    {
      label: 'MRR',
      value: fmtINR(platform_revenue.mrr_inr),
      sub: `${platform_revenue.active_subscriptions} active · ${platform_revenue.trial_subscriptions} trial`,
    },
    {
      label: 'Failed payments (30d)',
      value: String(operations.failed_payments_30d),
      sub: `${platform_revenue.expiring_in_7d} subs expiring in 7d`,
    },
    {
      label: 'Open critical alerts',
      value: String(security.critical_alerts),
      sub: `${security.high_alerts} high · ${security.medium_alerts} medium`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4">
      {cards.map((c) => (
        <PremiumMetricCard key={c.label} label={c.label} value={c.value} sub={c.sub} bordered={false} density="compact" />
      ))}
    </div>
  );
};
