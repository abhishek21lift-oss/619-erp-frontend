import React from 'react';
import { RadioTower, RefreshCw } from 'lucide-react';
import { rgba, semantic } from '@/lib/palette';
import type { Transport } from '@/components/platform/useCommandCenterSnapshot';

type HeaderProps = {
  transport: Transport;
  refresh: () => void;
  refreshing: boolean;
};

export const Header: React.FC<HeaderProps> = ({ transport, refresh, refreshing }) => (
  <div className="flex items-center gap-2.5 rounded-[16px] px-3.5 py-3 sm:gap-3 sm:px-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[11px]" style={{ background: transport === 'stream' ? rgba(semantic.success, 0.10) : 'var(--bg-subtle)' }}>
      <RadioTower size={17} color={transport === 'stream' ? semantic.success : 'var(--text-tertiary)'} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>Command Center</p>
      <p className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>{transport === 'stream' ? 'Live' : 'Polling 5s'}</p>
    </div>
    <button type="button" onClick={refresh} disabled={refreshing} aria-label="Refresh"
      className="flex items-center gap-2 rounded-[11px] px-2 py-2 text-[12.5px] font-[650] disabled:opacity-50 sm:px-3"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">Refresh</span>
    </button>
  </div>
);
