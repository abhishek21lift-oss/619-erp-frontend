'use client';

// Coupons — discount codes and redemptions.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
// Component bodies, props and rendered markup are unchanged.
import { useCallback, useEffect, useState } from 'react';
import {
  Plus, Loader2, X, Trash2, Gift, Receipt, Ticket, Percent, Ban, CheckCircle2, Sparkles,
} from 'lucide-react';
import { Button, Badge, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type { SubPlan, Coupon } from '@/lib/api';
import { StatTile } from '@/components/platform/console';
import { useToast } from '@/lib/toast';
import { fmtDate, fmtINR } from '../_shared/format';
import { Center, ErrorState, IconBtn } from '../_shared/ui';

export type CouponTemplate = {
  key: string; label: string; icon: React.ReactNode;
  initial: { description: string; discountType: 'percent' | 'fixed'; discountValue: string; maxPerOrg: string; validUntil?: string };
};
export function couponTemplates(): CouponTemplate[] {
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return [
    { key: 'launch', label: 'Launch offer', icon: <Sparkles size={13} />, initial: { description: 'Launch discount', discountType: 'percent', discountValue: '20', maxPerOrg: '1' } },
    { key: 'referral', label: 'Referral', icon: <Gift size={13} />, initial: { description: 'Referral reward', discountType: 'fixed', discountValue: '500', maxPerOrg: '1' } },
    { key: 'seasonal', label: 'Seasonal', icon: <Percent size={13} />, initial: { description: 'Seasonal promotion', discountType: 'percent', discountValue: '15', maxPerOrg: '1', validUntil: in30Days } },
  ];
}

export function CouponsTab() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [template, setTemplate] = useState<CouponTemplate | null>(null);
  const [busy, setBusy] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Record<string, { id: string; organization_name: string | null; gross_amount_inr: number; discount_inr: number; net_amount_inr: number; redeemed_at: string }[]>>({});

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.listCoupons()
      .then((r) => setCoupons(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load coupons'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.subscription.plans().then((r) => setPlans(r.data.plans ?? [])).catch(() => {}); }, []);

  const toggleActive = async (c: Coupon) => {
    setBusy(c.id);
    try {
      await api.superAdmin.updateCoupon(c.id, { is_active: !c.is_active });
      toast.success(c.is_active ? `${c.code} deactivated.` : `${c.code} reactivated.`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
    finally { setBusy(''); }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete ${c.code}? This is only possible because it has never been redeemed.`)) return;
    setBusy(c.id);
    try {
      await api.superAdmin.deleteCoupon(c.id);
      toast.success(`${c.code} deleted.`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
    finally { setBusy(''); }
  };

  const openRedemptions = async (c: Coupon) => {
    if (expanded === c.id) { setExpanded(null); return; }
    setExpanded(c.id);
    if (redemptions[c.id]) return;
    try {
      const r = await api.superAdmin.couponRedemptions(c.id);
      setRedemptions((prev) => ({ ...prev, [c.id]: r.data ?? [] }));
    } catch { /* the row still renders without its history */ }
  };

  if (loading) return <Center><Loader2 size={26} className="animate-spin" style={{ color: '#6366f1' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;

  // Coupon analytics — aggregated from the same rows already loaded for the
  // list below (times_redeemed / total_discount_inr come pre-computed from
  // the redemption ledger server-side), not a separate call.
  const activeCoupons = coupons.filter((c) => c.is_active).length;
  const totalRedemptions = coupons.reduce((s, c) => s + c.times_redeemed, 0);
  const totalDiscountGiven = coupons.reduce((s, c) => s + c.total_discount_inr, 0);
  const topCoupon = [...coupons].sort((a, b) => b.times_redeemed - a.times_redeemed)[0];

  const openTemplate = (t: CouponTemplate | null) => { setTemplate(t); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setTemplate(null); };

  return (
    <div className="space-y-4">
      {coupons.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Active coupons" value={String(activeCoupons)} sub={`${coupons.length} total`} tone="brand" icon={<Ticket size={15} />} />
          <StatTile label="Redemptions" value={String(totalRedemptions)} sub="all time" tone="positive" icon={<CheckCircle2 size={15} />} />
          <StatTile label="Discount given" value={fmtINR(totalDiscountGiven)} sub="all time" tone="caution" icon={<Percent size={15} />} />
          <StatTile label="Top coupon" value={topCoupon && topCoupon.times_redeemed > 0 ? topCoupon.code : '—'}
            sub={topCoupon && topCoupon.times_redeemed > 0 ? `${topCoupon.times_redeemed} uses` : 'none redeemed yet'} tone="neutral" icon={<Sparkles size={15} />} />
        </div>
      )}

      {/* Wraps on narrow screens — the action previously sat on the same row as
          a long paragraph and was clipped to "New coup…" on a phone. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1" style={{ minWidth: 220 }}>
          <p className="text-[13px] font-[780]" style={{ color: 'var(--text-primary)' }}>Discount coupons</p>
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Applied at activation. Redemption counts come from the ledger, so they always reconcile with payments.
          </p>
        </div>
        {showForm ? (
          <Button className="w-full shrink-0 sm:w-auto" onClick={closeForm} iconLeft={<X size={14} />}>Close</Button>
        ) : (
          <Button className="w-full shrink-0 sm:w-auto" onClick={() => openTemplate(null)} iconLeft={<Plus size={14} />}>New coupon</Button>
        )}
      </div>

      {!showForm && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>Quick start:</span>
          {couponTemplates().map((t) => (
            <button key={t.key} onClick={() => openTemplate(t)}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-[650] transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <CouponForm
          key={template?.key ?? 'blank'}
          plans={plans}
          initial={template?.initial}
          onCreated={() => { closeForm(); load(); }}
        />
      )}

      {coupons.length === 0 ? (
        <EmptyState icon={<Ticket size={22} />} title="No coupons yet"
          description="Create one to offer a launch discount or win back a lapsed studio." />
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => {
            const used = c.times_redeemed > 0;
            const exhausted = c.max_redemptions != null && c.times_redeemed >= c.max_redemptions;
            const expired = c.valid_until ? new Date(c.valid_until) < new Date() : false;
            const live = c.is_active && !exhausted && !expired;
            return (
              <div key={c.id} className="rounded-[16px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[11px]"
                    style={{ background: live ? 'rgba(16,185,129,0.12)' : 'var(--bg-subtle)', color: live ? '#10b981' : 'var(--text-muted)' }}>
                    {c.discount_type === 'percent' ? <Percent size={15} /> : <Ticket size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-[820]" style={{ color: 'var(--text-primary)' }}>{c.code}</span>
                      <Badge tone={live ? 'success' : 'neutral'}>
                        {!c.is_active ? 'Inactive' : exhausted ? 'Fully redeemed' : expired ? 'Expired' : 'Live'}
                      </Badge>
                      <span className="text-[11.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
                        {c.discount_type === 'percent' ? `${c.discount_value}% off` : `${fmtINR(c.discount_value)} off`}
                        {c.max_discount_inr != null ? ` (max ${fmtINR(c.max_discount_inr)})` : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                      {c.description ? `${c.description} · ` : ''}
                      {c.times_redeemed}
                      {c.max_redemptions != null ? `/${c.max_redemptions}` : ''} redeemed
                      {c.total_discount_inr > 0 ? ` · ${fmtINR(c.total_discount_inr)} given away` : ''}
                      {c.applies_to_plans?.length ? ` · ${c.applies_to_plans.join(', ')} only` : ''}
                      {c.valid_until ? ` · until ${fmtDate(c.valid_until)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {used && (
                      <IconBtn title="Redemptions" onClick={() => openRedemptions(c)}>
                        <Receipt size={12} /> {expanded === c.id ? 'Hide' : 'History'}
                      </IconBtn>
                    )}
                    <IconBtn title={c.is_active ? 'Deactivate' : 'Reactivate'} onClick={() => toggleActive(c)}
                      busy={busy === c.id} tone={c.is_active ? 'danger' : 'success'}>
                      {c.is_active ? <><Ban size={12} /> Deactivate</> : <><CheckCircle2 size={12} /> Reactivate</>}
                    </IconBtn>
                    {/* Deleting a redeemed coupon would tear a hole in the
                        billing record, so the option is only offered when it
                        has never been used — the API rejects it regardless. */}
                    {!used && (
                      <IconBtn title="Delete" onClick={() => remove(c)} busy={busy === c.id} tone="danger">
                        <Trash2 size={12} /> Delete
                      </IconBtn>
                    )}
                  </div>
                </div>

                {expanded === c.id && (
                  <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    {!redemptions[c.id] ? (
                      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Loading…</p>
                    ) : redemptions[c.id].length === 0 ? (
                      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>No redemptions recorded.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {redemptions[c.id].map((r) => (
                          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {r.organization_name || 'Unknown studio'} · {fmtDate(r.redeemed_at)}
                            </span>
                            <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                              {fmtINR(r.gross_amount_inr)} − {fmtINR(r.discount_inr)} = <strong style={{ color: 'var(--text-primary)' }}>{fmtINR(r.net_amount_inr)}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CouponForm({ plans, initial, onCreated }: {
  plans: SubPlan[];
  /** Seeds the form once, from one of the quick-start templates above — the
   *  operator can still edit every field before creating. */
  initial?: { description: string; discountType: 'percent' | 'fixed'; discountValue: string; maxPerOrg: string; validUntil?: string };
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(initial?.discountType ?? 'percent');
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? '');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [maxPerOrg, setMaxPerOrg] = useState(initial?.maxPerOrg ?? '1');
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? '');
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const value = Number(discountValue);
  const percentOutOfRange = discountType === 'percent' && (value > 100 || value <= 0);

  const submit = async () => {
    if (!code.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error('A code and a discount above zero are required.');
      return;
    }
    if (percentOutOfRange) { toast.error('A percentage discount must be between 1 and 100.'); return; }
    setSaving(true);
    try {
      await api.superAdmin.createCoupon({
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discount_type: discountType,
        discount_value: value,
        max_discount_inr: discountType === 'percent' && maxDiscount ? Number(maxDiscount) : null,
        max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
        max_per_org: maxPerOrg ? Number(maxPerOrg) : 1,
        valid_until: validUntil || null,
        applies_to_plans: appliesTo.length ? appliesTo : null,
      });
      toast.success('Coupon created.');
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create coupon');
    } finally { setSaving(false); }
  };

  const field = {
    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  } as const;

  return (
    <div className="rounded-[16px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Code</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAUNCH20"
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] font-[700] uppercase outline-none" style={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Launch promotion"
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={field} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Type</span>
          <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
            className="h-9 rounded-[10px] px-2 text-[12.5px] font-[650] outline-none" style={field}>
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed rupees off</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {discountType === 'percent' ? 'Percent (1–100)' : 'Rupees off'}
          </span>
          <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} inputMode="numeric"
            placeholder={discountType === 'percent' ? '20' : '500'}
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] font-[650] tabular-nums outline-none"
            style={{ ...field, borderColor: percentOutOfRange && discountValue ? '#ef4444' : 'var(--border)' }} />
        </label>

        {discountType === 'percent' && (
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Max discount (₹, optional)</span>
            <input value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} inputMode="numeric" placeholder="2000"
              className="h-9 rounded-[10px] px-2.5 text-[12.5px] tabular-nums outline-none" style={field} />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total uses (blank = unlimited)</span>
          <input value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} inputMode="numeric" placeholder="20"
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] tabular-nums outline-none" style={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Uses per studio</span>
          <input value={maxPerOrg} onChange={(e) => setMaxPerOrg(e.target.value)} inputMode="numeric"
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] tabular-nums outline-none" style={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Valid until (optional)</span>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
            className="h-9 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={field} />
        </label>
      </div>

      <div className="mt-3">
        <span className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Limit to plans (none selected = all plans)
        </span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {plans.map((p) => {
            const on = appliesTo.includes(p.code);
            return (
              <button key={p.code} type="button"
                onClick={() => setAppliesTo((prev) => on ? prev.filter((x) => x !== p.code) : [...prev, p.code])}
                className="rounded-full px-3 py-1.5 text-[11.5px] font-[650] transition"
                style={on
                  ? { background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.4)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={submit} loading={saving} disabled={saving}>Create coupon</Button>
      </div>
    </div>
  );
}

// ── SaaS run-rate metrics ─────────────────────────────────────────────────────
// MRR/ARR are a RUN-RATE (recurring price normalised to one month), not cash
// collected — the revenue trend below is the cash side. Labelling both clearly
// matters: conflating them is the classic SaaS reporting mistake.
