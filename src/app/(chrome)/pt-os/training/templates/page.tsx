'use client';

// The workouts a studio has designed.
//
// This page exists because the builder had no front door. A template could be
// created by the API and edited at /pt-os/training/templates/<id>, and there
// was no way to find that id from inside the app — the whole new training
// domain was reachable only by typing a URL.
//
// ── Why it is not the old Workout Plans screen ─────────────────────────────
//
// That screen lists workout_plans, assigns them, and carries the exercise
// library and the training brief in tabs beside them. It reads the old tables
// and will keep working until the cutover finishes. Editing it in place would
// mean one screen serving two schemas at once, which is the state that makes
// a migration impossible to finish.
//
// ── A day inside a week must say which day it is ───────────────────────────
//
// wt_week_day_agree, mirrored in the API's zod schema. This form does not
// offer week membership at all, so every template made here is standalone and
// day_number stays optional — a programme's weeks are built from the programme
// side, where the week is already known.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Dumbbell, Loader2, Plus } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import NewWorkoutDialog from '@/components/pt-os/training/NewWorkoutDialog';
import { describeTemplate } from '@/lib/training/templates';
import type { WorkoutTemplate } from '@/lib/api';

export default function TemplatesPage() {
  return <Guard roles={['admin', 'manager', 'trainer']}><Templates /></Guard>;
}

function Templates() {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.training.templates.list();
      setTemplates(res.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load workouts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (fields: { name: string; goal: string; dayLabel: string }) => {
    const res = await api.training.templates.create({
      name: fields.name.trim(),
      goal: fields.goal.trim() || null,
      day_label: fields.dayLabel.trim() || null,
    });
    // Straight into the builder: a workout with no exercises is not a thing
    // anyone wanted to create, it is step one of creating one.
    router.push(`/pt-os/training/templates/${res.data.id}`);
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--brand-lo)' }} />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHero
        icon={<Dumbbell size={20} />}
        title="Workouts"
        subtitle="Days a client can be assigned and log against"
        actions={
          <Button iconLeft={<Plus size={14} />} onClick={() => setCreating(true)}>
            New workout
          </Button>
        }
      />

      {error && (
        <div className="mx-auto max-w-md py-16 text-center">
          <AlertCircle size={28} style={{ color: 'var(--danger-text)', margin: '0 auto 10px' }} />
          <p className="text-[14px] font-[620]" style={{ color: 'var(--text-muted)' }}>{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => { setLoading(true); load(); }}>
            Retry
          </Button>
        </div>
      )}

      {!error && templates.length === 0 && (
        <div className="mx-auto max-w-md py-20 text-center">
          <Dumbbell size={30} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p className="text-[14px] font-[620]" style={{ color: 'var(--text-primary)' }}>
            No workouts yet
          </p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            A workout is one day — the exercises, the sets, the prescription.
          </p>
          <Button className="mt-5" iconLeft={<Plus size={14} />} onClick={() => setCreating(true)}>
            New workout
          </Button>
        </div>
      )}

      {!error && templates.length > 0 && (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const sub = describeTemplate(t);
            return (
              <li key={t.id}>
                <Link
                  href={`/pt-os/training/templates/${t.id}`}
                  className="block rounded-[16px] border p-4 transition-all hover:-translate-y-0.5"
                  style={{ borderColor: 'var(--border-2)', background: 'var(--bg-card)' }}
                >
                  <h2 className="text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                    {t.name}
                  </h2>
                  {sub && (
                    <p className="mt-1 text-[12px] font-[620]" style={{ color: 'var(--text-muted)' }}>
                      {sub}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <NewWorkoutDialog
          onClose={() => setCreating(false)}
          onCreate={create}
          onError={(m) => toast.error(m)}
        />
      )}
    </PageContainer>
  );
}
