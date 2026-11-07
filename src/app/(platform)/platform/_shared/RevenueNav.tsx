'use client';

// One Revenue row, wherever the operator is inside Revenue.
//
// Finance used to own four sub-tabs and Analytics sat in a separate hero pill
// row above them. That is two navigations for one module, and the hero pill was
// already selected. Billing/Payments/Invoices/Coupons/Analytics now live in a
// single control on both screens; Analytics keeps its own ?tab deep link.
import { useEffect, useState } from 'react';
import { CreditCard, TrendingUp, Receipt, Ticket, Wallet } from 'lucide-react';
import { SegmentedTabs } from '@/components/platform/console';
import { api } from '@/lib/api';
import type { FinanceSubTab } from './types';

export type RevenueView = FinanceSubTab | 'analytics';

export function RevenueNav({
  view, onChange,
}: {
  view: RevenueView;
  onChange: (v: RevenueView) => void;
}) {
  const [awaiting, setAwaiting] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    // Count only: the queue itself is fetched by the Payments screen. limit=1
    // keeps this cheap; the response carries the platform-wide stats anyway.
    const load = () => {
      api.superAdmin.subscriptionRequests({ status: 'AWAITING_VERIFICATION', limit: 1 })
        .then((r) => { if (alive) setAwaiting(r.stats?.awaiting_count ?? null); })
        .catch(() => { if (alive) setAwaiting(null); });
    };
    load();
    // The queue dispatches this after an approve/reject, so the badge cannot
    // keep claiming work that is already done.
    window.addEventListener('subscription-requests-changed', load);
    return () => { alive = false; window.removeEventListener('subscription-requests-changed', load); };
  }, []);

  return (
    <div className="mb-5 max-w-3xl">
      <SegmentedTabs<RevenueView>
        tabs={[
          { id: 'billing', label: 'Billing', icon: <CreditCard size={13} /> },
          { id: 'payments', label: 'Payments', icon: <Wallet size={13} />, badge: awaiting ?? undefined },
          { id: 'invoices', label: 'Invoices', icon: <Receipt size={13} /> },
          { id: 'coupons', label: 'Coupons', icon: <Ticket size={13} /> },
          { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={13} /> },
        ]}
        value={view}
        onChange={onChange}
        label="Revenue views"
      />
    </div>
  );
}
