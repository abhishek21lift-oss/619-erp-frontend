'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';

// C-02 fix: guard against unknown sales tab values.
// /sales/[anything-invalid] now returns 404 instead of a blank workspace.
const VALID_SALES_TABS = ['leads', 'enquiry', 'funnel', 'sources'] as const;
type SalesTab = typeof VALID_SALES_TABS[number];

export default function SalesTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_SALES_TABS.includes(tab as SalesTab)) {
    notFound();
  }
  return <ModuleWorkspace config={getModuleConfig('sales', `sales-${tab}`)} />;
}
