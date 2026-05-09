'use client';

import { use } from 'react';
import RoutePlaceholderPage from '@/components/RoutePlaceholderPage';

const LABELS: Record<string, string> = {
  branches: 'Branches',
  staff: 'Staff & Access',
  biometric: 'Biometric & Face',
  equipment: 'Equipment',
  notices: 'Notices & Rules',
  billing: 'GST / Invoice',
  branding: 'Branding & App',
  measurements: 'Measurements',
  workouts: 'Workouts & Diet',
};

export default function SettingsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  const title = LABELS[tab] || 'Settings';
  return (
    <RoutePlaceholderPage
      title={title}
      description="Configure branch operations, access, branding, billing, and studio defaults."
      role="admin"
    />
  );
}
