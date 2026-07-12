'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import Link from 'next/link';

/* ─── Types ──────────────────────────────────────────────────────── */
interface StaffMember {
  id: string;
  unique_id?: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  phone?: string;
  joining_date?: string;
  created_at?: string;
}

type StaffEdits = Record<string, { role: string; status: string }>;

/* ─── Constants ──────────────────────────────────────────────────── */
const ROLES = ['admin', 'manager', 'trainer', 'receptionist', 'accountant', 'hr', 'support'];

const ROLE_CFG: Record<string, {
  label: string; icon: string;
  gradient: string; bg: string; color: string; dot: string; ring: string;
}> = {
  admin:        { label: 'Admin',        icon: '🛡️',  gradient: 'linear-gradient(135deg,#7c3aed,#4f46e5)', bg: '#f5f3ff', color: '#5b21b6', dot: '#7c3aed', ring: '#ddd6fe' },
  manager:      { label: 'Manager',      icon: '💼',  gradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)', bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6', ring: '#bfdbfe' },
  trainer:      { label: 'Trainer',      icon: '💪',  gradient: 'linear-gradient(135deg,#10b981,#059669)', bg: '#f0fdf4', color: '#065f46', dot: '#22c55e', ring: '#bbf7d0' },
  receptionist: { label: 'Receptionist', icon: '🎧',  gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', bg: '#fffbeb', color: '#92400e', dot: '#f59e0b', ring: '#fde68a' },
  accountant:   { label: 'Accountant',   icon: '📊',  gradient: 'linear-gradient(135deg,#e11d48,#be185d)', bg: '#fff1f2', color: '#9f1239', dot: '#f43f5e', ring: '#fecdd3' },
  hr:           { label: 'HR',           icon: '🌱',  gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', bg: '#ecfeff', color: '#164e63', dot: '#06b6d4', ring: '#a5f3fc' },
  support:      { label: 'Support',      icon: '🔧',  gradient: 'linear-gradient(135deg,#64748b,#475569)', bg: '#f8fafc', color: '#334155', dot: '#64748b', ring: '#cbd5e1' },
};

import { avatarGradient as avatarGrad, initialsAvatar } from '@/lib/avatar';
import { CopyId } from '@/components/ui/CopyId';

/* ─── Helpers ────────────────────────────────────────────────────── */
const initials = initialsAvatar;

const getRoleCfg = (r: string) =>
  ROLE_CFG[r] || { label: r, icon: '👤', gradient: 'linear-gradient(135deg,#64748b,#475569)', bg: '#f8fafc', color: '#334155', dot: '#64748b', ring: '#cbd5e1' };

// TODO: Performance stats and AI badges should come from a real API endpoint

/* ─── Main export ────────────────────────────────────────────────── */
export default function StaffManagementPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

/* ─── Inner ──────────────────────────────────────────────────────── */
function Inner() {
  const [staff, setStaff]       = useState<StaffMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [saving, setSaving]     = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('all');
  const [view, setView]         = useState<'grid' | 'list'>('grid');
  const [panel, setPanel]       = useState<StaffMember | null>(null);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [edits, setEdits]       = useState<StaffEdits>({});
  const searchRef               = useRef<HTMLInputElement>(null);

  /* keyboard shortcut: / → focus search */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    let alive = true;
    api.staff.list()
      .then(data => {
        if (!alive) return;
        const list: StaffMember[] = Array.isArray(data) ? data : [];
        setStaff(list);
        const init: StaffEdits = {};
        list.forEach(s => { init[s.id] = { role: s.role, status: s.status || 'active' }; });
        setEdits(init);
      })
      .catch(e => alive && setError(e.message || 'Failed to load staff'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const flash = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2800);
  }, []);

  const save = useCallback(async (s: StaffMember) => {
    setSaving(s.id);
    setError('');
    try {
      await api.staff.update(s.id, { role: edits[s.id]?.role, status: edits[s.id]?.status });
      setStaff(prev => prev.map(m => m.id === s.id ? { ...m, ...edits[s.id] } : m));
      flash(`Changes saved for ${s.name}`);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) || 'Could not save');
    } finally {
      setSaving(null);
    }
  }, [edits, flash]);

  const isDirty = (s: StaffMember) =>
    edits[s.id]?.role !== s.role || edits[s.id]?.status !== (s.status || 'active');

  const editProfile = useCallback(async (id: string, updates: { name: string; email: string; phone: string }) => {
    setSaving(id);
    setError('');
    try {
      await api.staff.update(id, updates);
      setStaff(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
      setEditTarget(null);
      flash('Profile updated');
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) || 'Could not update profile');
    } finally {
      setSaving(null);
    }
  }, [flash]);

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      || (s.phone || '').includes(q) || s.role.toLowerCase().includes(q)
      || (s.unique_id || '').toLowerCase().includes(q);
    const matchR = roleFilter === 'all' || s.role === roleFilter;
    return matchQ && matchR;
  });

  const totalActive   = staff.filter(s => (s.status || 'active') === 'active').length;
  const totalTrainers = staff.filter(s => s.role === 'trainer').length;
  const totalAdmins   = staff.filter(s => s.role === 'admin' || s.role === 'manager').length;

  return (
    <AppShell>
      <style>{CSS}</style>

      <div className="sm-page">

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="sm-hero">
          <div className="sm-hero-left">
            <div className="sm-hero-eyebrow">
              <span className="sm-pulse-dot" />
              Coach Abhishek · Team Management
            </div>
            <h1 className="sm-hero-title">Team Management</h1>
            <p className="sm-hero-sub">
              Manage staff access, roles, schedules, and performance from one intelligent workspace.
            </p>
          </div>
          <div className="sm-hero-stats">
            {[
              { label: 'Total Staff',   val: staff.length,        icon: '👥', color: '#7c3aed' },
              { label: 'Active Today',  val: totalActive,         icon: '🟢', color: '#10b981' },
              { label: 'Trainers',      val: totalTrainers,       icon: '💪', color: '#0ea5e9' },
              { label: 'Admin / Mgmt',  val: totalAdmins,         icon: '🛡️', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="sm-stat-card">
                <div className="sm-stat-icon">{s.icon}</div>
                <div className="sm-stat-val" style={{ color: s.color }}>
                  {loading ? '—' : s.val}
                </div>
                <div className="sm-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ALERTS ──────────────────────────────────────────── */}
        {error   && <div className="sm-alert sm-alert-error"  ><span>⚠</span>{error}  </div>}
        {success && <div className="sm-alert sm-alert-success"><span>✓</span>{success}</div>}

        {/* ── ACTION BAR ──────────────────────────────────────── */}
        <div className="sm-actionbar">
          <div className="sm-search-wrap">
            <svg className="sm-search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              ref={searchRef}
              aria-label="Search staff"
              className="sm-search"
              placeholder="Search name, role, email, phone… (press / to focus)"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="sm-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          <div className="sm-actionbar-right">
            {/* View toggle */}
            <div className="sm-view-toggle">
              <button
                className={`sm-view-btn${view === 'grid' ? ' active' : ''}`}
                onClick={() => setView('grid')}
                aria-label="Grid view"
                title="Grid view"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                </svg>
              </button>
              <button
                className={`sm-view-btn${view === 'list' ? ' active' : ''}`}
                onClick={() => setView('list')}
                aria-label="List view"
                title="List view"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                </svg>
              </button>
            </div>

            <Link href="/settings/staff/new" className="sm-btn sm-btn-primary">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Add Staff
            </Link>
          </div>
        </div>

        {/* ── ROLE FILTERS ─────────────────────────────────────── */}
        <div className="sm-filters" role="tablist" aria-label="Filter by role">
          {['all', ...ROLES].map(r => {
            const cfg = r === 'all' ? null : getRoleCfg(r);
            const count = r === 'all' ? staff.length : staff.filter(s => s.role === r).length;
            return (
              <button
                key={r}
                role="tab"
                aria-selected={roleFilter === r}
                className={`sm-filter-tab${roleFilter === r ? ' active' : ''}`}
                onClick={() => setRole(r)}
                style={roleFilter === r && cfg ? { borderColor: cfg.dot, background: cfg.bg, color: cfg.color } : {}}
              >
                {cfg && <span className="sm-filter-dot" style={{ background: cfg.dot }} />}
                {r === 'all' ? '👥 All' : `${cfg!.icon} ${cfg!.label}`}
                <span className="sm-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── RESULT META ─────────────────────────────────────── */}
        {!loading && (
          <div className="sm-result-meta">
            <span>
              Showing <strong>{filtered.length}</strong> of <strong>{staff.length}</strong> staff
              {roleFilter !== 'all' && ` · ${getRoleCfg(roleFilter).label}`}
              {search && ` · "${search}"`}
            </span>
            {(search || roleFilter !== 'all') && (
              <button className="sm-clear-filters" onClick={() => { setSearch(''); setRole('all'); }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── MAIN CONTENT ─────────────────────────────────────── */}
        {loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <EmptyState search={search} />
        ) : view === 'grid' ? (
          <div className="sm-grid">
            {filtered.map(s => (
              <StaffCard
                key={s.id}
                s={s}
                edits={edits}
                setEdits={setEdits}
                saving={saving}
                save={save}
                isDirty={isDirty}
                onOpen={() => setPanel(s)}
                onEdit={() => setEditTarget(s)}
              />
            ))}
          </div>
        ) : (
          <StaffTable
            filtered={filtered}
            edits={edits}
            setEdits={setEdits}
            saving={saving}
            save={save}
            isDirty={isDirty}
            onOpen={(s: StaffMember) => setPanel(s)}
            onEdit={(s: StaffMember) => setEditTarget(s)}
          />
        )}

      </div>

      {/* ── SIDE PANEL ──────────────────────────────────────── */}
      {panel && (
        <SidePanel
          s={panel}
          edits={edits}
          setEdits={setEdits}
          saving={saving}
          save={save}
          isDirty={isDirty}
          onClose={() => setPanel(null)}
        />
      )}

      {/* ── EDIT MODAL ──────────────────────────────────────── */}
      {editTarget && (
        <EditModal
          s={editTarget}
          saving={saving}
          onSave={editProfile}
          onClose={() => setEditTarget(null)}
        />
      )}
    </AppShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STAFF CARD
══════════════════════════════════════════════════════════════════ */
function StaffCard({ s, edits, setEdits, saving, save, isDirty, onOpen, onEdit }: {
  s: StaffMember;
  edits: StaffEdits;
  setEdits: React.Dispatch<React.SetStateAction<StaffEdits>>;
  saving: string | null;
  save: (s: StaffMember) => Promise<void>;
  isDirty: (s: StaffMember) => boolean;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const e     = edits[s.id] || { role: s.role, status: s.status || 'active' };
  const cfg   = getRoleCfg(e.role);
  const busy  = saving === s.id;
  const isActive = e.status === 'active';

  return (
    <div className={`sm-card${isDirty(s) ? ' dirty' : ''}`} style={{ '--ring': cfg.ring } as React.CSSProperties}>

      {/* Header */}
      <div className="sm-card-head">
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div className="sm-card-avatar" style={{ background: avatarGrad(s.name) }}>
            {initials(s.name)}
          </div>
          <span
            className="sm-online-dot"
            style={{ background: isActive ? '#22c55e' : 'var(--text-disabled)' }}
            title={isActive ? 'Active' : 'Inactive'}
          />
        </div>
        <div className="sm-card-meta">
          <div className="sm-card-name">{s.name}</div>
          {s.unique_id && <div style={{ marginBottom: 2 }}><CopyId id={s.unique_id} color="#6366f1" /></div>}
          <div className="sm-card-email">{s.email}</div>
          {s.phone && <div className="sm-card-phone">{s.phone}</div>}
        </div>
        <div className="sm-card-role-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.ring }}>
          {cfg.icon} {cfg.label}
        </div>
      </div>

      {/* Quick stats */}
      <div className="sm-card-stats">
        {[
          { label: 'Attendance', val: '—', color: '#94a3b8' },
          { label: 'Clients',    val: '—', color: '#94a3b8' },
          { label: 'Leads',      val: '—', color: '#94a3b8' },
          { label: 'Score',      val: '—', color: '#94a3b8' },
        ].map(st => (
          <div key={st.label} className="sm-mini-stat">
            <div className="sm-mini-val" style={{ color: st.color }}>{st.val}</div>
            <div className="sm-mini-lbl">{st.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="sm-card-controls">
        <select
          className="sm-select"
          value={e.role}
          onChange={ev => setEdits(p => ({ ...p, [s.id]: { ...p[s.id], role: ev.target.value } }))}
          aria-label="Change role"
        >
          {ROLES.map(r => <option key={r} value={r}>{getRoleCfg(r).label}</option>)}
        </select>
        <select
          className={`sm-select sm-status-select${isActive ? ' active' : ''}`}
          value={e.status}
          onChange={ev => setEdits(p => ({ ...p, [s.id]: { ...p[s.id], status: ev.target.value } }))}
          aria-label="Change status"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Footer actions */}
      <div className="sm-card-footer">
        <button className="sm-card-action" onClick={onOpen} title="View profile">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View
        </button>
        <button className="sm-card-action" onClick={onEdit} title="Edit profile">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button
          className={`sm-btn-save${busy ? ' busy' : ''}`}
          onClick={() => save(s)}
          disabled={!isDirty(s) || busy}
          aria-label="Save changes"
        >
          {busy ? 'Saving…' : isDirty(s) ? 'Save ✓' : 'Saved'}
        </button>
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STAFF TABLE (list view)
══════════════════════════════════════════════════════════════════ */
interface StaffTableProps {
  filtered: StaffMember[];
  edits: StaffEdits;
  setEdits: React.Dispatch<React.SetStateAction<StaffEdits>>;
  saving: string | null;
  save: (s: StaffMember) => Promise<void>;
  isDirty: (s: StaffMember) => boolean;
  onOpen: (s: StaffMember) => void;
  onEdit: (s: StaffMember) => void;
}

function StaffTable({ filtered, edits, setEdits, saving, save, isDirty, onOpen, onEdit }: StaffTableProps) {
  return (
    <div className="sm-table-card">
      <table className="sm-table">
        <thead>
          <tr>
            <th>Member</th><th>Role</th><th>Status</th>
            <th>Attendance</th><th>Change Role</th><th>Change Status</th>
            <th style={{ textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s: StaffMember) => {
            const e   = edits[s.id] || { role: s.role, status: s.status || 'active' };
            const cfg = getRoleCfg(e.role);
            const busy = saving === s.id;
            return (
              <tr key={s.id} className="sm-table-row">
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="sm-table-avatar" style={{ background: avatarGrad(s.name) }}>{initials(s.name)}</div>
                    <div>
                      <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--text-primary)' }}>
                        {s.name}
                      </div>
                      {s.unique_id && <CopyId id={s.unique_id} color="#6366f1" />}
                      <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 1 }}>{s.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="sm-badge" style={{ background: cfg.bg, color: cfg.color }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block', marginRight: 5 }} />
                    {cfg.icon} {cfg.label}
                  </span>
                </td>
                <td>
                  <span className="sm-badge" style={{
                    background: e.status === 'active' ? '#f0fdf4' : '#f8fafc',
                    color: e.status === 'active' ? '#15803d' : '#64748b',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.status === 'active' ? '#22c55e' : 'var(--text-disabled)', display: 'inline-block', marginRight: 5 }} />
                    {e.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>—</span>
                </td>
                <td>
                  <select className="sm-select" style={{ minWidth: 130 }} value={e.role}
                    onChange={ev => setEdits(p => ({ ...p, [s.id]: { ...p[s.id], role: ev.target.value } }))}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{getRoleCfg(r).label}</option>)}
                  </select>
                </td>
                <td>
                  <select className={`sm-select${e.status === 'active' ? ' active' : ''}`} value={e.status}
                    onChange={ev => setEdits(p => ({ ...p, [s.id]: { ...p[s.id], status: ev.target.value } }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                    <button className="sm-card-action" onClick={() => onOpen(s)}>View</button>
                    <button className="sm-card-action" onClick={() => onEdit(s)}>Edit</button>
                    <button className={`sm-btn-save${busy ? ' busy' : ''}`} onClick={() => save(s)} disabled={!isDirty(s) || busy}>
                      {busy ? '…' : isDirty(s) ? 'Save' : '✓'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════════════════════════════ */
function EditModal({ s, saving, onSave, onClose }: {
  s: StaffMember;
  saving: string | null;
  onSave: (id: string, updates: { name: string; email: string; phone: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName]   = useState(s.name);
  const [email, setEmail] = useState(s.email || '');
  const [phone, setPhone] = useState(s.phone || '');
  const busy = saving === s.id;

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!name.trim()) return;
    onSave(s.id, { name: name.trim(), email: email.trim(), phone: phone.trim() });
  };

  return (
    <>
      <div className="sm-overlay" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-label="Edit staff profile" style={{
        position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          background: 'white', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', width: '100%', maxWidth: 440,
          border: '1px solid #e2e8f0', overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 750, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                Edit Profile
                {s.unique_id && <CopyId id={s.unique_id} color="#6366f1" />}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Update name, email, and phone</div>
            </div>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f8fafc', cursor: 'pointer', color: '#64748b' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 24, display: 'grid', gap: 16 }}>
            {([
              { label: 'Full Name *', value: name, onChange: setName, type: 'text', required: true },
              { label: 'Email', value: email, onChange: setEmail, type: 'email', required: false },
              { label: 'Phone', value: phone, onChange: setPhone, type: 'tel', required: false },
            ] as const).map(f => (
              <label key={f.label} style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>{f.label}</span>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => (f.onChange as (v: string) => void)(e.target.value)}
                  required={f.required}
                  style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 14px', fontSize: 13.5, fontWeight: 500, color: '#0f172a', background: '#f8fafc', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
              </label>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={busy || !name.trim()} style={{ fontSize: 13, fontWeight: 700, padding: '9px 22px', borderRadius: 10, border: 'none', background: busy ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', cursor: busy ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
                {busy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SIDE PANEL
══════════════════════════════════════════════════════════════════ */
interface SidePanelProps {
  s: StaffMember;
  edits: StaffEdits;
  setEdits: React.Dispatch<React.SetStateAction<StaffEdits>>;
  saving: string | null;
  save: (s: StaffMember) => Promise<void>;
  isDirty: (s: StaffMember) => boolean;
  onClose: () => void;
}

function SidePanel({ s, edits, setEdits, saving, save, isDirty, onClose }: SidePanelProps) {
  const e     = edits[s.id] || { role: s.role, status: s.status || 'active' };
  const cfg   = getRoleCfg(e.role);
  const busy  = saving === s.id;

  return (
    <>
      <div className="sm-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sm-panel" role="dialog" aria-label={`${s.name} details`}>
        <div className="sm-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="sm-panel-avatar" style={{ background: avatarGrad(s.name) }}>{initials(s.name)}</div>
            <div>
              <div className="sm-panel-name">{s.name}</div>
              <div className="sm-panel-email">{s.email}</div>
            </div>
          </div>
          <button className="sm-panel-close" onClick={onClose} aria-label="Close panel">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="sm-panel-body">

          <div className="sm-panel-section">
            <div className="sm-panel-section-title">Role Badge</div>
            <div className="sm-card-role-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.ring, display: 'inline-flex' }}>
              {cfg.icon} {cfg.label}
            </div>
          </div>

          <div className="sm-panel-section">
            <div className="sm-panel-section-title">Performance</div>
            <div className="sm-panel-stats">
              {[
                { label: 'Attendance', color: '#94a3b8' },
                { label: 'Clients',    color: '#94a3b8' },
                { label: 'Leads',      color: '#94a3b8' },
                { label: 'Score',      color: '#94a3b8' },
              ].map(st => (
                <div key={st.label} className="sm-panel-stat">
                  <div className="sm-panel-stat-val" style={{ color: st.color }}>—</div>
                  <div className="sm-panel-stat-lbl">{st.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sm-panel-section">
            <div className="sm-panel-section-title">Change Role</div>
            <select className="sm-select" style={{ width: '100%' }} value={e.role}
              onChange={ev => setEdits(p => ({ ...p, [s.id]: { ...p[s.id], role: ev.target.value } }))}
            >
              {ROLES.map(r => <option key={r} value={r}>{getRoleCfg(r).label}</option>)}
            </select>
          </div>

          <div className="sm-panel-section">
            <div className="sm-panel-section-title">Account Status</div>
            <select className="sm-select" style={{ width: '100%' }} value={e.status}
              onChange={ev => setEdits(p => ({ ...p, [s.id]: { ...p[s.id], status: ev.target.value } }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="sm-panel-section">
            <div className="sm-panel-section-title">Permissions</div>
            <div className="sm-perms">
              {(() => {
                const role = (edits[s.id]?.role || s.role);
                const adminPerms = ['View Clients', 'Edit Members', 'Manage Payments', 'View Reports', 'Manage Staff'];
                const managerPerms = ['View Clients', 'Edit Members', 'Manage Payments', 'View Reports'];
                const trainerPerms = ['View Clients'];
                const allowed = role === 'admin' ? adminPerms : role === 'manager' ? managerPerms : role === 'accountant' ? ['Manage Payments', 'View Reports'] : role === 'hr' ? ['View Reports', 'Manage Staff'] : trainerPerms;
                return adminPerms.map(p => (
                  <div key={p} className="sm-perm-row">
                    <span>{p}</span>
                    <span className={`sm-perm-tag${allowed.includes(p) ? ' yes' : ' no'}`}>{allowed.includes(p) ? '✓ Allowed' : '✗ Denied'}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

        </div>

        <div className="sm-panel-footer">
          <button className={`sm-btn-save${busy ? ' busy' : ''}`} style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => save(s)} disabled={!isDirty(s) || busy}
          >
            {busy ? 'Saving…' : isDirty(s) ? 'Save Changes' : 'No Changes'}
          </button>
          <button className="sm-card-action" onClick={onClose}>Close</button>
        </div>
      </aside>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════ */
function SkeletonGrid() {
  return (
    <div className="sm-grid">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="sm-card" style={{ gap: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="sk" style={{ width: 48, height: 48, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="sk" style={{ height: 14, width: '55%', marginBottom: 8, borderRadius: 6 }} />
              <div className="sk" style={{ height: 11, width: '40%', borderRadius: 6 }} />
            </div>
          </div>
          <div className="sk" style={{ height: 10, width: '30%', borderRadius: 99, marginBottom: 4 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            {[1,2,3,4].map(j => (
              <div key={j} className="sk" style={{ flex: 1, height: 40, borderRadius: 10 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <div className="sk" style={{ flex: 1, height: 34, borderRadius: 8 }} />
            <div className="sk" style={{ flex: 1, height: 34, borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════════════════════════ */
function EmptyState({ search }: { search: string }) {
  return (
    <div className="sm-empty">
      <div className="sm-empty-icon">{search ? '🔍' : '👥'}</div>
      <div className="sm-empty-title">
        {search ? `No results for "${search}"` : 'No staff members yet'}
      </div>
      <div className="sm-empty-sub">
        {search
          ? 'Try a different name, role, or email.'
          : 'Start building your dream team by adding trainers, managers, and support staff.'}
      </div>
      {!search && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
          <Link href="/settings/staff/new" className="sm-btn sm-btn-primary">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add First Staff
          </Link>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CSS-IN-JS STYLES
══════════════════════════════════════════════════════════════════ */
const CSS = `
/* ── Page wrap ────────────────────────────────────── */
.sm-page {
  position: relative;
  padding: 32px 32px 120px;
  max-width: 1320px;
  margin: 0 auto;
  min-height: 100dvh;
  overflow: hidden;
}
@media (max-width: 768px) { .sm-page { padding: 18px 16px 80px; } }

/* ── Hero ──────────────────────────────────────────── */
.sm-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.07);
  border-radius: 20px;
  padding: 28px 32px;
  box-shadow: 0 4px 24px rgba(124,58,237,0.08), 0 1px 4px rgba(0,0,0,0.04);
}
@media (max-width: 700px) { .sm-hero { flex-direction: column; } }
.sm-hero-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  color: #7c3aed; margin-bottom: 10px;
  background: #f5f3ff; border: 1px solid #ddd6fe;
  border-radius: 100px; padding: 4px 12px;
}
.sm-pulse-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #7c3aed;
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot { 0%,100%{ box-shadow: 0 0 0 0 #7c3aed55; } 50%{ box-shadow: 0 0 0 5px transparent; } }
.sm-hero-title {
  font-size: 30px; font-weight: 900; letter-spacing: -0.04em;
  color: #0f172a; line-height: 1.15;
  background: linear-gradient(135deg, #0f172a 0%, #4f46e5 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.sm-hero-sub { font-size: 13.5px; color: #64748b; margin-top: 8px; max-width: 440px; line-height: 1.55; }
.sm-hero-stats { display: flex; gap: 12px; flex-wrap: wrap; }
.sm-stat-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 14px; padding: 14px 20px;
  min-width: 96px; text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: transform 0.18s, box-shadow 0.18s;
}
.sm-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
.sm-stat-icon { font-size: 20px; margin-bottom: 5px; }
.sm-stat-val { font-size: 24px; font-weight: 900; letter-spacing: -0.03em; }
.sm-stat-lbl { font-size: 10.5px; color: #94a3b8; margin-top: 2px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

/* ── Alerts ────────────────────────────────────────── */
.sm-alert {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 500; margin-bottom: 14px;
  animation: slide-in 0.25s ease;
}
@keyframes slide-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
.sm-alert-error   { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
.sm-alert-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }

/* ── Action bar ────────────────────────────────────── */
.sm-actionbar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px; flex-wrap: wrap;
}
.sm-search-wrap {
  position: relative; flex: 1; min-width: 240px;
}
.sm-search-icon {
  position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
  color: #94a3b8; pointer-events: none;
}
.sm-search {
  width: 100%; background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px; padding: 11px 36px 11px 40px;
  font-size: 13.5px; color: #0f172a; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sm-search:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px #7c3aed1a;
}
.sm-search-clear {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: #f1f5f9; border: none; border-radius: 50%;
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b; transition: background 0.12s;
}
.sm-search-clear:hover { background: #e2e8f0; }
.sm-actionbar-right { display: flex; align-items: center; gap: 10px; }

/* View toggle */
.sm-view-toggle {
  display: flex; background: #f8fafc;
  border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 3px;
}
.sm-view-btn {
  padding: 6px 10px; border: none; background: none; border-radius: 7px;
  color: #94a3b8; cursor: pointer; transition: all 0.15s;
}
.sm-view-btn.active { background: #fff; color: #7c3aed; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

/* Buttons */
.sm-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 700;
  text-decoration: none; border: none; cursor: pointer;
  transition: all 0.18s;
}
.sm-btn-primary {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
  box-shadow: 0 2px 12px rgba(124,58,237,0.28);
}
.sm-btn-primary:hover {
  box-shadow: 0 6px 20px rgba(124,58,237,0.38);
  transform: translateY(-1px);
}

/* ── Role filters ──────────────────────────────────── */
.sm-filters {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-bottom: 14px;
}
.sm-filter-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 100px;
  font-size: 12px; font-weight: 650;
  background: #fff; color: #475569;
  border: 1.5px solid #e2e8f0;
  cursor: pointer; transition: all 0.15s;
}
.sm-filter-tab:hover { border-color: #cbd5e1; background: #fff; }
.sm-filter-tab.active { border-color: currentColor; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.sm-filter-dot { width: 6px; height: 6px; border-radius: 50%; }
.sm-filter-count {
  background: rgba(0,0,0,0.07); color: inherit;
  padding: 1px 7px; border-radius: 100px; font-size: 10.5px; font-weight: 700;
}

/* Result meta */
.sm-result-meta {
  font-size: 12.5px; color: #64748b; margin-bottom: 18px;
  display: flex; align-items: center; gap: 12px;
}
.sm-clear-filters {
  background: none; border: none; color: #7c3aed; font-size: 12px;
  font-weight: 700; cursor: pointer; text-decoration: underline;
}

/* ── Grid ──────────────────────────────────────────── */
.sm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}
@media (max-width: 600px) { .sm-grid { grid-template-columns: 1fr; } }

/* ── Card ──────────────────────────────────────────── */
.sm-card {
  background: #fff;
  border: 1.5px solid rgba(0,0,0,0.07);
  border-radius: 18px; padding: 20px;
  display: flex; flex-direction: column; gap: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  animation: card-in 0.3s ease both;
}
@keyframes card-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
.sm-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(0,0,0,0.09), 0 0 0 2px var(--ring, #ddd6fe);
  border-color: var(--ring, #ddd6fe);
}
.sm-card.dirty { border-color: #fde68a; box-shadow: 0 2px 12px rgba(245,158,11,0.1); }

/* AI badge */
.sm-ai-badge {
  display: inline-flex; align-items: center;
  font-size: 10.5px; font-weight: 700;
  padding: 3px 9px; border-radius: 100px;
  letter-spacing: 0.02em;
}
.sm-ai-chip {
  display: inline-flex; align-items: center;
  font-size: 9.5px; font-weight: 700;
  padding: 2px 7px; border-radius: 100px; margin-left: 7px;
}

/* Card head */
.sm-card-head {
  display: flex; align-items: flex-start; gap: 12px;
}
.sm-card-avatar {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 15px; font-weight: 800;
  letter-spacing: 0.02em; flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(0,0,0,0.15);
}
.sm-online-dot {
  position: absolute; bottom: 1px; right: 1px;
  width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.sm-card-meta { flex: 1; min-width: 0; }
.sm-card-name  { font-size: 14px; font-weight: 750; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sm-card-email { font-size: 11px; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sm-card-phone { font-size: 11px; color: #94a3b8; margin-top: 1px; }
.sm-card-role-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 100px; border: 1.5px solid;
  font-size: 11px; font-weight: 700; flex-shrink: 0; white-space: nowrap;
}

/* Quick stats */
.sm-card-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
}
.sm-mini-stat {
  background: #f8fafc; border: 1px solid #f1f5f9;
  border-radius: 10px; padding: 8px 4px; text-align: center;
}
.sm-mini-val { font-size: 15px; font-weight: 800; }
.sm-mini-lbl { font-size: 9.5px; color: #94a3b8; margin-top: 2px; font-weight: 600; text-transform: uppercase; }

/* Controls */
.sm-card-controls { display: flex; gap: 8px; }
.sm-select {
  background: #f8fafc; border: 1.5px solid #e2e8f0;
  border-radius: 9px; padding: 7px 10px;
  font-size: 12.5px; color: #0f172a; font-weight: 500;
  outline: none; cursor: pointer; flex: 1;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sm-select:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px #7c3aed1a; }
.sm-select:hover { border-color: #cbd5e1; }
.sm-status-select.active { border-color: #bbf7d0; background: #f0fdf4; color: #15803d; }

/* Card footer */
.sm-card-footer {
  display: flex; align-items: center; gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f8fafc;
}
.sm-card-action {
  display: inline-flex; align-items: center; gap: 5px;
  background: #f8fafc; border: 1.5px solid #e2e8f0;
  border-radius: 8px; padding: 6px 12px;
  font-size: 12px; font-weight: 600; color: #475569;
  cursor: pointer; transition: all 0.14s;
}
.sm-card-action:hover { background: #f1f5f9; border-color: #cbd5e1; color: #0f172a; }
.sm-btn-save {
  margin-left: auto;
  background: linear-gradient(135deg,#7c3aed,#4f46e5);
  color: #fff; border: none; border-radius: 9px;
  padding: 7px 16px; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all 0.16s;
  display: inline-flex; align-items: center; gap: 5px;
  box-shadow: 0 2px 8px rgba(124,58,237,0.2);
}
.sm-btn-save:hover:not(:disabled) {
  box-shadow: 0 4px 16px rgba(124,58,237,0.36);
  transform: translateY(-1px);
}
.sm-btn-save:disabled { opacity: 0.35; cursor: default; transform: none; box-shadow: none; }
.sm-btn-save.busy { animation: btn-pulse 0.9s ease-in-out infinite; }
@keyframes btn-pulse { 0%,100%{ opacity:1; } 50%{ opacity:0.65; } }

/* ── Table ──────────────────────────────────────────── */
.sm-table-card {
  background: #fff;
  border: 1.5px solid rgba(0,0,0,0.07);
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.sm-table { width: 100%; border-collapse: collapse; }
.sm-table thead tr { background: #f8fafc; border-bottom: 1.5px solid #f1f5f9; }
.sm-table th {
  padding: 13px 16px;
  font-size: 10.5px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 0.07em; text-align: left;
}
.sm-table-row { border-bottom: 1px solid #f8fafc; transition: background 0.12s; }
.sm-table-row:last-child { border-bottom: none; }
.sm-table-row:hover { background: rgba(124,58,237,0.03); }
.sm-table-row td { padding: 13px 16px; vertical-align: middle; }
.sm-table-avatar {
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 800; flex-shrink: 0;
}
.sm-badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 700;
}

/* ── Side panel ─────────────────────────────────────── */
.sm-overlay {
  position: fixed; inset: 0; z-index: 40;
  background: rgba(15,23,42,0.3);
  backdrop-filter: blur(4px);
  animation: fade-in 0.2s ease;
}
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }
.sm-panel {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 420px; max-width: 100%;
  z-index: 50;
  background: #fff;
  border-left: 1.5px solid #e2e8f0;
  display: flex; flex-direction: column;
  box-shadow: -8px 0 32px rgba(0,0,0,0.1);
  animation: panel-in 0.28s cubic-bezier(0.22,1,0.36,1);
}
@keyframes panel-in { from { transform: translateX(40px); opacity:0; } to { transform:none; opacity:1; } }
.sm-panel-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 20px;
  border-bottom: 1.5px solid #f1f5f9;
}
.sm-panel-avatar {
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 17px; font-weight: 900;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.sm-panel-name  { font-size: 16px; font-weight: 800; color: #0f172a; }
.sm-panel-email { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.sm-panel-close {
  background: #f8fafc; border: 1.5px solid #e2e8f0;
  border-radius: 9px; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b; transition: all 0.14s;
}
.sm-panel-close:hover { background: #fee2e2; border-color: #fecdd3; color: #e11d48; }
.sm-panel-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
.sm-panel-section {}
.sm-panel-section-title { font-size: 10.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
.sm-panel-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
.sm-panel-stat {
  background: #f8fafc; border: 1px solid #f1f5f9;
  border-radius: 12px; padding: 12px 6px; text-align: center;
}
.sm-panel-stat-val { font-size: 18px; font-weight: 900; }
.sm-panel-stat-lbl { font-size: 9.5px; color: #94a3b8; margin-top: 3px; text-transform: uppercase; font-weight: 700; }
.sm-shifts { display: flex; flex-direction: column; gap: 7px; }
.sm-shift-chip {
  display: flex; justify-content: space-between; align-items: center;
  background: #f8fafc; border: 1px solid #f1f5f9;
  border-radius: 9px; padding: 8px 14px;
  font-size: 12px; color: #334155;
}
.sm-shift-chip.off { background: #fff1f2; color: #94a3b8; border-color: #fee2e2; }
.sm-perms { display: flex; flex-direction: column; gap: 7px; }
.sm-perm-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12.5px; color: #334155; padding: 8px 12px;
  background: #f8fafc; border-radius: 8px;
}
.sm-perm-tag {
  font-size: 10.5px; font-weight: 700;
  padding: 2px 9px; border-radius: 100px;
}
.sm-perm-tag.yes { background: #f0fdf4; color: #15803d; }
.sm-perm-tag.no  { background: #fff1f2; color: #9f1239; }
.sm-panel-footer {
  padding: 16px 24px; border-top: 1.5px solid #f1f5f9;
  display: flex; gap: 10px;
}

/* ── Empty ─────────────────────────────────────────── */
.sm-empty {
  padding: 80px 32px; text-align: center;
  background: #fff;
  border: 1.5px solid rgba(0,0,0,0.07);
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.sm-empty-icon { font-size: 48px; margin-bottom: 14px; animation: float-icon 3s ease-in-out infinite; }
@keyframes float-icon { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-8px); } }
.sm-empty-title { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
.sm-empty-sub { font-size: 13.5px; color: #64748b; max-width: 380px; margin: 0 auto; line-height: 1.6; }

/* ── Skeleton ───────────────────────────────────────── */
.sk {
  background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0%{ background-position:-200% 0; } 100%{ background-position:200% 0; } }
`;
