'use client';

// Security Centre — who is trying to get in, who succeeded, what is exposed.
//
// Read-only by design. Every action an operator might want from here — force
// logout, reset MFA, deactivate — already exists on the studio row in Studios
// and is already audited there. Two buttons for one act means two audit shapes
// and two places to get the permission check right.
//
// The layout puts exposure first and history last, because the order an
// operator needs it in during an incident is: am I exposed → who is attacking
// → what exactly happened.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, Search, Filter, ChevronLeft, ChevronRight, RotateCcw,
  Loader2, AlertTriangle, Globe, Monitor, KeyRound, Users, Fingerprint, Eye,
} from 'lucide-react';
import { api } from '@/lib/api';
import { roleLabel } from '@/lib/roles';
import type {
  SecurityOverview, SecurityThreats, LoginEvent, LoginEventQuery, ActiveSession,
} from '@/lib/api';

const PAGE_SIZE = 50;
const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' } as const;
const inputStyle = { ...cardStyle, color: 'var(--text-primary)' } as const;

/* Each outcome gets its own tone. mfa_failed is deliberately the same red as a
   breach rather than the amber of a routine bad password: a wrong second factor
   against a CORRECT password means the password is already compromised. */
const OUTCOME: Record<string, { label: string; bg: string; fg: string }> = {
  success:      { label: 'Success',        bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  bad_password: { label: 'Wrong password', bg: 'rgba(245,158,11,0.14)', fg: '#b45309' },
  unknown_user: { label: 'No such account', bg: 'var(--bg-subtle)',     fg: 'var(--text-muted)' },
  inactive:     { label: 'Deactivated',    bg: 'var(--bg-subtle)',      fg: 'var(--text-muted)' },
  mfa_required: { label: 'MFA required',   bg: 'rgba(0,103,224,0.12)', fg: '#0067e0' },
  mfa_failed:   { label: 'MFA failed',     bg: 'rgba(239,68,68,0.12)',  fg: '#dc2626' },
};

const METHOD_LABEL: Record<string, string> = {
  password: 'Password', google: 'Google', passkey: 'Passkey', refresh: 'Refresh',
};

function fmtWhen(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/** Coarse on purpose — for recognising a session at a glance, not fingerprinting. */
function parseAgent(ua?: string | null) {
  if (!ua) return '—';
  const browser =
    /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' :
    /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari' :
    /Firefox\//.test(ua) ? 'Firefox' : 'Other';
  const os =
    /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' :
    /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' :
    /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} · ${os}` : browser;
}

function Tile({ label, value, sub, tone, icon }: {
  label: string; value: string; sub?: string;
  tone?: 'good' | 'warn' | 'bad'; icon: React.ReactNode;
}) {
  const colour = tone === 'good' ? 'var(--success-text)' : tone === 'bad' ? 'var(--danger-text)'
    : tone === 'warn' ? '#b45309' : 'var(--text-primary)';
  return (
    <div className="rounded-[14px] p-3.5" style={cardStyle}>
      <div className="flex items-center gap-1.5" style={{ color: 'var(--text-disabled)' }}>
        {icon}
        <p className="text-[10px] font-[750] uppercase tracking-[0.08em]">{label}</p>
      </div>
      <p className="mt-1 text-[19px] font-[800] tabular-nums leading-tight" style={{ color: colour }}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
export default function SecurityCentre() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [threats, setThreats] = useState<SecurityThreats | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [failedOnly, setFailedOnly] = useState(true);
  const [outcome, setOutcome] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const query: LoginEventQuery = useMemo(() => ({
    // The explicit outcome filter wins: picking "Success" while the failures
    // toggle is on would otherwise return nothing and look like a bug.
    failed: !outcome && failedOnly ? 'true' : undefined,
    outcome: outcome || undefined,
    q: debouncedQ || undefined,
    limit: PAGE_SIZE,
    offset,
  }), [failedOnly, outcome, debouncedQ, offset]);

  const loadTop = useCallback(() => {
    setError('');
    Promise.all([
      api.superAdmin.securityOverview(),
      api.superAdmin.securityThreats(),
      api.superAdmin.activeSessions(),
    ])
      .then(([o, t, s]) => { setOverview(o.data); setThreats(t.data); setSessions(s.data); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the security overview.'))
      .finally(() => setLoading(false));
  }, []);

  const loadEvents = useCallback(() => {
    api.superAdmin.loginEvents(query)
      .then((r) => { setEvents(r.data ?? []); setTotal(r.paging?.total ?? 0); })
      .catch(() => { /* the feed is supplementary; the tiles above still stand */ });
  }, [query]);

  useEffect(() => { loadTop(); }, [loadTop]);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const breaches = threats?.by_account.filter((a) => a.succeeded_after) ?? [];

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Checking security posture…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16 text-center">
        <AlertTriangle size={22} style={{ color: 'var(--danger-text)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button onClick={loadTop} className="mt-1 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Try again</button>
      </div>
    );
  }

  const l = overview?.logins_24h;
  const noMfa = overview?.operators.without_mfa ?? 0;

  return (
    <div className="space-y-4">
      {/* The two things that are true right now and need acting on, above
          everything else. */}
      {breaches.length > 0 && (
        <div className="rounded-[14px] p-3.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="flex items-start gap-2 text-[12.5px] font-[700]" style={{ color: '#dc2626' }}>
            <ShieldAlert size={15} className="mt-0.5 shrink-0" />
            <span>
              {breaches.length} account{breaches.length === 1 ? '' : 's'} signed in successfully
              after a run of failed attempts — investigate now.
            </span>
          </p>
          <ul className="mt-1.5 space-y-0.5 pl-6">
            {breaches.map((b) => (
              <li key={b.email_attempted} className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-mono">{b.email_attempted}</span> — {b.failures} failures
                from {b.distinct_ips} address{b.distinct_ips === 1 ? '' : 'es'}, then a success
              </li>
            ))}
          </ul>
        </div>
      )}

      {noMfa > 0 && (
        <div className="rounded-[14px] p-3.5" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)' }}>
          <p className="flex items-start gap-2 text-[12.5px] font-[700]" style={{ color: '#b45309' }}>
            <KeyRound size={15} className="mt-0.5 shrink-0" />
            <span>
              {noMfa} platform operator account{noMfa === 1 ? ' has' : 's have'} no second factor.
              {' '}An operator without MFA can reach every studio&rsquo;s data.
            </span>
          </p>
          <ul className="mt-1.5 space-y-0.5 pl-6">
            {overview?.operators.accounts.filter((a) => !a.mfa_enabled).map((a) => (
              <li key={a.id} className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
                {a.name} — {a.email}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Failed sign-ins" value={String(l?.failed_24h ?? 0)}
          sub={`${l?.targeted_accounts_24h ?? 0} account${l?.targeted_accounts_24h === 1 ? '' : 's'} targeted · last 24h`}
          tone={(l?.failed_24h ?? 0) > 0 ? 'warn' : undefined}
          icon={<ShieldAlert size={12} />}
        />
        <Tile
          label="MFA failures" value={String(l?.mfa_failed_24h ?? 0)}
          sub={(l?.mfa_failed_24h ?? 0) > 0 ? 'correct password, wrong factor' : 'none in 24h'}
          tone={(l?.mfa_failed_24h ?? 0) > 0 ? 'bad' : undefined}
          icon={<Fingerprint size={12} />}
        />
        <Tile
          label="Operators protected"
          value={`${(overview?.operators.total ?? 0) - noMfa}/${overview?.operators.total ?? 0}`}
          sub={noMfa ? `${noMfa} without MFA` : 'all have a second factor'}
          tone={noMfa ? 'bad' : 'good'}
          icon={<ShieldCheck size={12} />}
        />
        <Tile
          label="Active sessions" value={String(overview?.active_sessions ?? 0)}
          sub={`${overview?.impersonations_7d ?? 0} impersonation${overview?.impersonations_7d === 1 ? '' : 's'} in 7d`}
          icon={<Users size={12} />}
        />
      </div>

      {/* Two groupings, because they are two different attacks. */}
      {(threats?.by_account.length || threats?.by_ip.length) ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[16px]" style={cardStyle}>
            <p className="px-3.5 py-2.5 text-[11px] font-[750] uppercase tracking-[0.08em]"
              style={{ color: 'var(--text-disabled)', borderBottom: '1px solid var(--border)' }}>
              Accounts under attack
            </p>
            {threats.by_account.length === 0 && (
              <p className="px-3.5 py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                No account has {threats.min_failures}+ failures in {threats.window_hours}h.
              </p>
            )}
            {threats.by_account.map((a) => (
              <div key={a.email_attempted} className="flex items-center gap-3 px-3.5 py-2"
                style={{ borderTop: '1px solid var(--border)' }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                    {a.email_attempted}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {a.distinct_ips} address{a.distinct_ips === 1 ? '' : 'es'} · {fmtWhen(a.last_attempt)}
                  </p>
                </div>
                {a.succeeded_after && (
                  <span className="shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10px] font-[750]"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
                    then succeeded
                  </span>
                )}
                <span className="shrink-0 text-[13px] font-[800] tabular-nums" style={{ color: '#b45309' }}>
                  {a.failures}
                </span>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[16px]" style={cardStyle}>
            <p className="px-3.5 py-2.5 text-[11px] font-[750] uppercase tracking-[0.08em]"
              style={{ color: 'var(--text-disabled)', borderBottom: '1px solid var(--border)' }}>
              Addresses sweeping accounts
            </p>
            {threats.by_ip.length === 0 && (
              <p className="px-3.5 py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                No address has {threats.min_failures}+ failures in {threats.window_hours}h.
              </p>
            )}
            {threats.by_ip.map((i) => (
              <div key={i.ip_address} className="flex items-center gap-3 px-3.5 py-2"
                style={{ borderTop: '1px solid var(--border)' }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                    {i.ip_address}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {i.accounts_targeted} account{i.accounts_targeted === 1 ? '' : 's'} · {fmtWhen(i.last_attempt)}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-[800] tabular-nums" style={{ color: '#b45309' }}>
                  {i.failures}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Feed */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Email, IP or studio…" aria-label="Search sign-in attempts"
            className="h-10 w-full rounded-[11px] pl-9 pr-3 text-[12.5px] outline-none" style={inputStyle}
          />
        </div>
        <button
          onClick={() => { setFailedOnly((v) => !v); setOutcome(''); setOffset(0); }}
          aria-pressed={failedOnly}
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[700]"
          style={failedOnly
            ? { background: 'rgba(239,68,68,0.10)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.22)' }
            : inputStyle}
        >
          <ShieldAlert size={13} /> Failures only
        </button>
        <button
          onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[650]" style={inputStyle}
        >
          <Filter size={13} /> Filters
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="grid grid-cols-1 gap-3 rounded-[14px] p-3.5 sm:grid-cols-2 lg:grid-cols-4" style={cardStyle}>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Outcome</span>
                <select
                  value={outcome} onChange={(e) => { setOutcome(e.target.value); setOffset(0); }}
                  className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={inputStyle}
                >
                  <option value="">Any</option>
                  {Object.entries(OUTCOME).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  onClick={() => { setOutcome(''); setQ(''); setDebouncedQ(''); setFailedOnly(true); setOffset(0); }}
                  className="flex min-h-[36px] items-center gap-1.5 text-[12px] font-[650]" style={{ color: 'var(--text-muted)' }}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-[16px]" style={cardStyle}>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            {total.toLocaleString('en-IN')} attempt{total === 1 ? '' : 's'}
          </p>
          {total > PAGE_SIZE && (
            <div className="flex items-center gap-1">
              <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}
                aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-[8px] disabled:opacity-40"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <ChevronLeft size={14} />
              </button>
              <span className="px-1.5 text-[11.5px] font-[650] tabular-nums" style={{ color: 'var(--text-muted)' }}>{page} / {pages}</span>
              <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total}
                aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-[8px] disabled:opacity-40"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {events.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <ShieldCheck size={22} style={{ color: 'var(--success-text)' }} />
            <p className="text-[13px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
              {failedOnly && !outcome ? 'No failed sign-ins match' : 'No attempts match'}
            </p>
          </div>
        )}

        {events.map((e) => {
          const o = OUTCOME[e.outcome] ?? OUTCOME.unknown_user;
          return (
            <div key={String(e.id)} className="flex items-center gap-3 px-3 py-2.5 sm:px-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[750]" style={{ background: o.bg, color: o.fg }}>
                    {o.label}
                  </span>
                  <span className="truncate font-mono text-[11.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                    {e.email_attempted || e.user_name || '—'}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {e.organization_name ? `${e.organization_name} · ` : ''}
                  {METHOD_LABEL[e.method] ?? e.method} · {fmtWhen(e.created_at)}
                </p>
              </div>
              <div className="shrink-0 text-right text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                {e.ip_address && (
                  <p className="flex items-center justify-end gap-1 font-mono"><Globe size={9} />{e.ip_address}</p>
                )}
                {e.user_agent && (
                  <p className="flex items-center justify-end gap-1"><Monitor size={9} />{parseAgent(e.user_agent)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sessions last: useful context, never the thing you open the page for. */}
      {sessions && sessions.length > 0 && (
        <div className="overflow-hidden rounded-[16px]" style={cardStyle}>
          <p className="flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-[750] uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-disabled)', borderBottom: '1px solid var(--border)' }}>
            <Eye size={11} /> Signed in now
          </p>
          {sessions.slice(0, 12).map((s) => (
            <div key={s.user_id} className="flex items-center gap-3 px-3.5 py-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {s.organization_name || 'Platform'} · {roleLabel(s.role)}
                </p>
              </div>
              <span className="shrink-0 text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {s.sessions} session{s.sessions === 1 ? '' : 's'}
              </span>
            </div>
          ))}
          {/* Stated rather than implied: force logout lives with the account it
              acts on, and duplicating it here would give one act two audit
              shapes and two permission checks to get right. */}
          <p className="px-3.5 py-2 text-[10.5px]" style={{ color: 'var(--text-disabled)', borderTop: '1px solid var(--border)' }}>
            To end someone&rsquo;s sessions, use Force logout on their account under Studios.
          </p>
        </div>
      )}
    </div>
  );
}
