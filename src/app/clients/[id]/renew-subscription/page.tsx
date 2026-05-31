'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { WorkflowLayout, WorkflowHero, SummaryRail, StickyActionBar, SectionHeading, GlassCard } from '@/components/workflow';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { getStoredPlans } from '@/lib/plans';
import { computeEndDate, toInputDate } from '@/lib/format';

export default function RenewSubscriptionPage() {
  return <Guard><Inner /></Guard>;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'UPI', label: 'UPI', icon: '📱' },
  { value: 'CARD', label: 'Card', icon: '💳' },
  { value: 'BANK', label: 'Bank Transfer', icon: '🏦' },
];

interface PlanRow {
  id: number;
  plan: string;
  startDate: string;
  endDate: string;
  basePrice: string;
  sellingPrice: string;
  coupon: string;
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [groupId, setGroupId] = useState('');
  const [memPlans, setMemPlans] = useState<{ name: string; base: number; final: number }[]>([]);
  const [planRows, setPlanRows] = useState<PlanRow[]>([
    { id: 1, plan: '', startDate: '', endDate: '', basePrice: '', sellingPrice: '', coupon: '' },
  ]);

  useEffect(() => {
    const stored = getStoredPlans();
    const mp = stored.filter(p => p.kind === 'Membership').map(p => ({ name: p.name, base: p.base_amount, final: p.final_amount }));
    setMemPlans(mp.length > 0 ? mp : [
      { name: 'Monthly', base: 2500, final: 2500 },
      { name: 'Quarterly', base: 7000, final: 6500 },
      { name: 'Half Yearly', base: 13000, final: 11500 },
      { name: 'Yearly', base: 24000, final: 20000 },
    ]);
  }, []);

  useEffect(() => {
    api.clients.get(id).then(setClient).catch((e: any) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  function handlePlanSelect(rowId: number, planName: string) {
    const plan = memPlans.find(p => p.name === planName);
    setPlanRows(r => r.map(x => {
      if (x.id !== rowId) return x;
      const start = x.startDate || toInputDate(client?.pt_end_date) || toInputDate(new Date());
      return { ...x, plan: planName, startDate: start, endDate: computeEndDate(start, planName), basePrice: plan ? String(plan.base) : x.basePrice, sellingPrice: plan ? String(plan.final) : x.sellingPrice };
    }));
  }

  function handleStartDateChange(rowId: number, newStart: string) {
    setPlanRows(r => r.map(x => x.id === rowId ? { ...x, startDate: newStart, endDate: computeEndDate(newStart, x.plan) } : x));
  }

  function updateRow(rowId: number, field: keyof PlanRow, value: string) {
    setPlanRows(r => r.map(x => x.id === rowId ? { ...x, [field]: value } : x));
  }

  function addPlanRow() {
    setPlanRows(r => [...r, { id: Date.now(), plan: '', startDate: '', endDate: '', basePrice: '', sellingPrice: '', coupon: '' }]);
  }

  function removePlanRow(rowId: number) {
    if (planRows.length <= 1) return;
    setPlanRows(r => r.filter(x => x.id !== rowId));
  }

  const mrp = planRows.reduce((s, r) => s + (parseFloat(r.basePrice) || 0), 0);
  const total = planRows.reduce((s, r) => s + (parseFloat(r.sellingPrice) || 0), 0);
  const discount = Math.max(0, mrp - total);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    for (let i = 0; i < planRows.length; i++) {
      const r = planRows[i]; const n = i + 1;
      if (!r.plan) { const m = `Row ${n}: pick a plan`; setError(m); toast.error(m); return; }
      if (!r.startDate) { const m = `Row ${n}: start date required`; setError(m); toast.error(m); return; }
      if (!r.endDate) { const m = `Row ${n}: end date required`; setError(m); toast.error(m); return; }
      if (new Date(r.endDate) <= new Date(r.startDate)) { const m = `Row ${n}: end must be after start`; setError(m); toast.error(m); return; }
      if (!(parseFloat(r.sellingPrice) > 0)) { const m = `Row ${n}: selling price required`; setError(m); toast.error(m); return; }
    }
    setSaving(true);
    try {
      const result = await api.clients.renewSubscription(id, {
        renew_plan: planRows[0].plan,
        plan_rows: planRows.map(r => ({ plan: r.plan, startDate: r.startDate, endDate: r.endDate, basePrice: parseFloat(r.basePrice) || 0, sellingPrice: parseFloat(r.sellingPrice) || 0, coupon: r.coupon || null })),
        group_id: groupId || null,
        payment_method: paymentMethod,
      });
      const m = result?.message || 'Subscription renewed successfully!';
      setSuccess(m); toast.success(m);
      setTimeout(() => router.push(`/clients/${id}`), 900);
    } catch (err: any) {
      const m = err?.message || 'Failed to renew subscription';
      setError(m); toast.error(m);
    } finally { setSaving(false); }
  }

  if (loading) return <AppShell><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div></AppShell>;

  const summaryItems = [
    { label: 'MRP', value: `₹ ${mrp.toLocaleString('en-IN')}` },
    { label: 'Discount', value: `- ₹ ${discount.toLocaleString('en-IN')}`, highlight: discount > 0 },
    { label: 'CGST', value: '₹ 0' },
    { label: 'SGST', value: '₹ 0' },
    { label: 'Coupon', value: '₹ 0' },
  ];

  return (
    <AppShell>
      <WorkflowLayout
        hero={
          <WorkflowHero
            client={client}
            backHref={`/clients/${id}`}
            badge={{ label: 'Renew Subscription', color: '#10b981' }}
          />
        }
        rail={
          <SummaryRail
            title="Renewal Summary"
            items={summaryItems}
            total={total}
            client={client}
          />
        }
        actionBar={
          <StickyActionBar
            total={total}
            label="Renew Subscription"
            saving={saving}
            onCancel={() => router.push(`/clients/${id}`)}
          />
        }
        onSubmit={handleSubmit}
      >
        <AnimatePresence>
          {success && (
            <motion.div key="s" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#065f46', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
              ✓ {success}
            </motion.div>
          )}
          {error && (
            <motion.div key="e" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b', display: 'flex', gap: 8, alignItems: 'center' }}>
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan rows */}
        <GlassCard>
          <SectionHeading eyebrow="MEMBERSHIP" title="Select Renewal Plan" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {planRows.map((row, i) => {
              const planObj = memPlans.find(p => p.name === row.plan);
              return (
                <motion.div key={row.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  style={{ background: 'var(--bg-elevated, #f8f9fa)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border, #e5e7eb)', position: 'relative' }}>
                  {planRows.length > 1 && (
                    <button type="button" onClick={() => removePlanRow(row.id)}
                      style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Plan {i + 1} *</span>
                      <select style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14, background: 'var(--bg-white)', appearance: 'none', cursor: 'pointer' }}
                        value={row.plan} onChange={e => handlePlanSelect(row.id, e.target.value)} required>
                        <option value="">Select Plan</option>
                        {memPlans.map(p => <option key={p.name} value={p.name}>{p.name} — ₹{p.final.toLocaleString('en-IN')}</option>)}
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Start Date *</span>
                      <input type="date" style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                        value={row.startDate} onChange={e => handleStartDateChange(row.id, e.target.value)} required />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>End Date</span>
                      <input type="date" style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                        value={row.endDate} onChange={e => updateRow(row.id, 'endDate', e.target.value)} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Base Price</span>
                      <input type="number" placeholder="₹" style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                        value={row.basePrice} onChange={e => updateRow(row.id, 'basePrice', e.target.value)} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Selling Price *</span>
                      <input type="number" placeholder="₹" style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                        value={row.sellingPrice} onChange={e => updateRow(row.id, 'sellingPrice', e.target.value)} required />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Coupon</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="text" placeholder="Code" style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14, flex: 1 }}
                          value={row.coupon} onChange={e => updateRow(row.id, 'coupon', e.target.value)} />
                        <button type="button" style={{ padding: '0 12px', background: 'var(--accent, #6366f1)', color: 'var(--bg-white)', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Apply</button>
                      </div>
                    </label>
                  </div>
                  {planObj && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: '#ecfdf5', color: '#065f46', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>✓ {planObj.name}</span>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>₹{planObj.final.toLocaleString('en-IN')} net</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          <button type="button" onClick={addPlanRow}
            style={{ marginTop: 12, alignSelf: 'flex-start', background: 'transparent', border: '1.5px dashed var(--accent, #6366f1)', color: 'var(--accent, #6366f1)', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            + Add another plan
          </button>
        </GlassCard>

        {/* Payment method */}
        <GlassCard>
          <SectionHeading eyebrow="PAYMENT" title="Payment Method" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 22px', borderRadius: 12, border: paymentMethod === m.value ? '2px solid var(--accent, #6366f1)' : '2px solid var(--border, #e5e7eb)', background: paymentMethod === m.value ? 'var(--accent-soft, #eef2ff)' : 'var(--bg-white)', cursor: 'pointer', transition: 'all .18s', minWidth: 90 }}>
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: paymentMethod === m.value ? 'var(--accent, #6366f1)' : 'var(--text, #1f2937)' }}>{m.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Group ID */}
        <GlassCard>
          <SectionHeading eyebrow="OPTIONAL" title="Group / Referral" />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Group Member ID</span>
            <input style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
              placeholder="Enter Member / Enquiry code" value={groupId} onChange={e => setGroupId(e.target.value)} />
          </label>
        </GlassCard>
      </WorkflowLayout>
    </AppShell>
  );
}
