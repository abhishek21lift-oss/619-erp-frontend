'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Guard from '@/components/Guard';

// The workout-template builder was retired and folded into Workout Plans,
// which is the canonical workout surface. This stub preserves old links and
// bookmarks by redirecting straight through.
//
// ── Why this one lost, on structure rather than preference ─────────────────
//
// workout_assignments has exactly one parent column — workout_plan_id — and no
// column for a template at all. A workout_template therefore cannot be
// assigned to a client, cannot reach Today, cannot be logged, and cannot
// produce a personal record. It was an authoring screen with no exit, and the
// flow the product needs (author → assign → log → progress) was only ever
// completable on the workout_plans side.
//
// Production said the same thing: 60 plans, 409 exercises and 49 assignments
// current to 2026-09-02, against 1 template with 4 exercises from one August
// afternoon, whose program_id and week_id are both NULL.
//
// The template row itself is NOT deleted. It stays in workout_templates and
// /api/training/templates still serves it, so nothing has been lost — only the
// second front door has closed.
export default function TemplatesRetiredRedirect() {
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
