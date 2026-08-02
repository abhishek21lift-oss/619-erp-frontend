'use client';

/**
 * MonthlyTargetHero — the studio's revenue commitment for the current month.
 *
 * Leads the revenue page because it is the one number on it that is a
 * *decision* rather than a report: everything else describes what happened,
 * this says what the studio is trying to do about it.
 *
 * ── The lock ────────────────────────────────────────────────────────────────
 * A target can be set once per calendar month and cannot then be changed. That
 * rule lives in the database (UNIQUE (organization_id, period), and no update
 * route exists) — this component renders the lock, it does not implement it.
 * The `locked` flag comes from the server rather than being inferred from the
 * presence of a value, so the UI cannot disagree with what the API will allow.
 *
 * The confirmation step before committing is deliberate. An irreversible action
 * behind a single un-guarded button is a trap, and "I typed 50000 instead of
 * 500000 and now I'm stuck for a month" is the obvious failure.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import {
  Target, Lock, TrendingUp, Wallet, Loader2, AlertTriangle, PartyPopper, Info,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import http from '@/lib/http';

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

export type RevenueTarget = {
  period: string;
  target_amount: number | null;
  achieved: number;
  balance: number | null;
  surplus: number | null;
  pct: number | null;
  locked: boolean;
  set_by_name: string | null;
  set_at: string | null;
  can_set: boolean;
};

const fmtINR = (n: number) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

/** Compact form for the very large figures the headline can carry. */
const fmtCompact = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (a >= 1e5) return '₹' + (v / 1e5).toFixed(2).replace(/\.00$/, '') + 'L';
  return fmtINR(v);
};

const monthLabel = () =>
  new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

/** Days remaining in the current month, inclusive of today. */
function daysLeftInMonth(): number {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate() + 1;
}

// Progress colour is earned, not decorative: red when the month is nearly gone
// and the studio is well short, amber when behind, emerald when on track.
function toneFor(pct: number, daysLeft: number, totalDays: number): {
  ring: string; label: string; glow: string;
} {
  if (pct >= 100) return { ring: '#10B981', label: 'Target smashed', glow: '#10B981' };
  const elapsed = 1 - daysLeft / totalDays;
  // "Expected" progress if revenue arrived evenly across the month.
  const pace = elapsed * 100;
  if (pct >= pace) return { ring: '#10B981', label: 'On track', glow: '#10B981' };
  if (pct >= pace * 0.7) return { ring: '#F59E0B', label: 'Slightly behind', glow: '#F59E0B' };
  return { ring: '#EF4444', label: 'Behind pace', glow: '#EF4444' };
}

/** Count-up on the headline figure. The number is the point of this card. */
function useCountUp(value: number, run: boolean) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce || !run ? value : 0);
  useEffect(() => {
    if (reduce || !run) { setN(value); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      // easeOutExpo
      setN(Math.round(value * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, run, reduce]);
  return n;
}

function ProgressRing({ pct, colour, size = 148 }: { pct: number; colour: string; size?: number }) {
  const reduce = useReducedMotion();
  const stroke = 13;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * circ;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--bg-subtle)" strokeWidth={stroke} />
        <m.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: reduce ? circ - dash : circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: reduce ? 0 : 1.1, ease: EASE_EXPO }}
          style={{ filter: `drop-shadow(0 0 8px ${colour}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular-nums text-[26px] font-[860] leading-none"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          {Math.round(clamped)}%
        </span>
        <span className="mt-0.5 text-[9.5px] font-[750] uppercase tracking-[0.12em]"
          style={{ color: 'var(--text-muted)' }}>
          of target
        </span>
      </div>
    </div>
  );
}

function Figure({ label, value, colour, icon }: {
  label: string; value: string; colour?: string; icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center gap-1.5">
        <span style={{ color: colour ?? 'var(--text-muted)' }}>{icon}</span>
        <span className="text-[10px] font-[750] uppercase tracking-[0.12em]"
          style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="truncate tabular-nums text-[19px] font-[820] leading-tight sm:text-[21px]"
        style={{ color: colour ?? 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  );
}

// Hoisted to module scope: defining this inside MonthlyTargetHero would give it
// a new identity on every render (e.g. every keystroke in the draft input),
// which makes React unmount/remount the whole subtree — including the input —
// and dismiss the on-screen keyboard after each character.
const Shell = ({ children, glow }: { children: React.ReactNode; glow?: string }) => (
  <m.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: EASE_EXPO }}
    className="relative overflow-hidden rounded-[20px] p-5 sm:p-6"
    style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}
  >
    {glow && (
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full"
        style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`, opacity: 0.16, filter: 'blur(48px)' }} />
    )}
    <div className="relative">{children}</div>
  </m.section>
);

export default function MonthlyTargetHero({ onTargetSet }: { onTargetSet?: () => void }) {
  const { toast } = useToast();
  const [data, setData] = useState<RevenueTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await http<{ data: RevenueTarget }>('/api/reports/revenue-target');
      setData(res.data);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(status === 404
        ? 'Revenue targets are not available yet — the backend needs deploying.'
        : err instanceof Error ? err.message : 'Could not load the monthly target');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const amount = Number(draft.replace(/[^0-9.]/g, ''));
  const amountValid = Number.isFinite(amount) && amount > 0;

  const submit = async () => {
    if (!amountValid) return;
    setSaving(true);
    try {
      await http('/api/reports/revenue-target', {
        method: 'POST',
        body: JSON.stringify({ target_amount: amount }),
      });
      toast.success(`Target set for ${monthLabel()} — locked until next month.`);
      setConfirming(false);
      setDraft('');
      await load();
      onTargetSet?.();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        // Someone else in the studio set it first. Reload so the card shows
        // their number rather than leaving this admin on a stale form.
        toast.error('This month’s target was already set.');
        await load();
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not set the target');
      }
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  const daysLeft = daysLeftInMonth();
  const totalDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const tone = useMemo(
    () => toneFor(data?.pct ?? 0, daysLeft, totalDays),
    [data?.pct, daysLeft, totalDays],
  );

  const achieved = useCountUp(data?.achieved ?? 0, Boolean(data?.locked));

  if (loading) {
    return (
      <Shell>
        <div className="flex h-[168px] items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
          <p className="flex-1 text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>
          <button onClick={load} className="text-[12px] font-[700] underline" style={{ color: 'var(--danger)' }}>
            Retry
          </button>
        </div>
      </Shell>
    );
  }

  const header = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
          style={{
            background: 'linear-gradient(145deg,#0067E0,#0059CE)',
            boxShadow: '0 6px 16px rgba(0,103,224,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
            color: '#fff',
          }}>
          <Target size={17} />
        </span>
        <div>
          <h2 className="text-[15px] font-[820] leading-tight" style={{ color: 'var(--text-primary)' }}>
            {monthLabel()} target
          </h2>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left this month
          </p>
        </div>
      </div>
      {data?.locked && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-[750]"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
          <Lock size={11} /> Locked for this month
        </span>
      )}
    </div>
  );

  // ── Not set yet ───────────────────────────────────────────────────────────
  if (!data?.locked) {
    return (
      <Shell glow="#0067E0">
        {header}

        {!data?.can_set ? (
          <div className="flex items-start gap-2.5 rounded-[12px] p-3.5"
            style={{ background: 'var(--bg-subtle)' }}>
            <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              No target set for {monthLabel()}. The studio&rsquo;s trainer sets this.
            </p>
          </div>
        ) : confirming ? (
          <div className="rounded-[14px] p-4"
            style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                  Set {fmtINR(amount)} as the target for {monthLabel()}?
                </p>
                <p className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  This cannot be changed or undone until {monthLabel().split(' ')[0]} ends. Check the figure carefully.
                </p>
              </div>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <button onClick={submit} disabled={saving}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] px-4 text-[12.5px] font-[750] text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0067E0,#0059CE)' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Confirm &amp; lock
              </button>
              <button onClick={() => setConfirming(false)} disabled={saving}
                className="inline-flex min-h-[38px] items-center rounded-[10px] px-3.5 text-[12.5px] font-[700]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                Go back
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Commit to a revenue goal for {monthLabel()}. You can set it <strong>once</strong> — it locks
              until the month ends.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1 rounded-[12px] px-3"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', minHeight: 46 }}>
                <span className="text-[18px] font-[800]" style={{ color: 'var(--text-muted)' }}>₹</span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && amountValid) setConfirming(true); }}
                  inputMode="numeric"
                  placeholder="500000"
                  aria-label={`Revenue target for ${monthLabel()}`}
                  className="min-w-0 flex-1 bg-transparent tabular-nums text-[19px] font-[800] outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                {amountValid && (
                  <span className="shrink-0 text-[11.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>
                    {fmtCompact(amount)}
                  </span>
                )}
              </div>
              <button onClick={() => setConfirming(true)} disabled={!amountValid}
                className="inline-flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-[12px] px-4 text-[13px] font-[750] text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#0067E0,#0059CE)' }}>
                <Target size={15} /> Set target
              </button>
            </div>
            <p className="mt-2.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              Already collected this month: <strong style={{ color: 'var(--text-primary)' }}>{fmtINR(data?.achieved ?? 0)}</strong>
            </p>
          </div>
        )}
      </Shell>
    );
  }

  // ── Set and locked: the flaunt state ──────────────────────────────────────
  const target = data.target_amount ?? 0;
  const beat = (data.pct ?? 0) >= 100;

  return (
    <Shell glow={tone.glow}>
      {header}

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
        <ProgressRing pct={data.pct ?? 0} colour={tone.ring} />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-[800] uppercase tracking-wider"
              style={{ background: `color-mix(in srgb, ${tone.ring} 15%, transparent)`, color: tone.ring }}>
              {beat && <PartyPopper size={11} />} {tone.label}
            </span>
          </div>

          {/* Achieved is the headline: it is the number that moves. */}
          <p className="tabular-nums text-[34px] font-[880] leading-none sm:text-[40px]"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.035em' }}>
            {fmtINR(achieved)}
          </p>
          <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            collected of <strong style={{ color: 'var(--text-secondary)' }}>{fmtINR(target)}</strong> target
          </p>

          <div className="mt-4 flex flex-wrap gap-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <Figure label="Target" value={fmtINR(target)} icon={<Target size={12} />} />
            <Figure label="Achieved" value={fmtINR(data.achieved)} colour="#10B981" icon={<TrendingUp size={12} />} />
            {beat ? (
              <Figure label="Surplus" value={`+${fmtINR(data.surplus ?? 0)}`} colour="#10B981"
                icon={<PartyPopper size={12} />} />
            ) : (
              <Figure label="Balance to go" value={fmtINR(data.balance ?? 0)} colour={tone.ring}
                icon={<Wallet size={12} />} />
            )}
          </div>

          {!beat && (data.balance ?? 0) > 0 && daysLeft > 0 && (
            <p className="mt-3 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              Needs <strong style={{ color: 'var(--text-primary)' }}>
                {fmtINR(Math.ceil((data.balance ?? 0) / daysLeft))}
              </strong>/day for the remaining {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
            </p>
          )}
          {data.set_by_name && (
            <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
              Set by {data.set_by_name}
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}
