'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Guard from '@/components/Guard';

// Measurements was retired and folded into the Fitness Testing module
// (Anthropometric + Body Composition steps). This stub preserves old
// links/bookmarks by redirecting straight through.
function MeasurementsRedirect() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const clientId = sp.get('client_id');
    router.replace(clientId ? `/pt-os/assessment?client_id=${clientId}` : '/pt-os/assessment');
  }, [router, sp]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} />
    </div>
  );
}

export default function MeasurementsPage() {
  return (
    <Guard>
      <Suspense fallback={null}>
        <MeasurementsRedirect />
      </Suspense>
    </Guard>
  );
}
