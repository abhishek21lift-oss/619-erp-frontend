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
//
// ── Live accounts vs records ────────────────────────────────────────────────
//
// The summary's account/role/engagement counts are for live accounts only
// (deleted_at IS NULL). The state ring is the exception: it describes every
// record, including deleted ones, so its centre is labelled "records" rather
// than "accounts". The directory itself includes soft-deleted rows by design,
// so its total can exceed the live-account count; the labels say which is which.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2, RefreshCw, Search, ShieldCheck, Users2, Clock,
} from 'lucide-react';
import { EmptyState, FormField, SelectInput } from '@/components/ui';
import { api } from '@/lib/api';
import type { PlatformUser, PlatformUserQuery, PlatformUserSummary } from '@/lib/api';
import { roleLabel } from '@/lib/roles';
import { fmtWhen } from '../_shared/format';
import { Center, ErrorState, inputCls, inputStyle } from '../_shared/ui';
import { errorMessage } from '@/lib/forms/errors';
import { CcCard, CcDonut, CcHBars, nfIN } from '@/components/platform/cc-viz';
import { ccSeries, ccState } from '@/components/platform/ccTheme';

const PAGE = 50;

type RoleFilter = '' | 'trainer' | 'member' | 'platform';
type StatusFilter = '' | 'active' | 'inactive' | 'deleted' | 'dormant' | 'never';

const readRole = (v: string | null): RoleFilter =>
  v === 'trainer' || v === 'member' || v === 'platform' ? v : '';

const readStatus = (v: string | null): StatusFilter =>
  v === 'active' || v === 'inactive' || v === 'deleted' || v === 'dormant' || v === 'never' ? v : '';

const readPage = (v: string | null): number => {
  const page = Number.parseInt(v ?? '1', 10);
  return Number.isFinite(page) && page > 1 ? (page - 1) * PAGE : 0;
};

/**
 * The summary, drawn. Counts come from the server in one pass, unpaged.
 * While they load the donuts read "—", never 0: a real zero and "not yet
 * known" are different facts.
 *
 * The engagement rows are mutually exclusive — signed in within 90 days,
 * dormant, never — so they add up to the live total. "Dormant" is a subset of
 * "ever signed in"; drawing both on one shared scale read as 12 of 10.
 */
function SummaryStrip({ s, failed }: { s: PlatformUserSummary | null; failed: boolean }) {
  const other = s ? Math.max(0, s.total - s.owners - s.members - s.platform) : 0;
  const recent = s ? Math.max(0, s.total - s.never_signed_in - s.dormant_90d) : 0;
  const empty = failed ? 'Unavailable' : s ? 'No account' : 'Loading…';
  return (
    <div className="mb-5 grid gap-4 lg:grid-cols-3">
      <CcCard tone="teal" eyebrow="Accounts" title={s ? `${nfIN(s.total)} live accounts` : 'Live accounts'} icon={<Users2 size={15} />}>
        <CcDonut stack size={136} centerLabel="accounts" empty={empty} data={s ? [
          { label: 'Trainers (studio owners)', value: s.owners },
          { label: 'Members', value: s.members },
          { label: 'Platform operators', value: s.platform },
          ...(other ? [{ label: 'Other staff', value: other }] : []),
        ] : []} />
      </CcCard>
      <CcCard tone="sky" eyebrow="State" title="Active, disabled, deleted" icon={<ShieldCheck size={15} />}>
        <CcDonut stack size={136} centerLabel="records" empty={empty} data={s ? [
          { label: 'Active', value: s.active, color: ccState.healthy },
          { label: 'Disabled', value: s.inactive, color: ccState.warning },
          { label: 'Deleted', value: s.deleted, color: ccState.critical },
        ] : []} />
      </CcCard>
      <CcCard tone="purple" eyebrow="Engagement" title="Who is actually signing in" icon={<Clock size={15} />}>
        {s ? (
          <CcHBars max={Math.max(1, s.total)} rows={[
            { label: 'Signed in (last 90 days)', value: recent, sub: `${nfIN(recent)} of ${nfIN(s.total)}`, color: ccSeries[0] },
            { label: 'Dormant 90+ days', value: s.dormant_90d, sub: `${nfIN(s.dormant_90d)} of ${nfIN(s.total)}`, color: ccState.warning },
            { label: 'Never signed in', value: s.never_signed_in, sub: `${nfIN(s.never_signed_in)} of ${nfIN(s.total)}`, color: ccState.unknown },
          ]} />
        ) : <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{failed ? 'Totals unavailable' : 'Loading totals…'}</p>}
      </CcCard>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'ok' | 'warn' | 'bad' | 'mute' | 'brand' }) {
  const palette = {
    ok:    { bg: 'rgba(16,185,129,0.10)',  fg: '#047857', bd: 'rgba(16,185,129,0.24)' },
    warn:  { bg: 'rgba(245,158,11,0.10)',  fg: '#B45309', bd: 'rgba(245,158,11,0.24)' },
    bad:   { bg: 'rgba(220,38,38,0.08)',   fg: '#B91C1C', bd: 'rgba(220,38,38,0.22)' },
    brand: { bg: 'rgba(163,55,87,0.10)',   fg: '#A33757', bd: 'rgba(163,55,87,0.24)' },
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
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(() => sp.get('q') ?? '');
  const [search, setSearch] = useState(() => (sp.get('q') ?? '').trim());
  const [role, setRole] = useState<RoleFilter>(() => readRole(sp.get('role')));
  const [status, setStatus] = useState<StatusFilter>(() => readStatus(sp.get('status')));
  const [offset, setOffset] = useState(() => readPage(sp.get('page')));
  const [rows, setRows] = useState<PlatformUser[]>([]);
  const [summary, setSummary] = useState<PlatformUserSummary | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // `q` is what the box shows; `search` is what has been sent. Separating them
  // is what makes the debounce below visible rather than laggy — the field
  // stays responsive while the request waits. Comparing against `search`
  // (rather than a first-render ref) keeps a deep-linked `?q=` and its page
  // from being reset on mount, including React's double-invoked effects.
  useEffect(() => {
    const next = q.trim();
    if (next === search) return;
    const t = setTimeout(() => { setSearch(next); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [q, search]);

  const query = useMemo<PlatformUserQuery>(() => ({
    q: search || undefined,
    role: role || undefined,
    status: status || undefined,
    limit: PAGE,
    offset,
  }), [search, role, status, offset]);

  // A sequence number, not just a loading flag: a slow "d" response must not
  // overwrite the faster "deeksha" response that followed it.
  const requestSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.superAdmin.listUsers(query);
      if (seq !== requestSeq.current) return;
      const nextRows = res.data ?? [];
      const nextTotal = res.total ?? 0;
      // A page from a shared URL can outlive the rows it pointed at.
      if (!nextRows.length && offset > 0 && nextTotal > 0) {
        setOffset(Math.max(0, Math.floor((nextTotal - 1) / PAGE) * PAGE));
        return;
      }
      setRows(nextRows);
      setTotal(nextTotal);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(errorMessage(e, 'Could not load the directory'));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [query, offset]);

  useEffect(() => { load(); }, [load]);

  // The summary is unfiltered by design — it describes the platform, not the
  // current query — so it loads once, and again when Refresh is pressed.
  const loadSummary = useCallback(async () => {
    setSummaryFailed(false);
    try {
      const r = await api.superAdmin.userSummary();
      setSummary(r.data);
    } catch {
      setSummary(null);
      setSummaryFailed(true);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const refresh = useCallback(() => {
    void load();
    void loadSummary();
  }, [load, loadSummary]);

  // Deep-link the filters and page. `replace` keeps the back button leaving
  // the console rather than walking backwards through every keystroke.
  useEffect(() => {
    const params = new URLSearchParams(sp.toString());
    if (search) params.set('q', search); else params.delete('q');
    if (role) params.set('role', role); else params.delete('role');
    if (status) params.set('status', status); else params.delete('status');
    if (offset > 0) params.set('page', String(Math.floor(offset / PAGE) + 1)); else params.delete('page');
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = sp.toString() ? `${pathname}?${sp.toString()}` : pathname;
    if (next !== current) router.replace(next, { scroll: false });
  }, [search, role, status, offset, pathname, router, sp]);

  const filtering = Boolean(search || role || status);

  if (error && !rows.length) return <ErrorState error={error} onRetry={refresh} />;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        <span className="font-[650]">Platform totals</span>
        {filtering && <span>Filters apply to the directory below</span>}
      </div>

      <SummaryStrip s={summary} failed={summaryFailed} />

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
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search accounts by name or email"
            type="search"
            name="q"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </div>

        <FormField label="Filter by role" labelHidden>
          <SelectInput
            className={inputCls}
            style={{ ...inputStyle, width: 'auto' }}
            value={role}
            onChange={(e) => { setRole(e.target.value as RoleFilter); setOffset(0); }}
          >
            <option value="">All roles</option>
            <option value="trainer">Trainers (Owners)</option>
            <option value="member">Members</option>
            <option value="platform">Platform operators</option>
          </SelectInput>
        </FormField>

        <FormField label="Filter by account state" labelHidden>
          <SelectInput
            className={inputCls}
            style={{ ...inputStyle, width: 'auto' }}
            value={status}
            onChange={(e) => { setStatus(e.target.value as StatusFilter); setOffset(0); }}
          >
            <option value="">Any state</option>
            <option value="active">Active</option>
            <option value="inactive">Disabled</option>
            <option value="deleted">Deleted</option>
            <option value="dormant">Dormant 90+ days</option>
            <option value="never">Never signed in</option>
          </SelectInput>
        </FormField>

        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh directory"
          aria-busy={loading}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[650]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* A failed refresh with rows on screen must not look like fresh data. */}
      {error && rows.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[12px] px-3 py-2.5 text-[12px]"
          style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}
        >
          <span>Could not refresh the directory. Showing the last loaded results.</span>
          <button type="button" onClick={refresh} className="font-[750] underline underline-offset-2">Retry</button>
        </div>
      )}

      {loading && !rows.length ? (
        <Center><Loader2 size={22} className="animate-spin" style={{ color: '#A33757' }} /></Center>
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
          <div className="mb-2 flex items-center justify-between gap-3 text-[12px]" aria-live="polite">
            <span style={{ color: 'var(--text-muted)' }}>{filtering ? 'Matching' : 'Showing'}</span>
            <span className="font-[700] tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {nfIN(total)} {total === 1 ? 'account' : 'accounts'}
            </span>
          </div>

          {/* Below lg a 760px table hides the columns this page exists for
              (status, MFA, last seen). The same rows are shown as cards. */}
          <ul className="overflow-hidden rounded-[14px] lg:hidden" style={{ border: '1px solid var(--border)' }}>
            {rows.map((u, i) => {
              const st = statusOf(u);
              return (
                <li key={u.id} className="px-3.5 py-3" style={{ borderTop: i ? '1px solid var(--border)' : undefined }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{u.name}</div>
                      <div className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {u.active_sessions > 0 && (
                        <Badge tone={u.active_sessions > 3 ? 'warn' : 'mute'}>{u.active_sessions} live</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="min-w-0 truncate">{u.organization_name ?? 'No studio'}</span>
                    <Badge tone="mute">{roleLabel(u.role)}</Badge>
                    {u.has_platform_grant && <Badge tone="brand">Platform</Badge>}
                    {u.mfa_enabled ? <Badge tone="ok">MFA</Badge> : <Badge tone="mute">No MFA</Badge>}
                    <span className="ml-auto whitespace-nowrap">{u.last_login ? fmtWhen(u.last_login) : 'Never'}</span>
                  </div>
                  {u.organization_status === 'suspended' && (
                    <div className="mt-1.5"><Badge tone="warn">Studio suspended</Badge></div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Horizontal scroll on the container, so the page itself never
              scrolls sideways on a phone. Focusable because a scroll region
              that keyboard users cannot reach hides its columns from them. */}
          <div
            role="region"
            aria-label="Accounts directory table"
            // A scrollable region must be reachable by keyboard (WCAG 2.1.1);
            // the jsx-a11y rule does not model that pattern.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            className="hidden overflow-x-auto rounded-[14px] lg:block"
            style={{ border: '1px solid var(--border)' }}
          >
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr style={{ background: 'var(--bg-subtle)' }}>
                  {['Account', 'Studio', 'Role', 'Status', 'Security', 'Last seen'].map((h) => (
                    <th
                      key={h}
                      scope="col"
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
              {offset + 1}–{Math.min(offset + rows.length, total)} of {nfIN(total)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE))}
                className="min-h-[44px] rounded-[10px] px-3 font-[650] disabled:opacity-40"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                Previous
              </button>
              <button
                type="button"
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
