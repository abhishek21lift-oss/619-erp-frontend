'use client';

import { use } from 'react';
import RoutePlaceholderPage from '@/components/RoutePlaceholderPage';

const LABELS: Record<string, string> = {
  targets: 'Trainer Targets',
};

export default function TrainingTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  const title = LABELS[tab] || 'Training Module';
  return (
    <RoutePlaceholderPage
      title={title}
      description="Monitor coaching goals, weekly targets, and performance review actions."
      role="admin"
    />
  );
}
