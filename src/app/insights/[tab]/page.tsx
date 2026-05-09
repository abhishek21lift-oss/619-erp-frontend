'use client';

import { use } from 'react';
import RoutePlaceholderPage from '@/components/RoutePlaceholderPage';

const LABELS: Record<string, string> = {
  members: 'Member Analytics',
  billing: 'Billing Analysis',
};

export default function InsightsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  const title = LABELS[tab] || 'Insights Module';
  return (
    <RoutePlaceholderPage
      title={title}
      description="Review analytics snapshots, trends, and export-ready decision metrics."
      role="admin"
    />
  );
}
