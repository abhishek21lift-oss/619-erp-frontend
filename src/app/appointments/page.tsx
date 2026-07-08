'use client';

import Guard from '@/components/Guard';

import dynamic from 'next/dynamic';
const ModuleWorkspace = dynamic(() => import('@/components/modules/ModuleWorkspace'), { ssr: false });
import { getModuleConfig } from '@/lib/module-config';

export default function AppointmentsPage() {
  return <ModuleWorkspace config={getModuleConfig('appointments')} />;
}
