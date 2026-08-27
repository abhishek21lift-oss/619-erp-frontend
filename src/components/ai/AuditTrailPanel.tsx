'use client';

/**
 * AuditTrailPanel — displays the history of intelligence actions
 * (memory confirm/reject, proposal approve/reject) for a client or
 * across all clients. Read-only, no mutations.
 */

import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, Shield, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { AiIntelligenceAudit } from '@/lib/api';

const ACCENT = '#0067E0';

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  confirm: { label: 'Memory Confirmed', color: '#059669', icon: <CheckCircle2 size={12} /> },
  reject: { label: 'Memory Rejected', color: '#dc2626', icon: <XCircle size={12} /> },
  approve: { label: 'Proposal Approved', color: '#059669', icon: <CheckCircle2 size={12} /> },
  reject_proposal: { label: 'Proposal Rejected', color: '#dc2626', icon: <XCircle size={12} /> },
  supersede: { label: 'Memory Superseded', color: '#B45309', icon: <Shield size={12} /> },
  expire: { label: 'Proposal Expired', color: '#64748b', icon: <Clock size={12} /> },
  execute: { label: 'Proposal Executed', color: ACCENT, icon: <CheckCircle2 size={12} /> },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface Props {
  clientId?: string;
  limit?: number;
}

export default function AuditTrailPanel({ clientId, limit = 20 }: Props) {
  const [entries, setEntries] = useState<AiIntelligenceAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.ai.trainer.audit({
          client_id: clientId,
          limit,
        });
        if (alive) setEntries(res.data);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load audit trail');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [clientId, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin" style={{ color: ACCENT }} />
        <span className="ml-2 text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>
          Loading audit trail…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[12px] px-3 py-2 text-[12px] font-[600]"
        style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626' }}>
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-6 text-center">
        <Clock size={20} className="mx-auto mb-2" style={{ color: 'var(--text-disabled)' }} />
        <p className="text-[12px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
          No audit history yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => {
        const action = ACTION_LABELS[entry.action] ?? {
          label: entry.action,
          color: '#64748b',
          icon: <Clock size={12} />,
        };

        return (
          <div key={entry.id}
            className="flex items-start gap-3 rounded-[12px] px-3.5 py-2.5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: `${action.color}15`, color: action.color }}>
              {action.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-[700]" style={{ color: action.color }}>
                  {action.label}
                </span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-disabled)' }}>
                  {entry.target_type}
                </span>
              </div>
              {entry.target_description && (
                <p className="mt-0.5 truncate text-[11.5px] font-[560]" style={{ color: 'var(--text-muted)' }}>
                  {entry.target_description}
                </p>
              )}
              {entry.previous_state && entry.new_state && (
                <p className="mt-0.5 text-[10.5px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
                  {entry.previous_state} → {entry.new_state}
                </p>
              )}
              {entry.reason && (
                <p className="mt-0.5 text-[10.5px] italic" style={{ color: 'var(--text-disabled)' }}>
                  &ldquo;{entry.reason}&rdquo;
                </p>
              )}
            </div>
            <span className="flex-shrink-0 text-[10.5px] font-[600] tabular-nums" style={{ color: 'var(--text-disabled)' }}>
              {formatTime(entry.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
