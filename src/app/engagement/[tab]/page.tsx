'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Guard from '@/components/Guard';
import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';

// M-02 fix: guard against unknown engagement tab values.
// /engagement/[anything-invalid] now returns 404 instead of a blank workspace.
// The 19 unreleased module-config keys remain inaccessible via direct URL.
const VALID_ENGAGEMENT_TABS = [
  'notifications',
  'whatsapp',
  'campaigns',
  'offers',
  'feedback',
] as const;
type EngagementTab = typeof VALID_ENGAGEMENT_TABS[number];

export default function EngagementTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_ENGAGEMENT_TABS.includes(tab as EngagementTab)) {
    notFound();
  }
  return <Guard role="admin"><ModuleWorkspace config={getModuleConfig('engagement', `engagement-${tab}`)} /></Guard>;
}
