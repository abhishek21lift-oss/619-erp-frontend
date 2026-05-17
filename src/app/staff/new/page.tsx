'use client';
import { useState } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

export default function AddStaffAccountPage() {
  return (
    <Guard>
      <Inner />
    </Guard>
  );
}

const ROLES = ['admin', 'manager', 'trainer', 'receptionist', 'accountant'];

function Inner() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'trainer',
    password: '',
    confirm_password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (!form.password) { setError('Password is required'); return; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      await api.staff.create({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
      });
      setSuccess('Staff account created successfully!');
      setForm({ name: '', email: '', phone: '', role: 'trainer', password: '', confirm_password: '' });
    } catch (e: any) {
      setError(e.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="page-main">
        <div className="page-content fade-up" style={{ maxWidth: 560 }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Add Staff Account</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Create a new login for a gym staff member.</div>
          </div>

          {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

          <div className="card" style={{ padding: '28px 32px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div>
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">Email *</label>
                  <input className="input" type="email" placeholder="staff@619gym.com" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="form-label">Role *</label>
                <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">Password *</label>
                  <input className="input" type="password" placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
                </div>
                <div>
                  <label className="form-label">Confirm Password *</label>
                  <input className="input" type="password" placeholder="Repeat password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setForm({ name: '', email: '', phone: '', role: 'trainer', password: '', confirm_password: '' })}>
                  Reset
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
