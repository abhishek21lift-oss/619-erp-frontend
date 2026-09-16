'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Repeat, CheckCircle, IndianRupee, Calendar, User, Dumbbell, FileText } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useStore } from '@tanstack/react-form';
import { useAppForm } from '@/lib/forms/useAppForm';
import { inlineNumber } from '@/lib/forms/inline';
import {
  renewPtSchema, blankRenewPt, toRenewPtPayload, ptEndDate, renewalBalance,
} from '@/lib/forms/schemas/renewPt';
import {
  NumberField, DateFieldControl, TextAreaField, FormErrorBanner,
} from '@/components/ui/form';

const fmtINR = (n: number | string | null | undefined) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface Client {
  id: string; name: string; mobile?: string; trainer_name?: string;
  package_type?: string; pt_end_date?: string; final_amount: number;
  paid_amount: number; balance_amount: number;
}

function ReadOnly({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="rounded-[13px] px-4 py-3.5" style={{ background: 'var(--bg-subtle)', border: '1.5px solid rgba(0,0,0,0.07)' }}>
      <p className="text-[10px] font-[700] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-[15px] font-[700]" style={{ color: highlight || '#0F172A' }}>{value}</p>
    </div>
  );
}

/** A typed figure for a preview: a real number, or 0 when it is not one yet. */
function numberOrZero(raw: string): number {
  const n = inlineNumber(raw);
  return typeof n === 'number' ? n : 0;
}

export default function RenewPtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);

  const f = useAppForm({
    schema: renewPtSchema,
    defaultValues: blankRenewPt(),
    onSubmit: async (values) => {
      await api.clients.renewPt(id, toRenewPtPayload(values));
      toast.success('PT renewed successfully');
    },
    onSuccess: () => router.push(`/pt-os/clients/${id}`),
  });

  const { form, isSubmitting } = f;
  const values = useStore(form.store, (s) => s.values);

  // The live summary reads the TYPED strings, not a parsed payload — there is
  // no payload until submit. `inlineNumber` gives it the same three-way answer
  // the schema does, so "1,500" previews as ₹1,500 and "15k" previews as
  // nothing rather than as ₹15.
  const final = numberOrZero(values.finalAmount);
  const paidNow = numberOrZero(values.paidNow);
  const balance = renewalBalance(final, paidNow);

  const months = inlineNumber(values.durationMonths);
  const endDate = typeof months === 'number' ? ptEndDate(values.startDate, months) : null;

  useEffect(() => {
    let live = true;
    api.pt.client(id)
      .then((res) => {
        if (!live) return;
        // One assertion at the boundary, naming the shape this page reads.
        // It was `(cRes.value as any)?.data`, which also switched off checking
        // of every property access downstream — including the seeded amount.
        const c = (res.data as Client | null) ?? null;
        setClient(c);
        // Seeded, not forced: the previous term's price is the usual starting
        // point and the coach can change it. `?? ''` rather than `|| ''` so a
        // stored 0 seeds as "0" rather than silently as blank.
        if (c?.final_amount != null) {
          form.setFieldValue('finalAmount', String(c.final_amount));
        }
      })
      .catch(() => { /* the form still works; the summary card just stays empty */ });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Guard>
      <PageContainer>

        <PageHero
          icon={<Repeat size={20} />}
          title="Renew PT"
          subtitle={client ? client.name : undefined}
        />

      <div className="mx-auto max-w-2xl">

        {/* Current subscription summary */}
        {client && (
          <div className="rounded-[18px] p-5 mb-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p className="text-[10px] font-[700] uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Current Subscription</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Plan', value: client.package_type || '—' },
                { label: 'Expires', value: fmtDate(client.pt_end_date) },
                { label: 'Total Paid', value: fmtINR(client.paid_amount) },
                { label: 'Balance Due', value: fmtINR(client.balance_amount), red: client.balance_amount > 0 },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  <p className="text-[14px] font-[700]" style={{ color: item.red ? '#ef4444' : '#0F172A' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form sections (flat — no wrapper card) */}
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); void f.submit(); }}
          className="space-y-6"
        >

          {/* Section: Plan */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(0,103,224,0.12)' }}>
                <Dumbbell size={13} style={{ color: '#0067e0' }} />
              </div>
              <h2 className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>Package Details</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <form.Field name="startDate">
                  {(field) => (
                    <DateFieldControl field={field} label="Start date" required
                      serverError={f.errors.fieldErrors.startDate} />
                  )}
                </form.Field>
                <form.Field name="durationMonths">
                  {(field) => (
                    <NumberField field={field} label="Duration" required mode="integer" suffix="months"
                      description="1 to 60"
                      serverError={f.errors.fieldErrors.durationMonths} />
                  )}
                </form.Field>
              </div>
              {endDate && (
                <div className="rounded-[10px] px-4 py-2.5 flex items-center gap-2"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Calendar size={13} style={{ color: '#10b981' }} />
                  <span className="text-[12px] font-[600]" style={{ color: '#10b981' }}>
                    New end date: <strong>{fmtDate(endDate)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--bg-subtle)' }} />

          {/* Section: Financials */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <IndianRupee size={13} style={{ color: '#10b981' }} />
              </div>
              <h2 className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>Financial Details</h2>
            </div>
            <div className="space-y-4">
              <form.Field name="finalAmount">
                {(field) => (
                  <NumberField field={field} label="Final amount" required mode="money" suffix="₹"
                    description="What this term is worth, before anything is paid"
                    serverError={f.errors.fieldErrors.finalAmount} />
                )}
              </form.Field>
              <form.Field name="paidNow">
                {(field) => (
                  <NumberField field={field} label="Amount paid now" mode="money" suffix="₹"
                    description="Leave blank if nothing is being collected today"
                    serverError={f.errors.fieldErrors.paidNow} />
                )}
              </form.Field>

              {/* Computed summary. Reads the TYPED strings through the same
                  normalizer the schema uses, so "1,500" previews as ₹1,500 and
                  "15k" previews as nothing rather than as ₹15. */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <ReadOnly label="Final Amount" value={fmtINR(final)} highlight="#0F172A" />
                <ReadOnly label="Paid Now" value={fmtINR(paidNow)} highlight="#10b981" />
                <ReadOnly label="Balance Due" value={fmtINR(balance)} highlight={balance > 0 ? '#dc2626' : '#10b981'} />
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--bg-subtle)' }} />

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <FileText size={13} style={{ color: '#f59e0b' }} />
              </div>
              <h2 className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>Notes (optional)</h2>
            </div>
            <form.Field name="notes">
              {(field) => (
                <TextAreaField field={field} label="Notes" labelHidden rows={3} maxLength={1000} showCount
                  placeholder="Any notes about this renewal…"
                  serverError={f.errors.fieldErrors.notes} />
              )}
            </form.Field>
          </div>

          <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />

          {/* Actions. No longer gated on three boxes being non-empty: the
              button was disabled until something was typed and then accepted
              whatever it was, so a blank Final Amount could not be submitted
              but a "₹0" could. The fields say what is wrong now. */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="success" loading={isSubmitting} disabled={isSubmitting}
              iconLeft={<CheckCircle size={14} />}>
              Confirm Renewal
            </Button>
          </div>
        </form>
      </div>
      </PageContainer>
    </Guard>
  );
}
