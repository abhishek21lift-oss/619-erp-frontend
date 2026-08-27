'use client';

// Users — the platform account directory.
//
// The one module the console did not have. Accounts were reachable only
// through the studio that owns them, so questions that span studios — who holds
// platform access, who has never signed in, which logins are still live for a
// suspended studio — meant opening studios one at a time.
//
// ── What it deliberately shows ──────────────────────────────────────────────
//
// Platform access is the GRANT, not the role. An account whose role says
// super_admin but which holds no live platform_owners row cannot reach the
// console, and a directory that printed the role as though it were access would
// describe a permission that does not exist. The badge reads has_platform_grant.
//
// Sessions are live refresh tokens, so "3 sessions" means three devices could
// act as this account right now — which is the number that matters when
// deciding whether to force a logout, and is not inferable from is_active.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, RefreshCw, Search, ShieldCheck, KeyRound, Users2, UserX, Clock,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type { PlatformUser, PlatformUserQuery, PlatformUserSummary } from '@/lib/api';
import { roleLabel } from '@/lib/roles';
import { fmtWhen } from '../_shared/format';
import { Center, ErrorState, inputCls, inputStyle } from '../_shared/ui';

const PAGE = 50;

type RoleFilter = '' | 'admin' | 'trainer' | 'member' | 'platform';
type StatusFilter = '' | 'active' | 'inactive' | 'deleted';

/** The summary strip. Counts come from the server in one pass, unpaged. */
function SummaryStrip({ s }: { s: PlatformUserSummary | null }) {
  const items: { label: string; value: number | undefined; icon: React.ReactNode }[] = [
    { label: 'Accounts', value: s?.total, icon: <Users2 size={13} /> },
    { label: 'Studio owners', value: s?.owners, icon: <ShieldCheck size={13} /> },
    { label: 'Trainers', value: s?.trainers, icon: <Users2 size={13} /> },
    { label: 'Members', value: s?.members, icon: <Users2 size={13} /> },
    { label: 'Platform', value: s?.platform, icon: <KeyRound size={13} /> },
    { label: 'Never signed in', value: s?.never_signed_in, icon: <UserX size={13} /> },
    { label: 'Dormant 90d', value: s?.dormant_90d, icon: <Clock size={13} /> },
  ];
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-[12px] px-3 py-2.5"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            {it.icon}
            <span className="truncate">{it.label}</span>
          </div>
          {/* An em dash while loading rather than 0: a real zero and "not yet
              known" are different facts, and showing 0 for the second is how a
              console teaches an operator to distrust it. */}
          <div className="mt-1 text-[19px] font-[750] tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {it.value ?? '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'ok' | 'warn' | 'bad' | 'mute' | 'brand' }) {
  const palette = {
    ok:    { bg: 'rgba(16,185,129,0.10)',  fg: '#047857', bd: 'rgba(16,185,129,0.24)' },
    warn:  { bg: 'rgba(245,158,11,0.10)',  fg: '#B45309', bd: 'rgba(245,158,11,0.24)' },
    bad:   { bg: 'rgba(220,38,38,0.08)',   fg: '#B91C1C', bd: 'rgba(220,38,38,0.22)' },
    brand: { bg: 'rgba(0,103,224,0.10)',   fg: '#0067E0', bd: 'rgba(0,103,224,0.24)' },
    mute:  { bg: 'var(--bg-subtle)',       fg: 'var(--text-muted)', bd: 'var(--border)' },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-[700] whitespace-nowrap"
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.bd}` }}
    >
      {children}
    </span>
  );
}

function statusOf(u: PlatformUser): { label: string; tone: 'ok' | 'warn' | 'bad' | 'mute' } {
  if (u.deleted_at) return { label: 'Deleted', tone: 'bad' };
  if (!u.is_active) return { label: 'Disabled', tone: 'warn' };
  return { label: 'Active', tone: 'ok' };
}

export function UsersTab() {
  const [rows, setRows] = useState<PlatformUser[]>([]);
  const [summary, setSummary] = useState<PlatformUserSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // `q` is what the box shows; `search` is what has been sent. Separating them
  // is what makes the debounce below visible rather than laggy — the field
  // stays responsive while the request waits.
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('');
  const [status, setStatus] = useState<StatusFilter>('');

  useEffect(() => {
    const t = setTimeout(() => { setSearch(q.trim()); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo<PlatformUserQuery>(() => ({
    q: search || undefined,
    role: role || undefined,
    status: status || undefined,
    limit: PAGE,
    offset,
  }), [search, role, status, offset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.superAdmin.listUsers(query);
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the directory');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  // The summary is unfiltered by design — it describes the platform, not the
  // current query — so it loads once rather than on every keystroke.
  useEffect(() => {
    let cancelled = false;
    api.superAdmin.userSummary()
      .then((r) => { if (!cancelled) setSummary(r.data); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, []);

  const filtering = Boolean(search || role || status);

  if (error && !rows.length) return <ErrorState error={error} onRetry={load} />;

  return (
    <div>
      <SummaryStrip s={summary} />

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            className={inputCls}
            style={{ ...inputStyle, paddingLeft: 32 }}
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search accounts by name or email"
          />
        </div>

        <select
          className={inputCls}
          style={{ ...inputStyle, width: 'auto' }}
          value={role}
          onChange={(e) => { setRole(e.target.value as RoleFilter); setOffset(0); }}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="admin">Studio owners</option>
          <option value="trainer">Trainers</option>
          <option value="member">Members</option>
          <option value="platform">Platform operators</option>
        </select>

        <select
          className={inputCls}
          style={{ ...inputStyle, width: 'auto' }}
          value={status}
          onChange={(e) => { setStatus(e.target.value as StatusFilter); setOffset(0); }}
          aria-label="Filter by account status"
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Disabled</option>
          <option value="deleted">Deleted</option>
        </select>

        <button
          onClick={load}
          className="flex min-h-[44px] items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[650]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading && !rows.length ? (
        <Center><Loader2 size={22} className="animate-spin" style={{ color: '#0067e0' }} /></Center>
      ) : !rows.length ? (
        <EmptyState
          icon={<Users2 size={22} />}
          title={filtering ? 'No accounts match' : 'No accounts yet'}
          description={
            filtering
              ? 'Nothing on the platform matches these filters. Clearing them shows every account.'
              : 'Accounts appear here as studios are created and their owners are invited.'
          }
        />
      ) : (
        <>
          {/* Horizontal scroll on the CONTAINER, so the page itself never
              scrolls sideways on a phone. */}
          <div className="overflow-x-auto rounded-[14px]" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr style={{ background: 'var(--bg-subtle)' }}>
                  {['Account', 'Studio', 'Role', 'Status', 'Security', 'Last seen'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[11px] font-[750] uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const st = statusOf(u);
                  return (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-3 py-2.5">
                        <div className="font-[650]" style={{ color: 'var(--text-primary)' }}>{u.name}</div>
                        <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>
                        {u.organization_name ?? <span title="Platform accounts belong to no studio">—</span>}
                        {u.organization_status === 'suspended' && (
                          <div className="mt-0.5"><Badge tone="warn">Studio suspended</Badge></div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {/* roleLabel, so this reads the same words as the rest
                            of the product rather than raw identifiers. */}
                        <Badge tone="mute">{roleLabel(u.role)}</Badge>
                        {u.has_platform_grant && (
                          <span className="ml-1"><Badge tone="brand">Platform</Badge></span>
                        )}
                      </td>
                      <td className="px-3 py-2.5"><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {u.mfa_enabled
                            ? <Badge tone="ok">MFA</Badge>
                            : <Badge tone="mute">No MFA</Badge>}
                          {u.active_sessions > 0 && (
                            <Badge tone={u.active_sessions > 3 ? 'warn' : 'mute'}>
                              {u.active_sessions} live
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {u.last_login ? fmtWhen(u.last_login) : 'Never'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paging. Shown always, not only when there is a next page, so the
              total is visible — "showing 50 of 50" and "showing 50 of 3,200"
              are very different things to an operator. */}
          <div className="mt-3 flex items-center justify-between text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <span className="tabular-nums">
              {offset + 1}–{Math.min(offset + rows.length, total)} of {total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE))}
                className="min-h-[44px] rounded-[10px] px-3 font-[650] disabled:opacity-40"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                Previous
              </button>
              <button
                disabled={offset + rows.length >= total || loading}
                onClick={() => setOffset(offset + PAGE)}
                className="min-h-[44px] rounded-[10px] px-3 font-[650] disabled:opacity-40"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default UsersTab;
