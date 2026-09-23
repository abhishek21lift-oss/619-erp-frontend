'use client';

/**
 * UPI collection settings.
 *
 * Small screen, high stakes: the VPA entered here is where members' money
 * goes. So the form previews the payee exactly as a UPI app will show it, and
 * collection stays OFF until an admin explicitly turns it on — a half-filled
 * configuration must never be able to put a live QR in front of a member.
 *
 * On the universal form platform. The rules this screen already carried — the
 * VPA pattern, the statutory GST slabs, the 5–1440 link validity — moved into
 * `schemas/upiSettings.ts` unchanged; what the migration added is a real submit
 * guard (two clicks in one frame both saw `saving === false`), a GSTIN format
 * check on a value that is printed on every receipt, and server failures
 * through the shared mapper instead of `err.message` straight from the wire.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import {
  Wallet, Loader2, Check, AlertTriangle, Info, ShieldCheck, ArrowRight,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  upiSettingsSchema, upiSettingsToFormValues, toUpiSettingsPayload, gstOptions,
  UPI_FIELD_HINTS, VPA_RE,
  type UpiSettingsState, type UpiSettingsValues,
} from '@/lib/forms/schemas/upiSettings';
import {
  TextField, TextAreaField, NumberField, SelectField, FormErrorBanner,
} from '@/components/ui/form';
import type { UpiSettings, UpiSettingsInput } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { PageHeader } from '@/components/ui';
import { errorMessage } from '@/lib/forms/errors';

export default function PaymentSettingsPage() {
  return <Guard role="trainer"><Inner /></Guard>;
}

function Inner() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState<UpiSettings | null>(null);
  const [initial, setInitial] = useState<UpiSettingsState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.upiPayments.getSettings();
      setSaved(res.data ?? null);
      setInitial(upiSettingsToFormValues(res.data ?? null, user?.organization_name ?? ''));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load payment settings.'));
    } finally {
      setLoading(false);
    }
  }, [user?.organization_name]);

  useEffect(() => { void load(); }, [load]);

  if (loading || (!initial && !loadError)) {
    return (
      <div className="mx-auto max-w-[560px] animate-pulse space-y-4 px-1 pt-4">
        <div className="h-8 w-56 rounded" style={{ background: 'var(--bg-subtle)' }} />
        <div className="h-[420px] rounded-2xl" style={{ background: 'var(--bg-subtle)' }} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <PageHeader
        title="UPI collection"
        subtitle="Take membership payments over UPI and verify them yourself. No gateway, no per-transaction fee."
        icon={<Wallet size={19} />}
      />

      {loadError && !initial ? (
        <p className="mt-4 flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--danger-text)' }}>
          <AlertTriangle size={14} className="mt-px shrink-0" /> {loadError}
        </p>
      ) : (
        <SettingsForm
          initial={initial!}
          saved={saved}
          onSaved={(next) => {
            setSaved(next);
            // Rebuilt from what the server returned rather than from what was
            // typed, so the form shows what is actually stored (§11).
            setInitial(upiSettingsToFormValues(next, user?.organization_name ?? ''));
          }}
        />
      )}

      {saved && (
        <Link href="/finance/verify-payments"
          className="mt-4 flex items-center justify-between rounded-2xl p-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
              Verification queue
            </p>
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Approve or reject the references members submit.
            </p>
          </div>
          <ArrowRight size={17} style={{ color: 'var(--brand)' }} />
        </Link>
      )}

      <p className="mt-4 flex items-start gap-2 px-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        <Info size={14} className="mt-px shrink-0" />
        Payments are verified by you, by hand, against your bank account — nothing is confirmed
        automatically. Only approve a reference you can actually see in your statement.
      </p>
    </div>
  );
}

function SettingsForm({
  initial, saved, onSaved,
}: {
  initial: UpiSettingsState;
  saved: UpiSettings | null;
  onSaved: (next: UpiSettings) => void;
}) {
  const { toast } = useToast();

  // The stored values, which the schema always accepts however non-standard —
  // see the schema's note on why a legacy rate or GSTIN must not lock an admin
  // out of editing the UPI ID.
  const storedGstPercent = saved?.gst_percent == null ? null : Number(saved.gst_percent);
  const storedGstNumber = saved?.gst_number ?? null;

  const f = useAppForm({
    schema: upiSettingsSchema({ storedGstPercent, storedGstNumber }),
    defaultValues: initial,
    fieldHints: UPI_FIELD_HINTS,
    // The panel stays on screen and is edited again; emptying it after a save
    // would be a worse answer than leaving the saved values visible.
    keepValuesOnSuccess: true,
    onSubmit: async (values: UpiSettingsValues) => {
      const res = await api.upiPayments.saveSettings(
        toUpiSettingsPayload(values) as UpiSettingsInput,
      );
      onSaved(res.data);
      toast.success(
        values.is_enabled ? 'Saved. Members can now pay by UPI.' : 'Saved. Collection is off.',
      );
    },
  });

  const { form } = f;

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void f.submit(); }}>
      {/* ── Live/off state ── */}
      <form.Subscribe selector={(s) => s.values.is_enabled}>
        {(enabled) => (
          <m.div
            layout
            className="mt-4 flex items-start gap-3 rounded-2xl p-4"
            style={{
              background: enabled ? 'var(--success-soft)' : 'var(--bg-subtle)',
              border: `1px solid ${enabled ? 'var(--success-border)' : 'var(--border)'}`,
            }}
          >
            <ShieldCheck size={18} className="mt-0.5 shrink-0"
              style={{ color: enabled ? 'var(--success-text)' : 'var(--text-muted)' }} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                {enabled ? 'Collection is on' : 'Collection is off'}
              </p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                {enabled
                  ? 'Members can open a payment page, pay by UPI and submit a reference for you to verify.'
                  : 'Members cannot start a UPI payment. Turn this on once the UPI ID below is correct.'}
              </p>
            </div>
            {/* A switch, not a checkbox: it toggles a live member-facing
                capability rather than setting a value that Save then commits,
                so the ARIA role has to say switch. CheckboxField would render
                the wrong control for this meaning. */}
            <form.Field name="is_enabled">
              {(field) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.state.value}
                  aria-label="Enable UPI collection"
                  onClick={() => field.handleChange(!field.state.value)}
                  className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors"
                  style={{ background: field.state.value ? 'var(--success)' : 'var(--border-3)' }}
                >
                  <m.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                    style={{ left: field.state.value ? 22 : 2 }}
                  />
                </button>
              )}
            </form.Field>
          </m.div>
        )}
      </form.Subscribe>

      {/* ── Form ── */}
      <section className="mt-4 rounded-2xl p-5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>

        <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} className="mb-4" />

        <form.Field name="upi_id">
          {(field) => (
            <TextField
              field={field}
              label="Your UPI ID (VPA)"
              required
              placeholder="studio@okhdfcbank"
              description="Exactly as it appears in your UPI app. This is where money arrives."
              autoComplete="off"
              serverError={f.errors.fieldErrors.upi_id}
            />
          )}
        </form.Field>

        <form.Field name="merchant_name">
          {(field) => (
            <TextField
              field={field}
              label="Name shown to the member"
              required
              placeholder="Abhishek PT Studio"
              description="Members abandon payments to a name they do not recognise."
              maxLength={120}
              showCount
              className="mt-4"
              serverError={f.errors.fieldErrors.merchant_name}
            />
          )}
        </form.Field>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <form.Field name="gst_percent">
            {(field) => (
              <SelectField
                field={field}
                label="GST %"
                required
                // A select rather than a text box. The rate is one of five
                // statutory values, so a free-text field invites a number that
                // cannot appear on a valid invoice — and made a BLANK possible,
                // which is what silently saved 0%.
                options={gstOptions(storedGstPercent)}
                description="0% hides the line entirely. These are the statutory slabs."
                serverError={f.errors.fieldErrors.gst_percent}
              />
            )}
          </form.Field>

          <form.Field name="order_ttl_minutes">
            {(field) => (
              <NumberField
                field={field}
                label="Link valid for"
                required
                mode="integer"
                suffix="min"
                description="Minutes, 5 to 1440."
                serverError={f.errors.fieldErrors.order_ttl_minutes}
              />
            )}
          </form.Field>
        </div>

        <form.Field name="gst_number">
          {(field) => (
            <TextField
              field={field}
              label="GSTIN (optional)"
              placeholder="22AAAAA0000A1Z5"
              description="Printed on receipts when set."
              className="mt-4"
              autoComplete="off"
              serverError={f.errors.fieldErrors.gst_number}
            />
          )}
        </form.Field>

        <form.Field name="instructions">
          {(field) => (
            <TextAreaField
              field={field}
              label="Note on the payment page (optional)"
              rows={2}
              maxLength={500}
              showCount
              placeholder="Payments are verified within 2 hours, 7am–9pm."
              description="Sets expectations — members chase a studio that goes quiet."
              className="mt-4"
              serverError={f.errors.fieldErrors.instructions}
            />
          )}
        </form.Field>

        {/* ── Preview ── */}
        <form.Subscribe selector={(s) => [s.values.merchant_name, s.values.upi_id] as const}>
          {([merchantName, upiId]) => (
            <div className="mt-5 rounded-xl p-3.5" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-[11px] font-[700] uppercase tracking-[0.1em]"
                style={{ color: 'var(--text-muted)' }}>
                How members will see it
              </p>
              <p className="mt-1.5 text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                {merchantName.trim() || 'Your studio name'}
              </p>
              {/* Brand colour once the VPA is well-formed — the preview is
                  the one place an admin checks the payee before turning
                  collection on, so it should say when it is usable. */}
              <p className="font-mono text-[13px]"
                style={{ color: VPA_RE.test(upiId.trim()) ? 'var(--brand)' : 'var(--text-muted)' }}>
                {upiId.trim() || 'yourname@bank'}
              </p>
            </div>
          )}
        </form.Subscribe>

        <button
          type="submit"
          // The real guard is the in-flight ref inside useAppForm; `disabled`
          // only communicates the state. Gating on validity here as well would
          // hide WHY the form cannot be saved behind a dead button.
          disabled={f.isSubmitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl text-[15px] font-[720] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
          style={{ height: 50, background: 'var(--brand)' }}
        >
          {f.isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                          : <><Check size={16} /> Save settings</>}
        </button>
      </section>
    </form>
  );
}
