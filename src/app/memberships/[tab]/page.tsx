'use client';

import { use } from 'react';
import RoutePlaceholderPage from '@/components/RoutePlaceholderPage';

const LABELS: Record<string, string> = {
  plans: 'Membership Plans',
};

export default function MembershipsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  const title = LABELS[tab] || 'Memberships Module';
  return (
    <RoutePlaceholderPage
      title={title}
      description="Manage plan catalog operations, membership rules, and billing readiness."
      role={tab === 'plans' ? 'admin' : undefined}
    />
  );
}
