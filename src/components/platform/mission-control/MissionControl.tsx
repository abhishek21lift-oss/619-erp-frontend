'use client';
/**
 * The Command Center shell.
 *
 * ── The reading order it is built around ───────────────────────────────────
 *
 * An operator arriving at an incident asks the same questions in the same
 * order, and the layout answers them top to bottom rather than making them
 * hunt:
 *
 *   WHAT IS BROKEN    the status ring and its reason list
 *   HOW BAD           the rollup, plus coverage — because "critical" over half
 *                     a platform is a different claim from "critical" over all
 *                     of it, and only the second number can say which
 *   WHY               each matrix row carries its own reason, unclicked
 *   WHAT IS AFFECTED  the topology, where the edges are
 *   WHAT CHANGED      the incident timeline
 *   WHAT CAN I DO     the recovery console
 *   DID IT WORK       the verdict the command returns, and the next snapshot
 *
 * ── Why the existing panels are reused, not rewritten ──────────────────────
 *
 * AlertCenter, Guardian, CommandPanel and LiveLogs are ~1,500 lines of working
 * behaviour against real endpoints. Rewriting them for visual consistency
 * would risk regressions in the half of this console that actually acts on
 * production, to change how it looks. They are composed here instead.
 */

import React, { useCallback, useState } from 'react';
import { m } from 'framer-motion';
import { Loader2, RefreshCw, Activity, ShieldCheck, Radio, Terminal } from 'lucide-react';
import { useCommandCenterSnapshot } from '@/components/platform/useCommandCenterSnapshot';
import { Center, ErrorState } from '@/app/(platform)/platform/_shared/ui';
import AlertCenter from '@/components/platform/alert-center';
import Guardian from '@/components/platform/guardian';
import CommandPanel from '@/components/platform/command-panel';
import LiveLogs from '@/components/platform/live-logs';
import { GlobalStatus } from './GlobalStatus';
import { HealthMatrix } from './HealthMatrix';
import { Topology } from './Topology';
import { ObservabilityBar } from './ObservabilityBar';
import { surface, toneFor } from './tokens';

type Deck = 'operations' | 'guardian' | 'recovery' | 'logs';

const DECKS: Array<{ id: Deck; label: string; Icon: typeof Activity }> = [
  { id: 'operations', label: 'Operations', Icon: Activity },
  { id: 'guardian', label: 'Guardian', Icon: ShieldCheck },
  { id: 'recovery', label: 'Recovery', Icon: Terminal },
  { id: 'logs', label: 'Live logs', Icon: Radio },
];

export const MissionControl: React.FC = () => {
  const { snap, error, loading, refreshing, transport, history, refresh } = useCommandCenterSnapshot(5_000);
  const [deck, setDeck] = useState<Deck>('operations');

  const handleRefresh = useCallback(() => { refresh(); }, [refresh]);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 size={30} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    );
  }
  if (error && !snap) return <Center><ErrorState error={error} onRetry={handleRefresh} /></Center>;
  if (!snap) return null;

  const tone = toneFor(snap.status);

  return (
    <div
      className="relative mx-auto w-full max-w-[1600px] space-y-4 pb-10"
      data-test-id="command-center-root"
    >
      {/* Ambient wash, tinted by the CURRENT STATE rather than a fixed brand
          colour — the room changes colour when something is wrong, which is
          peripheral information an operator picks up without reading. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-40 h-80 w-80 rounded-full blur-3xl transition-colors duration-700"
        style={{ background: tone.color, opacity: 0.07 }}
      />

      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9.5px] font-[900] uppercase tracking-[.2em]"
            style={{ color: tone.color }}>
            <span className="relative flex h-1.5 w-1.5">
              {snap.status !== 'healthy' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: tone.color }} />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: tone.color }} />
            </span>
            Command Center
          </div>
          <h1 className="mt-1 text-[26px] font-[950] leading-none tracking-[-.045em] sm:text-[30px]"
            style={{ color: 'var(--text-primary)' }}>
            Platform operations
          </h1>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex shrink-0 items-center gap-2 rounded-[12px] border px-3.5 py-2 text-[11px] font-[850] disabled:opacity-60"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Re-probe
        </button>
      </header>

      <ObservabilityBar snap={snap} transport={transport} refreshing={refreshing} />

      <GlobalStatus snap={snap} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <HealthMatrix snap={snap} history={history} />
        <Topology snap={snap} />
      </div>

      {/* ── Decks ────────────────────────────────────────────────────────────
          Tabs rather than one long scroll: each of these polls its own
          endpoints, and rendering all four at once would quadruple the load
          the console puts on a platform it is supposed to be watching. */}
      <nav
        className="flex gap-1 overflow-x-auto rounded-[14px] p-1"
        style={{ background: 'var(--bg-subtle)' }}
        aria-label="Command Center decks"
      >
        {DECKS.map(({ id, label, Icon }) => {
          const active = deck === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setDeck(id)}
              aria-current={active ? 'page' : undefined}
              className="relative flex shrink-0 items-center gap-1.5 rounded-[11px] px-3 py-1.5 text-[11px] font-[800] transition-colors"
              style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              {active && (
                <m.span
                  layoutId="deck-pill"
                  className="absolute inset-0 rounded-[11px]"
                  style={{ background: 'var(--surface)', boxShadow: '0 2px 8px rgba(15,23,42,.08)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={13} className="relative" />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </nav>

      <m.div key={deck} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}>
        {deck === 'operations' && <AlertCenter />}
        {deck === 'guardian' && <Guardian />}
        {deck === 'recovery' && <CommandPanel />}
        {deck === 'logs' && <LiveLogs />}
      </m.div>

      <footer className="px-1 text-center text-[9.5px]" style={{ color: 'var(--text-disabled)' }}>
        <span style={surface.inset ? undefined : undefined}>
          Snapshot {new Date(snap.collected_at).toLocaleTimeString()} · collected in {snap.duration_ms}ms ·{' '}
          {snap.observability?.probed ?? 0}/{snap.observability?.total ?? 0} probes returned
        </span>
      </footer>
    </div>
  );
};

export default MissionControl;
