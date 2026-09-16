'use client';
import { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import {
  Percent, DollarSign, Loader2, RefreshCw, CheckCircle, Wallet,
  ChevronDown, Save, Users, Clock, Pencil, X, UserCheck,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import {
  commissionRowSchema, commissionToDraft, toCommissionPayload, ratePercentFromFraction,
  payoutRowSchema, payoutToDraft,
  PAYOUT_STATUS_OPTIONS,
  type CommissionDraft, type PayoutDraft, type PayoutStatus,
} from '@/lib/forms/schemas/commission';
import { errorMessage, mapApiError } from '@/lib/forms/errors';
import { Button, PullToRefresh } from '@/components/ui';
import { useToast } from '@/lib/toast';

/**
 * Format a rupee figure.
 *
 * Accepts a string as well as a number, because that is what the API actually
 * sends: Postgres NUMERIC columns arrive as strings over JSON. The body always
 * handled it — `Number(n ?? 0)` — but the signature said otherwise, and the
 * `any`-typed rows meant nothing ever checked. Typing the rows surfaced four
 * call sites passing a possible string into a parameter declared `number`.
 */
function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };
const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: 'easeOut' as const } };

/**
 * The rows these three endpoints return, narrowed to the fields this screen
 * reads.
 *
 * Previously every one was `any`, on the screen that decides what a trainer is
 * paid. A renamed column would have arrived as `undefined`, been coerced by
 * `Number(undefined ?? 0)` to 0, and shown as ₹0 with nothing failing — which
 * is the exact shape of the bug this pass exists to remove.
 *
 * Numbers are typed `number | string | null` because the API returns Postgres
 * NUMERIC columns as strings; pretending otherwise is how `.toFixed` ends up on
 * a string at runtime.
 */
type Money = number | string | null | undefined;

interface TrainerPerfRow {
  id: string;
  name?: string | null;
  active_clients?: Money;
  // `incentive_rate`, the field /pt-os/trainer-performance actually sends, as
  // a FRACTION. This interface declared `commission_pct`, which that endpoint
  // has never returned — so the percentage printed on every row was
  // `undefined ?? 0`, i.e. 0% for every trainer, and the edit box opened empty.
  incentive_rate?: Money;
  monthly_commission?: Money;
  total_incentives?: Money;
}

interface PayoutRow {
  trainer_id: string;
  trainer_name?: string | null;
  payout_status?: string | null;
  paid_amount?: Money;
  total_commission?: Money;
}

interface CommissionRow {
  commission_amt?: Money;
}

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' };
const label = { fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-muted)' };
const value = { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' };

export default function CommissionsPage() {
  const { toast } = useToast();
  const [month, setMonthRaw] = useState(() => new Date().toISOString().slice(0, 7));

  const [calculating, setCalculating] = useState(false);

  // `{ data: [...] }` is the envelope these three endpoints return. Narrowed
  // once here rather than cast at each read, so a shape change surfaces in one
  // place instead of as a silent `undefined` inside a Number().
  const rowsOf = <T,>(r: unknown): T[] => {
    const data = (r as { data?: unknown } | null)?.data;
    return Array.isArray(data) ? (data as T[]) : [];
  };

  const commissions = useAsync(() => api.pt.commissions({}).then(rowsOf<CommissionRow>), []);
  const payouts = useAsync(() => api.pt.payouts({ month }).then(rowsOf<PayoutRow>), [month]);
  const perf = useAsync(() => api.pt.trainerPerformance().then(rowsOf<TrainerPerfRow>), []);

  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [editingPayout, setEditingPayout] = useState<string | null>(null);
  // Drafts hold RAW STRINGS, not numbers. A half-typed value must never be a
  // number that reads as deliberate, and `Number('')` is 0.
  const [commissionDraft, setCommissionDraft] = useState<Record<string, CommissionDraft>>({});
  const [payoutDraft, setPayoutDraft] = useState<Record<string, PayoutDraft>>({});
  // Per-row validation messages, keyed by trainer then field.
  const [rowErrors, setRowErrors] = useState<Record<string, Record<string, string>>>({});

  /**
   * Changing the month abandons every open edit.
   *
   * Drafts are keyed by trainer id alone, so without this a figure typed for
   * March survives the switch to April and is saved against it. The payouts
   * list refetches; the drafts did not.
   */
  const setMonth = useCallback((next: string) => {
    setMonthRaw(next);
    setCommissionDraft({});
    setPayoutDraft({});
    setRowErrors({});
    setEditingCommission(null);
    setEditingPayout(null);
  }, []);

  const [savingCommission, setSavingCommission] = useState<string | null>(null);
  const [savingPayout, setSavingPayout] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    await Promise.all([commissions.refetch(), payouts.refetch(), perf.refetch()]);
  }, [commissions.refetch, payouts.refetch, perf.refetch]);

  const perfData = perf.data ?? [];
  const payoutsData = payouts.data ?? [];
  const commissionsData = commissions.data ?? [];

  const totalCommission = commissionsData.reduce((s: number, c: CommissionRow) => s + Number(c.commission_amt ?? 0), 0);
  const totalPayout = payoutsData.filter((p: PayoutRow) => p.payout_status === 'paid').reduce((s: number, p: PayoutRow) => s + Number(p.paid_amount ?? p.total_commission ?? 0), 0);
  const pendingPayouts = payoutsData.filter((p: PayoutRow) => p.payout_status !== 'paid').reduce((s: number, p: PayoutRow) => s + Number(p.total_commission ?? 0), 0);
  const activeTrainers = perfData.filter((t: TrainerPerfRow) => Number(t.active_clients ?? 0) > 0).length;

  async function handleCalculate() {
    setCalculating(true);
    try {
      await api.pt.calculateCommissions(month);
      toast.success('Commissions calculated successfully');
      commissions.refetch();
      payouts.refetch();
      perf.refetch();
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Calculation failed'));
    } finally {
      setCalculating(false);
    }
  }

  const handleEditCommission = useCallback((trainerId: string, trainer: TrainerPerfRow) => {
    setEditingCommission(trainerId);
    // `?? ''` via commissionToDraft, not `?? 0`: a trainer with no percentage
    // recorded shows an empty box rather than a 0% nobody chose.
    setCommissionDraft(prev => ({ ...prev, [trainerId]: commissionToDraft(trainer) }));
    setRowErrors(prev => ({ ...prev, [trainerId]: {} }));
  }, []);

  const handleSaveCommission = useCallback(async (trainerId: string) => {
    const draft = commissionDraft[trainerId];
    if (!draft) return;

    // Parse before writing. The draft holds strings; this is the one place they
    // become numbers, and a blank box fails here rather than arriving as 0.
    const parsed = commissionRowSchema.safeParse(draft);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !errs[key]) errs[key] = issue.message;
      }
      setRowErrors(prev => ({ ...prev, [trainerId]: errs }));
      return;
    }

    setRowErrors(prev => ({ ...prev, [trainerId]: {} }));
    setSavingCommission(trainerId);
    try {
      await api.pt.updateCommission(trainerId, {
        // toCommissionPayload converts the percent the person typed into the
        // fraction the column stores. Sending the percent raw put 12.5 into a
        // NUMERIC(5,4) CHECK (0..1) column — a 500 — or, for anything under 1,
        // stored a rate a hundred times what was meant.
        ...toCommissionPayload(parsed.data),
      });
      toast.success('Commission updated');
      setEditingCommission(null);
      perf.refetch();
      commissions.refetch();
    } catch (e: unknown) {
      const mapped = mapApiError(e, { fallback: 'Failed to update commission' });
      toast.error(mapped.formError ?? 'Failed to update commission');
      if (Object.keys(mapped.fieldErrors).length) {
        setRowErrors(prev => ({ ...prev, [trainerId]: mapped.fieldErrors }));
      }
    } finally {
      setSavingCommission(null);
    }
  }, [commissionDraft, toast, perf, commissions]);

  const handleEditPayout = useCallback((trainerId: string, payout: PayoutRow) => {
    setEditingPayout(trainerId);
    setPayoutDraft(prev => ({ ...prev, [trainerId]: payoutToDraft(payout) }));
    setRowErrors(prev => ({ ...prev, [trainerId]: {} }));
  }, []);

  const handleSavePayout = useCallback(async (trainerId: string) => {
    const draft = payoutDraft[trainerId];
    if (!draft) return;

    const parsed = payoutRowSchema.safeParse(draft);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !errs[key]) errs[key] = issue.message;
      }
      setRowErrors(prev => ({ ...prev, [trainerId]: errs }));
      return;
    }

    setRowErrors(prev => ({ ...prev, [trainerId]: {} }));
    setSavingPayout(trainerId);
    try {
      await api.pt.updatePayout(trainerId, {
        payout_status: parsed.data.payout_status,
        paid_amount: parsed.data.paid_amount,
      });
      toast.success('Payout updated');
      setEditingPayout(null);
      payouts.refetch();
    } catch (e: unknown) {
      const mapped = mapApiError(e, { fallback: 'Failed to update payout' });
      toast.error(mapped.formError ?? 'Failed to update payout');
      if (Object.keys(mapped.fieldErrors).length) {
        setRowErrors(prev => ({ ...prev, [trainerId]: mapped.fieldErrors }));
      }
    } finally {
      setSavingPayout(null);
    }
  }, [payoutDraft, toast, payouts]);

  const handleMarkAllPaid = useCallback(async () => {
    try {
      await api.pt.markAllPayoutsPaid(month);
      toast.success('All payouts marked as paid');
      payouts.refetch();
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Failed to mark all paid'));
    }
  }, [month, toast, payouts]);

  return (
    <Guard role="admin">
      <PullToRefresh onRefresh={refreshAll}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px' }}>
        {/* ── Hero ── */}
        <m.div {...fadeUp}
          style={{ padding: '32px 40px', marginBottom: 32, borderBottom: '1px solid var(--border)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'rgba(16,185,129,0.1)' }}>
              <Percent size={18} style={{ color: '#10b981' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10b981' }}>Finance</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--text-primary)', margin: 0 }}>
            Trainer Commissions
          </h1>
          <p style={{ marginTop: 10, maxWidth: 500, fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)', fontWeight: 400 }}>
            Calculate monthly commissions, manage payouts, and track trainer performance. Full admin control over all financial data.
          </p>
        </m.div>

        {/* ── Controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <div style={{ position: 'relative' }}>
            <input aria-label="Month" type="month" value={month} onChange={e => setMonth(e.target.value)}
              style={{
                borderRadius: 12, padding: '10px 36px 10px 16px', fontSize: 14, fontWeight: 500,
                background: 'var(--bg-card)',
                border: '1px solid #cbd5e1', color: 'var(--text-primary)', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                minWidth: 180, cursor: 'pointer', fontFamily: 'inherit',
              }}
            />
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)', pointerEvents: 'none' }} />
          </div>
          <Button onClick={handleCalculate} disabled={calculating}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', borderRadius: 12, fontWeight: 600, border: 'none', padding: '10px 22px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: calculating ? 'not-allowed' : 'pointer', opacity: calculating ? 0.7 : 1, boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
            {calculating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            Calculate Commissions
          </Button>
        </div>

        {/* ── KPI Cards ── */}
        <m.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Commission', value: fmtINR(totalCommission), icon: <DollarSign size={18} />, accent: '#10b981', glow: 'rgba(16,185,129,0.15)' },
            { label: 'Total Paid Out', value: fmtINR(totalPayout), icon: <CheckCircle size={18} />, accent: '#10b981', glow: 'rgba(16,185,129,0.15)' },
            { label: 'Pending Payouts', value: fmtINR(pendingPayouts), icon: <Clock size={18} />, accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
            { label: 'Active Trainers', value: activeTrainers, icon: <Users size={18} />, accent: '#0067e0', glow: 'rgba(0,103,224,0.15)' },
          ].map((kpi, i) => (
            <m.div key={i} variants={itemVariants}
              style={{
                position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '22px 24px',
                ...card,
              }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ ...label, textTransform: 'uppercase' }}>{kpi.label}</span>
                  <div style={{ display: 'flex', width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--bg-subtle)', color: kpi.accent }}>
                    {kpi.icon}
                  </div>
                </div>
                <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{kpi.value}</p>
              </div>
            </m.div>
          ))}
        </m.div>

        {/* ── Main grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* ── Trainer Performance ── */}
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              borderRadius: 20, padding: 24,
              ...card,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={18} style={{ color: '#10b981' }} />
                Trainer Performance
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text-disabled)', fontWeight: 500 }}>{perfData.length} trainers</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
              {perfData.map((t: TrainerPerfRow, i: number) => {
                const isEditing = editingCommission === t.id;
                const draft = commissionDraft[t.id] || {};
                const saving = savingCommission === t.id;
                return (
                  <m.div key={t.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{
                      borderRadius: 14, padding: '14px 16px',
                      background: isEditing ? 'rgba(16,185,129,0.04)' : '#F8FAFC',
                      border: isEditing ? '1px solid rgba(16,185,129,0.3)' : '1px solid #e2e8f0',
                      transition: 'all 0.2s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Users size={10} />
                            {t.active_clients ?? 0} active
                          </span>
                          {/* Named with the trainer. One row per trainer means a
                              dozen buttons called "Edit" and a dozen called
                              "Save", which is what a screen reader reads out —
                              on the screen that decides what each of them is
                              paid. */}
                          {!isEditing && (
                            <button onClick={() => handleEditCommission(t.id, t)}
                              aria-label={`Edit ${t.name}'s commission`}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: 'var(--text-disabled)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onMouseOver={e => (e.currentTarget.style.color = '#10b981')}
                              onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}>
                              <Pencil size={12} /> Edit
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditing && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditingCommission(null); }}
                            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <X size={13} /> Cancel
                          </button>
                          <button onClick={() => handleSaveCommission(t.id)} disabled={saving}
                            aria-label={`Save ${t.name}'s commission`}
                            style={{
                              background: saving ? '#047857' : 'linear-gradient(135deg, #10b981, #059669)',
                              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                              display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
                              boxShadow: saving ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
                            }}>
                            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>

                    {!isEditing ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        <div>
                          <span style={label}>Commission %</span>
                          <p style={{ margin: '2px 0 0', ...value }}>{ratePercentFromFraction(t.incentive_rate) || '0'}%</p>
                        </div>
                        <div>
                          <span style={label}>Commission</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmtINR(t.monthly_commission)}</p>
                        </div>
                        <div>
                          <span style={label}>Incentives</span>
                          <p style={{ margin: '2px 0 0', ...value }}>{fmtINR(t.total_incentives)}</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        <div>
                          <label htmlFor={`comm-pct-${t.id}`} style={{ ...label, textTransform: 'uppercase' }}>Commission %</label>
                          <input id={`comm-pct-${t.id}`} type="text" inputMode="decimal" value={draft.commission_pct}
                            onChange={e => setCommissionDraft(prev => ({ ...prev, [t.id]: { ...prev[t.id]!, commission_pct: e.target.value } }))}
                            style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-card)', fontFamily: 'inherit' }}
                          />
                          {rowErrors[t.id]?.commission_pct && (
                            <p role="alert" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.3, color: 'var(--danger-text)' }}>
                              {rowErrors[t.id]!.commission_pct}
                            </p>
                          )}
                        </div>
                        <div>
                          <label htmlFor={`comm-amt-${t.id}`} style={{ ...label, textTransform: 'uppercase' }}>Amount (₹)</label>
                          <input id={`comm-amt-${t.id}`} type="text" inputMode="decimal" value={draft.commission_amount}
                            onChange={e => setCommissionDraft(prev => ({ ...prev, [t.id]: { ...prev[t.id]!, commission_amount: e.target.value } }))}
                            style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#059669', background: 'var(--bg-card)', fontFamily: 'inherit' }}
                          />
                          {rowErrors[t.id]?.commission_amount && (
                            <p role="alert" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.3, color: 'var(--danger-text)' }}>
                              {rowErrors[t.id]!.commission_amount}
                            </p>
                          )}
                        </div>
                        <div>
                          <label htmlFor={`comm-inc-${t.id}`} style={{ ...label, textTransform: 'uppercase' }}>Incentives (₹)</label>
                          <input id={`comm-inc-${t.id}`} type="text" inputMode="decimal" value={draft.incentives}
                            onChange={e => setCommissionDraft(prev => ({ ...prev, [t.id]: { ...prev[t.id]!, incentives: e.target.value } }))}
                            style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-card)', fontFamily: 'inherit' }}
                          />
                          {rowErrors[t.id]?.incentives && (
                            <p role="alert" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.3, color: 'var(--danger-text)' }}>
                              {rowErrors[t.id]!.incentives}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </m.div>
                );
              })}
              {perfData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-disabled)', margin: 0 }}>No trainer data yet. Calculate commissions to populate.</p>
                </div>
              )}
            </div>
          </m.div>

          {/* ── Payouts ── */}
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              borderRadius: 20, padding: 24,
              ...card,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} style={{ color: '#10b981' }} />
                Payouts
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>{month}</span>
                {payoutsData.some((p: PayoutRow) => p.payout_status !== 'paid') && (
                  <button onClick={handleMarkAllPaid}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 8,
                      fontSize: 11, fontWeight: 700, color: '#fff',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                    }}>
                    <CheckCircle size={13} /> Mark All Paid
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
              {payoutsData.map((p: PayoutRow) => {
                const tid = String(p.trainer_id);
                const isEditing = editingPayout === tid;
                const draft = payoutDraft[tid] || {};
                const saving = savingPayout === tid;
                return (
                  <m.div key={tid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      borderRadius: 14, padding: '14px 16px',
                      background: isEditing ? 'rgba(16,185,129,0.04)' : '#F8FAFC',
                      border: isEditing ? '1px solid rgba(16,185,129,0.3)' : '1px solid #e2e8f0',
                      transition: 'all 0.2s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.trainer_name}</span>
                        {!isEditing && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.03em',
                            background: p.payout_status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            color: p.payout_status === 'paid' ? '#059669' : '#d97706',
                            border: p.payout_status === 'paid' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)',
                          }}>
                            {p.payout_status || 'unknown'}
                          </span>
                        )}
                      </div>
                      {!isEditing && (
                        <button onClick={() => handleEditPayout(tid, p)}
                          aria-label={`Edit ${p.trainer_name ?? 'trainer'}'s payout`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'var(--text-disabled)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onMouseOver={e => (e.currentTarget.style.color = '#10b981')}
                          onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}>
                          <Pencil size={12} /> Edit
                        </button>
                      )}
                    </div>

                    {!isEditing ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <span style={label}>Commission Total</span>
                          <p style={{ margin: '2px 0 0', ...value }}>{fmtINR(p.total_commission)}</p>
                        </div>
                        <div>
                          <span style={label}>Net Amount</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmtINR(p.paid_amount ?? p.total_commission)}</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label htmlFor={`payout-status-${tid}`} style={{ ...label, textTransform: 'uppercase' }}>Status</label>
                          <select id={`payout-status-${tid}`} value={draft.payout_status}
                            onChange={e => setPayoutDraft(prev => ({ ...prev, [tid]: { ...prev[tid]!, payout_status: e.target.value as PayoutStatus } }))}
                            style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-card)', fontFamily: 'inherit', cursor: 'pointer' }}>
                            {PAYOUT_STATUS_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`payout-paid-${tid}`} style={{ ...label, textTransform: 'uppercase' }}>Paid Amount (₹)</label>
                          <input id={`payout-paid-${tid}`} type="text" inputMode="decimal" value={draft.paid_amount}
                            onChange={e => setPayoutDraft(prev => ({ ...prev, [tid]: { ...prev[tid]!, paid_amount: e.target.value } }))}
                            style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#059669', background: 'var(--bg-card)', fontFamily: 'inherit' }}
                          />
                          {rowErrors[tid]?.paid_amount && (
                            <p role="alert" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.3, color: 'var(--danger-text)' }}>
                              {rowErrors[tid]!.paid_amount}
                            </p>
                          )}
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingPayout(null)}
                            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <X size={13} /> Cancel
                          </button>
                          <button onClick={() => handleSavePayout(tid)} disabled={saving}
                            aria-label={`Save ${p.trainer_name ?? 'trainer'}'s payout`}
                            style={{
                              background: saving ? '#047857' : 'linear-gradient(135deg, #10b981, #059669)',
                              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              boxShadow: saving ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
                            }}>
                            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </m.div>
                );
              })}
              {payoutsData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-disabled)', margin: 0 }}>No payouts for this month yet.</p>
                </div>
              )}
            </div>
          </m.div>
        </div>
      </div>
      </PullToRefresh>
    </Guard>
  );
}
