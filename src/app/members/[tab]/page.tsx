'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';

// C-01 fix: guard against unknown member tab values.
// /members/[anything-invalid] now returns 404 instead of a blank workspace.
const VALID_MEMBER_TABS = ['active', 'renewals', 'expiring', 'lapsed', 'birthdays'] as const;
type MemberTab = typeof VALID_MEMBER_TABS[number];

export default function MembersTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_MEMBER_TABS.includes(tab as MemberTab)) {
    notFound();
  }
  return <ModuleWorkspace config={getModuleConfig('members', `members-${tab}`)} />;
}
