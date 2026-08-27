'use client';

// Studios tab — tenant and account management.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
// Component bodies, props and rendered markup are unchanged.
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Building2, Plus, Loader2, Users, Dumbbell, UserCircle, KeyRound, Power, ChevronDown, ImagePlus,
  LogIn, Pencil, Trash2, UserPlus, IndianRupee, Eye, Gift, Receipt, Search, MoreVertical,
  Download, ArrowUpDown, CheckSquare, Square, LogOut, ShieldOff, CalendarPlus, StickyNote, Save,
  ToggleLeft, ToggleRight, Lock,
} from 'lucide-react';
import StudioMark from '@/components/StudioMark';
import { Button, Badge, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type {
  Organization, OrganizationDetail, OrgUser, StudioOverview, SubStudio, OrgBillingProfile,
  ResolvedFeature,
} from '@/lib/api';
import { encodeImpersonationHandoff, setImpersonation, type StoredImpersonation } from '@/lib/http';
import { clearCachedAuthUser } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { roleLabel } from '@/lib/roles';
import {
  AddUserModal, CreateOrgModal, EditUserModal, ResetPasswordModal,
} from '../_modals/OrgModals';
import { fmtDate, fmtINR, fmtWhen } from '../_shared/format';
import type { StudioFilter, StudioRow, StudioSort } from '../_shared/types';
import { Center, ErrorState, IconBtn, MiniStat } from '../_shared/ui';

export function exportStudiosCsv(rows: StudioRow[]): void {
  const headers = ['Name', 'Slug', 'Status', 'Plan', 'Revenue', 'Active Clients', 'Total Clients', 'Coaches', 'Accounts', 'Last Active', 'Created'];
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.org.name, r.org.slug, r.org.status, r.sub?.plan_name || '', r.revenue,
      r.activeClients, r.totalClients, r.org.trainer_count ?? 0, r.org.user_count ?? 0,
      r.lastLogin ? fmtDate(r.lastLogin) : '', fmtDate(r.org.created_at),
    ].map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `studios-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function StudiosTab() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [subStudios, setSubStudios] = useState<SubStudio[]>([]);
  const [overviewStudios, setOverviewStudios] = useState<StudioOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<OrgUser | null>(null);
  const [editTarget, setEditTarget] = useState<OrgUser | null>(null);
  const [addTarget, setAddTarget] = useState<Organization | null>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudioFilter>('all');
  const [sortBy, setSortBy] = useState<StudioSort>('name');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([api.superAdmin.listOrgs(), api.superAdmin.subscriptions(), api.superAdmin.overview()])
      .then(([o, s, ov]) => {
        setOrgs(o.data ?? []);
        setSubStudios(s.data.studios ?? []);
        setOverviewStudios(ov.data.studios ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load studios'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo<StudioRow[]>(() => {
    const subById = new Map(subStudios.map((s) => [s.id, s]));
    const ovById = new Map(overviewStudios.map((s) => [s.id, s]));
    return orgs.map((org) => {
      const sub = subById.get(org.id);
      const ov = ovById.get(org.id);
      return {
        org, sub,
        revenue: Number(ov?.revenue ?? 0),
        outstanding: Number(ov?.outstanding ?? 0),
        lastLogin: ov?.last_login ?? null,
        activeClients: ov?.active_clients ?? org.client_count ?? 0,
        totalClients: ov?.total_clients ?? org.client_count ?? 0,
        sessionsThisMonth: ov?.sessions_this_month ?? 0,
      };
    });
  }, [orgs, subStudios, overviewStudios]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => r.org.name.toLowerCase().includes(q) || r.org.slug.toLowerCase().includes(q));
    if (filter === 'active') list = list.filter((r) => r.org.status === 'active');
    if (filter === 'suspended') list = list.filter((r) => r.org.status === 'suspended');
    if (filter === 'trial') list = list.filter((r) => r.sub?.effective_state === 'trial');
    if (filter === 'renewal_due') list = list.filter((r) => r.sub?.renewal_due);
    if (filter === 'requested') list = list.filter((r) => !!r.sub?.requested_at);

    const sorted = [...list];
    if (sortBy === 'revenue') sorted.sort((a, b) => b.revenue - a.revenue);
    else if (sortBy === 'clients') sorted.sort((a, b) => b.activeClients - a.activeClients);
    else if (sortBy === 'created') sorted.sort((a, b) => new Date(b.org.created_at).getTime() - new Date(a.org.created_at).getTime());
    else if (sortBy === 'last_active') sorted.sort((a, b) => new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime());
    else sorted.sort((a, b) => a.org.name.localeCompare(b.org.name));
    return sorted;
  }, [rows, query, filter, sortBy]);

  const toggleStatus = async (o: Organization) => {
    const next = o.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended' && !window.confirm(`Suspend "${o.name}"? All its logins will be signed out and blocked.`)) return;
    try {
      await api.superAdmin.updateOrg(o.id, { status: next });
      toast.success(next === 'suspended' ? 'Studio suspended.' : 'Studio reactivated.');
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  };

  const toggleSelect = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const selectAllFiltered = () => setSelected(new Set(filtered.map((r) => r.org.id)));
  const clearSelection = () => setSelected(new Set());

  const bulkSetStatus = async (status: 'active' | 'suspended') => {
    if (status === 'suspended' && !window.confirm(`Suspend ${selected.size} studio${selected.size === 1 ? '' : 's'}? All their logins will be signed out and blocked.`)) return;
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const id of selected) {
      try { await api.superAdmin.updateOrg(id, { status }); ok++; } catch { fail++; }
    }
    setBulkBusy(false);
    if (fail) toast.warning(`${ok} updated, ${fail} failed.`); else toast.success(`${ok} studio${ok === 1 ? '' : 's'} ${status === 'suspended' ? 'suspended' : 'reactivated'}.`);
    clearSelection();
    load();
  };

  const bulkExport = () => {
    const list = selected.size ? filtered.filter((r) => selected.has(r.org.id)) : filtered;
    exportStudiosCsv(list);
    toast.success(`Exported ${list.length} studio${list.length === 1 ? '' : 's'}.`);
  };

  const FILTERS: { id: StudioFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'suspended', label: 'Suspended' },
    { id: 'trial', label: 'On trial' },
    { id: 'renewal_due', label: 'Renewal due' },
    { id: 'requested', label: 'Requested' },
  ];
  const SORTS: { id: StudioSort; label: string }[] = [
    { id: 'name', label: 'Name' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'clients', label: 'Clients' },
    { id: 'created', label: 'Newest' },
    { id: 'last_active', label: 'Last active' },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[160px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input aria-label="Search studios"
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search studios…"
            className="h-11 w-full rounded-[10px] pl-8 pr-3 text-[12.5px] outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="relative">
          <select aria-label="Sort studios" value={sortBy} onChange={(e) => setSortBy(e.target.value as StudioSort)}
            className="h-11 appearance-none rounded-[10px] py-1.5 pl-8 pr-8 text-[12px] font-[650] outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>Sort · {s.label}</option>)}
          </select>
          <ArrowUpDown size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
        </div>
        <Button iconLeft={<Plus size={14} />} onClick={() => setCreateOpen(true)}
          style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>New Studio</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="min-h-[44px] rounded-full px-3 text-[11.5px] font-[650] transition-colors"
            style={filter === f.id
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Bulk action bar — only takes up space once something is selected. */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[14px] px-4 py-2.5"
          style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
          <span className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{selected.size} selected</span>
          <button onClick={() => bulkSetStatus('active')} disabled={bulkBusy}
            className="flex min-h-[44px] items-center gap-1.5 rounded-[8px] px-2.5 text-[11.5px] font-[700] transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
            <Power size={12} /> Activate
          </button>
          <button onClick={() => bulkSetStatus('suspended')} disabled={bulkBusy}
            className="flex min-h-[44px] items-center gap-1.5 rounded-[8px] px-2.5 text-[11.5px] font-[700] transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.10)', color: '#dc2626' }}>
            <Power size={12} /> Suspend
          </button>
          <button onClick={bulkExport} disabled={bulkBusy}
            className="flex min-h-[44px] items-center gap-1.5 rounded-[8px] px-2.5 text-[11.5px] font-[700] transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Download size={12} /> Export
          </button>
          {bulkBusy && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
          <button onClick={clearSelection} className="ml-auto text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>Clear</button>
        </div>
      )}

      {loading && <Center><Loader2 size={26} className="animate-spin" style={{ color: '#0067e0' }} /></Center>}
      {error && !loading && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState icon={<Building2 size={20} />}
          title={rows.length === 0 ? 'No studios yet' : 'No studios match'}
          description={rows.length === 0 ? 'Create the first tenant workspace to onboard a trainer.' : 'Try a different search term or filter.'} />
      )}
      {!loading && !error && filtered.length > 0 && (
        <>
          <button onClick={() => (selected.size === filtered.length ? clearSelection() : selectAllFiltered())}
            className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            {selected.size === filtered.length ? <CheckSquare size={13} /> : <Square size={13} />}
            Select all {filtered.length}
          </button>
          <div className="space-y-3">
            {filtered.map((row) => (
              <OrgCard key={row.org.id} row={row}
                selected={selected.has(row.org.id)}
                onToggleSelect={() => toggleSelect(row.org.id)}
                onToggleStatus={() => toggleStatus(row.org)}
                onResetPassword={setResetTarget}
                onEditUser={setEditTarget}
                onAddUser={() => setAddTarget(row.org)}
                onChanged={load} />
            ))}
          </div>
        </>
      )}

      {createOpen && <CreateOrgModal onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
      {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} />}
      {addTarget && <AddUserModal org={addTarget} onClose={() => setAddTarget(null)} onAdded={() => { setAddTarget(null); load(); }} />}
    </div>
  );
}

// Small "⋯" menu — Suspend/Activate and Support Access live here per the
// spec's "More menu" grouping. Archive / Delete / Transfer ownership / Reset
// usage / Export-this-studio are NOT here: there is no backend support for
// any of them (no archived state, no org-delete endpoint, no ownership
// transfer, no per-studio usage reset), and fabricating buttons for actions
// that silently do nothing — or worse, half-work — is worse than omitting
// them. Bulk/CSV export of what's already loaded is real and lives in the
// bulk action bar instead.
export function MoreMenu({ suspended, onToggleStatus, onSupportAccess, supportBusy }: {
  suspended: boolean; onToggleStatus: () => void; onSupportAccess: () => void; supportBusy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((s) => !s)} title="More"
        className="flex h-11 w-11 items-center justify-center rounded-[10px] transition hover:bg-black/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <MoreVertical size={15} />
      </button>
      {open && (
        <div data-no-pull-refresh className="absolute right-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-[12px] py-1.5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(15,23,42,0.18)' }}>
          <button onClick={() => { setOpen(false); onSupportAccess(); }} disabled={supportBusy}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] font-[600] transition hover:bg-black/5 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}>
            {supportBusy ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />} Support access
          </button>
          <button onClick={() => { setOpen(false); onToggleStatus(); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] font-[600] transition hover:bg-black/5"
            style={{ color: suspended ? '#059669' : '#dc2626' }}>
            <Power size={13} /> {suspended ? 'Activate' : 'Suspend'}
          </button>
        </div>
      )}
    </div>
  );
}

// Plan-tier accent — gives each card a colored identity strip at a glance,
// keyed by plan_code (stable) rather than plan_name (a display string).
export const PLAN_ACCENT: Record<string, string> = {
  starter: 'linear-gradient(90deg,#64748b,#475569)',
  growth: 'linear-gradient(90deg,#0067e0,#0059ce)',
  professional: 'linear-gradient(90deg,#0067e0,#0059ce)',
  elite: 'linear-gradient(90deg,#f59e0b,#d97706)',
};
export const NO_PLAN_ACCENT = 'linear-gradient(90deg,var(--border),var(--border))';

// A compact, colorful stat chip — icon in a tinted circle, value + label
// stacked beside it. Four of these replace the old plain icon+text list,
// which had no visual weight and (combined with not having its own row)
// was wrapping one item per line on a phone.
export function OrgCard({ row, selected, onToggleSelect, onToggleStatus, onResetPassword, onEditUser, onAddUser, onChanged }: {
  row: StudioRow;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleStatus: () => void;
  onResetPassword: (u: OrgUser) => void;
  onEditUser: (u: OrgUser) => void;
  onAddUser: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const org = row.org;
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [impLoading, setImpLoading] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onLogoPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await api.superAdmin.uploadOrgLogo(org.id, file);
      toast.success('Logo updated.');
      onChanged();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Logo upload failed'); }
    finally { setUploading(false); }
  };

  const loadDetail = useCallback(() => {
    setLoadingDetail(true);
    api.superAdmin.getOrg(org.id)
      .then((r) => setDetail(r.data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [org.id]);

  const [userBusy, setUserBusy] = useState<string | null>(null);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) loadDetail();
  };

  const toggleUser = async (u: OrgUser) => {
    try {
      await api.superAdmin.setUserActive(u.id, !u.is_active);
      toast.success(u.is_active ? 'Account deactivated.' : 'Account activated.');
      loadDetail(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
  };

  const forceLogout = async (u: OrgUser) => {
    // Confirmed because it disconnects a live human mid-task, but tone is
    // neutral: this is recoverable by signing back in, unlike a reset.
    if (!window.confirm(`Sign ${u.name} out of every device?\n\nTheir password is unchanged — they can log straight back in.`)) return;
    setUserBusy(`logout:${u.id}`);
    try {
      await api.superAdmin.forceLogout(u.id);
      toast.success('All sessions revoked.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not revoke sessions'); }
    finally { setUserBusy(null); }
  };

  const resetMfa = async (u: OrgUser) => {
    if (!window.confirm(`Reset two-factor for ${u.name}?\n\nThis removes a security factor from their account and signs them out everywhere. They will re-enrol on next login. The action is recorded against you.`)) return;
    setUserBusy(`mfa:${u.id}`);
    try {
      const r = await api.superAdmin.resetMfa(u.id);
      toast.success(r.data.was_enabled ? 'Two-factor reset; sessions revoked.' : 'No two-factor was enrolled.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not reset two-factor'); }
    finally { setUserBusy(null); }
  };

  const deleteUser = async (u: OrgUser) => {
    if (!window.confirm(`Remove ${u.name} (${u.email})? They will be signed out and can no longer log in.`)) return;
    try {
      await api.superAdmin.deleteUser(u.id);
      toast.success('Account removed.');
      loadDetail(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const impersonate = async (mode: 'read_only' | 'full', userId?: string) => {
    if (mode === 'full' && !window.confirm(
      `Enter ${org.name} with FULL ACCESS?\n\nYou will be able to make changes to this studio's live data as its admin. Every change is recorded against you in the activity log.`
    )) return;
    const key = `${mode}:${userId || 'primary'}`;
    setImpLoading(key);
    try {
      const r = await api.superAdmin.impersonate(org.id, { userId, mode });
      const d = r.data;
      const imp: StoredImpersonation = {
        token: d.token, readonly: d.readonly,
        adminId: d.admin.id, adminName: d.admin.name,
        orgId: d.organization.id, orgName: d.organization.name, orgLogo: d.organization.logo_url,
        // Where the banner's Exit button goes. The console knows its own
        // address; the studio app must not have to.
        returnTo: `${window.location.origin}/platform`,
      };

      // Drop the cached super-admin identity so the studio app resolves as the
      // studio admin (studio nav + studio home), not the platform UI.
      clearCachedAuthUser();

      // ── Which origin serves the studio app ────────────────────────────────
      //
      // Same origin unless the Command Center has been split onto its own
      // hostname, in which case '/' here is a 404 — the console's host serves
      // the console and nothing else (see the frontend's src/proxy.ts).
      //
      // sessionStorage does not cross an origin either, so a split deployment
      // has to hand the token over in the URL fragment. A fragment never
      // reaches a server, which is the only reason it is an acceptable place
      // to put a live access token for one navigation.
      const studioOrigin = (process.env.NEXT_PUBLIC_APP_ORIGIN || '').replace(/\/$/, '');
      if (studioOrigin && studioOrigin !== window.location.origin) {
        window.location.href = `${studioOrigin}/#imp=${encodeImpersonationHandoff(imp)}`;
      } else {
        setImpersonation(imp);
        window.location.href = '/';
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start impersonation');
      setImpLoading('');
    }
  };

  const suspended = org.status === 'suspended';
  const planAccent = row.sub?.plan_code ? (PLAN_ACCENT[row.sub.plan_code] || NO_PLAN_ACCENT) : NO_PLAN_ACCENT;

  return (
    // No overflow-hidden on the card itself: the More menu's dropdown is
    // absolutely positioned inside it, and a clipped ancestor was cutting
    // the dropdown off at the card's edge instead of letting it float above
    // the next card. The top strip and the expanded panel round their own
    // corners instead of relying on the parent to clip them square.
    <div className="relative rounded-[18px]"
      style={{
        background: 'var(--bg-card)',
        border: selected ? '1.5px solid var(--brand)' : '1px solid var(--border)',
        boxShadow: selected ? '0 0 0 4px var(--brand-soft)' : 'none',
      }}>
      {/* Plan-tier accent strip — the card's identity at a glance, before
          reading a single word. Neutral hairline when there's no plan yet. */}
      <div className="h-[3px] w-full rounded-t-[17px]" style={{ background: planAccent }} />

      <div className="p-4">
        {/* Identity row — ONLY the checkbox, logo, and name/slug live here.
            The old layout crammed all three action buttons onto this same
            row too; on a phone that starved the name of width and forced
            it down to "A..", with every badge and stat wrapping one per
            line below. Actions now get their own full-width row. */}
        <div className="flex items-start gap-3">
          <button onClick={onToggleSelect} title="Select" className="-m-1.5 flex flex-shrink-0 items-center justify-center rounded-[8px] p-1.5" style={{ color: selected ? 'var(--brand)' : 'var(--text-disabled)', minHeight: 44, minWidth: 44 }}>
            {selected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
          <div className="relative flex-shrink-0">
            <StudioMark name={org.name} logoUrl={org.logo_url} size={44} />
            <input aria-label="Upload a studio logo" ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onLogoPick} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Upload / change logo"
              className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full transition hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            </button>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[15px] font-[800] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
            <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
              /{org.slug} · created {fmtDate(org.created_at)} · active {fmtWhen(row.lastLogin)}
            </p>
          </div>
        </div>

        {/* Badges — own row, full card width, wraps freely now. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={suspended ? 'danger' : 'success'} dot>{org.status}</Badge>
          {row.sub?.plan_name && <Badge tone="purple">{row.sub.plan_name}</Badge>}
          {row.sub?.effective_state === 'trial' && <Badge tone="info">trial</Badge>}
          {row.sub?.renewal_due && <Badge tone="warning">renewal due</Badge>}
          {row.sub?.requested_at && <Badge tone="warning">requested</Badge>}
        </div>

        {/* Stats — a real 2x2 grid on a phone (4-across from sm), each a
            colored icon chip rather than plain muted text. */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat icon={<IndianRupee size={14} />} value={fmtINR(row.revenue)} label="Revenue" color="#10b981" />
          <MiniStat icon={<Users size={14} />} value={`${row.activeClients}/${row.totalClients}`} label="Clients" color="#0067e0" />
          <MiniStat icon={<Dumbbell size={14} />} value={org.trainer_count ?? 0} label="Coaches" color="#0067e0" />
          <MiniStat icon={<UserCircle size={14} />} value={org.user_count ?? 0} label="Accounts" color="#f59e0b" />
        </div>

        {/* Actions — dedicated row, never shares space with the name again. */}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={toggleExpand} title="Open studio — manage accounts"
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-80"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            Open <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button onClick={() => impersonate('read_only')} disabled={suspended || impLoading === 'read_only:primary'} title="View this studio as its admin (read-only)"
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-80 disabled:opacity-40"
            style={{ background: 'rgba(0,103,224,0.10)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.25)' }}>
            {impLoading === 'read_only:primary' ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} View as
          </button>
          <MoreMenu
            suspended={suspended}
            onToggleStatus={onToggleStatus}
            onSupportAccess={() => impersonate('full')}
            supportBusy={impLoading === 'full:primary'}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t rounded-b-[17px] px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          {loadingDetail && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#0067e0' }} /></div>}
          {detail && detail.users.length === 0 && <p className="py-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>No login accounts.</p>}
          {detail && detail.users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  {u.name} <span className="font-[500]" style={{ color: 'var(--text-muted)' }}>· {roleLabel(u.role)}</span>
                </p>
                <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{u.email} · last login {fmtWhen(u.last_login)}</p>
              </div>
              {!u.is_active && <Badge tone="danger">disabled</Badge>}
              {u.is_active && (
                <>
                  <IconBtn title="View as (read-only)" onClick={() => impersonate('read_only', u.id)} busy={impLoading === `read_only:${u.id}`}>
                    <Eye size={12} /> View
                  </IconBtn>
                  <IconBtn title="Act as (full access — changes are live, recorded against you)" onClick={() => impersonate('full', u.id)} busy={impLoading === `full:${u.id}`} tone="danger">
                    <LogIn size={12} /> Act as
                  </IconBtn>
                </>
              )}
              <IconBtn title="Edit" onClick={() => onEditUser(u)}><Pencil size={12} /> Edit</IconBtn>
              <IconBtn title="Reset password" onClick={() => onResetPassword(u)}><KeyRound size={12} /> Reset</IconBtn>
              <IconBtn title="Sign out of every device (password unchanged)" onClick={() => forceLogout(u)} busy={userBusy === `logout:${u.id}`}>
                <LogOut size={12} /> Sign out
              </IconBtn>
              <IconBtn title="Reset two-factor — removes a security factor" onClick={() => resetMfa(u)} busy={userBusy === `mfa:${u.id}`} tone="danger">
                <ShieldOff size={12} /> 2FA
              </IconBtn>
              <IconBtn title={u.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleUser(u)}
                tone={u.is_active ? 'danger' : 'success'}><Power size={12} /> {u.is_active ? 'Off' : 'On'}</IconBtn>
              <IconBtn title="Remove account" onClick={() => deleteUser(u)} tone="danger"><Trash2 size={12} /></IconBtn>
            </div>
          ))}
          {detail && (
            <button onClick={onAddUser}
              className="mt-2 flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-[700] transition hover:bg-black/5"
              style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
              <UserPlus size={12} /> Add account
            </button>
          )}
          {detail && <StudioOperatorPanel org={org} onChanged={onChanged} />}
        </div>
      )}
    </div>
  );
}

/* Operator-only controls for a studio: goodwill extensions and the internal
   scratchpad. Both are platform-side — nothing here is visible to the studio's
   own admins, and the notes deliberately never leave the super-admin API. */
export function StudioOperatorPanel({ org, onChanged }: { org: Organization; onChanged: () => void }) {
  const { toast } = useToast();
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesMeta, setNotesMeta] = useState<{ at: string | null; by: string | null }>({ at: null, by: null });
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.superAdmin.orgNotes(org.id)
      .then((r) => {
        setNotes(r.data.internal_notes ?? '');
        setNotesMeta({ at: r.data.internal_notes_updated_at, by: r.data.internal_notes_updated_by });
      })
      .catch(() => { /* notes are supplementary; a failure must not blank the panel */ })
      .finally(() => setNotesLoaded(true));
  }, [org.id]);

  const grant = async () => {
    const n = parseInt(days, 10);
    if (!Number.isFinite(n) || n === 0) { toast.error('Enter a non-zero number of days.'); return; }
    if (!window.confirm(`${n > 0 ? 'Add' : 'Remove'} ${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} ${n > 0 ? 'to' : 'from'} ${org.name}'s subscription?`)) return;
    setGranting(true);
    try {
      const r = await api.superAdmin.bonusDays(org.id, n, reason || undefined);
      toast.success(`${n > 0 ? 'Granted' : 'Removed'} ${Math.abs(n)} days — ${r.data.field.replace(/_/g, ' ')} updated.`);
      setDays(''); setReason('');
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not apply bonus days'); }
    finally { setGranting(false); }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const r = await api.superAdmin.saveOrgNotes(org.id, notes);
      setNotesMeta({ at: r.data.internal_notes_updated_at, by: r.data.internal_notes_updated_by });
      setDirty(false);
      toast.success('Notes saved.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save notes'); }
    finally { setSavingNotes(false); }
  };

  const field = { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' } as const;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 border-t pt-3 lg:grid-cols-2" style={{ borderColor: 'var(--border)' }}>
      {/* Bonus days */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
          <CalendarPlus size={11} /> Bonus days
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number" value={days} onChange={(e) => setDays(e.target.value)}
            placeholder="14" aria-label="Bonus days"
            className="h-9 w-20 rounded-[9px] px-2.5 text-[12.5px] outline-none" style={field}
          />
          <input
            value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)" aria-label="Reason"
            className="h-9 min-w-[120px] flex-1 rounded-[9px] px-2.5 text-[12.5px] outline-none" style={field}
          />
          <button
            onClick={grant} disabled={granting}
            className="flex h-11 items-center gap-1.5 rounded-[9px] px-3 text-[11.5px] font-[700] text-white disabled:opacity-50"
            style={{ background: '#0067e0' }}
          >
            {granting ? <Loader2 size={12} className="animate-spin" /> : <Gift size={12} />} Grant
          </button>
        </div>
        <p className="mt-1.5 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
          Extends the trial while trialling, otherwise the paid period. Negative values shorten it.
        </p>
      </div>

      {/* Internal notes */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
          <StickyNote size={11} /> Internal notes
        </p>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
          placeholder={notesLoaded ? 'Operator-only context — never shown to the studio.' : 'Loading…'}
          rows={3} aria-label="Internal notes"
          className="w-full resize-y rounded-[9px] px-2.5 py-2 text-[12.5px] outline-none" style={field}
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <button
            onClick={saveNotes} disabled={savingNotes || !dirty}
            className="flex h-11 items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[700] disabled:opacity-40"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {savingNotes ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
          </button>
          {notesMeta.at && (
            <span className="text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
              {notesMeta.by ? `${notesMeta.by} · ` : ''}{fmtWhen(notesMeta.at)}
            </span>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <BillingProfileEditor orgId={org.id} />
      </div>

      <div className="lg:col-span-2">
        <StudioFeatureEditor orgId={org.id} orgName={org.name} />
      </div>
    </div>
  );
}

/* Per-studio feature overrides. Lives here rather than in the Features tab
   because the question is always "what does THIS studio have" — asked while
   looking at the studio, in response to a support conversation about it.
   The Features tab answers the other question, "what does the platform offer".

   Every row shows WHY it resolved the way it did. Without that, an operator
   staring at a disabled feature cannot tell an expired trial from a plan that
   never included it from a kill switch someone pulled this morning. */
export const FEATURE_SOURCE_LABEL: Record<ResolvedFeature['source'], string> = {
  core: 'Core — always on',
  global_off: 'Off platform-wide',
  override: 'Set for this studio',
  plan: 'From their plan',
  default: 'Default',
};

export function StudioFeatureEditor({ orgId, orgName }: { orgId: string; orgName: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ResolvedFeature[] | null>(null);
  const [busyKey, setBusyKey] = useState('');

  const load = useCallback(() => {
    api.superAdmin.orgFeatures(orgId)
      .then((r) => setRows(r.data))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load features'));
  }, [orgId, toast]);

  useEffect(() => { if (open && !rows) load(); }, [open, rows, load]);

  const setOverride = async (f: ResolvedFeature) => {
    const next = !f.enabled;
    // The reason is mandatory server-side; asking for it here means the
    // operator never meets a validation error they cannot act on.
    const reason = window.prompt(
      `${next ? 'Grant' : 'Remove'} ${f.name} for ${orgName}.\n\nWhy? (recorded in the audit trail)`,
    );
    if (reason === null) return;
    if (!reason.trim()) { toast.error('A reason is required.'); return; }
    setBusyKey(f.key);
    try {
      await api.superAdmin.setOrgFeature(orgId, f.key, { enabled: next, reason: reason.trim() });
      toast.success(`${f.name} ${next ? 'granted' : 'removed'} for ${orgName}.`);
      setRows(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not set the override'); }
    finally { setBusyKey(''); }
  };

  const clearOverride = async (f: ResolvedFeature) => {
    setBusyKey(f.key);
    try {
      await api.superAdmin.clearOrgFeature(orgId, f.key);
      toast.success(`${f.name} follows their plan again.`);
      setRows(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not clear the override'); }
    finally { setBusyKey(''); }
  };

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[750] uppercase tracking-[0.08em]"
        style={{ color: 'var(--text-disabled)' }}
      >
        <ToggleRight size={11} /> Features
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div className="rounded-[10px]" style={{ border: '1px solid var(--border)' }}>
          {!rows && (
            <div className="flex justify-center py-5">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          )}
          {rows?.map((f) => (
            <div key={f.key} className="flex items-center gap-2.5 px-2.5 py-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
                <p className="truncate text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                  {FEATURE_SOURCE_LABEL[f.source]}
                  {f.override?.reason ? ` · ${f.override.reason}` : ''}
                </p>
              </div>
              {f.source === 'override' && (
                <button
                  onClick={() => clearOverride(f)} disabled={busyKey === f.key}
                  className="shrink-0 text-[10.5px] font-[650] disabled:opacity-40"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear
                </button>
              )}
              {busyKey === f.key
                ? <Loader2 size={14} className="animate-spin shrink-0" style={{ color: 'var(--brand)' }} />
                : (
                  <button
                    role="switch" aria-checked={f.enabled}
                    aria-label={`${f.name} for ${orgName}`}
                    disabled={f.is_core || f.source === 'global_off'}
                    onClick={() => setOverride(f)}
                    className="shrink-0 disabled:opacity-35"
                    style={{ color: f.enabled ? 'var(--success-text)' : 'var(--text-disabled)' }}
                  >
                    {f.is_core ? <Lock size={14} /> : f.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                )}
            </div>
          ))}
          {rows && (
            // A studio-level switch cannot beat the platform kill switch, so
            // saying nothing here would look like a broken toggle.
            <p className="px-2.5 py-2 text-[10.5px]" style={{ color: 'var(--text-disabled)', borderTop: '1px solid var(--border)' }}>
              Features off platform-wide cannot be granted to one studio.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* The studio's registered identity as it will appear on future invoices. Kept
   next to the other operator tools rather than in Finance, because the moment
   you need it is when a studio emails asking for their GSTIN on the bill —
   which happens while you are looking at the studio, not at the ledger.
   Loaded lazily on expand: most visits to a studio row never touch billing. */
export function BillingProfileEditor({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<OrgBillingProfile> | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open || form) return;
    api.superAdmin.orgBillingProfile(orgId)
      .then((r) => setForm(r.data))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load the billing profile'));
  }, [open, form, orgId, toast]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const r = await api.superAdmin.saveOrgBillingProfile(orgId, {
        billing_name: form.billing_name ?? null, billing_email: form.billing_email ?? null,
        billing_gstin: form.billing_gstin ?? null,
        billing_address_line1: form.billing_address_line1 ?? null,
        billing_address_line2: form.billing_address_line2 ?? null,
        billing_city: form.billing_city ?? null, billing_state: form.billing_state ?? null,
        billing_state_code: form.billing_state_code ?? null,
        billing_postal_code: form.billing_postal_code ?? null,
      });
      setForm(r.data); setDirty(false);
      toast.success('Billing profile saved — applies to invoices issued from now on.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save the billing profile'); }
    finally { setSaving(false); }
  };

  const field = { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' } as const;
  const set = (k: keyof OrgBillingProfile, v: string) => { setForm((f) => (f ? { ...f, [k]: v } : f)); setDirty(true); };

  const FIELDS: { key: keyof OrgBillingProfile; label: string; placeholder?: string; wide?: boolean }[] = [
    { key: 'billing_name', label: 'Registered name', placeholder: 'Iron House Fitness LLP', wide: true },
    { key: 'billing_gstin', label: 'GSTIN', placeholder: '27AAAAA0000A1Z5' },
    { key: 'billing_email', label: 'Billing email' },
    { key: 'billing_address_line1', label: 'Address line 1', wide: true },
    { key: 'billing_address_line2', label: 'Address line 2', wide: true },
    { key: 'billing_city', label: 'City' },
    { key: 'billing_state', label: 'State' },
    { key: 'billing_state_code', label: 'GST state code', placeholder: '27' },
    { key: 'billing_postal_code', label: 'PIN' },
  ];

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[750] uppercase tracking-[0.08em]"
        style={{ color: 'var(--text-disabled)' }}
      >
        <Receipt size={11} /> Billing profile
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((f) => (
              <label key={String(f.key)} className={`flex flex-col gap-1 ${f.wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
                <span className="text-[10px] font-[700]" style={{ color: 'var(--text-disabled)' }}>{f.label}</span>
                <input
                  value={(form?.[f.key] as string) ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={form ? f.placeholder : 'Loading…'}
                  disabled={!form}
                  className="h-9 rounded-[9px] px-2.5 text-[12.5px] outline-none disabled:opacity-50" style={field}
                />
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={save} disabled={saving || !dirty}
              className="flex h-11 items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[700] disabled:opacity-40"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
            </button>
            <span className="text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
              Invoices already issued keep the details recorded on them.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

