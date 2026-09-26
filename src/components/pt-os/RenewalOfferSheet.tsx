'use client';

/**
 * "Send renewal offer" — the trainer prices this client's next term and sends
 * it to the member app, where they pay it by UPI.
 *
 *   • prefilled from the client's current term (months and price), editable
 *   • shows the live offer if there is one: sending again replaces an unpaid
 *     offer; one the member has paid must be verified first (the server says so)
 *   • needs the studio's UPI payee set up — without it, it says where to do that
 *   • a client without the app gets a ready WhatsApp message with the link
 *
 * Nothing here decides the price the member pays: the server stores the offer
 * and every later screen reads it from there.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { UpiOrder } from '@/lib/api';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import {
  ChoiceChips, FormErrorBanner, NumberField, SelectField, TextAreaField, TextField,
} from '@/components/ui/form';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  OFFER_MONTHS, OFFER_VALID_DAYS, blankRenewalOffer, renewalOfferSchema, toRenewalOfferPayload,
} from '@/lib/forms/schemas/renewalOffer';
import { whatsAppHref } from '@/lib/phone';
import { palette, rgba } from '@/lib/palette';
import { useToast } from '@/lib/toast';

type OfferClient = {
  id: string;
  name: string;
  mobile?: string | null;
  duration_months?: number | null;
  final_amount?: number | string | null;
};

const BLUE = palette.blue[500];
const GOOD = palette.emerald[500];
const inr = (n: number | string) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (v: string) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function RenewalOfferSheet({ client, onClose }: { client: OfferClient; onClose: () => void }) {
  const ref = useDialogA11y({ open: true, onClose });
  const [current, setCurrent] = useState<UpiOrder | null | undefined>(undefined);
  const [upi, setUpi] = useState<{ ready: boolean; gst: number } | null>(null);
  const [sent, setSent] = useState<{ order: UpiOrder; memberCanSee: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    api.upiPayments.renewalOffer(client.id)
      .then((r) => { if (live) setCurrent(r.data.order); })
      .catch(() => { if (live) setCurrent(null); });
    api.upiPayments.getSettings()
      .then((r) => { if (live) setUpi({ ready: r.configured && r.enabled, gst: Number(r.data?.gst_percent) || 0 }); })
      .catch(() => { if (live) setUpi({ ready: false, gst: 0 }); });
    return () => { live = false; };
  }, [client.id]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" data-no-pull-refresh>
      <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={onClose} aria-hidden />
      <m.div ref={ref} role="dialog" aria-modal="true" aria-labelledby="renewal-offer-title"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[24px] p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:m-4 sm:rounded-[24px]"
        style={{ background: 'var(--bg-canvas)' }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="renewal-offer-title" className="text-[18px] font-[820]" style={{ color: 'var(--text-primary)' }}>Send renewal offer</h2>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {client.name} sees it in the app and pays by UPI. You verify the payment and their plan extends.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
            <X size={16} aria-hidden />
          </button>
        </div>

        {sent ? (
          <Sent client={client} order={sent.order} memberCanSee={sent.memberCanSee} onClose={onClose} />
        ) : upi === null || current === undefined ? (
          <div className="grid h-40 place-items-center" aria-busy="true"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
        ) : !upi.ready ? (
          <div className="rounded-[14px] p-4" style={{ background: rgba(palette.amber[500], 0.1) }} role="alert">
            <p className="flex items-center gap-2 text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
              <AlertTriangle size={15} aria-hidden style={{ color: palette.amber[600] }} /> UPI payments are not set up
            </p>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              A renewal offer is paid by UPI to your studio&apos;s account. Add your UPI ID first.
            </p>
            <Link href="/finance/payment-settings" className="mt-3 inline-flex h-10 items-center rounded-[12px] px-4 text-[13px] font-[750] text-white" style={{ background: BLUE }}>
              Set up UPI
            </Link>
          </div>
        ) : (
          <>
            {current && <CurrentOffer order={current} />}
            {current?.status === 'VERIFICATION_PENDING' ? null : (
              <OfferForm client={client} gst={upi.gst} replacing={Boolean(current)}
                onSent={(order, memberCanSee) => setSent({ order, memberCanSee })} />
            )}
          </>
        )}
      </m.div>
    </div>
  );
}

function CurrentOffer({ order }: { order: UpiOrder }) {
  const paid = order.status === 'VERIFICATION_PENDING';
  return (
    <div className="mb-4 rounded-[14px] p-3.5" style={{ background: paid ? rgba(GOOD, 0.1) : rgba(BLUE, 0.07), border: `1px solid ${rgba(paid ? GOOD : BLUE, 0.25)}` }}>
      <p className="flex items-center gap-2 text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
        {paid ? <CheckCircle2 size={14} aria-hidden style={{ color: GOOD }} /> : <Clock size={14} aria-hidden style={{ color: BLUE }} />}
        {paid ? 'Paid — waiting for you to verify' : 'Offer sent, not paid yet'}
      </p>
      <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        {order.plan_name} · {order.duration_months} month{order.duration_months === 1 ? '' : 's'} · {inr(order.total_amount)}
        {paid ? '' : ` · open until ${day(order.expires_at)}`}
      </p>
      {paid ? (
        <Link href="/finance/verify-payments" className="mt-2 inline-block text-[12.5px] font-[750]" style={{ color: BLUE }}>Verify the payment →</Link>
      ) : (
        <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Sending a new offer replaces this one.</p>
      )}
    </div>
  );
}

function OfferForm({ client, gst, replacing, onSent }: {
  client: OfferClient; gst: number; replacing: boolean; onSent: (order: UpiOrder, memberCanSee: boolean) => void;
}) {
  const { toast } = useToast();
  const f = useAppForm({
    schema: renewalOfferSchema,
    defaultValues: blankRenewalOffer(client),
    onSubmit: async (values) => {
      const res = await api.upiPayments.sendRenewalOffer(toRenewalOfferPayload(client.id, values));
      onSent(res.data.order, res.data.member_can_see);
    },
    onSuccess: () => toast.success(replacing ? 'New offer sent — it replaces the old one' : 'Renewal offer sent'),
    keepValuesOnSuccess: true,
  });
  const { form, isSubmitting } = f;
  const [amount, setAmount] = useState(blankRenewalOffer(client).amount);
  const price = Number(amount);
  const total = useMemo(() => (Number.isFinite(price) && price > 0 ? Math.round(price * (1 + gst / 100) * 100) / 100 : null), [price, gst]);
  const lastTerm = client.duration_months && Number(client.final_amount) > 0
    ? `Current term: ${client.duration_months} month${client.duration_months === 1 ? '' : 's'} for ${inr(client.final_amount as number)}`
    : undefined;

  return (
    <form onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate className="space-y-4">
      <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />

      <form.Field name="months">
        {(field) => (
          <ChoiceChips field={field} legend="How many months?" density="compact"
            options={OFFER_MONTHS.map((n) => ({ value: String(n), label: `${n} month${n === 1 ? '' : 's'}` }))}
            serverError={f.errors.fieldErrors.months} />
        )}
      </form.Field>

      <form.Field name="amount" listeners={{ onChange: ({ value }: { value: string }) => setAmount(value) }}>
        {(field) => (
          <NumberField field={field} label="Price" mode="decimal" suffix="₹" placeholder="e.g. 9000"
            description={lastTerm} serverError={f.errors.fieldErrors.amount} />
        )}
      </form.Field>

      <form.Field name="packageName">
        {(field) => (
          <TextField field={field} label="Package name (optional)" placeholder="e.g. PT — 3 months" maxLength={120}
            serverError={f.errors.fieldErrors.packageName} />
        )}
      </form.Field>

      <form.Field name="note">
        {(field) => (
          <TextAreaField field={field} label="Note to the client (optional)" placeholder="e.g. Same price as last time — let's keep going!"
            maxLength={500} serverError={f.errors.fieldErrors.note} />
        )}
      </form.Field>

      <form.Field name="validDays">
        {(field) => (
          <SelectField field={field} label="Offer open for"
            options={OFFER_VALID_DAYS.map((d) => ({ value: d, label: `${d} days` }))}
            serverError={f.errors.fieldErrors.validDays} />
        )}
      </form.Field>

      {total !== null && (
        <p className="rounded-[12px] px-3.5 py-2.5 text-[13px] font-[650]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
          {client.name} pays <span className="font-[800] tabular-nums">{inr(total)}</span>
          {gst > 0 ? <span style={{ color: 'var(--text-muted)' }}> (incl. GST {gst}%)</span> : null}
        </p>
      )}

      <button type="submit" disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[780] text-white disabled:opacity-60"
        style={{ background: BLUE }}>
        {isSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
        {replacing ? 'Send new offer' : 'Send offer'}
      </button>
    </form>
  );
}

function Sent({ client, order, memberCanSee, onClose }: { client: OfferClient; order: UpiOrder; memberCanSee: boolean; onClose: () => void }) {
  const link = typeof window === 'undefined' ? '/member/renew' : `${window.location.origin}/member/renew`;
  const message = `Hi ${client.name.split(' ')[0]}, your renewal is ready: ${order.plan_name}, ${order.duration_months} month${order.duration_months === 1 ? '' : 's'} for ${inr(order.total_amount)}. Pay by UPI in the app: ${link}`;
  const wa = whatsAppHref(client.mobile, message);
  return (
    <div role="status">
      <div className="flex items-start gap-3 rounded-[14px] p-4" style={{ background: rgba(GOOD, 0.1) }}>
        <CheckCircle2 size={20} aria-hidden style={{ color: GOOD }} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-[14px] font-[780]" style={{ color: 'var(--text-primary)' }}>Offer sent — {inr(order.total_amount)}</p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {memberCanSee
              ? `${client.name} has been notified in the app. You'll see their payment in Verify Payments.`
              : `${client.name} isn't using the member app yet — send them the link on WhatsApp.`}
          </p>
        </div>
      </div>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer"
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[780] text-white"
          style={{ background: GOOD }}>
          <MessageCircle size={16} aria-hidden /> Send on WhatsApp
        </a>
      )}
      <button type="button" onClick={onClose} className="mt-2 h-11 w-full rounded-[13px] text-[13.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>
        Done
      </button>
    </div>
  );
}
