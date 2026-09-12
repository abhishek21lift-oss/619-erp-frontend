'use client';

// Canonical redirect: /insights/[tab] is a retired duplicate of the custom
// Insights pages. The static routes (/insights/traffic, /renewal, /sessions)
// already win over this dynamic segment, so this only fires for edge cases —
// it exists so ONE architecture renders, not two, and the generic
// ModuleWorkspace (open guard, mock-shaped data) can never serve insights URLs.

import { use } from 'react';
import { notFound, redirect } from 'next/navigation';

const CANONICAL: Record<string, string> = {
  traffic: '/insights/traffic',
  renewal: '/insights/renewal',
  sessions: '/insights/sessions',
};

export default function InsightsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  const target = CANONICAL[tab];
  if (!target) {
    notFound();
  }
  redirect(target);
}
