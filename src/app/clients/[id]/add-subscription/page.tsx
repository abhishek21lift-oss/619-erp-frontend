'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Plus, Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import {
  WorkflowLayout,
  WorkflowHero,
  GlassCard,
  SummaryRail,
  StickyActionBar,
  SectionHeading,
  MetricPill,
} from '@/components/workflow';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { getStoredPlans } from '@/lib/plans';
import { computeEndDate, toInputDate } from '@/lib/format';
import { validatePlanRows } from '@/lib/validators/subscription';

export default function AddSubscriptionPage() {
  return <Guard><Inner /></Guard>;
}

interface PlanRow {
  id: number;
  plan: string;
  startDate: string;
  endDate: string;
  basePrice: string;
  sellingPrice: string;
  coupon: string;
  couponApplied: boolean;
}

const PAYMENT_METHODS = [
  { value: 'CASH',   label: 'Cash',          icon: '💵' },
  { value: 'UPI',    label: 'UPI',           icon: '📲' },
  { value: 'CARD',   label: 'Card',          icon: '💳' },
  { value: 'BANK',   label: 'Bank Transfer', icon: '🏦' },
] as const;

type PayMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK';

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { toast } = useToast();

  const [client,  setClient]  = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('CASH');
  const [groupId, setGroupId] = useState('');

  const [memPlans, setMemPlans] = useState<{ name: string; base: number; final: number }[]>([]);
  const today = toInputDate(new Date());

  const [planRows, setPlanRows] = useState<PlanRow[]>([
    { id: 1, plan: '', startDate: today, endDate: '', basePrice: '', sellingPrice: '', coupon: '', couponApplied: false },
  ]);

  // ── Load plans ──
  useEffect(() => {
    const stored = getStoredPlans();
    const mp = stored
      .filter(p => p.kind === 'Membership')
      .map(p => ({ name: p.name, base: p.base_amount, final: p.final_amount }));
    setMemPlans(mp.length > 0 ? mp : [
      { name: 'Monthly',     base: 2500,  final: 2500 },
      { name: 'Quarterly',   base: 7000,  final: 6500 },
      { name: 'Half Yearly', base: 13000, final: 11500 },
      { name: 'Yearly',      base: 24000, final: 20000 },
    ]);
  }, []);

  // ── Load client ──
  useEffect(() => {
    api.clients.get(id)
      .then(c => setClient(c))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Row helpers ──
  function handlePlanSelect(rowId: number, planName: string) {
    const plan = memPlans.find(p => p.name === planName);
    setPlanRows(r => r.map(x => {
      if (x.id !== rowId) return x;
      const start = x.startDate || today;
      return {
        ...x,
        plan: planName,
        startDate: start,
        endDate: computeEndDate(start, planName),
        basePrice: plan ? String(plan.base)  : x.basePrice,
        sellingPrice: plan ? String(plan.final) : x.sellingPrice,
        couponApplied: false,
      };
    }));
  }

  function handleStartDateChange(rowId: number, newStart: string) {
    setPlanRows(r => r.map(x =>
      x.id === rowId
        ? { ...x, startDate: newStart, endDate: computeEndDate(newStart, x.plan) }
        : x
    ));
  }

  function updateRow(rowId: number, field: keyof PlanRow, value: string | boolean) {
    setPlanRows(r => r.map(x => x.id === rowId ? { ...x, [field]: value } : x));
  }

  function addPlanRow() {
    setPlanRows(r => [...r, {
      id: Date.now(), plan: '', startDate: today, endDate: '',
      basePrice: '', sellingPrice: '', coupon: '', couponApplied: false,
    }]);
  }

  function removePlanRow(rowId: number) {
    if (planRows.length <= 1) return;
    setPlanRows(r => r.filter(x => x.id !== rowId));
  }

  // ── Pricing ──
  const mrp      = planRows.reduce((s, r) => s + (parseFloat(r.basePrice)     || 0), 0);
  const net      = planRows.reduce((s, r) => s + (parseFloat(r.sellingPrice)  || 0), 0);
  const discount = Math.max(0, mrp - net);
  const fmt      = (n: number) => '₹\u202f' + n.toLocaleString('en-IN');

  // ── Submit → redirect to payment details page ──
  async function handleSubmit() {
    setError(''); setSuccess('');
    const { error: ve } = validatePlanRows(planRows);
    if (ve) { setError(ve); toast.error(ve); return; }
    const body = {
      plan_rows: planRows.map(r => ({
        plan:         r.plan,
        startDate:    r.startDate,
        endDate:      r.endDate,
        basePrice:    parseFloat(r.basePrice)    || 0,
        sellingPrice: parseFloat(r.sellingPrice) || 0,
        coupon:       r.coupon || null,
      })),
      group_id:       groupId || null,
      payment_method: paymentMethod,
    };
    sessionStorage.setItem('subscription_plan_data', JSON.stringify(body));
    router.push(`/clients/${id}/add-subscription/payment`);
  }

  // ── Loading state ──
  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white">
          <div className="max-w-[1180px] mx-auto px-4 py-8 space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl bg-white/70 border border-white/60 h-32 animate-pulse" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const initials = (client?.name || 'C').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  // ── Summary rail rows ──
  const summaryRows = [
    { label: 'MRP',              value: fmt(mrp),      strikethrough: discount > 0 },
    { label: 'Discount',         value: discount > 0 ? `− ${fmt(discount)}` : '—', muted: discount === 0 },
    { label: 'Net Sales Amount', value: fmt(net),      highlight: true },
    { label: 'Payment Method',   value: PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || 'Cash', muted: true },
  ];

  const activePlan = planRows.find(r => r.plan);

  return (
    <AppShell>
      <WorkflowLayout
        hero={
          <WorkflowHero
            backHref={`/clients/${id}`}
            backLabel="Back to Member"
            eyebrow="MEMBERSHIP ASSIGNMENT"
            title={`Add Subscription — ${client?.name || '…'}`}
            subtitle={[client?.mobile, client?.email].filter(Boolean).join('  ·  ')}
            avatar={client?.photo_url || undefined}
            initials={initials}
            badges={
              <>
                {activePlan && <MetricPill label="Plan" value={activePlan.plan} variant="info" dot />}
                {net > 0 && <MetricPill label="Total" value={fmt(net)} variant="success" />}
              </>
            }
          />
        }
        alerts={
          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </motion.div>
            )}
            {success && (
              <motion.div
                key="ok"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
              </motion.div>
            )}
          </AnimatePresence>
        }
        main={
          <>
            {/* ── Plan Rows ── */}
            <GlassCard className="p-6">
              <SectionHeading
                eyebrow="PLAN SELECTION"
                title="Membership Plans"
                description="Select one or more plans with start dates, pricing, and optional coupons."
                action={
                  <button
                    type="button"
                    onClick={addPlanRow}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Plan
                  </button>
                }
              />

              <div className="space-y-4">
                <AnimatePresence>
                  {planRows.map((row, i) => (
                    <motion.div
                      key={row.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4"
                    >
                      {/* Row header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan {i + 1}</span>
                        {planRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePlanRow(row.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Plan name chips */}
                      {memPlans.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {memPlans.map(p => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => handlePlanSelect(row.id, p.name)}
                              className={[
                                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                row.plan === p.name
                                  ? 'bg-indigo-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.35)]'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600',
                              ].join(' ')}
                            >
                              {p.name} &nbsp;·&nbsp; ₹{p.final.toLocaleString('en-IN')}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Date + price grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={row.startDate}
                            onChange={e => handleStartDateChange(row.id, e.target.value)}
                            required
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">End Date</label>
                          <input
                            type="date"
                            value={row.endDate}
                            onChange={e => updateRow(row.id, 'endDate', e.target.value)}
                            required
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Base Price (₹)</label>
                          <input
                            type="number"
                            value={row.basePrice}
                            onChange={e => updateRow(row.id, 'basePrice', e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Selling Price (₹) *</label>
                          <input
                            type="number"
                            value={row.sellingPrice}
                            onChange={e => updateRow(row.id, 'sellingPrice', e.target.value)}
                            placeholder="0"
                            required
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Coupon */}
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Coupon code (optional)"
                          value={row.coupon}
                          onChange={e => updateRow(row.id, 'coupon', e.target.value)}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, 'couponApplied', true)}
                          disabled={!row.coupon}
                          className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </GlassCard>

            {/* ── Payment Method ── */}
            <GlassCard className="p-6">
              <SectionHeading
                eyebrow="PAYMENT"
                title="Payment Method"
                description="Select how this subscription is being paid."
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={[
                      'flex flex-col items-center gap-2 py-4 rounded-xl border text-sm font-semibold transition-all',
                      paymentMethod === m.value
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)]'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300',
                    ].join(' ')}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* ── Group ID ── */}
            <GlassCard className="p-6">
              <SectionHeading
                eyebrow="GROUP"
                title="Group / Couple Membership"
                description="Link to an existing member or enquiry code if applicable."
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter Member or Enquiry Code"
                  value={groupId}
                  onChange={e => setGroupId(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button type="button" className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap transition-colors">
                  🔍 Lookup Member Code
                </button>
                <button type="button" className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap transition-colors">
                  🔍 Lookup Enquiry Code
                </button>
              </div>
            </GlassCard>
          </>
        }
        aside={
          <SummaryRail
            eyebrow="ORDER SUMMARY"
            title="Pricing Breakdown"
            rows={summaryRows}
            total={{ label: 'Total Payable', value: fmt(net) }}
          >
            {activePlan && (
              <div className="mt-1 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-700 space-y-1.5">
                <p className="font-semibold text-indigo-800">Membership Preview</p>
                <p>Plan &nbsp;<strong>{activePlan.plan}</strong></p>
                {activePlan.startDate && <p>Starts &nbsp;<strong>{activePlan.startDate}</strong></p>}
                {activePlan.endDate   && <p>Ends &nbsp;<strong>{activePlan.endDate}</strong></p>}
              </div>
            )}
          </SummaryRail>
        }
        footer={
          <StickyActionBar
            total={net > 0 ? fmt(net) : undefined}
            totalLabel="Total Payable"
            helperText={paymentMethod !== 'CASH' ? `Paying via ${PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}` : undefined}
            primaryLabel="Confirm Subscription"
            primaryLoading={saving}
            primaryDisabled={saving}
            onPrimary={handleSubmit}
            secondaryLabel="Cancel"
            onSecondary={() => router.push(`/clients/${id}`)}
          />
        }
      />
    </AppShell>
  );
}
