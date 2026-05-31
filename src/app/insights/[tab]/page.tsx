'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';

// H-04 fix: guard against unknown insights tab values.
// /insights/[anything-invalid] now returns 404 instead of a blank workspace.
const VALID_INSIGHTS_TABS = ['traffic', 'renewal', 'sessions'] as const;
type InsightsTab = typeof VALID_INSIGHTS_TABS[number];

export default function InsightsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_INSIGHTS_TABS.includes(tab as InsightsTab)) {
    notFound();
  }
  return <ModuleWorkspace config={getModuleConfig('insights', `insights-${tab}`)} />;
}
