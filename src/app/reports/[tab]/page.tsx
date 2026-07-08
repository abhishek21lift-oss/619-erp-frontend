'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
const ModuleWorkspace = dynamic(() => import('@/components/modules/ModuleWorkspace'), { ssr: false });
import { getModuleConfig } from '@/lib/module-config';

// Guard against unknown report tab values.
// /reports/[anything-invalid] returns 404 instead of a blank workspace.
const VALID_REPORT_TABS = [
  'overview',
  'attendance',
  'trainers',
  'revenue',
  'dues',
  'staff',
  'monthly',
  'renewal',
  'traffic',
] as const;
type ReportTab = typeof VALID_REPORT_TABS[number];

export default function ReportTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_REPORT_TABS.includes(tab as ReportTab)) {
    notFound();
  }
  return <ModuleWorkspace config={getModuleConfig('reports', `reports-${tab}`)} />;
}

