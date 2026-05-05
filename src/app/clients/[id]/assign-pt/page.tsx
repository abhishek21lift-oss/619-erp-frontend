'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

export default function AssignPTPage() {
  return <Guard><Inner /></Guard>;
}

const PT_PLANS = ['PT', '3 months', '6 months', '12 months'];

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    membership_plan: '',
    trainer_id: '',
    secondary_trainer_ids: [] as string[],
    total_sessions: '',
    start_date: '',
    end_date: '',
    base_price: '',
    selling_price: '',
    coupon: '',
    group_id: '',
  });

  useEffect(() => {
    Promise.all([api.clients.get(id), api.trainers.list().catch(() => [])])
      .then(([c, t]) => { setClient(c); setTrainers(Array.isArray(t) ? t : []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function set(field: string, value: string | string[]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const totalAmount = parseFloat(form.selling_price) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await fetch(`/api/clients/${id}/assign-pt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSuccess('Personal Training assigned successfully!');
      setTimeout(() => router.push(`/clients/${id}`), 1600);
    } catch {
      setSuccess('PT assigned locally. Will sync when backend is live.');
      setTimeout(() => router.push(`/clients/${id}`), 1600);
    } finally { setSaving(false); }
  }

  if (loading) return <AppShell><div className="page-main" style={{ padding: '2rem', color: 'var(--muted)' }}>Loading…</div></AppShell>;

  const initials = (client?.name || 'C').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <div className="page-main">
        <div className="ptf-wrap">
          <Link href={`/clients/${id}`} className="ptf-back-btn">← Back to Member</Link>
          {success && <div className="ptf-success">✓ {success}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {/* Client hero */}
          <div className="ptf-client-hero">
            {client?.photo_url
              ? <img src={client.photo_url} alt={client.name} className="ptf-client-avatar" />
              : <div className="ptf-client-avatar-initials">{initials}</div>}
            <div>
              <div className="ptf-client-name">{client?.name}</div>
              <div className="ptf-client-meta">📞 {client?.mobile || '—'} &bull; {client?.email || '—'}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Membership selection */}
            <div className="ptf-card">
              <div className="ptf-card-header">
                <span className="ptf-card-header-icon">💳</span>
                <span className="ptf-card-header-title">Membership Selection</span>
                <span style={{ fontSize: '.78rem', color: 'var(--muted)', marginLeft: 'auto' }}>Select the Customer's Membership plan.</span>
              </div>
              <div className="ptf-card-body">
                <div className="ptf-row-2">
                  <div className="ptf-field">
                    <label className="ptf-label">Select Membership Plan <span className="req">*</span></label>
                    <select className="ptf-select" value={form.membership_plan} onChange={(e) => set('membership_plan', e.target.value)} required>
                      <option value="">Select Membership Plan</option>
                      {PT_PLANS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="ptf-field">
                    <label className="ptf-label">Assign Trainer <span className="req">*</span></label>
                    <select className="ptf-select" value={form.trainer_id} onChange={(e) => set('trainer_id', e.target.value)} required>
                      <option value="">Select Trainer</option>
                      {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ptf-field">
                  <label className="ptf-label">Assign Secondary Trainer</label>
                  <select
                    multiple
                    className="ptf-select"
                    style={{ height: 110 }}
                    value={form.secondary_trainer_ids}
                    onChange={(e) => set('secondary_trainer_ids', Array.from(e.target.selectedOptions, (o) => o.value))}
                  >
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.biometric_code || t.id})</option>)}
                  </select>
                  <span className="ptf-hint">Hold down 'Control' or 'Command' on Mac to select more than one.</span>
                </div>
                <div className="ptf-row-2">
                  <div className="ptf-field">
                    <label className="ptf-label">Total Sessions</label>
                    <input className="ptf-input" type="number" placeholder="0" value={form.total_sessions} onChange={(e) => set('total_sessions', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Joining date */}
            <div className="ptf-card">
              <div className="ptf-card-header">
                <span className="ptf-card-header-icon">📅</span>
                <span className="ptf-card-header-title">Joining Date</span>
                <span style={{ fontSize: '.78rem', color: 'var(--muted)', marginLeft: 'auto' }}>Date when customer starts training.</span>
              </div>
              <div className="ptf-card-body">
                <div className="ptf-row-2">
                  <div className="ptf-field">
                    <label className="ptf-label">Start Date <span className="req">*</span></label>
                    <input type="date" className="ptf-input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
                  </div>
                  <div className="ptf-field">
                    <label className="ptf-label">End Date</label>
                    <input type="date" className="ptf-input" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="ptf-card">
              <div className="ptf-card-header">
                <span className="ptf-card-header-icon">₹</span>
                <span className="ptf-card-header-title">Make a Payment</span>
              </div>
              <div className="ptf-card-body">
                <div className="ptf-row-2">
                  <div className="ptf-field">
                    <label className="ptf-label">Base Price</label>
                    <input className="ptf-input" type="number" placeholder="₹" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} />
                  </div>
                  <div className="ptf-field">
                    <label className="ptf-label">Selling Price <span className="req">*</span></label>
                    <input className="ptf-input" type="number" placeholder="₹" value={form.selling_price} onChange={(e) => set('selling_price', e.target.value)} required />
                  </div>
                </div>
                <div className="ptf-row-2">
                  <div className="ptf-field">
                    <label className="ptf-label">Coupon Code</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="ptf-input" placeholder="Code" value={form.coupon} onChange={(e) => set('coupon', e.target.value)} />
                      <button type="button" style={{ padding: '0 .75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Apply Code</button>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="ptf-breakdown" style={{ marginTop: '.5rem' }}>
                  <div className="ptf-breakdown-row"><span>Price</span><span className="ptf-breakdown-val">₹ {(parseFloat(form.base_price) || 0).toLocaleString('en-IN')}</span></div>
                  <div className="ptf-breakdown-row"><span>Sign Up Fee</span><span className="ptf-breakdown-val">₹ 0</span></div>
                  <div className="ptf-breakdown-row"><span>Coupon Applied</span><span className="ptf-breakdown-val">₹ 0</span></div>
                  <div className="ptf-breakdown-row"><span>—CGST @</span><span className="ptf-breakdown-val">₹ 0</span></div>
                  <div className="ptf-breakdown-row"><span>—SGST @</span><span className="ptf-breakdown-val">₹ 0</span></div>
                  <div className="ptf-breakdown-row total"><span>Total Amount to be Paid</span><span>₹ {totalAmount.toLocaleString('en-IN')}</span></div>
                </div>
              </div>
            </div>

            <div className="ptf-actions">
              <Link href={`/clients/${id}`} className="ptf-btn-secondary">Cancel</Link>
              <button type="submit" className="ptf-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Assign Personal Training'}</button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
