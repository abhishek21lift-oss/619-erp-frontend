'use client';
/**
 * Member — Renew.
 *
 * Where the plan stands, and the way to the next term:
 *   • an offer from the trainer → its price, the dates it buys, and Pay by UPI
 *     (the ordinary payment screen; the studio verifies the transfer)
 *   • no offer → ask the trainer for one (one request until they look)
 *
 * Every figure is the server's (GET /api/me/renewal): the price is the
 * trainer's, and the dates are what approval will actually apply — an unexpired
 * plan is extended from its end date, so paying early costs no days.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  BadgeCheck, CalendarClock, CheckCircle2, Clock, CreditCard, Loader2, MessageCircle, Receipt, RefreshCw, Sparkles,
} from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import PayBalanceButton from '@/components/member/PayBalanceButton';
import {
  Card, EASE, LoadError, MC, PageSkeleton, PageTitle, Section, longDate,
} from '@/components/member/MemberUI';
import { api } from '@/lib/api';
import type { MeRenewal } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { palette, rgba } from '@/lib/palette';
import { daysLeft } from '@/components/member/planDates';
import { useToast } from '@/lib/toast';

export default function MemberRenewPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <RenewBody />
      </MemberShell>
    </Guard>
  );
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function RenewBody() {
  const [data, setData] = useState<MeRenewal | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => api.me.renewal().then((r) => setData(r.data)).catch(() => setFailed(true));
  useEffect(() => { void load(); }, []);

  const title = <PageTitle icon={<RefreshCw size={20} />} title="Renew" sub="Your plan and your next term" />;
  if (failed) return <>{title}<LoadError what="plan" /></>;
  if (!data) return <PageSkeleton />;

  return (
    <>
      {title}
      <PlanStatus plan={data.plan} />
      {data.offer ? <OfferCard offer={data.offer} /> : <AskCard requestedAt={data.requested_at} onSent={load} />}
      {data.plan.balance > 0 && (
        <Section title="Also owed">
          <Card className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[13.5px] font-[750]" style={{ color: MC.ink }}>{inr(data.plan.balance)} from an earlier package</p>
              <p className="mt-0.5 text-[12px]" style={{ color: MC.muted }}>Renewing does not change this — it is paid separately.</p>
            </div>
            <PayBalanceButton className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] px-3.5 text-[13px] font-[750] text-white"
              style={{ background: MC.primary }}>
              <CreditCard size={14} /> Pay
            </PayBalanceButton>
          </Card>
        </Section>
      )}
      <Link href="/member/payments" className="mt-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-[700]" style={{ color: MC.primary }}>
        <Receipt size={14} aria-hidden /> Payments and receipts
      </Link>
    </>
  );
}

// ── Where the plan stands ────────────────────────────────────────────────────

function PlanStatus({ plan }: { plan: MeRenewal['plan'] }) {
  const d = plan.days_left;
  // Days you still have, counting the end day — the plan card's own count.
  const have = d !== null && d >= 0 ? daysLeft(plan.end_date) : null;
  const total = plan.duration_months ? plan.duration_months * 30 : 30;
  const frac = have === null ? 0 : Math.max(0, Math.min(1, have / total));
  const tone = plan.phase === 'active' ? palette.emerald[500] : plan.phase === 'none' ? MC.muted : palette.amber[500];
  const r = 30;
  const c = 2 * Math.PI * r;

  const headline = d === null ? 'No end date on record'
    : have !== null ? `${have} day${have === 1 ? '' : 's'} left`
      : `Ended ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ago`;

  return (
    <m.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
      className="mb-4 flex items-center gap-4 rounded-[20px] p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center" aria-hidden>
        <svg viewBox="0 0 76 76" className="absolute inset-0 -rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth="7" />
          <m.circle cx="38" cy="38" r={r} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - frac) }}
            transition={{ duration: 0.9, ease: EASE }} />
        </svg>
        <CalendarClock size={22} style={{ color: tone }} />
      </div>
      <div className="min-w-0">
        <p className="text-[20px] font-[820] leading-tight tracking-[-0.02em]" style={{ color: MC.ink }}>{headline}</p>
        <p className="mt-0.5 truncate text-[12.5px] font-[600]" style={{ color: MC.muted }}>
          {plan.package_name || 'Your plan'}
          {plan.end_date ? ` · ${d !== null && d < 0 ? 'ended' : 'ends'} ${longDate(plan.end_date)}` : ''}
        </p>
      </div>
    </m.section>
  );
}

// ── The trainer's offer ─────────────────────────────────────────────────────

function OfferCard({ offer }: { offer: NonNullable<MeRenewal['offer']> }) {
  const router = useRouter();
  const paid = offer.status === 'VERIFICATION_PENDING';
  const months = `${offer.duration_months} month${offer.duration_months === 1 ? '' : 's'}`;

  return (
    <Section title="Your renewal">
      <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.05 }}
        className="relative overflow-hidden rounded-[22px] p-5 text-white"
        style={{ background: `linear-gradient(150deg, ${palette.gray[900]} 0%, ${palette.blue[800]} 60%, ${palette.blue[600]} 100%)` }}>
        <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full"
          style={{ background: `radial-gradient(circle, ${rgba(palette.blue[400], 0.45)}, transparent 70%)` }} />
        <p className="relative flex items-center gap-1.5 text-[11px] font-[750] uppercase tracking-[0.14em] opacity-80">
          <Sparkles size={13} aria-hidden /> From your trainer
        </p>
        <h2 className="relative mt-1 text-[22px] font-[820] leading-tight tracking-[-0.02em]">{offer.package_name}</h2>
        <p className="relative mt-0.5 text-[13px] font-[600] opacity-80">{months}</p>

        <p className="relative mt-4 text-[40px] font-[850] leading-none tracking-[-0.03em] tabular-nums">{inr(offer.total_amount)}</p>
        {offer.gst_amount > 0 && (
          <p className="relative mt-1 text-[12px] opacity-75">{inr(offer.base_amount)} + GST {offer.gst_percent}% ({inr(offer.gst_amount)})</p>
        )}

        <div className="relative mt-4 rounded-[14px] p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <p className="flex items-center gap-2 text-[13px] font-[700]">
            <BadgeCheck size={15} aria-hidden /> Active until {longDate(offer.window.activated_to)}
          </p>
          <p className="mt-0.5 pl-[23px] text-[12px] opacity-75">
            From {longDate(offer.window.activated_from)} — your remaining days are kept
          </p>
        </div>

        {offer.note && <p className="relative mt-3 text-[13px] italic leading-relaxed opacity-90">“{offer.note}”</p>}

        {paid ? (
          <div className="relative mt-4 flex items-center gap-2 rounded-[14px] p-3 text-[13px] font-[700]"
            style={{ background: rgba(palette.emerald[500], 0.2) }} role="status">
            <CheckCircle2 size={16} aria-hidden /> Payment sent — the studio is confirming it
          </div>
        ) : (
          <>
            <button type="button" onClick={() => router.push(`/member/pay/${offer.id}`)}
              className="relative mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-[800]"
              style={{ background: '#fff', color: palette.gray[900] }}>
              <CreditCard size={16} aria-hidden /> Pay {inr(offer.total_amount)} by UPI
            </button>
            <p className="relative mt-2 flex items-center justify-center gap-1 text-[11.5px] opacity-75">
              <Clock size={11} aria-hidden /> Offer open until {longDate(offer.expires_at)}
            </p>
          </>
        )}
      </m.div>
    </Section>
  );
}

// ── No offer yet ─────────────────────────────────────────────────────────────

function AskCard({ requestedAt, onSent }: { requestedAt: string | null; onSent: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    setBusy(true);
    try {
      await api.me.requestRenewal();
      toast.success('Sent — your trainer will send your renewal');
      onSent();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send your request. Try again, or message your trainer.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Your renewal">
      <Card className="p-5">
        {requestedAt ? (
          <div className="flex items-start gap-3" role="status">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: rgba(MC.success, 0.12), color: MC.success }}>
              <CheckCircle2 size={18} aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-[780]" style={{ color: MC.ink }}>Request sent</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
                Your trainer has been asked for your renewal. It will appear here, ready to pay, as soon as they send it.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[15px] font-[780]" style={{ color: MC.ink }}>Keep your momentum going</p>
            <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
              Your trainer sets your renewal price. Ask for it here and pay by UPI when it arrives — no need to wait for the studio.
            </p>
            <button type="button" onClick={() => void ask()} disabled={busy}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[780] text-white disabled:opacity-60"
              style={{ background: MC.primary }}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />}
              Ask for my renewal
            </button>
          </>
        )}
        <Link href="/member/messages" className="mt-3 flex items-center justify-center gap-1.5 text-[12.5px] font-[700]" style={{ color: MC.primary }}>
          <MessageCircle size={13} aria-hidden /> Message your trainer
        </Link>
      </Card>
    </Section>
  );
}
