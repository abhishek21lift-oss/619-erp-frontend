'use client';

// Studio-facing subscription screen. Standalone (no AppShell) so a frozen studio
// gets a clean, self-contained page instead of a half-broken dashboard. Shows the
// current trial/subscription state, the plan catalogue with live launch pricing,
// and the studio's invoice history. Activation is handled by the platform team
// (admin-activated billing), so the CTA is "contact to subscribe", not a checkout.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert, Check, Crown, Loader2, LogOut, Sparkles, Clock, ArrowRight,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { SubscriptionStatus, SubPlan, SubInvoice } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';

const FROZEN_STATES = ['frozen', 'trial_expired', 'expired', 'cancelled', 'suspended'];
const fmtINR = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function SubscriptionPage() {
  return (
    <Guard>
      <SubscriptionScreen />
    </Guard>
  );
}

function SubscriptionScreen() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [slots, setSlots] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<SubInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState('');
  const [requested, setRequested] = useState(false);

  const requestActivation = async (planCode?: string) => {
    setRequesting(planCode || 'general');
    try {
      const r = await api.subscription.requestActivation(planCode);
      setRequested(true);
      toast.success(r.data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request');
    } finally { setRequesting(''); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, pl] = await Promise.all([api.subscription.status(), api.subscription.plans()]);
      setStatus(st.data);
      setPlans(pl.data.plans ?? []);
      setSlots(pl.data.founder_slots_remaining);
      try { setInvoices((await api.subscription.invoices()).data ?? []); } catch { /* frozen can still read */ }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const frozen = status ? FROZEN_STATES.includes(status.state) : false;
  const onTrial = status?.state === 'trial';
  const active = status?.state === 'active';

  const trialPct = useMemo(() => {
    if (!onTrial || status?.trial_days_left == null) return 0;
    return Math.min(1, Math.max(0, (7 - status.trial_days_left) / 7));
  }, [onTrial, status]);

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center" style={{ background: '#050816' }}>
      <Loader2 size={30} className="animate-spin" style={{ color: '#F59E0B' }} />
    </div>;
  }

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(180deg,#050816 0%,#0b1020 100%)' }}>
      {/* Top bar */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
            <Sparkles size={17} color="#fff" />
          </div>
          <div>
            <p className="text-[14px] font-[820] tracking-tight text-white">MY PT STUDIO</p>
            <p className="text-[11px]" style={{ color: '#94a3b8' }}>{user?.organization_name || 'Your studio'}</p>
          </div>
        </div>
        <button onClick={() => logout()} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-[650] text-slate-300 transition hover:bg-white/5">
          <LogOut size={13} /> Sign out
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-5 pb-16">
        {/* Hero — frozen vs trial vs active */}
        {frozen && (
          <div className="mb-8 rounded-[22px] p-7 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <ShieldAlert size={26} style={{ color: '#f87171' }} />
            </div>
            <h1 className="text-[24px] font-[860] tracking-[-0.02em] text-white">{status?.state === 'trial_expired' || status?.state === 'frozen' ? 'Your trial has expired' : 'Your subscription is inactive'}</h1>
            <p className="mx-auto mt-2 max-w-[440px] text-[14px]" style={{ color: '#cbd5e1' }}>
              {status?.reason || 'Please subscribe to continue using MY PT STUDIO.'}
            </p>
            <p className="mx-auto mt-3 max-w-[440px] text-[12.5px]" style={{ color: '#94a3b8' }}>
              Your data is safe — clients, workouts, assessments and files are all preserved. Choose a plan below and contact us to reactivate instantly.
            </p>
          </div>
        )}

        {onTrial && (
          <div className="mb-8 rounded-[22px] p-6" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Clock size={20} style={{ color: '#fbbf24' }} />
                <div>
                  <h1 className="text-[19px] font-[820] text-white">{status?.trial_days_left ?? 0} {status?.trial_days_left === 1 ? 'day' : 'days'} left in your free trial</h1>
                  <p className="text-[12.5px]" style={{ color: '#cbd5e1' }}>All premium features are unlocked. Pick a plan to keep them after your trial ends on {fmtDate(status?.trial_ends_at)}.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }}>
              <div className="h-full rounded-full" style={{ width: `${trialPct * 100}%`, background: 'linear-gradient(90deg,#F59E0B,#fbbf24)' }} />
            </div>
          </div>
        )}

        {active && status && (
          <div className="mb-8 rounded-[22px] p-6" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[19px] font-[820] text-white">{status.plan?.name || 'Active'} plan</h1>
                  {status.is_founder && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]" style={{ background: 'rgba(245,158,11,0.18)', color: '#fcd34d' }}>
                      <Crown size={10} /> Founder #{status.founder_number}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px]" style={{ color: '#cbd5e1' }}>
                  {status.current_period_end
                    ? `${status.renewal_due ? 'Renews soon — ' : ''}Renews on ${fmtDate(status.current_period_end)}${status.period_days_left != null ? ` · ${status.period_days_left} days left` : ''}`
                    : 'Active · no expiry'}
                  {status.client_limit != null ? ` · ${status.client_count ?? 0}/${status.client_limit} clients` : ` · ${status.client_count ?? 0} clients (unlimited)`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Founder banner */}
        {slots != null && slots > 0 && (
          <p className="mb-4 text-center text-[12.5px] font-[650]" style={{ color: '#fcd34d' }}>
            🔥 Founder&apos;s Club — only {slots} of 50 lifetime-locked-price spots left.
          </p>
        )}

        {/* Pricing */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const isCurrent = status?.plan?.code === p.code;
            return (
              <div key={p.code} className="relative flex flex-col rounded-[20px] p-5"
                style={{ background: p.code === 'elite' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)', border: p.code === 'elite' ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(255,255,255,0.10)' }}>
                {p.is_launch && (
                  <span className="absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-[10px] font-[800] text-white" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>LAUNCH OFFER</span>
                )}
                <p className="text-[13px] font-[750] text-white">{p.name}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: '#94a3b8' }}>{p.best_for}</p>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-[26px] font-[860] text-white">{fmtINR(p.effective_price_inr)}</span>
                  {p.is_launch && <span className="mb-1 text-[13px] line-through" style={{ color: '#64748b' }}>{fmtINR(p.price_inr)}</span>}
                </div>
                <p className="text-[11.5px]" style={{ color: '#94a3b8' }}>for {p.duration_months} {p.duration_months === 1 ? 'month' : 'months'}</p>
                <div className="mt-4 space-y-2 text-[12.5px]" style={{ color: '#cbd5e1' }}>
                  <p className="flex items-center gap-2"><Check size={13} style={{ color: '#34d399' }} /> {p.client_limit != null ? `Up to ${p.client_limit} clients` : 'Unlimited clients'}</p>
                  <p className="flex items-center gap-2"><Check size={13} style={{ color: '#34d399' }} /> All premium features</p>
                  <p className="flex items-center gap-2"><Check size={13} style={{ color: '#34d399' }} /> {p.duration_months >= 12 ? 'Priority support' : 'Standard support'}</p>
                </div>
                <div className="mt-auto pt-4">
                  {isCurrent ? (
                    <div className="rounded-[12px] py-2 text-center text-[12px] font-[700]" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>Current plan</div>
                  ) : requested ? (
                    <div className="rounded-[12px] py-2 text-center text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>Request sent ✓</div>
                  ) : (
                    <button onClick={() => requestActivation(p.code)} disabled={!!requesting}
                      className="flex w-full items-center justify-center gap-1.5 rounded-[12px] py-2 text-[12px] font-[750] text-white transition hover:opacity-90 disabled:opacity-50"
                      style={{ background: p.code === 'elite' ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'rgba(255,255,255,0.10)' }}>
                      {requesting === p.code ? <Loader2 size={13} className="animate-spin" /> : null}
                      Choose {p.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Request / status CTA */}
        <div className="mt-8 flex flex-col items-center gap-3 rounded-[18px] p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[14px] font-[750] text-white">Ready to {frozen ? 'reactivate' : active ? 'renew or upgrade' : 'subscribe'}?</p>
          <p className="max-w-[460px] text-[12.5px]" style={{ color: '#94a3b8' }}>
            {requested
              ? 'Thanks! Your request has reached the MY PT STUDIO team — we’ll confirm your payment and switch on your subscription shortly. No data is lost.'
              : 'Pick a plan above (or tap below) to request activation. Our team confirms your payment and switches on your subscription — usually within a few hours.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {!requested && (
              <Button onClick={() => requestActivation()} loading={requesting === 'general'} disabled={!!requesting}
                style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff' }}>
                Request activation
              </Button>
            )}
            <Button variant="outline" onClick={() => load()} iconLeft={<ArrowRight size={14} />}>Refresh status</Button>
          </div>
        </div>

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-[12px] font-[700] uppercase tracking-wider" style={{ color: '#64748b' }}>Invoice history</p>
            <div className="overflow-hidden rounded-[16px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {invoices.map((inv, i) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-[12.5px]" style={{ background: 'rgba(255,255,255,0.02)', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <span style={{ color: '#cbd5e1' }}>{inv.invoice_number} · {fmtDate(inv.issued_at)}</span>
                  <span className="tabular-nums font-[650]" style={{ color: inv.status === 'refunded' ? '#64748b' : '#fff', textDecoration: inv.status === 'refunded' ? 'line-through' : 'none' }}>{fmtINR(inv.amount_inr)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
