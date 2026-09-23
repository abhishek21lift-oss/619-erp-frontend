'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
const ModuleWorkspace = dynamic(() => import('@/components/modules/ModuleWorkspace'), { ssr: false });
import { getModuleConfig } from '@/lib/module-config';

// Unknown tabs 404 rather than opening a blank generic workspace. It used to
// take any value, so /attendance/leave opened a staff-leave workspace long
// after staff leave stopped being a thing a studio has.
const VALID_ATTENDANCE_TABS = ['reports'] as const;
type AttendanceTab = typeof VALID_ATTENDANCE_TABS[number];

export default function AttendanceTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_ATTENDANCE_TABS.includes(tab as AttendanceTab)) {
    notFound();
  }
  return <ModuleWorkspace config={getModuleConfig('attendance', tab)} />;
}
