'use client';
/**
 * How much of the platform this reading covers, and how fresh it is.
 *
 * A strip rather than a panel because it is CONTEXT for everything below it,
 * not a thing to read on its own. It earns its row by carrying the three facts
 * that decide how much to trust the screen: what was measured, what was not,
 * and how old the numbers are.
 */

import React from 'react';
import { Radio, Wifi, WifiOff, Clock, EyeOff, ShieldAlert } from 'lucide-react';
import type { CommandCenterSnapshot } from '@/lib/api';
import { toneFor } from './tokens';

const Chip: React.FC<{
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string; value: string; color?: string; title?: string;
}> = ({ Icon, label, value, color, title }) => (
  <span
    className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
    style={{ background: 'var(--bg-subtle)' }}
    title={title}
  >
    <Icon size={11} style={{ color: color ?? 'var(--text-tertiary)' }} />
    <span className="text-[9.5px] font-[800] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
      {label}
    </span>
    <b className="text-[10.5px] tabular-nums" style={{ color: color ?? 'var(--text-primary)' }}>{value}</b>
  </span>
);

export const ObservabilityBar: React.FC<{
  snap: CommandCenterSnapshot;
  transport: 'stream' | 'polling';
  refreshing: boolean;
}> = ({ snap, transport, refreshing }) => {
  const obs = snap.observability;
  const blind = obs?.unavailable ?? 0;
  const stale = obs?.stale ?? 0;
  const coverage = obs?.coverage ?? 1;
  const violations = snap.contract_violations ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        Icon={transport === 'stream' ? Wifi : WifiOff}
        label={transport === 'stream' ? 'live' : 'polling'}
        value={transport === 'stream' ? 'socket' : '5s'}
        color={transport === 'stream' ? toneFor('healthy').color : undefined}
        title={transport === 'stream'
          ? 'Streaming over the authenticated WebSocket.'
          : 'The socket is unavailable; falling back to a 5-second poll. Same data, slower.'}
      />
      <Chip
        Icon={Radio} label="coverage" value={`${Math.round(coverage * 100)}%`}
        color={coverage < 1 ? toneFor('degraded').color : undefined}
        title="Share of probes that actually returned a reading. Capabilities this deployment has not wired up are excluded."
      />
      {blind > 0 && (
        <Chip
          Icon={EyeOff} label="blind" value={String(blind)} color={toneFor('degraded').color}
          title="Probes that should have run and did not. These are gaps, not readings."
        />
      )}
      {stale > 0 && (
        <Chip
          Icon={Clock} label="cached" value={String(stale)}
          title="Cards served from the per-collector TTL cache rather than freshly probed."
        />
      )}
      {violations.length > 0 && (
        <Chip
          Icon={ShieldAlert} label="contract" value={`${violations.length} drifted`}
          color={toneFor('warning').color}
          title={`A collector graded itself healthy while its payload lost fields the console renders: ${violations.slice(0, 6).join(', ')}`}
        />
      )}
      <span className="text-[9.5px] tabular-nums" style={{ color: 'var(--text-disabled)' }}>
        {refreshing ? 'refreshing…' : new Date(snap.collected_at).toLocaleTimeString()}
      </span>
    </div>
  );
};
