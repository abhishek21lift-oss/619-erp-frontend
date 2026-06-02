'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Sparkles, ChevronRight, Check, Calendar,
  Hash, Tag, TrendingUp, Wallet, IndianRupee, Percent,
  Users, Crown, Zap, Target, Star, ArrowRight, User,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import {
  WorkflowLayout, WorkflowHero, SummaryRail, StickyActionBar,
  SectionHeading, GlassCard,
} from '@/components/workflow';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { getStoredPlans } from '@/lib/plans';
import { computeEndDate, toInputDate } from '@/lib/format';

export default function AssignPTPage() {
  return <Guard><Inner /></Guard>;
}

const PT_PLANS = [
  { name: 'PT Monthly',     base: 6000,  final: 6000,  sessions: 12, color: '#06B6D4', gradient: 'from-cyan-500 to-blue-500', icon: Zap },
  { name: 'PT Quarterly',   base: 16500, final: 15000, sessions: 36, color: '#8B5CF6', gradient: 'from-violet-500 to-purple-500', icon: Target },
  { name: 'PT Half-Yearly', base: 30000, final: 26000, sessions: 72, color: '#F59E0B', gradient: 'from-amber-500 to-orange-500', icon: TrendingUp },
  { name: 'PT Annual',      base: 55000, final: 45000, sessions: 144,color: '#10B981', gradient: 'from-emerald-500 to-green-500', icon: Crown },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash',     icon: '💵', color: '#10B981' },
  { value: 'UPI',  label: 'UPI',      icon: '📱', color: '#8B5CF6' },
  { value: 'CARD', label: 'Card',     icon: '💳', color: '#3B82F6' },
  { value: 'BANK', label: 'Bank Trf', icon: '🏦', color: '#F59E0B' },
  { value: 'CHEQUE', label: 'Cheque', icon: '📝', color: '#EC4899' },
];

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [ptPlans, setPtPlans] = useState(PT_PLANS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [form, setForm] = useState({
    membership_plan: '', trainer_id: '',
    secondary_trainer_ids: [] as string[],
    total_sessions: '', start_date: '', end_date: '',
    base_price: '', selling_price: '', coupon: '', paid_amount: '',
    group_id: '',
  });

  useEffect(() => {
    Promise.all([api.clients.get(id), api.trainers.list().catch((err: any) => { toast.error(err?.message || 'Failed to load trainers'); return []; })])
      .then(([c, t]) => {
        setClient(c);
        setTrainers(Array.isArray(t) ? t : []);
      })
      .catch((e: any) => { setError(e.message); toast.error(e.message || 'Failed to load'); })
      .finally(() => setLoading(false));
    const stored = getStoredPlans();
    const pt = stored.filter(p => p.kind === 'PT').map(p => ({
      name: p.name, base: p.base_amount, final: p.final_amount,
      sessions: (p as any).sessions || 12,
      color: '#8B5CF6', gradient: 'from-violet-500 to-purple-500', icon: Dumbbell,
    }));
    if (pt.length > 0) setPtPlans(pt);
  }, [id, toast]);

  function set(field: string, value: string | string[]) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handlePlanSelect(planName: string) {
    const plan = ptPlans.find(p => p.name === planName);
    setForm(f => {
      const start = f.start_date || toInputDate(new Date());
      const base = plan ? String(plan.base) : '';
      const sell = plan ? String(plan.final) : '';
      return {
        ...f, membership_plan: planName, start_date: start,
        end_date: computeEndDate(start, planName),
        base_price: base, selling_price: sell,
        paid_amount: sell,
        total_sessions: plan ? String(plan.sessions) : f.total_sessions,
      };
    });
  }

  function handleStartDate(newStart: string) {
    setForm(f => ({
      ...f, start_date: newStart,
      end_date: computeEndDate(newStart, f.membership_plan),
    }));
  }

  const mrp = parseFloat(form.base_price) || 0;
  const total = parseFloat(form.selling_price) || 0;
  const discount = Math.max(0, mrp - total);
  const paidNum = parseFloat(form.paid_amount) || 0;
  const balance = Math.max(0, total - paidNum);
  const balColor = balance === 0 ? '#10B981' : '#F59E0B';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.trainer_id) {
      const m = 'Please select a trainer';
      setError(m);
      toast.error(m);
      return;
    }
    if (!form.start_date || !form.end_date) {
      const m = 'PT start and end dates are required';
      setError(m);
      toast.error(m);
      return;
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      const m = 'End date must be after start date';
      setError(m);
      toast.error(m);
      return;
    }
    setSaving(true);
    try {
      const result = await api.clients.assignPt(id, {
        trainer_id: form.trainer_id,
        pt_start_date: form.start_date,
        pt_end_date: form.end_date,
        membership_plan: form.membership_plan || null,
        sessions: form.total_sessions ? parseInt(form.total_sessions) : null,
        base_price: mrp,
        selling_price: total,
        paid_amount: paidNum,
        balance_amount: balance,
        coupon: form.coupon || null,
        payment_method: paymentMethod,
      });
      const m = result?.message || 'Personal Training assigned successfully!';
      setSuccess(m);
      toast.success(m);
      setTimeout(() => router.push(`/clients/${id}`), 900);
    } catch (err: any) {
      const m = err?.message || 'Failed to assign PT';
      setError(m);
      toast.error(m);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-[#F5F5F7] via-indigo-50/30 to-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-[3px] border-[#8B5CF6] border-t-transparent animate-spin" />
            <span className="text-[13px] font-medium text-[var(--text-muted)]">Loading assignment form...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  const summaryItems = [
    { label: 'Plan', value: form.membership_plan || '—' },
    { label: 'Trainer', value: trainers.find(t => t.id === form.trainer_id)?.name || '—' },
    { label: 'Sessions', value: form.total_sessions || '—' },
    { label: 'Base Price', value: `₹ ${mrp.toLocaleString('en-IN')}` },
    { label: 'Discount', value: discount > 0 ? `-₹ ${discount.toLocaleString('en-IN')}` : '—', highlight: discount > 0 },
    { label: 'Paid', value: `₹ ${paidNum.toLocaleString('en-IN')}` },
    { label: 'Balance', value: `₹ ${balance.toLocaleString('en-IN')}`, color: balColor },
  ];

  return (
    <AppShell>
      <WorkflowLayout
        hero={
          <WorkflowHero
            client={client}
            backHref={`/clients/${id}`}
            badge={{
              label: 'Assign Personal Training',
              color: '#8B5CF6',
            }}
          />
        }
        rail={<SummaryRail title="PT Summary" items={summaryItems} total={paidNum} client={client} />}
        actionBar={
          <StickyActionBar
            total={paidNum}
            label={saving ? 'Assigning...' : 'Assign Personal Training'}
            saving={saving}
            onCancel={() => router.push(`/clients/${id}`)}
          />
        }
        onSubmit={handleSubmit}
      >
        <AnimatePresence>
          {success && (
            <motion.div
              key="s"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-2xl bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.12)] px-5 py-3.5 text-[13px] font-semibold text-[#10B981]"
            >
              <Check size={15} strokeWidth={2.5} />
              {success}
            </motion.div>
          )}
          {error && (
            <motion.div
              key="e"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-2xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.12)] px-5 py-3.5 text-[13px] font-semibold text-[#EF4444]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(239,68,68,0.10)] text-[10px] font-bold">!</span>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PT Plan Selection ── */}
        <GlassCard>
          <SectionHeading
            eyebrow="PT MEMBERSHIP"
            title="Choose a Personal Training Plan"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ptPlans.map(p => {
              const Icon = p.icon;
              const selected = form.membership_plan === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePlanSelect(p.name)}
                  className={cn(
                    'relative flex flex-col gap-2 rounded-2xl p-4 text-left transition-all duration-200 overflow-hidden group',
                    selected
                      ? 'shadow-[0_0_0_2px_rgba(139,92,246,0.4),0_8px_24px_rgba(139,92,246,0.12)]'
                      : 'border border-white/60 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]',
                  )}
                  style={{
                    background: selected
                      ? `linear-gradient(135deg, ${p.color}12, ${p.color}06)`
                      : 'var(--bg-card)',
                  }}
                >
                  {selected && (
                    <div
                      className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ background: p.color }}
                    >
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200"
                    style={{
                      background: selected
                        ? `linear-gradient(135deg, ${p.color}, ${p.color}cc)`
                        : '#F5F5F7',
                    }}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.5}
                      className={selected ? 'text-white' : 'text-[var(--text-muted)]'}
                    />
                  </div>
                  <div>
                    <p
                      className="text-[13px] font-bold leading-tight"
                      style={{ color: selected ? p.color : '#0B0B0F' }}
                    >
                      {p.name}
                    </p>
                    <p className="text-[18px] font-extrabold mt-0.5 tracking-tight text-[var(--text-primary)]">
                      ₹{p.final.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium">
                      {p.sessions} sessions
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* ── Trainer Assignment ── */}
        <GlassCard>
          <SectionHeading eyebrow="TRAINER" title="Assign Trainer" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {trainers.map((t: any) => {
              const selected = form.trainer_id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('trainer_id', t.id)}
                  className={cn(
                    'flex flex-col items-center gap-2.5 rounded-2xl p-4 transition-all duration-200',
                    selected
                      ? 'bg-gradient-to-b from-violet-500/10 to-violet-500/5 shadow-[0_0_0_2px_rgba(139,92,246,0.30)]'
                      : 'bg-white/80 border border-white/60 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]',
                  )}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-[14px] font-bold overflow-hidden transition-all duration-200"
                    style={{
                      background: selected
                        ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
                        : '#F5F5F7',
                      color: selected ? '#fff' : '#4A4E57',
                      boxShadow: selected ? '0 4px 12px rgba(139,92,246,0.25)' : 'none',
                    }}
                  >
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={t.name} className="h-full w-full object-cover" />
                    ) : (
                      (t.name || '?')
                        .split(' ')
                        .map((w: string) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    )}
                  </div>
                  <div className="text-center">
                    <p
                      className="text-[12px] font-bold leading-tight"
                      style={{ color: selected ? '#6D28D9' : '#0B0B0F' }}
                    >
                      {t.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {t.biometric_code || 'Trainer'}
                    </p>
                  </div>
                  {selected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B5CF6]">
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Trainers & Sessions */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-[0.04em]">
                <Users size={12} className="inline mr-1" />
                Secondary Trainer(s)
              </label>
              <select
                multiple
                className="w-full h-[90px] rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[rgba(139,92,246,0.3)] focus:bg-white transition-all"
                value={form.secondary_trainer_ids}
                onChange={e =>
                  set(
                    'secondary_trainer_ids',
                    Array.from(e.target.selectedOptions, o => o.value),
                  )
                }
              >
                {trainers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-[0.04em]">
                <Hash size={12} className="inline mr-1" />
                Total Sessions
              </label>
              <input
                type="number"
                placeholder="0"
                className="w-full h-11 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[rgba(139,92,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,92,246,0.06)] transition-all"
                value={form.total_sessions}
                onChange={e => set('total_sessions', e.target.value)}
              />
            </div>
          </div>
        </GlassCard>

        {/* ── Schedule ── */}
        <GlassCard>
          <SectionHeading eyebrow="SCHEDULE" title="Training Duration" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-[0.04em]">
                <Calendar size={12} className="inline mr-1" />
                Start Date *
              </label>
              <input
                type="date"
                required
                className="w-full h-11 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[rgba(139,92,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,92,246,0.06)] transition-all"
                value={form.start_date}
                onChange={e => handleStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-[0.04em]">
                <Calendar size={12} className="inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                className="w-full h-11 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[rgba(139,92,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,92,246,0.06)] transition-all"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
              />
            </div>
          </div>
        </GlassCard>

        {/* ── Payment ── */}
        <GlassCard>
          <SectionHeading
            eyebrow="PAYMENT"
            title="Payment Details"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-[0.04em]">
                <IndianRupee size={12} className="inline mr-1" />
                Base Price
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[var(--text-muted)]">₹</span>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full h-11 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] pl-8 pr-3.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[rgba(16,185,129,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(16,185,129,0.06)] transition-all"
                  value={form.base_price}
                  onChange={e => set('base_price', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-[0.04em]">
                <Tag size={12} className="inline mr-1" />
                Selling Price *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[var(--text-muted)]">₹</span>
                <input
                  type="number"
                  required
                  placeholder="0"
                  className="w-full h-11 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] pl-8 pr-3.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[rgba(16,185,129,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(16,185,129,0.06)] transition-all"
                  value={form.selling_price}
                  onChange={e => set('selling_price', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-[0.04em]">
                <Wallet size={12} className="inline mr-1" />
                Paid Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[var(--text-muted)]">₹</span>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="0"
                  className="w-full h-11 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] pl-8 pr-3.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[rgba(245,158,11,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,158,11,0.06)] transition-all"
                  value={form.paid_amount}
                  onChange={e => set('paid_amount', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-[0.04em]">
                <TrendingUp size={12} className="inline mr-1" />
                Balance Amount
              </label>
              <div
                className="flex h-11 items-center rounded-xl border px-3.5 text-[14px] font-bold transition-all"
                style={{
                  borderColor: balance === 0 ? 'rgba(16,185,129,0.20)' : 'rgba(245,158,11,0.20)',
                  background: balance === 0 ? 'rgba(16,185,129,0.04)' : 'rgba(245,158,11,0.04)',
                  color: balColor,
                }}
              >
                ₹ {balance.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-[0.04em]">
                <Percent size={12} className="inline mr-1" />
                Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  className="flex-1 h-11 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[rgba(139,92,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,92,246,0.06)] transition-all uppercase tracking-[0.08em]"
                  value={form.coupon}
                  onChange={e => set('coupon', e.target.value)}
                />
                <button
                  type="button"
                  className="flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(139,92,246,0.20)] hover:shadow-[0_4px_16px_rgba(139,92,246,0.30)] transition-all"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mt-5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-2.5 uppercase tracking-[0.04em]">
              <Wallet size={12} className="inline mr-1" />
              Payment Method
            </p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all duration-200',
                    paymentMethod === m.value
                      ? 'shadow-[0_0_0_2px]'
                      : 'bg-white/80 border border-white/60 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
                  )}
                  style={{
                    background:
                      paymentMethod === m.value
                        ? `linear-gradient(135deg, ${m.color}12, ${m.color}06)`
                        : undefined,
                    boxShadow:
                      paymentMethod === m.value
                        ? `0 0 0 2px ${m.color}40`
                        : undefined,
                    color: paymentMethod === m.value ? m.color : '#4A4E57',
                  }}
                >
                  <span className="text-[16px]">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      </WorkflowLayout>
    </AppShell>
  );
}
