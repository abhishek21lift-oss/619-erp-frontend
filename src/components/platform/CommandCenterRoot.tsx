import React, { useCallback, useMemo, useState } from 'react';
import { useCommandCenterSnapshot } from '@/components/platform/useCommandCenterSnapshot';
import { Header } from '@/components/platform/Header';
import { HeroHealth } from '@/components/platform/HeroHealth';
import { KPISection } from '@/components/platform/KPISection';
import { CardGrid } from '@/components/platform/CardGrid';
import AlertCenter from '@/components/platform/alert-center';
import Guardian from '@/components/platform/guardian';
import CommandPanel from '@/components/platform/command-panel';
import LiveLogs from '@/components/platform/live-logs';
import { Center, ErrorState } from '@/app/(platform)/platform/_shared/ui';
import { Loader2 } from 'lucide-react';
import { TONE } from '@/components/platform/command-center-utils';

export const CommandCenterRoot: React.FC = () => {
  const { snap, error, loading, refreshing, transport, history, refresh } = useCommandCenterSnapshot(5_000);
  const [kpiRefreshToken, setKpiRefreshToken] = useState(0);

  const handleRefresh = useCallback(() => {
    refresh();
    setKpiRefreshToken((v) => v + 1);
  }, [refresh]);

  const statusCounts = useMemo(() => {
    if (!snap) return [];
    const cards = Object.values(snap.cards);
    const map: Record<string, { n: number; color: string }> = {
      critical: { n: 0, color: TONE.critical.color },
      timeout: { n: 0, color: TONE.timeout.color },
      warning: { n: 0, color: TONE.warning.color },
      unavailable: { n: 0, color: TONE.unavailable.color },
      healthy: { n: 0, color: TONE.healthy.color },
    };
    cards.forEach((c) => { if (c.status in map) map[c.status].n++; });
    return [
      { label: 'critical', n: map.critical.n, color: map.critical.color },
      { label: 'timeout', n: map.timeout.n, color: map.timeout.color },
      { label: 'warning', n: map.warning.n, color: map.warning.color },
      { label: 'unavailable', n: map.unavailable.n, color: map.unavailable.color },
      { label: 'healthy', n: map.healthy.n, color: map.healthy.color },
    ].filter((c) => c.n > 0);
  }, [snap]);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 size={32} className="animate-spin" /></div>;
  }
  if (error && !snap) return <Center><ErrorState error={error} onRetry={handleRefresh} /></Center>;
  if (!snap) return null;

  const cards = Object.values(snap.cards);
  const overall = TONE[snap.status] ?? TONE.unavailable;

  return (
    <div className="space-y-4" data-test-id="command-center-root">
      <Header transport={transport} refresh={handleRefresh} refreshing={refreshing} />
      <HeroHealth overallStatus={overall} counts={statusCounts} durationMs={snap.duration_ms} />
      <KPISection refreshToken={kpiRefreshToken} />
      <AlertCenter onChanged={() => refresh()} />
      <Guardian />
      <CardGrid cards={cards} history={history} />
      <div className="pt-1"><CommandPanel onRan={() => refresh()} /></div>
      <div className="pt-1"><LiveLogs /></div>
      <p className="text-center text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>
        {transport === 'stream' ? 'Streaming live' : 'Updating every 5s'} · last collected {new Date(snap.collected_at).toLocaleTimeString()}
      </p>
    </div>
  );
};
