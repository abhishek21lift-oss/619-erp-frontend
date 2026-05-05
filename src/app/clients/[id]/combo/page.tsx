'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

export default function ComboPage() { return <Guard><Inner /></Guard>; }

const COMBO_PLANS = ['Half Yearly', 'Yearly', 'Quarterly'];

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ package_type: 'Half Yearly', trainer_id: '', amount: '', start_date: '', end_date: '', notes: '' });

  useEffect(() => {
    Promise.all([api.clients.get(id), api.trainers.list().catch(() => [])])
      .then(([c, t]) => { setClient(c); setTrainers(Array.isArray(t) ? t : []); })
      .catch(console.error).finally(() => setLoading(false));
  }, [id]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  const total = parseFloat(form.amount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await fetch(`/api/clients/${id}/combo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); } catch {}
    setSuccess('Combo offer applied successfully!');
    setTimeout(() => router.push(`/clients/${id}`), 1500);
    setSaving(false);
  }

  if (loading) return <AppShell><div className="page-main" style={{ padding: '2rem' }}>Loading…</div></AppShell>;
  const initials = (client?.name || 'C').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <div className="page-main"><div className="ptf-wrap">
        <Link href={`/clients/${id}`} className="ptf-back-btn">← Back to Member</Link>
        {success && <div className="ptf-success">✓ {success}</div>}

        <div className="ptf-client-hero">
          {client?.photo_url ? <img src={client.photo_url} alt="" className="ptf-client-avatar" /> : <div className="ptf-client-avatar-initials">{initials}</div>}
          <div><div className="ptf-client-name">{client?.name}</div><div className="ptf-client-meta">📞 {client?.mobile || '—'}</div></div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ptf-card">
            <div className="ptf-card-header"><span className="ptf-card-header-icon">🎁</span><span className="ptf-card-header-title">Upgrade to Combo Offer</span></div>
            <div className="ptf-card-body">
              <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '.75rem 1rem', fontSize: '.84rem', color: '#7c3aed', marginBottom: '.5rem' }}>
                🎁 Combo Offer = Gym Membership + Personal Training bundled at a special price.
              </div>
              <div className="ptf-row-2">
                <div className="ptf-field">
                  <label className="ptf-label">Combo Plan <span className="req">*</span></label>
                  <select className="ptf-select" value={form.package_type} onChange={e => set('package_type', e.target.value)} required>
                    {COMBO_PLANS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="ptf-field">
                  <label className="ptf-label">Assign Trainer <span className="req">*</span></label>
                  <select className="ptf-select" value={form.trainer_id} onChange={e => set('trainer_id', e.target.value)} required>
                    <option value="">Select Trainer</option>
                    {trainers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="ptf-row-2">
                <div className="ptf-field">
                  <label className="ptf-label">Start Date <span className="req">*</span></label>
                  <input type="date" className="ptf-input" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
                </div>
                <div className="ptf-field">
                  <label className="ptf-label">End Date</label>
                  <input type="date" className="ptf-input" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                </div>
              </div>
              <div className="ptf-row-2">
                <div className="ptf-field">
                  <label className="ptf-label">Combo Amount (₹) <span className="req">*</span></label>
                  <input type="number" className="ptf-input" placeholder="₹" value={form.amount} onChange={e => set('amount', e.target.value)} required />
                </div>
              </div>
              <div className="ptf-field">
                <label className="ptf-label">Notes</label>
                <textarea className="ptf-input" rows={2} placeholder="Any special terms or notes…" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </div>
          <div className="ptf-card">
            <div className="ptf-card-header"><span className="ptf-card-header-icon">₹</span><span className="ptf-card-header-title">Payment Breakdown</span></div>
            <div className="ptf-card-body">
              <div className="ptf-breakdown">
                <div className="ptf-breakdown-row"><span>Combo Price</span><span className="ptf-breakdown-val">₹ {total.toLocaleString('en-IN')}</span></div>
                <div className="ptf-breakdown-row"><span>Sign Up Fee</span><span className="ptf-breakdown-val">₹ 0</span></div>
                <div className="ptf-breakdown-row"><span>—CGST @</span><span className="ptf-breakdown-val">₹ 0</span></div>
                <div className="ptf-breakdown-row"><span>—SGST @</span><span className="ptf-breakdown-val">₹ 0</span></div>
                <div className="ptf-breakdown-row total"><span>Total Amount to be Paid</span><span>₹ {total.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          </div>
          <div className="ptf-actions">
            <Link href={`/clients/${id}`} className="ptf-btn-secondary">Cancel</Link>
            <button type="submit" className="ptf-btn-primary" disabled={saving} style={{ background: '#7c3aed' }}>{saving ? 'Saving…' : '🎁 Apply Combo Offer'}</button>
          </div>
        </form>
      </div></div>
    </AppShell>
  );
}
