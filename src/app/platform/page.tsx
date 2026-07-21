'use client';

// Platform Super Admin portal (multi-tenant SaaS). Hidden, role='super_admin'
// only — tenant admins cannot reach it (enforced server-side by
// requireSuperAdmin, and client-side by Guard role="super_admin"). Manages
// tenants (organizations) and their login accounts.

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Building2, Plus, Loader2, ShieldAlert, Users, Dumbbell, UserCircle,
  KeyRound, Power, X, Copy, RefreshCw, ChevronDown, ImagePlus,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import StudioMark from '@/components/StudioMark';
import { Button, Badge, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type { Organization, OrganizationDetail, OrgUser } from '@/lib/api';
import { useToast } from '@/lib/toast';

function genPassword(len = 14): string {
  const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  let s = '';
  for (let i = 0; i < len; i++) s += cs[a[i] % cs.length];
  return s;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function PlatformAdminPage() {
  return (
    <Guard role="super_admin">
      <AppShell title="Platform Admin">
        <PlatformContent />
      </AppShell>
    </Guard>
  );
}

function PlatformContent() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<OrgUser | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.superAdmin.listOrgs()
      .then((r) => setOrgs(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load organizations'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    total: orgs.length,
    active: orgs.filter((o) => o.status === 'active').length,
    suspended: orgs.filter((o) => o.status === 'suspended').length,
    clients: orgs.reduce((s, o) => s + (Number(o.client_count) || 0), 0),
  }), [orgs]);

  const toggleStatus = async (o: Organization) => {
    const next = o.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended' && !window.confirm(`Suspend "${o.name}"? All its logins will be signed out and blocked.`)) return;
    try {
      await api.superAdmin.updateOrg(o.id, { status: next });
      toast.success(next === 'suspended' ? 'Organization suspended.' : 'Organization reactivated.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px]"
            style={{ background: 'linear-gradient(135deg,#0f172a,#334155)' }}>
            <Building2 size={20} color="#fff" />
          </div>
          <div>
            <h1 className="text-[20px] font-[840] tracking-tight" style={{ color: 'var(--text-primary)' }}>Platform Admin</h1>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Manage tenant workspaces &amp; login accounts</p>
          </div>
        </div>
        <Button iconLeft={<Plus size={14} />} onClick={() => setCreateOpen(true)}
          style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>
          New Organization
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Organizations', value: stats.total, color: '#6366f1' },
          { label: 'Active', value: stats.active, color: '#10b981' },
          { label: 'Suspended', value: stats.suspended, color: '#ef4444' },
          { label: 'Total Clients', value: stats.clients, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="rounded-[16px] p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="mt-1 text-[24px] font-[840] tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></div>
      )}
      {error && !loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ShieldAlert size={28} style={{ color: '#ef4444' }} />
          <p className="text-[14px] font-[600] text-slate-600">{error}</p>
          <Button variant="outline" iconLeft={<RefreshCw size={14} />} onClick={load}>Retry</Button>
        </div>
      )}
      {!loading && !error && orgs.length === 0 && (
        <EmptyState icon={<Building2 size={20} />} title="No organizations yet"
          description="Create the first tenant workspace to onboard a trainer." />
      )}

      {!loading && !error && orgs.length > 0 && (
        <div className="space-y-3">
          {orgs.map((o) => (
            <OrgCard key={o.id} org={o} onToggleStatus={() => toggleStatus(o)} onResetPassword={setResetTarget} onChanged={load} />
          ))}
        </div>
      )}

      {createOpen && <CreateOrgModal onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
    </div>
  );
}

// ── Organization card (expandable to manage its users) ──────────────────────────
function OrgCard({ org, onToggleStatus, onResetPassword, onChanged }: {
  org: Organization;
  onToggleStatus: () => void;
  onResetPassword: (u: OrgUser) => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const loadDetail = useCallback(() => {
    setLoadingDetail(true);
    api.superAdmin.getOrg(org.id)
      .then((r) => setDetail(r.data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [org.id]);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) loadDetail();
  };

  const toggleUser = async (u: OrgUser) => {
    try {
      await api.superAdmin.setUserActive(u.id, !u.is_active);
      toast.success(u.is_active ? 'Account deactivated.' : 'Account activated.');
      loadDetail();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const suspended = org.status === 'suspended';

  return (
    <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-shrink-0">
          <StudioMark name={org.name} logoUrl={org.logo_url} size={40} />
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onLogoPick} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Upload / change logo"
            className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full transition hover:opacity-80"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            {uploading ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
            <Badge tone={suspended ? 'danger' : 'success'}>{org.status}</Badge>
          </div>
          <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>/{org.slug} · created {fmtDate(org.created_at)}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><UserCircle size={13} /> {org.user_count ?? 0}</span>
          <span className="flex items-center gap-1"><Dumbbell size={13} /> {org.trainer_count ?? 0}</span>
          <span className="flex items-center gap-1"><Users size={13} /> {org.client_count ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleStatus} title={suspended ? 'Reactivate' : 'Suspend'}
            className="flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition hover:opacity-80"
            style={{
              background: suspended ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.08)',
              color: suspended ? '#059669' : '#dc2626',
              border: `1px solid ${suspended ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.20)'}`,
            }}>
            <Power size={13} /> {suspended ? 'Reactivate' : 'Suspend'}
          </button>
          <button onClick={toggleExpand} title="Manage accounts"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-black/5"
            style={{ border: '1px solid var(--border)' }}>
            <ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          {loadingDetail && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#6366f1' }} /></div>}
          {detail && detail.users.length === 0 && <p className="py-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>No login accounts.</p>}
          {detail && detail.users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  {u.name} <span className="font-[500]" style={{ color: 'var(--text-muted)' }}>· {u.role}</span>
                </p>
                <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
              </div>
              {!u.is_active && <Badge tone="danger">disabled</Badge>}
              <button onClick={() => onResetPassword(u)}
                className="flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[650] transition hover:bg-black/5"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <KeyRound size={12} /> Reset password
              </button>
              <button onClick={() => toggleUser(u)}
                className="flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[650] transition hover:opacity-80"
                style={{
                  border: `1px solid ${u.is_active ? 'rgba(239,68,68,0.20)' : 'rgba(16,185,129,0.25)'}`,
                  color: u.is_active ? '#dc2626' : '#059669',
                }}>
                <Power size={12} /> {u.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal shell ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-[20px] p-6" onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(15,23,42,0.30)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-[800]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-[11px] px-3 py-2.5 text-[13.5px] outline-none';
const inputStyle: React.CSSProperties = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

// ── Create Organization modal ───────────────────────────────────────────────────
function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', trainer_name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Name, a valid email, and an 8+ character password are required.');
      return;
    }
    setSaving(true);
    try {
      await api.superAdmin.createOrg({
        name: form.name.trim(),
        trainer_name: form.trainer_name.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
      });
      toast.success('Organization created.');
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
      setSaving(false);
    }
  };

  return (
    <Modal title="New Organization" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Organization name">
          <input className={inputCls} style={inputStyle} value={form.name} placeholder="e.g. Riya's Fitness Studio"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Owner / trainer name">
          <input className={inputCls} style={inputStyle} value={form.trainer_name} placeholder="Defaults to org name"
            onChange={(e) => setForm((f) => ({ ...f, trainer_name: e.target.value }))} />
        </Field>
        <Field label="Login email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} placeholder="trainer@example.com"
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Temporary password">
          <div className="flex gap-2">
            <input className={inputCls} style={inputStyle} value={form.password} placeholder="Min 8 characters"
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <button onClick={() => setForm((f) => ({ ...f, password: genPassword() }))} title="Generate"
              className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <RefreshCw size={15} />
            </button>
            <button onClick={() => { if (form.password) { navigator.clipboard?.writeText(form.password); toast.success('Copied'); } }} title="Copy"
              className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <Copy size={15} />
            </button>
          </div>
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Share this with the trainer; they change it after first login.</p>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit}
            style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Reset Password modal ─────────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: OrgUser; onClose: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await api.superAdmin.resetPassword(user.id, password);
      toast.success('Password reset. Existing sessions revoked.');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reset failed');
      setSaving(false);
    }
  };

  return (
    <Modal title="Reset Password" onClose={onClose}>
      <p className="mb-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        New password for <strong>{user.name}</strong> ({user.email}). This signs them out everywhere.
      </p>
      <Field label="New password">
        <div className="flex gap-2">
          <input className={inputCls} style={inputStyle} value={password} placeholder="Min 8 characters"
            onChange={(e) => setPassword(e.target.value)} />
          <button onClick={() => setPassword(genPassword())} title="Generate"
            className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={() => { if (password) { navigator.clipboard?.writeText(password); toast.success('Copied'); } }} title="Copy"
            className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <Copy size={15} />
          </button>
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} disabled={saving} onClick={submit}
          style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Reset</Button>
      </div>
    </Modal>
  );
}
