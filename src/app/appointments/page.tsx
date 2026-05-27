'use client';

import Guard from '@/components/Guard';

import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';

export default function AppointmentsPage() {
  return <ModuleWorkspace config={getModuleConfig('appointments')} />;
}
