'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';

// H-02 fix (original): only accept known plan tab values.
// M-01 fix: removed 'create' from VALID_PLAN_TABS — /plans/create is a static
// route that Next.js resolves before this [tab] handler, meaning 'create' could
// never reach this file. Keeping it in the whitelist was dead code.
const VALID_PLAN_TABS = ['active', 'archived', 'promo', 'renewal'] as const;
type PlanTab = typeof VALID_PLAN_TABS[number];

export default function PlansTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_PLAN_TABS.includes(tab as PlanTab)) {
    notFound();
  }
  return <ModuleWorkspace config={getModuleConfig('plans', `plans-${tab}`)} />;
}
