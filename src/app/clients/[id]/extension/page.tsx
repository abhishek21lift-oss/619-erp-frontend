'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

export default function ExtensionPage() { return <Guard><Inner /></Guard>; }

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ days: '7', reason: '' });

  useEffect(() => {
    api.clients.get(id).then(setClient).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}/extension`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('');
    } catch {}
    setSuccess(`Membership extended by ${form.days} days!`);
    setTimeout(() => router.push(`/clients/${id}`), 1500);
    setSaving(false);
  }

  if (loading) return <AppShell><div className="page-main" style={{ padding: '2rem', color: 'var(--muted)' }}>Loading…</div></AppShell>;
  const initials = (client?.name || 'C').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const newEndDate = client?.end_date ? new Date(new Date(client.end_date).getTime() + parseInt(form.days || '0') * 86400000).toLocaleDateString('en-IN') : '—';

  return (
    <AppShell>
      <div className="page-main"><div className="ptf-wrap">
        <Link href={`/clients/${id}`} className="ptf-back-btn">← Back to Member</Link>
        {success && <div className="ptf-success">✓ {success}</div>}

        <div className="ptf-client-hero">
          {client?.photo_url ? <img src={client.photo_url} alt="" className="ptf-client-avatar" /> : <div className="ptf-client-avatar-initials">{initials}</div>}
          <div>
            <div className="ptf-client-name">{client?.name}</div>
            <div className="ptf-client-meta">📞 {client?.mobile || '—'} • Current end date: <strong>{client?.end_date ? new Date(client.end_date).toLocaleDateString('en-IN') : '—'}</strong></div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ptf-card">
            <div className="ptf-card-header"><span className="ptf-card-header-icon">📅</span><span className="ptf-card-header-title">Add Extension</span></div>
            <div className="ptf-card-body">
              <div className="ptf-field" style={{ maxWidth: 260 }}>
                <label className="ptf-label">Number of Days <span className="req">*</span></label>
                <input type="number" className="ptf-input" min="1" max="365" value={form.days} onChange={e => set('days', e.target.value)} required />
              </div>
              {form.days && parseInt(form.days) > 0 && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '.65rem 1rem', fontSize: '.84rem', color: '#15803d', flex: 1 }}>
                    ✓ New end date: <strong>{newEndDate}</strong>
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '.65rem 1rem', fontSize: '.84rem', color: '#1d4ed8', flex: 1 }}>
                    📅 Extension: +{form.days} days
                  </div>
                </div>
              )}
              <div className="ptf-field">
                <label className="ptf-label">Reason</label>
                <textarea className="ptf-input" rows={3} placeholder="Reason for extension (injury, travel, etc.)…" value={form.reason} onChange={e => set('reason', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </div>
          <div className="ptf-actions">
            <Link href={`/clients/${id}`} className="ptf-btn-secondary">Cancel</Link>
            <button type="submit" className="ptf-btn-primary" disabled={saving}>{saving ? 'Saving…' : '📅 Apply Extension'}</button>
          </div>
        </form>
      </div></div>
    </AppShell>
  );
}
