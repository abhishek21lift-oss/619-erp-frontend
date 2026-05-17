'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { WorkflowLayout, WorkflowHero, SummaryRail, StickyActionBar, SectionHeading, GlassCard } from '@/components/workflow';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { getStoredPlans } from '@/lib/plans';
import { computeEndDate, toInputDate } from '@/lib/format';

export default function RenewPTPage() { return <Guard><Inner /></Guard>; }

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'UPI', label: 'UPI', icon: '📱' },
  { value: 'CARD', label: 'Card', icon: '💳' },
  { value: 'BANK', label: 'Bank Transfer', icon: '🏦' },
];

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [ptPlans, setPtPlans] = useState<{ name: string; base: number; final: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [form, setForm] = useState({ renew_plan: '', membership: '', trainer_id: '', secondary_trainer_ids: [] as string[], total_sessions: '', start_date: '', end_date: '', base_price: '', selling_price: '', coupon: '', group_id: '' });

  useEffect(() => {
    Promise.all([api.clients.get(id), api.trainers.list().catch(() => [])])
      .then(([c, t]) => { setClient(c); setTrainers(Array.isArray(t) ? t : []); })
      .catch((e: any) => setError(e.message)).finally(() => setLoading(false));
    const stored = getStoredPlans();
    const pt = stored.filter(p => p.kind === 'PT').map(p => ({ name: p.name, base: p.base_amount, final: p.final_amount }));
    setPtPlans(pt.length > 0 ? pt : [
      { name: 'PT Monthly', base: 6000, final: 6000 }, { name: 'PT Quarterly', base: 16500, final: 15000 },
      { name: 'PT Half-Yearly', base: 30000, final: 26000 }, { name: 'PT Annual', base: 55000, final: 45000 },
    ]);
  }, [id]);

  function set(field: string, value: string | string[]) { setForm(f => ({ ...f, [field]: value })); }

  function handleMembershipSelect(planName: string) {
    const plan = ptPlans.find(p => p.name === planName);
    setForm(f => {
      const start = f.start_date || toInputDate(client?.pt_end_date) || toInputDate(new Date());
      return { ...f, membership: planName, start_date: start, end_date: computeEndDate(start, planName), base_price: f.base_price || (plan ? String(plan.base) : ''), selling_price: f.selling_price || (plan ? String(plan.final) : '') };
    });
  }

  function handleStartDate(newStart: string) {
    setForm(f => ({ ...f, start_date: newStart, end_date: computeEndDate(newStart, f.membership) }));
  }

  const mrp = parseFloat(form.base_price) || 0;
  const total = parseFloat(form.selling_price) || 0;
  const discount = Math.max(0, mrp - total);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.start_date || !form.end_date) { const m = 'PT start and end dates required'; setError(m); toast.error(m); return; }
    if (new Date(form.end_date) <= new Date(form.start_date)) { const m = 'End date must be after start date'; setError(m); toast.error(m); return; }
    setSaving(true);
    try {
      const result = await api.clients.renewPt(id, {
        trainer_id: form.trainer_id || null, pt_start_date: form.start_date, pt_end_date: form.end_date,
        membership_plan: form.renew_plan || form.membership || null,
        amount: parseFloat(form.selling_price) || 0, payment_method: paymentMethod, notes: null,
      });
      const m = result?.message || 'Personal Training renewed successfully!';
      setSuccess(m); toast.success(m);
      setTimeout(() => router.push(`/clients/${id}`), 900);
    } catch (err: any) {
      const m = err?.message || 'Failed to renew PT'; setError(m); toast.error(m);
    } finally { setSaving(false); }
  }

  if (loading) return <AppShell><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div></AppShell>;

  const selectedTrainer = trainers.find(t => t.id === form.trainer_id);
  const summaryItems = [
    { label: 'Plan', value: form.membership || '—' },
    { label: 'Trainer', value: selectedTrainer?.name || client?.trainer_name || '—' },
    { label: 'Sessions', value: form.total_sessions || '—' },
    { label: 'MRP', value: `₹ ${mrp.toLocaleString('en-IN')}` },
    { label: 'Discount', value: `- ₹ ${discount.toLocaleString('en-IN')}`, highlight: discount > 0 },
  ];

  return (
    <AppShell>
      <WorkflowLayout
        hero={
          <WorkflowHero client={client} backHref={`/clients/${id}`} badge={{ label: 'Renew Personal Training', color: '#f59e0b' }} />
        }
        rail={
          <SummaryRail title="PT Renewal Summary" items={summaryItems} total={total} client={client} />
        }
        actionBar={
          <StickyActionBar total={total} label="Renew Personal Training" saving={saving} onCancel={() => router.push(`/clients/${id}`)} />
        }
        onSubmit={handleSubmit}
      >
        <AnimatePresence>
          {success && <motion.div key="s" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#065f46', fontWeight: 600 }}>✓ {success}</motion.div>}
          {error && <motion.div key="e" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b' }}>⚠ {error}</motion.div>}
        </AnimatePresence>

        {/* Plan chips */}
        <GlassCard>
          <SectionHeading eyebrow="PT PLAN" title="Select Renewal Plan" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {ptPlans.map(p => (
              <button key={p.name} type="button" onClick={() => handleMembershipSelect(p.name)}
                style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 18px', borderRadius: 12, border: form.membership === p.name ? '2px solid #f59e0b' : '2px solid var(--border, #e5e7eb)', background: form.membership === p.name ? '#fffbeb' : '#fff', cursor: 'pointer', transition: 'all .18s', minWidth: 130, textAlign: 'left' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: form.membership === p.name ? '#92400e' : 'var(--text, #1f2937)' }}>{p.name}</span>
                <span style={{ fontSize: 13, color: form.membership === p.name ? '#d97706' : 'var(--muted)' }}>₹{p.final.toLocaleString('en-IN')}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Trainer selection */}
        <GlassCard>
          <SectionHeading eyebrow="TRAINER" title="Select Trainer" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {trainers.map((t: any) => (
              <button key={t.id} type="button" onClick={() => set('trainer_id', t.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 10px', borderRadius: 12, border: form.trainer_id === t.id ? '2px solid #f59e0b' : '2px solid var(--border, #e5e7eb)', background: form.trainer_id === t.id ? '#fffbeb' : '#fff', cursor: 'pointer', transition: 'all .18s', textAlign: 'center' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: form.trainer_id === t.id ? '#f59e0b' : '#e5e7eb', color: form.trainer_id === t.id ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, overflow: 'hidden' }}>
                  {t.photo_url ? <img src={t.photo_url} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (t.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontWeight: 700, fontSize: 12, color: form.trainer_id === t.id ? '#92400e' : 'var(--text, #1f2937)' }}>{t.name}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Secondary Trainer(s)</span>
              <select multiple style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14, height: 100 }}
                value={form.secondary_trainer_ids}
                onChange={e => set('secondary_trainer_ids', Array.from(e.target.selectedOptions, o => o.value))}>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.biometric_code || t.id})</option>)}
              </select>
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 200, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Total Sessions</span>
            <input type="number" placeholder="0" style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
              value={form.total_sessions} onChange={e => set('total_sessions', e.target.value)} />
          </label>
        </GlassCard>

        {/* Dates */}
        <GlassCard>
          <SectionHeading eyebrow="SCHEDULE" title="Training Dates" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Start Date *</span>
              <input type="date" required style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                value={form.start_date} onChange={e => handleStartDate(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>End Date</span>
              <input type="date" style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </label>
          </div>
        </GlassCard>

        {/* Payment */}
        <GlassCard>
          <SectionHeading eyebrow="PAYMENT" title="Make a Payment" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Base Price</span>
              <input type="number" placeholder="₹" style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                value={form.base_price} onChange={e => set('base_price', e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Selling Price *</span>
              <input type="number" placeholder="₹" required style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                value={form.selling_price} onChange={e => set('selling_price', e.target.value)} />
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Coupon Code</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Code" style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14, flex: 1 }}
                value={form.coupon} onChange={e => set('coupon', e.target.value)} />
              <button type="button" style={{ padding: '0 14px', background: 'var(--accent, #6366f1)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Apply</button>
            </div>
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 18px', borderRadius: 12, border: paymentMethod === m.value ? '2px solid #f59e0b' : '2px solid var(--border, #e5e7eb)', background: paymentMethod === m.value ? '#fffbeb' : '#fff', cursor: 'pointer', transition: 'all .18s', minWidth: 80 }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: paymentMethod === m.value ? '#92400e' : 'var(--text, #1f2937)' }}>{m.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </WorkflowLayout>
    </AppShell>
  );
}
