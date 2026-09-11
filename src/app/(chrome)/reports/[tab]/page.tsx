'use client';

// Canonical redirect: /reports/[tab] rendered a generic ModuleWorkspace over
// the same concepts the custom pages own (Revenue, Dues, Trainers, Renewal,
// Traffic). Two UIs for one URL concept is how metric definitions drifted.
// Every slug now 301-equivalents (client redirect) to its canonical page;
// unknown slugs stay 404. The generic workspace no longer serves report URLs.

import { use } from 'react';
import { notFound, redirect } from 'next/navigation';

const CANONICAL: Record<string, string> = {
  overview: '/reports',
  monthly: '/insights/revenue',
  revenue: '/insights/revenue',
  dues: '/finance/dues',
  trainers: '/reports',
  attendance: '/insights/traffic',
  traffic: '/insights/traffic',
  renewal: '/insights/renewal',
  staff: '/operations/leaderboard',
};

export default function ReportTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  const target = CANONICAL[tab];
  if (!target) {
    notFound();
  }
  redirect(target);
}
