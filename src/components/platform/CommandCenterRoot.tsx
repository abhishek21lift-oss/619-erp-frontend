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
import { Loader2, Activity, ShieldCheck, Radio, Sparkles } from 'lucide-react';
import { TONE } from '@/components/platform/command-center-utils';

const sectionStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
  borderRadius: 22,
  boxShadow: '0 18px 60px rgba(15, 23, 42, 0.06)',
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
};

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
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 size={32} className="animate-spin" /></div>;
  }
  if (error && !snap) return <Center><ErrorState error={error} onRetry={handleRefresh} /></Center>;
  if (!snap) return null;

  const cards = Object.values(snap.cards);
  const overall = TONE[snap.status] ?? TONE.unavailable;
  const healthyCount = statusCounts.find((x) => x.label === 'healthy')?.n ?? 0;
  const attentionCount = (statusCounts.find((x) => x.label === 'critical')?.n ?? 0)
    + (statusCounts.find((x) => x.label === 'timeout')?.n ?? 0)
    + (statusCounts.find((x) => x.label === 'warning')?.n ?? 0);

  return (
    <div
      className="relative mx-auto w-full max-w-[1600px] space-y-5 overflow-hidden pb-8"
      data-test-id="command-center-root"
    >
      {/* Ambient layer: visual polish only; no app-wide theme or token changes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 h-80 w-80 rounded-full blur-3xl"
        style={{ background: 'rgba(99, 102, 241, 0.10)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-64 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'rgba(16, 185, 129, 0.08)' }}
      />

      <div className="relative">
        <Header transport={transport} refresh={handleRefresh} refreshing={refreshing} />
      </div>

      {/* Operator brief: answer the three questions an owner needs first. */}
      <section className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div
          className="overflow-hidden rounded-[26px] p-5 sm:p-6"
          style={{
            ...sectionStyle,
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 94%, transparent), color-mix(in srgb, var(--bg-subtle) 92%, transparent))',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p style={eyebrowStyle}>Platform command center</p>
              <h1 className="mt-1 text-[24px] font-[850] tracking-[-0.035em] sm:text-[30px]" style={{ color: 'var(--text-primary)' }}>
                Good morning, operator.
              </h1>
              <p className="mt-1 max-w-[680px] text-[12.5px] leading-relaxed sm:text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                One live view of platform health, active risk, infrastructure signals and production operations.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ background: overall.color, opacity: 0.55 }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: overall.color }} />
              </span>
              <span className="text-[10.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                {transport === 'stream' ? 'LIVE STREAM' : '5s POLLING'}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-[15px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                <Activity size={13} /><span style={eyebrowStyle}>System</span>
              </div>
              <p className="mt-1.5 text-[17px] font-[850] capitalize" style={{ color: overall.color }}>{snap.status}</p>
            </div>
            <div className="rounded-[15px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                <ShieldCheck size={13} /><span style={eyebrowStyle}>Healthy signals</span>
              </div>
              <p className="mt-1.5 text-[17px] font-[850]" style={{ color: 'var(--text-primary)' }}>{healthyCount}<span className="ml-1 text-[11px] font-[600]" style={{ color: 'var(--text-tertiary)' }}>cards</span></p>
            </div>
            <div className="rounded-[15px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                <Radio size={13} /><span style={eyebrowStyle}>Attention</span>
              </div>
              <p className="mt-1.5 text-[17px] font-[850]" style={{ color: attentionCount ? 'var(--text-primary)' : overall.color }}>
                {attentionCount}<span className="ml-1 text-[11px] font-[600]" style={{ color: 'var(--text-tertiary)' }}>signals</span>
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:w-[390px]">
          <HeroHealth overallStatus={overall} counts={statusCounts} durationMs={snap.duration_ms} />
        </div>
      </section>

      <section className="relative" style={sectionStyle}>
        <div className="flex items-end justify-between gap-3 px-4 pt-4 sm:px-5">
          <div>
            <p style={eyebrowStyle}>At a glance</p>
            <h2 className="mt-0.5 text-[16px] font-[800] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Platform pulse</h2>
          </div>
          <p className="hidden text-[10.5px] sm:block" style={{ color: 'var(--text-tertiary)' }}>Collected {new Date(snap.collected_at).toLocaleTimeString()}</p>
        </div>
        <div className="px-3 pb-3 pt-2 sm:px-4">
          <KPISection refreshToken={kpiRefreshToken} />
        </div>
      </section>

      {/* Risk first: alerts and Guardian form the operator's decision layer. */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
        <div className="min-w-0 rounded-[22px] p-1" style={sectionStyle}>
          <AlertCenter onChanged={() => refresh()} />
        </div>
        <div className="min-w-0 rounded-[22px] p-1" style={sectionStyle}>
          <Guardian />
        </div>
      </section>

      <section className="rounded-[22px] p-1" style={sectionStyle}>
        <div className="flex items-center gap-2 px-4 pt-4 sm:px-5">
          <Sparkles size={14} style={{ color: 'var(--text-tertiary)' }} />
          <div>
            <p style={eyebrowStyle}>Infrastructure</p>
            <h2 className="mt-0.5 text-[16px] font-[800]" style={{ color: 'var(--text-primary)' }}>System signals</h2>
          </div>
        </div>
        <div className="px-2 pb-2 pt-3 sm:px-3">
          <CardGrid cards={cards} history={history} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-w-0 rounded-[22px] p-1" style={sectionStyle}>
          <div className="px-4 pt-4 sm:px-5">
            <p style={eyebrowStyle}>Production controls</p>
            <h2 className="mt-0.5 text-[16px] font-[800]" style={{ color: 'var(--text-primary)' }}>Operations</h2>
          </div>
          <div className="pt-2"><CommandPanel onRan={() => refresh()} /></div>
        </div>
        <div className="min-w-0 rounded-[22px] p-1" style={sectionStyle}>
          <div className="px-4 pt-4 sm:px-5">
            <p style={eyebrowStyle}>Observability</p>
            <h2 className="mt-0.5 text-[16px] font-[800]" style={{ color: 'var(--text-primary)' }}>Live system stream</h2>
          </div>
          <div className="pt-2"><LiveLogs /></div>
        </div>
      </section>

      <div className="relative flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3 text-center text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>
        <span>{transport === 'stream' ? 'Streaming live' : 'Updating every 5s'}</span>
        <span aria-hidden="true">·</span>
        <span>last collected {new Date(snap.collected_at).toLocaleTimeString()}</span>
        <span aria-hidden="true">·</span>
        <span>{snap.duration_ms}ms collection</span>
      </div>
    </div>
  );
};
