'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import { useAuth } from '@/lib/auth-context';
import SoloTrainerApp from '@/components/solo/SoloTrainerApp';

export default function Root() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const stored = localStorage.getItem('solo-trainer-setup-complete') === 'true';
    setSetupComplete(stored);
    if (!stored) router.replace('/setup');
  }, [loading, router, user]);

  if (loading || !user || setupComplete === null || setupComplete === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-semibold shadow-sm">
          Loading Coach Abhishek
        </div>
      </div>
    );
  }

  return (
    <Guard>
      <SoloTrainerApp screen="dashboard" />
    </Guard>
  );
}
