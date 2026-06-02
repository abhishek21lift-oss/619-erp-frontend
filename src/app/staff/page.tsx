'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

function StaffRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/settings/staff'); }, [router]);
  return null;
}

/* ─── types ──────────────────────────────────────────────────────── */
interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  created_at?: string;
  avatar?: string;
}

/* ─── helpers ────────────────────────────────────────────────────── */
function initials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  ['#6366f1','#8b5cf6'],
  ['#ec4899','#f43f5e'],
  ['#0ea5e9','#6366f1'],
  ['#10b981','#0ea5e9'],
  ['#f59e0b','#ef4444'],
  ['#8b5cf6','#ec4899'],
];
function avatarGrad(name: string) {
  const i = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  return `linear-gradient(135deg,${AVATAR_GRADIENTS[i][0]},${AVATAR_GRADIENTS[i][1]})`;
}

const ROLE_META: Record<string, { label: string; icon: string; bg: string; color: string; border: string; dot: string }> = {
  admin:        { label:'Admin',        icon:'🛡️', bg:'#fffbeb', color:'#92400e', border:'#fde68a', dot:'#f59e0b' },
  manager:      { label:'Manager',      icon:'📊', bg:'#eff6ff', color:'#1e40af', border:'#bfdbfe', dot:'#3b82f6' },
  trainer:      { label:'Trainer',      icon:'🏋️', bg:'#f0fdf4', color:'#065f46', border:'#bbf7d0', dot:'#22c55e' },
  receptionist: { label:'Receptionist', icon:'🎯', bg:'#faf5ff', color:'#6b21a8', border:'#e9d5ff', dot:'#a855f7' },
  accountant:   { label:'Accountant',   icon:'💰', bg:'#fff1f2', color:'#9f1239', border:'#fecdd3', dot:'#f43f5e' },
};

const AI_BADGES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  top:    { label:'Top Performer', color:'#047857', bg:'#d1fae5', icon:'⭐' },
  risk:   { label:'Burnout Risk',  color:'#9a3412', bg:'#ffedd5', icon:'⚠️' },
  new:    { label:'New Joiner',    color:'#1e40af', bg:'#dbeafe', icon:'✨' },
  rising: { label:'Rising Star',  color:'#6b21a8', bg:'#f3e8ff', icon:'🚀' },
};
function getAiBadge(s: StaffMember): keyof typeof AI_BADGES | null {
  if (!s.created_at) return null;
  const days = (Date.now() - new Date(s.created_at).getTime()) / 86400000;
  if (days < 30) return 'new';
  const h = s.id.charCodeAt(0) % 10;
  if (h < 2) return 'top';
  if (h === 3) return 'risk';
  if (h < 5) return 'rising';
  return null;
}

const ROLES_ALL = ['all', 'admin', 'manager', 'trainer', 'receptionist', 'accountant'];

/* ─── page root ──────────────────────────────────────────────────── */
export default function StaffListPage() {
  return (
    <Guard>
      <StaffRedirect />
    </Guard>
  );
}

/* ─── main inner ─────────────────────────────────────────────────── */
function Inner() {
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [view, setView]           = useState<'grid'|'list'>('grid');
  const [panel, setPanel]         = useState<StaffMember | null>(null);
  const [showAdv, setShowAdv]     = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.staff.list()
      .then(data => alive && setStaff(Array.isArray(data) ? data : []))
      .catch(e  => alive && setError(e.message || 'Failed to load staff'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  /* keyboard shortcut: / → focus search */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const filtered = useMemo(() => {
    let rows = staff;
    if (roleFilter !== 'all') rows = rows.filter(s => s.role === roleFilter);
    if (statusFilter !== 'all') rows = rows.filter(s => (s.status || 'active') === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
      );
    }
    return rows;
  }, [staff, search, roleFilter, statusFilter]);

  const totalActive = staff.filter(s => (s.status || 'active') === 'active').length;
  const trainers    = staff.filter(s => s.role === 'trainer').length;
  const admins      = staff.filter(s => s.role === 'admin' || s.role === 'manager').length;

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* ─ PANEL OVERLAY ─ */}
      {panel && (
        <div className="sl-overlay" onClick={() => setPanel(null)}>
          <div className="sl-panel" onClick={e => e.stopPropagation()}>
            <div className="sl-panel-header">
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div className="sl-panel-avatar" style={{ background: avatarGrad(panel.name) }}>
                  {initials(panel.name)}
                </div>
                <div>
                  <div className="sl-panel-name">{panel.name}</div>
                  <div className="sl-panel-sub">{panel.email}</div>
                </div>
              </div>
              <button className="sl-panel-close" onClick={() => setPanel(null)}>✕</button>
            </div>
            <div className="sl-panel-body">
              {[
                ['Employee ID', `#EMP-${panel.id.slice(-6).toUpperCase()}`],
                ['Role', (ROLE_META[panel.role]?.label || panel.role)],
                ['Phone', panel.phone || '—'],
                ['Status', panel.status === 'inactive' ? 'Inactive' : 'Active'],
                ['Joined', panel.created_at ? new Date(panel.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'],
              ].map(([k,v]) => (
                <div className="sl-panel-row" key={k}>
                  <span className="sl-panel-key">{k}</span>
                  <span className="sl-panel-val">{v}</span>
                </div>
              ))}
              <div className="sl-panel-section">Quick Actions</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {['Edit Profile','View Schedule','Payroll','Permissions'].map(a => (
                  <button key={a} className="sl-panel-action">{a}</button>
                ))}
              </div>
              <div className="sl-panel-section">Performance Snapshot</div>
              {[
                ['Attendance','94%','#22c55e'],
                ['Tasks Done','87%','#6366f1'],
                ['Lead Rate','72%','#f59e0b'],
              ].map(([label,val,color]) => (
                <div key={label} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ color:'#64748b' }}>{label}</span>
                    <span style={{ fontWeight:700 }}>{val}</span>
                  </div>
                  <div style={{ height:5, borderRadius:99, background:'#f1f5f9' }}>
                    <div style={{ height:5, borderRadius:99, background:color, width:val, transition:'width .6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="sl-page">

        {/* ─ HERO ─ */}
        <div className="sl-hero">
          <div className="sl-hero-bg" />
          <div className="sl-hero-content">
            <div className="sl-hero-left">
              <div className="sl-hero-eyebrow">
                <span className="sl-live-dot" />
                619 Fitness Studio · Team Management
              </div>
              <h1 className="sl-hero-title">Team Management</h1>
              <p className="sl-hero-sub">Manage staff access, roles, schedules, payroll, and performance from one intelligent workspace.</p>
              <div className="sl-hero-actions">
                <a href="/staff/new" className="sl-btn-primary">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Add Staff
                </a>
                <button className="sl-btn-ghost">Import Team</button>
                <button className="sl-btn-ghost">Export</button>
              </div>
            </div>
            <div className="sl-hero-stats">
              {[
                { label:'Total Staff',   val: staff.length,   icon:'👥', color:'#6366f1' },
                { label:'Active Today',  val: totalActive,    icon:'🟢', color:'#22c55e' },
                { label:'Trainers',      val: trainers,       icon:'🏋️', color:'#f59e0b' },
                { label:'Management',    val: admins,         icon:'🛡️', color:'#a855f7' },
              ].map(s => (
                <div key={s.label} className="sl-stat-card">
                  <div className="sl-stat-icon" style={{ background:`${s.color}18` }}>{s.icon}</div>
                  <div className="sl-stat-val" style={{ color: s.color }}>{loading ? '—' : s.val}</div>
                  <div className="sl-stat-lbl">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─ TOOLBAR ─ */}
        <div className="sl-toolbar">
          <div className="sl-search-wrap">
            <svg className="sl-search-icon" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              ref={searchRef}
              className="sl-search"
              placeholder="Search name, email, phone… ( / )"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="sl-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <div className="sl-toolbar-right">
            <div className="sl-view-toggle">
              <button className={`sl-view-btn${view==='grid'?' active':''}`} onClick={() => setView('grid')} title="Grid view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
              </button>
              <button className={`sl-view-btn${view==='list'?' active':''}`} onClick={() => setView('list')} title="List view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
              </button>
            </div>
            <button className="sl-btn-ghost sl-adv-toggle" onClick={() => setShowAdv(v => !v)}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
              Filters {showAdv ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* ─ ADV FILTERS ─ */}
        {showAdv && (
          <div className="sl-adv-filters">
            <div>
              <label className="sl-filter-label">Status</label>
              <select className="sl-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="sl-filter-label">Sort by</label>
              <select className="sl-filter-select">
                <option>Name A–Z</option>
                <option>Newest First</option>
                <option>Role</option>
              </select>
            </div>
            <div>
              <label className="sl-filter-label">Joined</label>
              <select className="sl-filter-select">
                <option>All time</option>
                <option>This month</option>
                <option>This year</option>
              </select>
            </div>
          </div>
        )}

        {/* ─ ROLE FILTER PILLS ─ */}
        <div className="sl-role-filters">
          {ROLES_ALL.map(r => {
            const count = r === 'all' ? staff.length : staff.filter(s => s.role === r).length;
            const meta  = ROLE_META[r];
            return (
              <button
                key={r}
                className={`sl-role-pill${roleFilter===r?' active':''}`}
                style={roleFilter===r && meta ? { background: meta.bg, color: meta.color, borderColor: meta.border } : {}}
                onClick={() => setRoleFilter(r)}
              >
                {meta ? <span>{meta.icon}</span> : null}
                <span style={{ textTransform:'capitalize' }}>{r === 'all' ? 'All Staff' : meta?.label || r}</span>
                <span className="sl-pill-count">{count}</span>
              </button>
            );
          })}
        </div>

        {error && <div className="sl-alert-error">{error}</div>}

        {/* ─ RESULTS META ─ */}
        {!loading && staff.length > 0 && (
          <div className="sl-results-meta">
            Showing {filtered.length} of {staff.length} staff members
            {search && <span className="sl-results-query"> for "{search}"</span>}
          </div>
        )}

        {/* ─ CONTENT ─ */}
        {loading ? (
          <div className={view === 'grid' ? 'sl-grid' : 'sl-list'}>
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} list={view==='list'} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} />
        ) : view === 'grid' ? (
          <div className="sl-grid">
            {filtered.map(s => (
              <StaffCard key={s.id} staff={s} onOpen={() => setPanel(s)} />
            ))}
          </div>
        ) : (
          <div className="sl-list-wrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th>Staff Member</th><th>Role</th><th>Phone</th><th>Email</th>
                  <th style={{textAlign:'center'}}>Status</th><th style={{textAlign:'center'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <StaffRow key={s.id} staff={s} onOpen={() => setPanel(s)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </AppShell>
  );
}

/* ─── StaffCard (grid) ───────────────────────────────────────────── */
function StaffCard({ staff: s, onOpen }: { staff: StaffMember; onOpen: () => void }) {
  const meta  = ROLE_META[s.role] || { label: s.role, icon:'👤', bg:'#f8fafc', color:'#475569', border:'#e2e8f0', dot:'#94a3b8' };
  const badge = getAiBadge(s);
  const ai    = badge ? AI_BADGES[badge] : null;
  const isActive = (s.status || 'active') === 'active';

  return (
    <div className="sl-card" onClick={onOpen}>
      <div className="sl-card-top">
        {ai && (
          <span className="sl-ai-badge" style={{ background: ai.bg, color: ai.color }}>
            {ai.icon} {ai.label}
          </span>
        )}
        <div className="sl-card-avatar-wrap">
          <div className="sl-card-avatar" style={{ background: avatarGrad(s.name) }}>
            {initials(s.name)}
          </div>
          <span className={`sl-status-dot ${isActive ? 'active' : 'inactive'}`} />
        </div>
        <div className="sl-card-name">{s.name}</div>
        <div className="sl-card-id">#{`EMP-${s.id.slice(-6).toUpperCase()}`}</div>
        <span className="sl-card-role-badge" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
          <span className="sl-badge-dot" style={{ background: meta.dot }} />
          {meta.icon} {meta.label}
        </span>
      </div>
      <div className="sl-card-info">
        {s.email && (
          <div className="sl-card-info-row">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>{s.email}</span>
          </div>
        )}
        {s.phone && (
          <div className="sl-card-info-row">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.16 2.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L6.91 7.1a16 16 0 006 6l.46-.46a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>
            <span>{s.phone}</span>
          </div>
        )}
        {s.created_at && (
          <div className="sl-card-info-row">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Joined {new Date(s.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
          </div>
        )}
      </div>
      <div className="sl-card-footer">
        <div className="sl-mini-stat"><div className="sl-mini-val">94%</div><div className="sl-mini-lbl">Attendance</div></div>
        <div className="sl-mini-stat"><div className="sl-mini-val">12</div><div className="sl-mini-lbl">Clients</div></div>
        <div className="sl-mini-stat"><div className="sl-mini-val">8</div><div className="sl-mini-lbl">Leads</div></div>
      </div>
      <div className="sl-card-hover-bar">View Profile →</div>
    </div>
  );
}

/* ─── StaffRow (list) ────────────────────────────────────────────── */
function StaffRow({ staff: s, onOpen }: { staff: StaffMember; onOpen: () => void }) {
  const meta = ROLE_META[s.role] || { label: s.role, icon:'👤', bg:'#f8fafc', color:'#475569', border:'#e2e8f0', dot:'#94a3b8' };
  const isActive = (s.status || 'active') === 'active';
  return (
    <tr className="sl-row" onClick={onOpen}>
      <td>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background: avatarGrad(s.name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>
            {initials(s.name)}
          </div>
          <div>
            <div style={{ fontWeight:650, fontSize:13.5, color:'#0f172a' }}>{s.name}</div>
            {s.created_at && <div style={{ fontSize:11, color:'#94a3b8' }}>Joined {new Date(s.created_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</div>}
          </div>
        </div>
      </td>
      <td>
        <span style={{ background:meta.bg, color:meta.color, border:`1px solid ${meta.border}`, padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:4 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:meta.dot, display:'inline-block' }} />
          {meta.icon} {meta.label}
        </span>
      </td>
      <td style={{ fontSize:13, color:'#475569' }}>{s.phone || <span style={{ color:'#cbd5e1' }}>—</span>}</td>
      <td style={{ fontSize:13, color:'#475569' }}>{s.email}</td>
      <td style={{ textAlign:'center' }}>
        <span style={{ background: isActive ? '#f0fdf4' : '#f8fafc', color: isActive ? '#15803d' : '#64748b', border: `1px solid ${isActive ? '#bbf7d0' : '#e2e8f0'}`, padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:5 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background: isActive ? '#22c55e' : '#94a3b8', display:'inline-block' }} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style={{ textAlign:'center' }}>
        <button className="sl-row-action" onClick={e => { e.stopPropagation(); onOpen(); }}>View</button>
      </td>
    </tr>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
function SkeletonCard({ list }: { list: boolean }) {
  if (list) return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom:'1px solid #f8fafc' }}>
      <div className="sk" style={{ width:36, height:36, borderRadius:'50%', flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div className="sk" style={{ height:13, width:'35%', marginBottom:7 }} />
        <div className="sk" style={{ height:10, width:'22%' }} />
      </div>
      <div className="sk" style={{ height:22, width:80, borderRadius:100 }} />
      <div className="sk" style={{ height:13, width:'20%' }} />
      <div className="sk" style={{ height:22, width:60, borderRadius:100 }} />
    </div>
  );
  return (
    <div className="sl-card" style={{ pointerEvents:'none' }}>
      <div className="sl-card-top" style={{ alignItems:'center', paddingBottom:12 }}>
        <div className="sk" style={{ width:60, height:60, borderRadius:'50%', marginBottom:12 }} />
        <div className="sk" style={{ height:15, width:'60%', marginBottom:7 }} />
        <div className="sk" style={{ height:11, width:'40%', marginBottom:10 }} />
        <div className="sk" style={{ height:22, width:'55%', borderRadius:100 }} />
      </div>
      <div className="sl-card-info">
        <div className="sk" style={{ height:11, width:'90%', marginBottom:7 }} />
        <div className="sk" style={{ height:11, width:'70%' }} />
      </div>
      <div className="sl-card-footer">
        {[1,2,3].map(i => (
          <div key={i} className="sl-mini-stat">
            <div className="sk" style={{ height:16, width:30, marginBottom:4 }} />
            <div className="sk" style={{ height:9, width:44 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────────── */
function EmptyState({ search }: { search: string }) {
  return (
    <div className="sl-empty">
      <div className="sl-empty-art">
        <div className="sl-empty-circle c1" />
        <div className="sl-empty-circle c2" />
        <div className="sl-empty-icon">👥</div>
      </div>
      <div className="sl-empty-title">{search ? 'No results found' : 'No staff members yet'}</div>
      <div className="sl-empty-sub">
        {search
          ? <>Nothing matched <strong>"{search}"</strong>. Try a different name, email, or phone.</>
          : 'Start building your dream team by adding trainers, managers, and support staff.'}
      </div>
      {!search && (
        <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:24, flexWrap:'wrap' }}>
          <a href="/staff/new" className="sl-btn-primary">+ Add Staff</a>
          <button className="sl-btn-ghost">Import Team</button>
        </div>
      )}
    </div>
  );
}

/* ─── CSS ────────────────────────────────────────────────────────── */
const CSS = `
/* PAGE */
.sl-page { padding: 0 0 80px; max-width: 1200px; margin: 0 auto; }
@media (max-width:700px){ .sl-page { padding-bottom:60px; } }

/* HERO */
.sl-hero {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%);
  border-radius: 0 0 24px 24px;
  margin-bottom: 28px;
  padding: 36px 32px 32px;
}
@media (max-width:700px){ .sl-hero { padding:24px 20px; border-radius:0; } }
.sl-hero-bg {
  position:absolute; inset:0; pointer-events:none;
  background: radial-gradient(ellipse 60% 80% at 80% 50%,rgba(139,92,246,.25),transparent),
              radial-gradient(ellipse 40% 60% at 10% 80%,rgba(99,102,241,.2),transparent);
}
.sl-hero-content { position:relative; display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap; }
.sl-hero-left { flex:1; min-width:260px; }
.sl-hero-eyebrow {
  display:inline-flex; align-items:center; gap:7px;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12);
  color:rgba(255,255,255,.7); border-radius:100px;
  padding:5px 14px; font-size:11px; font-weight:600; letter-spacing:.05em;
  margin-bottom:14px;
}
.sl-live-dot {
  width:7px; height:7px; border-radius:50%; background:#22c55e;
  box-shadow:0 0 6px #22c55e; animation:slpulse 1.8s ease-in-out infinite;
}
@keyframes slpulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
.sl-hero-title { font-size:32px; font-weight:900; color:#fff; letter-spacing:-.04em; line-height:1.1; margin-bottom:10px; }
@media (max-width:700px){ .sl-hero-title { font-size:22px; } }
.sl-hero-sub { font-size:14px; color:rgba(255,255,255,.55); max-width:480px; line-height:1.6; margin-bottom:20px; }
.sl-hero-actions { display:flex; gap:10px; flex-wrap:wrap; }
.sl-btn-primary {
  display:inline-flex; align-items:center; gap:6px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff; border:none; border-radius:10px;
  padding:9px 18px; font-size:13px; font-weight:700;
  cursor:pointer; text-decoration:none;
  box-shadow:0 4px 14px rgba(99,102,241,.4);
  transition:all .18s cubic-bezier(.16,1,.3,1);
}
.sl-btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,.5); }
.sl-btn-ghost {
  display:inline-flex; align-items:center; gap:6px;
  background:rgba(255,255,255,.08); color:rgba(255,255,255,.8);
  border:1px solid rgba(255,255,255,.14); border-radius:10px;
  padding:9px 16px; font-size:13px; font-weight:600;
  cursor:pointer; font-family:inherit;
  transition:all .18s;
}
.sl-btn-ghost:hover { background:rgba(255,255,255,.14); }

/* HERO STATS */
.sl-hero-stats { display:flex; gap:12px; flex-wrap:wrap; }
.sl-stat-card {
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.1);
  backdrop-filter:blur(10px);
  border-radius:14px; padding:16px 20px;
  min-width:110px; text-align:center;
  transition:transform .2s;
}
.sl-stat-card:hover { transform:translateY(-2px); background:rgba(255,255,255,.1); }
.sl-stat-icon { font-size:20px; margin-bottom:8px; width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin:0 auto 8px; }
.sl-stat-val { font-size:26px; font-weight:900; letter-spacing:-.04em; }
.sl-stat-lbl { font-size:11px; color:rgba(255,255,255,.5); margin-top:3px; font-weight:500; }

/* TOOLBAR */
.sl-toolbar {
  display:flex; align-items:center; gap:12px;
  padding:0 32px; margin-bottom:14px; flex-wrap:wrap;
}
@media (max-width:700px){ .sl-toolbar { padding:0 16px; } }
.sl-search-wrap { position:relative; flex:1; min-width:220px; }
.sl-search-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; }
.sl-search {
  width:100%; background:#fff; border:1.5px solid #e2e8f0;
  border-radius:12px; padding:10px 14px 10px 38px;
  font-size:13.5px; color:#0f172a; outline:none;
  transition:border-color .15s, box-shadow .15s; font-family:inherit;
  box-shadow:0 1px 4px rgba(0,0,0,.04);
}
.sl-search:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.sl-search-clear {
  position:absolute; right:12px; top:50%; transform:translateY(-50%);
  background:none; border:none; cursor:pointer; color:#94a3b8; font-size:13px;
}
.sl-toolbar-right { display:flex; align-items:center; gap:8px; }
.sl-view-toggle { display:flex; background:#f1f5f9; border-radius:8px; padding:3px; gap:2px; }
.sl-view-btn {
  padding:5px 8px; border-radius:6px; border:none;
  background:transparent; color:#64748b; cursor:pointer;
  transition:all .15s; display:flex; align-items:center;
}
.sl-view-btn.active { background:#fff; color:#6366f1; box-shadow:0 1px 4px rgba(0,0,0,.08); }
.sl-adv-toggle { font-size:12px !important; color:#64748b !important; border-color:#e2e8f0 !important; background:transparent !important; }
.sl-adv-toggle:hover { color:#0f172a !important; }

/* ADV FILTERS */
.sl-adv-filters {
  display:flex; gap:12px; flex-wrap:wrap;
  padding:14px 32px; background:#f8fafc;
  border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;
  margin-bottom:14px;
}
@media (max-width:700px){ .sl-adv-filters { padding:12px 16px; } }
.sl-filter-label { display:block; font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; margin-bottom:5px; }
.sl-filter-select {
  background:#fff; border:1.5px solid #e2e8f0; border-radius:8px;
  padding:6px 10px; font-size:12.5px; color:#0f172a; outline:none;
  font-family:inherit; cursor:pointer;
}
.sl-filter-select:focus { border-color:#6366f1; }

/* ROLE PILLS */
.sl-role-filters { display:flex; gap:8px; flex-wrap:wrap; padding:0 32px; margin-bottom:20px; }
@media (max-width:700px){ .sl-role-filters { padding:0 16px; gap:6px; } }
.sl-role-pill {
  display:inline-flex; align-items:center; gap:5px;
  background:#fff; border:1.5px solid #e2e8f0; border-radius:100px;
  padding:6px 14px; font-size:12px; font-weight:600; color:#64748b;
  cursor:pointer; font-family:inherit;
  transition:all .18s cubic-bezier(.16,1,.3,1);
  box-shadow:0 1px 3px rgba(0,0,0,.04);
}
.sl-role-pill:hover { border-color:#c7d2fe; color:#4338ca; transform:translateY(-1px); box-shadow:0 3px 8px rgba(99,102,241,.12); }
.sl-role-pill.active { border-width:1.5px; box-shadow:0 2px 8px rgba(0,0,0,.08); }
.sl-pill-count { background:rgba(0,0,0,.06); border-radius:100px; padding:1px 7px; font-size:10px; font-weight:700; }

/* RESULTS META */
.sl-results-meta { padding:0 32px; margin-bottom:14px; font-size:12px; color:#94a3b8; }
.sl-results-query { color:#6366f1; font-weight:600; }

/* ALERT */
.sl-alert-error { margin:0 32px 14px; padding:12px 16px; background:#fff1f2; color:#9f1239; border:1px solid #fecdd3; border-radius:10px; font-size:13px; }

/* GRID */
.sl-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
  gap:16px; padding:0 32px;
}
@media (max-width:700px){ .sl-grid { grid-template-columns:1fr; padding:0 16px; gap:12px; } }

/* LIST */
.sl-list-wrap { padding:0 32px; }
@media (max-width:700px){ .sl-list-wrap { padding:0 16px; } }
.sl-table { width:100%; border-collapse:collapse; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.04); border:1px solid #f1f5f9; }
.sl-table thead tr { background:#f8fafc; border-bottom:1.5px solid #f1f5f9; }
.sl-table th { padding:13px 18px; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; text-align:left; }
.sl-table tbody tr { border-bottom:1px solid #f8fafc; }
.sl-table tbody tr:last-child { border-bottom:none; }
.sl-row { cursor:pointer; transition:background .12s; }
.sl-row:hover { background:#fafafa; }
.sl-table td { padding:14px 18px; vertical-align:middle; }
.sl-row-action {
  background:#f1f5f9; border:none; border-radius:7px;
  padding:5px 12px; font-size:12px; font-weight:600; color:#6366f1;
  cursor:pointer; font-family:inherit; transition:all .15s;
}
.sl-row-action:hover { background:#e0e7ff; }

/* STAFF CARD */
.sl-card {
  background:#fff; border:1.5px solid #f1f5f9; border-radius:16px;
  overflow:hidden; cursor:pointer;
  transition:all .22s cubic-bezier(.16,1,.3,1);
  box-shadow:0 2px 8px rgba(0,0,0,.04);
  position:relative;
}
.sl-card:hover {
  transform:translateY(-3px);
  box-shadow:0 12px 32px rgba(99,102,241,.12);
  border-color:#c7d2fe;
}
.sl-card-top {
  background:linear-gradient(180deg,#f8faff 0%,#fff 100%);
  padding:20px 16px 14px; text-align:center;
  border-bottom:1px solid #f8fafc;
}
.sl-ai-badge {
  display:inline-flex; align-items:center; gap:4px;
  font-size:10px; font-weight:700; border-radius:100px;
  padding:3px 9px; margin-bottom:10px;
}
.sl-card-avatar-wrap { position:relative; display:inline-block; margin-bottom:10px; }
.sl-card-avatar {
  width:60px; height:60px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  color:#fff; font-size:20px; font-weight:800;
  box-shadow:0 4px 12px rgba(0,0,0,.15);
}
.sl-status-dot {
  position:absolute; bottom:2px; right:2px;
  width:12px; height:12px; border-radius:50%; border:2px solid #fff;
}
.sl-status-dot.active { background:#22c55e; box-shadow:0 0 6px rgba(34,197,94,.5); }
.sl-status-dot.inactive { background:#94a3b8; }
.sl-card-name { font-size:15px; font-weight:750; color:#0f172a; margin-bottom:3px; }
.sl-card-id { font-size:10.5px; color:#94a3b8; margin-bottom:9px; font-family:monospace; }
.sl-card-role-badge {
  display:inline-flex; align-items:center; gap:5px;
  padding:4px 12px; border-radius:100px; border:1px solid;
  font-size:11.5px; font-weight:700;
}
.sl-badge-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
.sl-card-info { padding:12px 16px; }
.sl-card-info-row {
  display:flex; align-items:center; gap:7px;
  font-size:11.5px; color:#64748b; margin-bottom:6px;
}
.sl-card-info-row:last-child { margin-bottom:0; }
.sl-card-info-row svg { flex-shrink:0; color:#94a3b8; }
.sl-card-footer {
  display:flex; border-top:1px solid #f8fafc;
  padding:10px 0;
}
.sl-mini-stat { flex:1; text-align:center; }
.sl-mini-stat + .sl-mini-stat { border-left:1px solid #f1f5f9; }
.sl-mini-val { font-size:14px; font-weight:800; color:#0f172a; }
.sl-mini-lbl { font-size:9.5px; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; margin-top:1px; }
.sl-card-hover-bar {
  position:absolute; bottom:0; left:0; right:0;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff; text-align:center; padding:8px;
  font-size:12px; font-weight:700;
  transform:translateY(100%); transition:transform .2s cubic-bezier(.16,1,.3,1);
}
.sl-card:hover .sl-card-hover-bar { transform:translateY(0); }

/* SKELETON */
.sk {
  background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size:200% 100%;
  animation:shimmer 1.4s ease-in-out infinite;
  border-radius:6px;
}
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

/* EMPTY */
.sl-empty {
  text-align:center; padding:80px 32px;
  max-width:440px; margin:0 auto;
}
.sl-empty-art { position:relative; margin-bottom:24px; height:90px; display:flex; align-items:center; justify-content:center; }
.sl-empty-circle {
  position:absolute; border-radius:50%;
  animation:slfloa 3s ease-in-out infinite;
}
.sl-empty-circle.c1 { width:100px; height:100px; background:rgba(99,102,241,.08); }
.sl-empty-circle.c2 { width:70px; height:70px; background:rgba(139,92,246,.1); animation-delay:.5s; }
.sl-empty-icon { font-size:36px; position:relative; z-index:1; }
@keyframes slfloa { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
.sl-empty-title { font-size:18px; font-weight:800; color:#0f172a; margin-bottom:8px; }
.sl-empty-sub { font-size:13.5px; color:#64748b; line-height:1.6; }

/* SLIDE-OVER PANEL */
.sl-overlay {
  position:fixed; inset:0; background:rgba(15,23,42,.4); backdrop-filter:blur(4px);
  z-index:1000; display:flex; justify-content:flex-end;
  animation:sl-fade-in .2s ease;
}
@keyframes sl-fade-in { from{opacity:0} to{opacity:1} }
.sl-panel {
  width:360px; max-width:100vw; background:#fff;
  box-shadow:-12px 0 40px rgba(0,0,0,.12);
  overflow-y:auto; display:flex; flex-direction:column;
  animation:sl-slide-in .25s cubic-bezier(.16,1,.3,1);
}
@keyframes sl-slide-in { from{transform:translateX(100%)} to{transform:translateX(0)} }
.sl-panel-header {
  background:linear-gradient(135deg,#0f172a,#1e1b4b);
  padding:24px; display:flex; align-items:center; justify-content:space-between;
}
.sl-panel-avatar {
  width:48px; height:48px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  color:#fff; font-size:17px; font-weight:800;
  box-shadow:0 4px 12px rgba(0,0,0,.2);
}
.sl-panel-name { font-size:16px; font-weight:800; color:#fff; }
.sl-panel-sub { font-size:12px; color:rgba(255,255,255,.5); margin-top:2px; }
.sl-panel-close {
  background:rgba(255,255,255,.1); border:none; color:rgba(255,255,255,.7);
  width:30px; height:30px; border-radius:8px; cursor:pointer; font-size:13px;
  transition:background .15s;
}
.sl-panel-close:hover { background:rgba(255,255,255,.2); color:#fff; }
.sl-panel-body { padding:20px; flex:1; }
.sl-panel-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f8fafc; }
.sl-panel-row:last-of-type { border-bottom:none; }
.sl-panel-key { font-size:12px; color:#94a3b8; font-weight:500; }
.sl-panel-val { font-size:13px; font-weight:650; color:#0f172a; }
.sl-panel-section { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.07em; margin:18px 0 10px; }
.sl-panel-action {
  background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;
  padding:9px; font-size:12px; font-weight:600; color:#374151;
  cursor:pointer; font-family:inherit; text-align:center;
  transition:all .15s;
}
.sl-panel-action:hover { background:#f0f9ff; border-color:#bae6fd; color:#0369a1; }
`;
