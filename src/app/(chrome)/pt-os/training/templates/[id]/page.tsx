'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Guard from '@/components/Guard';

// The per-template builder was retired with its list — see the sibling
// page for why. Old links and bookmarks redirect to Workout Plans.
//
// It redirects to the LIST rather than to some workout_plans id, because there
// is no mapping between the two: a template is not a plan, was never assigned
// to anyone, and inventing a destination would be worse than landing the
// trainer somewhere they can navigate from. The template row is preserved in
// the database either way.
export default function TemplateDetailRetiredRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pt-os/workout-plans');
  }, [router]);

  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin" size={20} style={{ color: 'var(--text-muted)' }} />
      </div>
    </Guard>
  );
}
