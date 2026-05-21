'use client';

import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import PtOsNav from './PtOsNav';

export default function PtOsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-[1600px]">
          <PtOsNav />
          <div className="mt-4">{children}</div>
        </div>
      </AppShell>
    </Guard>
  );
}