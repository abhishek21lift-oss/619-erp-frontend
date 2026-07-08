'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';
const ModuleWorkspace = dynamic(() => import('@/components/modules/ModuleWorkspace'), { ssr: false });
import { getModuleConfig } from '@/lib/module-config';

export default function AttendanceTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  return <ModuleWorkspace config={getModuleConfig('attendance', tab)} />;
}
