import React from 'react';
import { Activity, Command, RefreshCw, ShieldCheck } from 'lucide-react';
import { rgba, semantic } from '@/lib/palette';
import type { Transport } from '@/components/platform/useCommandCenterSnapshot';

type HeaderProps = {
  transport: Transport;
  refresh: () => void;
  refreshing: boolean;
};

export const Header: React.FC<HeaderProps> = ({ transport, refresh, refreshing }) => {
  const live = transport === 'stream';

  return (
    <header
      className="relative overflow-hidden rounded-[22px] px-4 py-3.5 sm:px-5 sm:py-4"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 92%, white 8%), var(--surface))',
        border: '1px solid var(--border)',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.07), inset 0 1px 0 rgba(255,255,255,0.55)',
        backdropFilter: 'blur(18px)',
      }}
      data-test-id="command-center-header"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full blur-3xl"
        style={{ background: rgba(live ? semantic.success : semantic.warning, 0.10) }}
      />

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div
          className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[14px]"
          style={{
            background: live ? rgba(semantic.success, 0.12) : 'var(--bg-subtle)',
            border: `1px solid ${live ? rgba(semantic.success, 0.22) : 'var(--border)'}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          <Activity size={20} color={live ? semantic.success : 'var(--text-tertiary)'} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[15px] font-[850] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
              Command Center
            </p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-[800] uppercase tracking-[0.08em]"
              style={{
                color: live ? semantic.success : 'var(--text-secondary)',
                background: live ? rgba(semantic.success, 0.10) : 'var(--bg-subtle)',
                border: `1px solid ${live ? rgba(semantic.success, 0.18) : 'var(--border)'}`,
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: semantic.success }} />}
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: live ? semantic.success : 'var(--text-tertiary)' }} />
              </span>
              {live ? 'Live' : 'Polling'}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> Super Admin</span>
            <span aria-hidden="true">•</span>
            <span>Operations Control Room</span>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div
            className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[10.5px] font-[700]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
            title="Command palette"
          >
            <Command size={12} />
            <span>K</span>
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh Command Center"
          className="group flex items-center gap-2 rounded-[12px] px-2.5 py-2 text-[12px] font-[750] transition-transform hover:-translate-y-px disabled:opacity-50 sm:px-3"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
          }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : 'transition-transform group-hover:rotate-90'} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
