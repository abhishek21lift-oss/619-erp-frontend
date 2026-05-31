'use client';
import { use, useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Guard role="admin"><EditContent id={id} /></Guard>;
}

function EditContent({ id }: { id: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', specialization: '',
    status: 'active', notes: '', incentive_rate: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.trainers.get(id).then((t: any) => {
      setForm({
        name: t.name || '',
        mobile: t.mobile || '',
        email: t.email || '',
        specialization: t.specialization || '',
        status: t.status || 'active',
        notes: t.notes || '',
        incentive_rate: t.incentive_rate != null ? String(t.incentive_rate) : '',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.trainers.update(id, {
        ...form,
        incentive_rate: form.incentive_rate ? parseFloat(form.incentive_rate) : null,
      });
      setSuccess('Trainer updated successfully!');
      setTimeout(() => router.push(`/trainers/${id}`), 1200);
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally { setSaving(false); }
  }

  const F = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value })),
  });

  if (loading) return <AppShell><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="page-container animate-fade-in" style={{ maxWidth: 560 }}>
        <Link href={`/trainers/${id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 20, display: 'inline-flex', gap: 6 }}>
          <ArrowLeft size={14} /> Back to Trainer
        </Link>
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1 className="page-title">Edit Trainer</h1>
        </div>

        {success && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontWeight: 600 }}>{success}</div>}
        {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>{error}</div>}

        <form onSubmit={submit}>
          <div className="card" style={{ padding: 24, display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Full Name *', key: 'name', required: true, type: 'text' },
                { label: 'Mobile', key: 'mobile', type: 'tel' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Specialization', key: 'specialization', type: 'text' },
                { label: 'Incentive Rate (%)', key: 'incentive_rate', type: 'number' },
              ].map(({ label, key, required, type }) => (
                <label key={key} style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
                  <input className="input" type={type} {...F(key as keyof typeof form)} required={required} />
                </label>
              ))}
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</span>
                <select className="input" {...F('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Notes</span>
              <textarea className="input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Link href={`/trainers/${id}`} className="btn btn-outline btn-sm">Cancel</Link>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
