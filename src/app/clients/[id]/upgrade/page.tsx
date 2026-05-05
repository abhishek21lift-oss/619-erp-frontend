'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

export default function UpgradePage() { return <Guard><Inner /></Guard>; }

const PLANS = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'];
const PLAN_ORDER: Record<string,number> = { Monthly:1, Quarterly:2, 'Half Yearly':3, Yearly:4 };

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ package_type: 'Yearly', amount: '', start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    api.clients.get(id).then(setClient).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const totalAmount = parseFloat(form.amount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await fetch(`/api/clients/${id}/upgrade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); } catch {}
    setSuccess(`Package upgraded to ${form.package_type}!`);
    setTimeout(() => router.push(`/clients/${id}`), 1500);
    setSaving(false);
  }

  if (loading) return <AppShell><div className="page-main" style={{ padding: '2rem' }}>Loading…</div></AppShell>;
  const initials = (client?.name || 'C').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const upgradePlans = PLANS.filter(p => (PLAN_ORDER[p] || 0) > (PLAN_ORDER[client?.package_type] || 0));

  return (
    <AppShell>
      <div className="page-main"><div className="ptf-wrap">
        <Link href={`/clients/${id}`} className="ptf-back-btn">← Back to Member</Link>
        {success && <div className="ptf-success">✓ {success}</div>}

        <div className="ptf-client-hero">
          {client?.photo_url ? <img src={client.photo_url} alt="" className="ptf-client-avatar" /> : <div className="ptf-client-avatar-initials">{initials}</div>}
          <div>
            <div className="ptf-client-name">{client?.name}</div>
            <div className="ptf-client-meta">Current plan: <strong>{client?.package_type || '—'}</strong></div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ptf-card">
            <div className="ptf-card-header"><span className="ptf-card-header-icon">⬆️</span><span className="ptf-card-header-title">Upgrade Package</span></div>
            <div className="ptf-card-body">
              <div className="ptf-row-2">
                <div className="ptf-field">
                  <label className="ptf-label">Upgrade To Plan <span className="req">*</span></label>
                  <select className="ptf-select" value={form.package_type} onChange={e => set('package_type', e.target.value)} required>
                    <option value="">Select Plan</option>
                    {(upgradePlans.length > 0 ? upgradePlans : PLANS).map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="ptf-field">
                  <label className="ptf-label">Amount (₹) <span className="req">*</span></label>
                  <input type="number" className="ptf-input" placeholder="₹" value={form.amount} onChange={e => set('amount', e.target.value)} required />
                </div>
              </div>
              <div className="ptf-row-2">
                <div className="ptf-field">
                  <label className="ptf-label">Start Date</label>
                  <input type="date" className="ptf-input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                </div>
                <div className="ptf-field">
                  <label className="ptf-label">End Date</label>
                  <input type="date" className="ptf-input" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                </div>
              </div>
              {form.package_type && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '.65rem 1rem', fontSize: '.84rem', color: '#15803d' }}>
                  ⬆️ Upgrading: <strong>{client?.package_type || '—'}</strong> → <strong>{form.package_type}</strong>
                </div>
              )}
              <div className="ptf-field">
                <label className="ptf-label">Reason / Notes</label>
                <textarea className="ptf-input" rows={2} placeholder="Optional note…" value={form.reason} onChange={e => set('reason', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="ptf-card">
            <div className="ptf-card-header"><span className="ptf-card-header-icon">₹</span><span className="ptf-card-header-title">Payment Breakdown</span></div>
            <div className="ptf-card-body">
              <div className="ptf-breakdown">
                <div className="ptf-breakdown-row"><span>Upgrade Amount</span><span className="ptf-breakdown-val">₹ {totalAmount.toLocaleString('en-IN')}</span></div>
                <div className="ptf-breakdown-row"><span>—CGST @</span><span className="ptf-breakdown-val">₹ 0</span></div>
                <div className="ptf-breakdown-row"><span>—SGST @</span><span className="ptf-breakdown-val">₹ 0</span></div>
                <div className="ptf-breakdown-row total"><span>Total Amount to be Paid</span><span>₹ {totalAmount.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          </div>

          <div className="ptf-actions">
            <Link href={`/clients/${id}`} className="ptf-btn-secondary">Cancel</Link>
            <button type="submit" className="ptf-btn-primary" disabled={saving}>{saving ? 'Saving…' : '⬆️ Upgrade Package'}</button>
          </div>
        </form>
      </div></div>
    </AppShell>
  );
}
