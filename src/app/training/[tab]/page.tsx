'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';

// H-02 fix: guard against unknown training tab values.
// /training/[anything-invalid] now returns 404 instead of a blank workspace.
const VALID_TRAINING_TABS = ['transformations'] as const;
type TrainingTab = typeof VALID_TRAINING_TABS[number];

export default function TrainingTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_TRAINING_TABS.includes(tab as TrainingTab)) {
    notFound();
  }
  return <ModuleWorkspace config={getModuleConfig('training', `training-${tab}`)} />;
}
