'use client';

// A workout, being done.
//
// The whole screen is built around one constraint: the person using it is
// standing up, holding a phone, between sets, and possibly without signal.
// So nothing here blocks on the network. Logging a set is a local write that
// the queue delivers when it can (lib/training/logQueue.ts), and the sync
// state is shown rather than hidden — a spinner over the whole screen would
// be both a lie and useless.
//
// ── Why the template is fetched too ────────────────────────────────────────
//
// The session's performances know what was done; only the template knows what
// was asked for. Without it the logger cannot prefill, cannot show "prescribed
// 4 × 6", and cannot tell a treadmill from a squat before the first row is
// logged. It is one extra request at load and nothing depends on it — an
// ad-hoc session with no template logs perfectly well without one.

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowLeft, CheckCircle2, Dumbbell, Loader2, Play, Trophy,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import SetLogger from '@/components/pt-os/training/SetLogger';
import CardioLogger from '@/components/pt-os/training/CardioLogger';
import RestTimer from '@/components/pt-os/training/RestTimer';
import SyncBadge from '@/components/pt-os/training/SyncBadge';
import { useSessionLogger } from '@/lib/training/useSessionLogger';
import { useTrainingMeta } from '@/lib/training/useTrainingMeta';
import { pickLoggerShape, prescriptionsByExercise } from '@/lib/training/loggerShape';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { PersonalRecord, SessionSummary, TemplateExercise } from '@/lib/api';

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Guard roles={['admin', 'manager', 'trainer']}><SessionLogger sessionId={id} /></Guard>;
}

function SessionLogger({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { meta } = useTrainingMeta();
  const logger = useSessionLogger(sessionId);
  const {
    session, performances, loading, error, reload,
    logSet, logCardio, pending, syncing, syncError, retry, dropped, dismissDropped,
  } = logger;

  const [prescriptions, setPrescriptions] = useState<Map<string, TemplateExercise>>(new Map());
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restKey, setRestKey] = useState(0);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState<{ summary: SessionSummary; records: PersonalRecord[] } | null>(null);

  const templateId = session?.workout_template_id ?? null;
  useEffect(() => {
    if (!templateId) return;
    let alive = true;
    api.training.templates.get(templateId)
      .then((res) => { if (alive) setPrescriptions(prescriptionsByExercise(res.data.exercises ?? [])); })
      // A missing template costs prefill and target labels, not the workout.
      .catch(() => { if (alive) setPrescriptions(new Map()); });
    return () => { alive = false; };
  }, [templateId]);

  // A dropped write is the one failure the trainer must not miss: they believe
  // the set was recorded and it was refused.
  useEffect(() => {
    if (dropped.length === 0) return;
    toast.error(`${dropped.length} entr${dropped.length === 1 ? 'y was' : 'ies were'} rejected: ${dropped[0].message}`);
    dismissDropped();
  }, [dropped, toast, dismissDropped]);

  const start = useCallback(async () => {
    setStarting(true);
    try {
      await api.training.sessions.start(sessionId);
      await reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not start this session');
    } finally {
      setStarting(false);
    }
  }, [sessionId, reload, toast]);

  const finish = useCallback(async () => {
    setFinishing(true);
    try {
      // Anything still queued goes first, so the summary counts it.
      retry();
      const res = await api.training.sessions.complete(sessionId);
      setFinished({ summary: res.summary, records: res.records ?? [] });
      await reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not finish this session');
    } finally {
      setFinishing(false);
    }
  }, [sessionId, reload, retry, toast]);

  const onLogSet = useCallback((performanceId: string, payload: Record<string, unknown>) => {
    logSet(performanceId, payload);
    const rest = prescriptionsFor(performanceId, performances, prescriptions)?.target_rest_seconds;
    if (rest) { setRestSeconds(rest); setRestKey((k) => k + 1); }
  }, [logSet, performances, prescriptions]);

  const rows = useMemo(() => performances.map((p) => {
    const prescription = p.exercise_id ? prescriptions.get(p.exercise_id) : undefined;
    return { p, prescription, shape: pickLoggerShape(p, prescription, meta?.prescription_types ?? []) };
  }), [performances, prescriptions, meta]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--brand-lo)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={30} style={{ color: 'var(--danger-text)', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[620]" style={{ color: 'var(--text-muted)' }}>{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => reload()}>Retry</Button>
      </div>
    );
  }

  const notStarted = session?.status === 'NOT_STARTED';
  const complete = session?.status === 'COMPLETED';

  return (
    <PageContainer>
      <PageHero
        icon={<Dumbbell size={20} />}
        title={session?.template_name ?? 'Workout'}
        subtitle={session?.session_date ?? undefined}
        actions={
          <Button variant="outline" iconLeft={<ArrowLeft size={14} />} onClick={() => router.back()}>
            Back
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-3xl space-y-4">
        <SyncBadge pending={pending} syncing={syncing} error={syncError} onRetry={retry} />

        {notStarted && (
          <Button onClick={start} disabled={starting} iconLeft={<Play size={14} />} className="w-full">
            {starting ? 'Starting…' : 'Start workout'}
          </Button>
        )}

        {restSeconds != null && !complete && (
          <RestTimer key={restKey} seconds={restSeconds} onDismiss={() => setRestSeconds(null)} />
        )}

        {finished && <Finished summary={finished.summary} records={finished.records} />}

        {rows.length === 0 && (
          <p className="py-10 text-center text-[13px] font-[620]" style={{ color: 'var(--text-muted)' }}>
            Nothing on this session yet.
          </p>
        )}

        {rows.map(({ p, prescription, shape }) => (
          <section
            key={p.id}
            className="rounded-[16px] border p-4"
            style={{ borderColor: 'var(--border-2)', background: 'var(--bg-card)' }}
          >
            <header className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                {p.exercise_name}
              </h2>
              {p.section && (
                <span className="text-[10.5px] font-[700] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>
                  {p.section.toLowerCase()}
                </span>
              )}
            </header>

            {shape === 'cardio'
              ? <CardioLogger
                  performance={p}
                  prescription={prescription}
                  typeMeta={meta?.prescription_types.find((t) => t.type === prescription?.prescription_type)}
                  onLog={logCardio}
                />
              : <SetLogger performance={p} prescription={prescription} onLog={onLogSet} />}
          </section>
        ))}

        {!notStarted && !complete && rows.length > 0 && (
          <Button
            onClick={finish}
            disabled={finishing}
            iconLeft={<CheckCircle2 size={14} />}
            className="w-full"
          >
            {finishing ? 'Finishing…' : 'Finish workout'}
          </Button>
        )}
      </div>
    </PageContainer>
  );
}

function prescriptionsFor(
  performanceId: string,
  performances: { id: string; exercise_id: string | null }[],
  prescriptions: Map<string, TemplateExercise>,
): TemplateExercise | undefined {
  const p = performances.find((x) => x.id === performanceId);
  return p?.exercise_id ? prescriptions.get(p.exercise_id) : undefined;
}

function Finished({ summary, records }: { summary: SessionSummary; records: PersonalRecord[] }) {
  return (
    <div
      className="rounded-[16px] border p-4"
      style={{ borderColor: 'var(--success-border)', background: 'var(--success-bg)' }}
    >
      <h2 className="mb-2 text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>
        Workout complete
      </h2>
      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
        {summary.exercisesCompleted}/{summary.exercises} exercises · {summary.strength.hardSets} working sets
        {summary.strength.loadKg > 0 && <> · {Math.round(summary.strength.loadKg)}kg total load</>}
        {summary.cardio.efforts > 0 && <> · {summary.cardio.efforts} cardio effort{summary.cardio.efforts === 1 ? '' : 's'}</>}
      </p>
      {records.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {records.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
              <Trophy size={13} style={{ color: 'var(--gold)' }} />
              {r.exercise_name} — {r.record_type.replace(/_/g, ' ').toLowerCase()} {r.value}{r.unit ?? ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
