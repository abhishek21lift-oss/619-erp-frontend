'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';

// C-03 fix: guard against unknown settings tab values.
// /settings/[anything-invalid] now returns 404 instead of a blank workspace.
const VALID_SETTINGS_TABS = [
  'studio',
  'profile',
  'branches',
  'staff',
  'biometric',
  'billing',
  'branding',
  'integrations',
  'import-database',
] as const;
type SettingsTab = typeof VALID_SETTINGS_TABS[number];

export default function SettingsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_SETTINGS_TABS.includes(tab as SettingsTab)) {
    notFound();
  }
  return <ModuleWorkspace config={getModuleConfig('settings', `settings-${tab}`)} />;
}
