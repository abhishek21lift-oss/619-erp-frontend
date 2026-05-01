'use client';
import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function TrainersPage() {
  return <Guard role="admin"><TrainersContent /></Guard>;
}

const EMPTY = {
  name: '', mobile: '', email: '', role: 'Personal Trainer',
  joining_date: '', salary: '', incentive_rate: '50',
  specialization: '', certifications: '',
  status: 'active', notes: '',
};

function TrainersContent() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [modal,    setModal]    = useState<any | 'new' | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [form,     setForm]     = useState<any>(EMPTY);

  const load = () => {
    setLoading(true);
    api.trainers.list()
      .then(setTrainers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  function flash(msg: string, isError = false) {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  }

  function openNew() { setForm(EMPTY); setModal('new'); }
  function openEdit(t: any) {
    setForm({
      ...EMPTY, ...t,
      incentive_rate: String(Math.round((t.incentive_rate || 0.5) * 100)),
      salary: String(t.salary ?? 0),
      joining_date: t.joining_date ? String(t.joining_date).split('T')[0] : '',
    });
    setModal(t);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) return flash('Name is required', true);
    setSaving(true);
    try {
      const payload = {
        ...form,
        salary: parseFloat(form.salary) || 0,
        incentive_rate: parseFloat(form.incentive_rate) || 50,
      };
      if (modal === 'new') {
        await api.trainers.create(payload);
        flash('Trainer created!');
      } else if (modal) {
        await api.trainers.update(modal.id, payload);
        flash('Trainer updated!');
      }
      setModal(null);
      load();
    } catch (e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete trainer "${name}"?`)) return;
    setDeleting(id);
    try { await api.trainers.delete(id); flash(`${name} deleted`); load(); }
    catch(e:any) { flash(e.message, true); }
    finally { setDeleting(null); }
  }

  const S = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm((f:any) => ({...f, [k]: e.target.value}));

  const fmt = (n:any) => '₹' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Trainers</div>
            <div className="topbar-sub">{trainers.length} staff member{trainers.length !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Add Trainer</button>
        </div>

        <div className="page-content fade-up">
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <div className="card"><div className="text-muted">Loading trainers…</div></div>
          ) : trainers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏋️</div>
              <div className="text-muted mb-2">No trainers added yet</div>
              <button className="btn btn-primary" onClick={openNew}>Add First Trainer</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {trainers.map(t => (
                <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', opacity: deleting === t.id ? 0.4 : 1, cursor: 'default' }}>
                  <Link href={`/trainers/${t.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                      <div className="user-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
                        {t.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }} className="truncate">{t.name}</div>
                        <div className="text-muted text-xs truncate">{t.role || 'Personal Trainer'}</div>
                      </div>
                      <span className={`badge badge-${t.status === 'active' ? 'active' : 'expired'}`}>{t.status}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', fontSize: 12, marginTop: '.85rem' }}>
                      <div><div className="text-muted text-xs">Active Clients</div><div style={{ fontWeight: 700, color: 'var(--success)' }}>{t.active_clients ?? 0}</div></div>
                      <div><div className="text-muted text-xs">Month Revenue</div><div style={{ fontWeight: 700, color: 'var(--brand2)' }}>{fmt(t.month_revenue)}</div></div>
                      <div><div className="text-muted text-xs">Salary</div><div style={{ fontWeight: 600 }}>{fmt(t.salary)}</div></div>
                      <div><div className="text-muted text-xs">Incentive</div><div style={{ fontWeight: 600 }}>{Math.round((t.incentive_rate || 0.5) * 100)}%</div></div>
                    </div>

                    {t.specialization && (
                      <div className="text-muted text-xs" style={{ marginTop: '.6rem' }}>📋 {t.specialization}</div>
                    )}
                  </Link>

                  <div style={{ display: 'flex', gap: '.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '.85rem' }}>
                    <Link href={`/trainers/${t.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, textAlign: 'center' }}>👁️ View</Link>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(t)} title="Edit">✏️</button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => del(t.id, t.name)} disabled={deleting === t.id} title="Delete">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {modal && (
          <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
            <form className="card" onSubmit={save}>
              <div className="card-title" style={{ marginBottom: '1.25rem' }}>{modal === 'new' ? '➕ Add Trainer' : '✏️ Edit Trainer'}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                <div className="form-row form-row-2">
                  <div><label>Full Name *</label><input className="input" value={form.name} onChange={S('name')} required autoFocus /></div>
                  <div><label>Role</label><input className="input" value={form.role} onChange={S('role')} placeholder="Personal Trainer" /></div>
                </div>
                <div className="form-row form-row-2">
                  <div><label>Mobile</label><input className="input" type="tel" value={form.mobile} onChange={S('mobile')} /></div>
                  <div><label>Email</label><input className="input" type="email" value={form.email} onChange={S('email')} /></div>
                </div>
                <div className="form-row form-row-3">
                  <div><label>Joining Date</label><input className="input" type="date" value={form.joining_date} onChange={S('joining_date')} /></div>
                  <div><label>Salary (₹)</label><input className="input" type="number" value={form.salary} onChange={S('salary')} /></div>
                  <div><label>Incentive %</label><input className="input" type="number" min="0" max="100" value={form.incentive_rate} onChange={S('incentive_rate')} /></div>
                </div>
                <div><label>Specialization</label><input className="input" value={form.specialization} onChange={S('specialization')} placeholder="e.g. Weight loss, HIIT" /></div>
                <div>
                  <label>Status</label>
                  <select className="input select" value={form.status} onChange={S('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '.6rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : (modal === 'new' ? '➕ Create' : '💾 Save Changes')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
