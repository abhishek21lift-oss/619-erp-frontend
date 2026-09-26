'use client';

/**
 * Member Home — the renewal nudge.
 *
 * Shows only when there is something to act on:
 *   • the trainer has sent a renewal offer → "Your renewal is ready · ₹X"
 *   • the plan ends within two weeks, or has ended → a quiet reminder
 * and nothing otherwise. Loads on its own; a failed read simply hides it.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { CalendarClock, ChevronRight, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import type { MeRenewal } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';
import { daysLeft } from '@/components/member/planDates';
import { EASE, MC } from './MemberUI';

export default function RenewalBanner() {
  const [data, setData] = useState<MeRenewal | null>(null);

  useEffect(() => {
    let live = true;
    api.me.renewal().then((r) => { if (live) setData(r.data); }).catch(() => { if (live) setData(null); });
    return () => { live = false; };
  }, []);

  if (!data) return null;
  const { plan, offer } = data;

  if (offer && offer.status !== 'VERIFICATION_PENDING') {
    return (
      <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="mb-4">
        <Link href="/member/renew"
          className="flex items-center gap-3 rounded-[18px] p-4 text-white transition-transform active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${MC.primary}, ${MC.primaryDeep})`, boxShadow: `0 12px 28px -12px ${rgba(MC.primary, 0.6)}` }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <Sparkles size={18} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-[800]">Your renewal is ready</span>
            <span className="block truncate text-[12.5px] font-[600] opacity-85">
              {offer.package_name} · ₹{offer.total_amount.toLocaleString('en-IN')} · pay by UPI
            </span>
          </span>
          <ChevronRight size={18} aria-hidden className="shrink-0 opacity-80" />
        </Link>
      </m.div>
    );
  }

  if (plan.phase !== 'ending' && plan.phase !== 'expired') return null;
  const ago = Math.abs(plan.days_left ?? 0);
  // Counted the way the plan card on this screen counts (the end day is a day
  // you still have), so the two never disagree.
  const left = daysLeft(plan.end_date) ?? 0;
  const text = plan.phase === 'expired'
    ? `Your plan ended ${ago} day${ago === 1 ? '' : 's'} ago`
    : `Your plan ends in ${left} day${left === 1 ? '' : 's'}`;
  const tone = palette.amber[500];

  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="mb-4">
      <Link href="/member/renew"
        className="flex items-center gap-3 rounded-[18px] p-4 transition-transform active:scale-[0.98]"
        style={{ background: 'var(--bg-card)', border: `1px solid ${rgba(tone, 0.35)}` }}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: rgba(tone, 0.14), color: tone }}>
          <CalendarClock size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-[780]" style={{ color: MC.ink }}>{text}</span>
          <span className="block text-[12.5px]" style={{ color: MC.muted }}>
            {offer ? 'Renewal payment sent — the studio is confirming it' : data.requested_at ? 'Renewal requested from your trainer' : 'Renew in the app — tap to see how'}
          </span>
        </span>
        <ChevronRight size={16} aria-hidden className="shrink-0" style={{ color: MC.muted }} />
      </Link>
    </m.div>
  );
}
