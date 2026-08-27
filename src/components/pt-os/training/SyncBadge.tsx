'use client';

import { CloudOff, Loader2 } from 'lucide-react';

/**
 * The sync state, stated plainly.
 *
 * Silence when everything is delivered — a permanent "synced" badge is noise
 * that people stop reading, and then they stop reading it when it says
 * something else too.
 */
export default function SyncBadge({ pending, syncing, error, onRetry }: {
  pending: number; syncing: boolean; error: string | null; onRetry: () => void;
}) {
  if (pending === 0 && !error) return null;
  const offline = !!error;
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-[12px] border px-3.5 py-2.5 text-[12.5px] font-[620]"
      style={{
        borderColor: offline ? 'var(--warning-border)' : 'var(--border-2)',
        background: offline ? 'var(--warning-bg)' : 'var(--surface-2)',
        color: 'var(--text-primary)',
      }}
    >
      {offline ? <CloudOff size={14} /> : <Loader2 size={14} className="animate-spin" />}
      <span>
        {offline
          ? `${pending} entr${pending === 1 ? 'y' : 'ies'} waiting — will send when the connection is back`
          : `Saving ${pending} entr${pending === 1 ? 'y' : 'ies'}…`}
      </span>
      {offline && (
        <button type="button" onClick={onRetry} className="ml-auto underline" style={{ color: 'var(--brand)' }}>
          Try now
        </button>
      )}
      {!offline && syncing && <span className="sr-only">syncing</span>}
    </div>
  );
}
