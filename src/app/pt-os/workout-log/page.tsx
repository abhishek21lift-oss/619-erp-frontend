'use client';

import { ClipboardList } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';

// Sidebar landing point for the client-scoped Workout Log module. Unlike the
// other pickers this one does not come back to its own route with a query
// parameter — a client's log lives at /pt-os/clients/[id]/workout-log, so the
// destination is a path and hrefFor builds it.
export default function WorkoutLogLandingPage() {
  return (
    <Guard>
      <AppShell>
        <ClientPicker
          title="Workout Log"
          icon={<ClipboardList size={20} color="#fff" />}
          basePath="/pt-os/workout-log"
          hrefFor={(id) => `/pt-os/clients/${id}/workout-log`}
        />
      </AppShell>
    </Guard>
  );
}
