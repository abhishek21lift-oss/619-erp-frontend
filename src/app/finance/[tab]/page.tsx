'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';

// H-03 fix: guard against unknown finance tab values.
// /finance/[anything-invalid] now returns 404 instead of a blank workspace.
const VALID_FINANCE_TABS = [
  'invoices',
  'record-payment',
  'dues',
  'collection',
  'pl',
  'forecast',
  'trainer-revenue',
] as const;
type FinanceTab = typeof VALID_FINANCE_TABS[number];

export default function FinanceTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_FINANCE_TABS.includes(tab as FinanceTab)) {
    notFound();
  }
  return <ModuleWorkspace config={getModuleConfig('finance', `finance-${tab}`)} />;
}
