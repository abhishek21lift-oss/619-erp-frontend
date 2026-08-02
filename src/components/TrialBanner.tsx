'use client';

// Slim in-app banner shown to a studio while on trial (days remaining + progress
// + upgrade) or when a paid plan is within 7 days of renewal. Hidden for the
// platform super admin and for healthy active plans. One lightweight status
// fetch on mount.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { SubscriptionStatus } from '@/lib/api';

export default function TrialBanner() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.subscription.status().then((r) => { if (!cancelled) setStatus(r.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!status) return null;
  const onTrial = status.state === 'trial';
  const renewalDue = status.state === 'active' && status.renewal_due;
  if (!onTrial && !renewalDue) return null;

  const days = onTrial ? status.trial_days_left ?? 0 : status.period_days_left ?? 0;
  const pct = onTrial ? Math.min(1, Math.max(0, (7 - (status.trial_days_left ?? 0)) / 7)) : 0;

  return (
    <Link href="/subscription" className="block">
      <div
        className="flex items-center gap-3 px-4 py-2 transition-colors"
        style={{
          background: onTrial ? 'linear-gradient(90deg,rgba(245,158,11,0.14),rgba(245,158,11,0.06))' : 'rgba(0,103,224,0.10)',
          borderBottom: `1px solid ${onTrial ? 'rgba(245,158,11,0.25)' : 'rgba(0,103,224,0.25)'}`,
        }}
      >
        <Clock size={14} style={{ color: onTrial ? '#d97706' : '#0067e0' }} className="flex-shrink-0" />
        <p className="min-w-0 flex-1 truncate text-[12.5px] font-[650]" style={{ color: onTrial ? '#92400e' : '#0067e0' }}>
          {onTrial
            ? `${days} ${days === 1 ? 'day' : 'days'} left in your free trial`
            : `Your plan renews in ${days} ${days === 1 ? 'day' : 'days'}`}
        </p>
        {onTrial && (
          <div className="hidden h-1.5 w-28 overflow-hidden rounded-full sm:block" style={{ background: 'rgba(146,64,14,0.15)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: 'linear-gradient(90deg,#F59E0B,#fbbf24)' }} />
          </div>
        )}
        <span className="flex flex-shrink-0 items-center gap-1 text-[12px] font-[750]" style={{ color: onTrial ? '#b45309' : '#0067e0' }}>
          {onTrial ? 'Upgrade' : 'Renew'} <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}
