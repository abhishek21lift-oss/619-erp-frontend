'use client';

// Who is inside a studio right now — and what happened in every session that
// has ended.
//
// The console could always say that an impersonation happened (activity_log)
// but not whether one was still open, why it was opened, or how to stop it.
// Migration 285 made the session a row; this is the surface that reads it.
//
// Read-only sessions produce no action rows by construction (the server refuses
// every write), so "Actions" is only offered for full-access sessions. The
// revoke button is the operator's "get them out now" control and works on
// somebody else's session.

import { useCallback, useEffect, useState } from 'react';
import { Eye, LogIn, Loader2, RefreshCw, ShieldOff, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { ImpersonationSessionRecord, ImpersonationAction } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';
import { CcCard, CcEmpty } from './cc-viz';

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' } as const;

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function remaining(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'expired';
  const m = Math.ceil(ms / 60_000);
  return `${m}m left`;
}

const END_LABEL: Record<string, string> = {
  operator_exit: 'Exited',
  revoked: 'Revoked',
  expired: 'Expired',
  target_revoked: 'Target revoked',
};

export default function ImpersonationSessions() {
  const { toast } = useToast();
  const [active, setActive] = useState<ImpersonationSessionRecord[] | null>(null);
  const [recent, setRecent] = useState<ImpersonationSessionRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [actions, setActions] = useState<Record<string, ImpersonationAction[] | 'loading' | 'error'>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        api.superAdmin.impersonationSessions({ status: 'active', limit: 50 }),
        api.superAdmin.impersonationSessions({ status: 'ended', limit: 20 }),
      ]);
      setActive(a.data);
      setRecent(r.data);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not load impersonation sessions'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);
  // A session ending is a security event; the list should not need a manual
  // reload to notice one has expired.
  useEffect(() => {
    const id = window.setInterval(() => { void load(); }, 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const revoke = async (s: ImpersonationSessionRecord) => {
    if (!window.confirm(`End ${s.operator.name ?? 'this operator'}'s session in ${s.organization.name ?? 'this studio'} now?`)) return;
    setBusy(s.id);
    try {
      await api.superAdmin.revokeImpersonationSession(s.id, 'Revoked from the Security tab');
      toast.success('Session revoked. The next request with that token is refused.');
      await load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not revoke the session'));
    } finally { setBusy(null); }
  };

  const toggleActions = async (s: ImpersonationSessionRecord) => {
    if (open === s.id) { setOpen(null); return; }
    setOpen(s.id);
    if (actions[s.id]) return;
    setActions((m) => ({ ...m, [s.id]: 'loading' }));
    try {
      const r = await api.superAdmin.impersonationSessionActions(s.id);
      setActions((m) => ({ ...m, [s.id]: r.data }));
    } catch {
      setActions((m) => ({ ...m, [s.id]: 'error' }));
    }
  };

  const Row = ({ s }: { s: ImpersonationSessionRecord }) => {
    const full = s.mode === 'full';
    const a = actions[s.id];
    return (
      <div className="rounded-[14px] p-3" style={cardStyle}>
        <div className="flex flex-wrap items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: full ? 'rgba(220,38,38,0.12)' : 'rgba(163,55,87,0.10)', color: full ? '#dc2626' : '#A33757' }}>
            {full ? <LogIn size={15} /> : <Eye size={15} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
              {s.operator.name ?? s.operator.email ?? s.operator.id}
              <span className="font-[500]" style={{ color: 'var(--text-muted)' }}>
                {' '}→ {s.account.name ?? s.account.email ?? s.account.id} · {s.organization.name ?? s.organization.id}
              </span>
            </p>
            <p className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--text-secondary)' }} title={s.reason}>
              “{s.reason}”
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
              <span className="inline-flex items-center gap-1"><Clock size={10} /> {fmtWhen(s.started_at)}</span>
              <span>{full ? 'Full access' : 'Read-only'}</span>
              {s.active ? (
                <span className="font-[700]" style={{ color: full ? '#dc2626' : '#b45309' }}>{remaining(s.expires_at)}</span>
              ) : (
                <span>{END_LABEL[s.end_reason ?? ''] ?? 'Ended'} · {fmtWhen(s.ended_at)}</span>
              )}
              {s.action_count > 0 && <span>{s.action_count} write{s.action_count === 1 ? '' : 's'}</span>}
              {s.ip && <span className="font-mono">{s.ip}</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {full && s.action_count > 0 && (
              <button onClick={() => toggleActions(s)}
                className="flex h-8 items-center gap-1 rounded-[8px] px-2 text-[11px] font-[700]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {open === s.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Actions
              </button>
            )}
            {s.active && (
              <button onClick={() => revoke(s)} disabled={busy === s.id}
                className="flex h-8 items-center gap-1 rounded-[8px] px-2 text-[11px] font-[700] disabled:opacity-50"
                style={{ background: 'rgba(220,38,38,0.10)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}>
                {busy === s.id ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />} Revoke
              </button>
            )}
          </div>
        </div>

        {open === s.id && (
          <div className="mt-2 rounded-[10px] p-2" style={{ background: 'var(--bg-subtle)' }}>
            {a === 'loading' && <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}><Loader2 size={12} className="animate-spin" /> Loading actions…</div>}
            {a === 'error' && <p className="text-[11px]" style={{ color: 'var(--danger)' }}>Could not load the action trail.</p>}
            {Array.isArray(a) && a.length === 0 && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No writes recorded.</p>}
            {Array.isArray(a) && a.length > 0 && (
              <ul className="space-y-1">
                {a.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-baseline gap-2 text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-mono font-[750]" style={{ color: x.method === 'DELETE' ? '#dc2626' : 'var(--text-primary)' }}>{x.method}</span>
                    <span className="min-w-0 flex-1 truncate font-mono">{x.path}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{x.status_code ?? '—'} · {fmtWhen(x.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <CcCard
      title="Impersonation sessions"
      action={
        <button onClick={() => void load()} disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[11.5px] font-[700]"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[10.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
            Active now
          </p>
          {active === null ? (
            <div className="flex items-center gap-2 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : active.length === 0 ? (
            <CcEmpty title="No operator is inside a studio" body="Every impersonation appears here while it is open." height={120} />
          ) : (
            <div className="space-y-2">{active.map((s) => <Row key={s.id} s={s} />)}</div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[10.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
            Recent
          </p>
          {recent === null ? (
            <div className="flex items-center gap-2 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : recent.length === 0 ? (
            <p className="py-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>No ended sessions yet.</p>
          ) : (
            <div className="space-y-2">{recent.map((s) => <Row key={s.id} s={s} />)}</div>
          )}
        </div>
      </div>

      <p className="mt-3 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
        Read-only sessions cannot write, so they carry no action trail. Full-access writes are also
        recorded in the studio activity log against the operator, not the studio account.
      </p>
    </CcCard>
  );
}
