'use client';

/**
 * UPI collection settings.
 *
 * Small screen, high stakes: the VPA entered here is where members' money
 * goes. So the form previews the payee exactly as a UPI app will show it, and
 * collection stays OFF until an admin explicitly turns it on — a half-filled
 * configuration must never be able to put a live QR in front of a member.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import {
  Wallet, Loader2, Check, AlertTriangle, Info, ShieldCheck, ArrowRight,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
import type { UpiSettings } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { PageHeader } from '@/components/ui';

/** Mirrors the CHECK constraint in migration 112 and the DTO in the route. */
const VPA_RE = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/;

export default function PaymentSettingsPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

function Inner() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<UpiSettings | null>(null);

  const [upiId, setUpiId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [gstPercent, setGstPercent] = useState('0');
  const [gstNumber, setGstNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ttl, setTtl] = useState('60');
  const [enabled, setEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.upiPayments.getSettings();
      if (res.data) {
        setSaved(res.data);
        setUpiId(res.data.upi_id);
        setMerchantName(res.data.merchant_name);
        setGstPercent(String(Number(res.data.gst_percent)));
        setGstNumber(res.data.gst_number ?? '');
        setInstructions(res.data.instructions ?? '');
        setTtl(String(res.data.order_ttl_minutes));
        setEnabled(res.data.is_enabled);
      } else {
        // Sensible default for a first-time setup: the studio's own name is
        // almost always what should appear in the member's UPI app.
        setMerchantName(user?.organization_name ?? '');
      }
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load payment settings.');
    } finally {
      setLoading(false);
    }
  }, [user?.organization_name]);

  useEffect(() => { void load(); }, [load]);

  const vpaValid = VPA_RE.test(upiId.trim());
  const nameValid = merchantName.trim().length > 0;
  const gstValid = Number(gstPercent) >= 0 && Number(gstPercent) <= 100;
  const canSave = vpaValid && nameValid && gstValid && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.upiPayments.saveSettings({
        upi_id: upiId.trim(),
        merchant_name: merchantName.trim(),
        gst_percent: Number(gstPercent) || 0,
        gst_number: gstNumber.trim() || null,
        is_enabled: enabled,
        instructions: instructions.trim() || null,
        order_ttl_minutes: Number(ttl) || 60,
      });
      setSaved(res.data);
      toast.success(enabled ? 'Saved. Members can now pay by UPI.' : 'Saved. Collection is off.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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

      {/* ── Live/off state ── */}
      <m.div
        layout
        className="mt-4 flex items-start gap-3 rounded-2xl p-4"
        style={{
          background: enabled ? 'var(--success-soft)' : 'var(--bg-subtle)',
          border: `1px solid ${enabled ? 'var(--success-border)' : 'var(--border)'}`,
        }}
      >
        <ShieldCheck size={18} className="mt-0.5 shrink-0"
          style={{ color: enabled ? 'var(--success)' : 'var(--text-muted)' }} />
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
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Enable UPI collection"
          onClick={() => setEnabled((v) => !v)}
          className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors"
          style={{ background: enabled ? 'var(--success)' : 'var(--border-3)' }}
        >
          <m.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
            style={{ left: enabled ? 22 : 2 }}
          />
        </button>
      </m.div>

      {/* ── Form ── */}
      <section className="mt-4 rounded-2xl p-5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>

        <Field
          id="upi-id"
          label="Your UPI ID (VPA)"
          hint={upiId.length > 0 && !vpaValid
            ? 'Must look like name@bank — for example studio@okhdfcbank.'
            : 'Exactly as it appears in your UPI app. This is where money arrives.'}
          invalid={upiId.length > 0 && !vpaValid}
        >
          <input
            id="upi-id"
            value={upiId}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setUpiId(e.target.value.trim())}
            placeholder="studio@okhdfcbank"
            className="w-full rounded-xl px-3.5 font-mono text-[15px] outline-none"
            style={{
              height: 48, background: 'var(--bg-base)', color: 'var(--text-primary)',
              border: `1px solid ${upiId.length > 0 && !vpaValid ? 'var(--danger)' : 'var(--border-2)'}`,
            }}
          />
        </Field>

        <Field
          id="merchant-name"
          label="Name shown to the member"
          hint="Members abandon payments to a name they do not recognise."
          className="mt-4"
        >
          <input
            id="merchant-name"
            value={merchantName}
            maxLength={120}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Abhishek PT Studio"
            className="w-full rounded-xl px-3.5 text-[15px] outline-none"
            style={{
              height: 48, background: 'var(--bg-base)', color: 'var(--text-primary)',
              border: '1px solid var(--border-2)',
            }}
          />
        </Field>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field id="gst-percent" label="GST %" hint="0 hides the line entirely.">
            <input
              id="gst-percent"
              inputMode="decimal"
              value={gstPercent}
              onChange={(e) => setGstPercent(e.target.value.replace(/[^\d.]/g, ''))}
              className="w-full rounded-xl px-3.5 text-[15px] tabular-nums outline-none"
              style={{
                height: 48, background: 'var(--bg-base)', color: 'var(--text-primary)',
                border: `1px solid ${gstValid ? 'var(--border-2)' : 'var(--danger)'}`,
              }}
            />
          </Field>
          <Field id="order-ttl" label="Link valid for" hint="Minutes, 5 to 1440.">
            <input
              id="order-ttl"
              inputMode="numeric"
              value={ttl}
              onChange={(e) => setTtl(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl px-3.5 text-[15px] tabular-nums outline-none"
              style={{
                height: 48, background: 'var(--bg-base)', color: 'var(--text-primary)',
                border: '1px solid var(--border-2)',
              }}
            />
          </Field>
        </div>

        <Field id="gst-number" label="GSTIN (optional)" className="mt-4"
          hint="Printed on receipts when set.">
          <input
            id="gst-number"
            value={gstNumber}
            maxLength={32}
            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
            className="w-full rounded-xl px-3.5 font-mono text-[14px] outline-none"
            style={{
              height: 48, background: 'var(--bg-base)', color: 'var(--text-primary)',
              border: '1px solid var(--border-2)',
            }}
          />
        </Field>

        <Field id="instructions" label="Note on the payment page (optional)" className="mt-4"
          hint="Sets expectations — members chase a studio that goes quiet.">
          <textarea
            id="instructions"
            rows={2}
            maxLength={500}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Payments are verified within 2 hours, 7am–9pm."
            className="w-full resize-none rounded-xl px-3.5 py-2.5 text-[14px] outline-none"
            style={{
              background: 'var(--bg-base)', color: 'var(--text-primary)',
              border: '1px solid var(--border-2)',
            }}
          />
        </Field>

        {/* ── Preview ── */}
        <div className="mt-5 rounded-xl p-3.5" style={{ background: 'var(--bg-subtle)' }}>
          <p className="text-[11px] font-[700] uppercase tracking-[0.1em]"
            style={{ color: 'var(--text-muted)' }}>
            How members will see it
          </p>
          <p className="mt-1.5 text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>
            {merchantName.trim() || 'Your studio name'}
          </p>
          <p className="font-mono text-[13px]"
            style={{ color: vpaValid ? 'var(--brand)' : 'var(--text-muted)' }}>
            {upiId.trim() || 'yourname@bank'}
          </p>
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--danger)' }}>
            <AlertTriangle size={14} className="mt-px shrink-0" /> {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl text-[15px] font-[720] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
          style={{ height: 50, background: 'var(--brand)' }}
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  : <><Check size={16} /> Save settings</>}
        </button>
      </section>

      {/* ── Where to go next ── */}
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

function Field({
  id, label, hint, children, className, invalid,
}: {
  id: string; label: string; hint?: string;
  children: React.ReactNode; className?: string; invalid?: boolean;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[12px] font-[650]"
        style={{ color: 'var(--text-primary)' }}>{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p className="mt-1.5 text-[11.5px]"
          style={{ color: invalid ? 'var(--danger)' : 'var(--text-muted)' }}>{hint}</p>
      )}
    </div>
  );
}
