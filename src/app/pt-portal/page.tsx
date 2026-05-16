'use client';

import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import PersonalTrainingPortal from '@/components/pt/PersonalTrainingPortal';

export default function PtPortalPage() {
  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <PersonalTrainingPortal />
        </div>
      </AppShell>
    </Guard>
  );
}
