'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  Accessibility, ArrowLeft, ArrowRight, Check, Download, Loader2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { calcPostureReferrals, calcPostureRiskScore, classifyRisk } from '@/lib/posture-calculations';
import ReferralBanner from '@/components/pt-os/shared/ReferralBanner';
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import AssessmentHistoryHub from '@/components/pt-os/shared/AssessmentHistoryHub';
import { STEPS, initPostureForm, emptyPlanExercise, validatePostureFindings } from '@/components/pt-os/posture-assessment/types';
import type {
  AssessmentSummary, AssessmentType, CoachNotes, CorrectivePlan, MuscleFinding, PlanExercise,
  PostureFormData, PostureStatus, StepId,
} from '@/components/pt-os/posture-assessment/types';
import StepAssessmentOverview from '@/components/pt-os/posture-assessment/StepAssessmentOverview';
import StepPostureObservations from '@/components/pt-os/posture-assessment/StepPostureObservations';
import StepMuscleImbalance from '@/components/pt-os/posture-assessment/StepMuscleImbalance';
import StepCorrectivePlan from '@/components/pt-os/posture-assessment/StepCorrectivePlan';
import StepReview from '@/components/pt-os/posture-assessment/StepReview';
import AiPosturalInsightsPanel from '@/components/pt-os/posture-assessment/AiPosturalInsightsPanel';
import PostureCard from '@/components/pt-os/posture-assessment/PostureCard';
import PostureComparison from '@/components/pt-os/posture-assessment/PostureComparison';
import { errorMessage } from '@/lib/forms/errors';
import { assessmentDateIssue } from '@/components/pt-os/shared/AssessmentDateField';
import { downloadPosturePdf } from '@/lib/posture-pdf';

const EASE = [0.16, 1, 0.3, 1] as const;
const VALID_TYPES: AssessmentType[] = ['initial', 'follow_up', 're_assessment', 'progress'];
const VALID_STATUSES: PostureStatus[] = ['draft', 'completed'];

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch { return {}; }
  }
  return {};
}

function jsonArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((v) => v && typeof v === 'object') as Record<string, unknown>[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v) => v && typeof v === 'object') as Record<string, unknown>[] : [];
    } catch { return []; }
  }
  return [];
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

function planFromRow(raw: unknown): CorrectivePlan {
  const plan = jsonObject(raw);
  const toExercise = (entry: Record<string, unknown>): PlanExercise => ({
    ...emptyPlanExercise(),
    exercise: text(entry.exercise),
    targetMuscle: text(entry.target_muscle),
    region: text(entry.region),
    duration: text(entry.duration),
    sets: text(entry.sets),
    reps: text(entry.reps),
    hold: text(entry.hold),
    resistance: text(entry.resistance),
    tempo: text(entry.tempo),
    rest: text(entry.rest),
    frequency: text(entry.frequency),
    instructions: text(entry.instructions),
  });
  const recommendations = jsonObject(plan.recommendations);
  return {
    mobility: jsonArray(plan.mobility).map(toExercise),
    activation: jsonArray(plan.activation).map(toExercise),
    strengthening: jsonArray(plan.strengthening).map(toExercise),
    recommendations: {
      general: text(recommendations.general),
      modifications: text(recommendations.modifications),
      precautions: text(recommendations.precautions),
      follow_up: text(recommendations.follow_up),
      additional: text(recommendations.additional),
    },
  };
}

function formFromRow(row: Record<string, unknown>): PostureFormData {
  const fresh = initPostureForm();
  const viewNotesRaw = jsonObject(row.view_notes);
  const summaryRaw = jsonObject(row.assessment_summary);
  const coachNotesRaw = jsonObject(row.coach_notes) as Partial<CoachNotes>;

  const muscleImbalances: MuscleFinding[] = jsonArray(row.muscle_imbalances).map((m, index) => ({
    id: `m-${index}-${text(m.muscle).toLowerCase().replace(/[^a-z]+/g, '-')}`,
    muscle: text(m.muscle),
    status: m.status === 'tight' || m.status === 'weak' ? m.status : 'normal',
    side: m.side === 'left' || m.side === 'right' ? m.side : 'bilateral',
    notes: text(m.notes),
  }));

  const assessmentType = VALID_TYPES.includes(row.assessment_type as AssessmentType)
    ? row.assessment_type as AssessmentType
    : 'initial';
  const status = VALID_STATUSES.includes(row.status as PostureStatus)
    ? row.status as PostureStatus
    : 'completed';

  const summary: AssessmentSummary = {
    primaryConcern: text(summaryRaw.primary_concern),
    secondaryConcern: text(summaryRaw.secondary_concern),
    trainerAssessment: text(summaryRaw.trainer_assessment) || text(coachNotesRaw.initial_observations),
    clientRecommendations: text(summaryRaw.client_recommendations) || text(coachNotesRaw.corrective_strategy),
  };

  return {
    ...fresh,
    assessmentDate: row.assessment_date ? String(row.assessment_date).slice(0, 10) : fresh.assessmentDate,
    assessmentType,
    status,
    frontIssues: stringList(row.front_issues),
    sideIssues: stringList(row.side_issues),
    backIssues: stringList(row.back_issues),
    viewNotes: {
      front: text(viewNotesRaw.front),
      side: text(viewNotesRaw.side),
      back: text(viewNotesRaw.back),
    },
    otherIssueNotes: text(row.other_issue_notes),
    noIssuesNoted: false,
    frontPhoto: text(row.front_photo_url),
    sidePhoto: text(row.side_photo_url),
    backPhoto: text(row.back_photo_url),
    muscleImbalances,
    correctivePlan: planFromRow(row.corrective_plan),
    summary,
    resolvedFindings: stringList(row.resolved_findings),
    coachNotes: { ...fresh.coachNotes, ...coachNotesRaw },
  };
}

function serialiseExercise(entry: PlanExercise): Record<string, unknown> {
  return {
    exercise: entry.exercise.trim(),
    target_muscle: entry.targetMuscle.trim() || null,
    region: entry.region.trim() || null,
    duration: entry.duration.trim() || null,
    sets: entry.sets.trim() || null,
    reps: entry.reps.trim() || null,
    hold: entry.hold.trim() || null,
    resistance: entry.resistance.trim() || null,
    tempo: entry.tempo.trim() || null,
    rest: entry.rest.trim() || null,
    frequency: entry.frequency.trim() || null,
    instructions: entry.instructions.trim() || null,
  };
}

function toPayload(form: PostureFormData, status: PostureStatus): Record<string, unknown> {
  return {
    assessment_date: form.assessmentDate,
    assessment_type: form.assessmentType,
    status,
    front_issues: form.frontIssues,
    side_issues: form.sideIssues,
    back_issues: form.backIssues,
    view_notes: {
      front: form.viewNotes.front.trim() || null,
      side: form.viewNotes.side.trim() || null,
      back: form.viewNotes.back.trim() || null,
    },
    other_issue_notes: form.otherIssueNotes.trim() || null,
    front_photo_url: form.frontPhoto || null,
    side_photo_url: form.sidePhoto || null,
    back_photo_url: form.backPhoto || null,
    muscle_imbalances: form.muscleImbalances.map((m) => ({
      muscle: m.muscle, status: m.status, side: m.side, notes: m.notes.trim() || null,
    })),
    corrective_plan: {
      mobility: form.correctivePlan.mobility.filter((e) => e.exercise.trim()).map(serialiseExercise),
      activation: form.correctivePlan.activation.filter((e) => e.exercise.trim()).map(serialiseExercise),
      strengthening: form.correctivePlan.strengthening.filter((e) => e.exercise.trim()).map(serialiseExercise),
      recommendations: {
        general: form.correctivePlan.recommendations.general.trim() || null,
        modifications: form.correctivePlan.recommendations.modifications.trim() || null,
        precautions: form.correctivePlan.recommendations.precautions.trim() || null,
        follow_up: form.correctivePlan.recommendations.follow_up.trim() || null,
        additional: form.correctivePlan.recommendations.additional.trim() || null,
      },
    },
    assessment_summary: {
      primary_concern: form.summary.primaryConcern.trim() || null,
      secondary_concern: form.summary.secondaryConcern.trim() || null,
      trainer_assessment: form.summary.trainerAssessment.trim() || null,
      client_recommendations: form.summary.clientRecommendations.trim() || null,
    },
    resolved_findings: form.resolvedFindings,
    coach_notes: form.coachNotes,
  };
}

function validateStep(id: StepId, form: PostureFormData): string | undefined {
  if (id === 1) return assessmentDateIssue(form.assessmentDate);
  if (id === 2) return validatePostureFindings(form);
  return undefined;
}

export default function PtPostureAssessmentPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#A33757' }} /></div>}>
        <PostureContent />
      </Suspense>
    </Guard>
  );
}

function PostureContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Posture Assessment" icon={<Accessibility size={20} color="#fff" />} basePath="/pt-os/posture-assessment" />;
  return <PostureHub key={clientId} clientId={clientId} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── HUB (list + wizard) */
interface PostureHubProps {
  clientId: string;
  toast: ReturnType<typeof useToast>['toast'];
}

function PostureHub({ clientId, toast }: PostureHubProps) {
  const [clientName, setClientName] = useState('');
  const [assessments, setAssessments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [opening, setOpening] = useState(false);
  const [previous, setPrevious] = useState<Record<string, unknown> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, listRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.postureAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      const rows = Array.isArray(listRes?.data) ? listRes.data : [];
      setAssessments(rows);
    } catch (err: unknown) {
      setLoadError(errorMessage(err, 'Failed to load client.'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openWizard = async (id: string | null) => {
    setOpening(true);
    try {
      let row: Record<string, unknown> | null = null;
      if (id) {
        const res = await api.progress.postureAssessments.get(id) as { data?: Record<string, unknown> };
        row = res?.data ?? null;
        if (!row) { toast.error('Assessment not found.'); return; }
      }
      const candidates = [...assessments]
        .filter((a) => String(a.id) !== String(id ?? ''))
        .sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')));
      setPrevious(candidates[0] ?? null);
      setEditing(row);
      setView('wizard');
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to open assessment.'));
    } finally {
      setOpening(false);
    }
  };

  const closeWizard = (refresh: boolean) => {
    setView('list');
    setEditing(null);
    setPrevious(null);
    if (refresh) loadData();
  };

  const download = async (row: Record<string, unknown>) => {
    try {
      const res = await api.progress.postureAssessments.get(String(row.id)) as { data?: Record<string, unknown> };
      if (res?.data) downloadPosturePdf(res.data, clientName);
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not open the report.'));
    }
  };

  if (opening && view === 'list') {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#A33757' }} /></div>;
  }

  if (view === 'wizard') {
    return (
      <PostureWizard
        clientId={clientId}
        clientName={clientName}
        editing={editing}
        previous={previous}
        toast={toast}
        onDone={closeWizard}
      />
    );
  }

  return (
    <AssessmentHistoryHub
      title={`${clientName}'s Posture`}
      icon={<Accessibility size={18} />}
      emptyLabel="No posture assessments yet."
      loading={loading}
      loadError={loadError}
      onRetry={loadData}
      onNew={() => openWizard(null)}
      assessments={assessments}
      renderComparison={(initial, latest) => (
        latest.status === 'draft' || initial.status === 'draft'
          ? null
          : <PostureComparison initial={initial} latest={latest} />
      )}
      renderCard={(a) => (
        <PostureCard
          key={String(a.id)}
          assessment={a}
          onClick={() => openWizard(String(a.id))}
          onDownload={() => download(a)}
        />
      )}
    />
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface PostureWizardProps {
  clientId: string;
  clientName: string;
  editing: Record<string, unknown> | null;
  previous: Record<string, unknown> | null;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function PostureWizard({ clientId, clientName, editing, previous, toast, onDone }: PostureWizardProps) {
  const [recordId, setRecordId] = useState<string | null>(editing ? String(editing.id) : null);
  const initial = useMemo(() => (editing ? formFromRow(editing) : initPostureForm()), [editing]);

  const [form, setForm] = useState<PostureFormData>(initial);
  const [step, setStep] = useState<StepId>(1);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const initFormRef = useRef<PostureFormData>(initial);

  const draftKey = `posture-assessment-draft.v2:${clientId}:${recordId || 'new'}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  useEffect(() => {
    // Never lay a local draft over a record saved after it.
    const savedAt = editing ? Date.parse(String(editing.updated_at ?? editing.created_at ?? '')) || 0 : 0;
    const draft = restore(savedAt ? { notBefore: savedAt } : undefined) as Partial<PostureFormData> | null;
    if (draft) {
      setForm({ ...initial, ...draft });
      toast.info('Restored your unsaved draft.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const set = useCallback(<K extends keyof PostureFormData>(key: K, val: PostureFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const analysis = useMemo(() => {
    const postureRiskScore = calcPostureRiskScore(form.frontIssues, form.sideIssues, form.backIssues);
    const postureRiskLevel = classifyRisk(postureRiskScore);
    const referrals = calcPostureReferrals(form.frontIssues, form.sideIssues, form.backIssues);
    return { postureRiskScore, postureRiskLevel, referrals };
  }, [form.frontIssues, form.sideIssues, form.backIssues]);

  const persist = useCallback(async (status: PostureStatus): Promise<boolean> => {
    setSaving(true);
    try {
      const payload = toPayload(form, status);
      let row: Record<string, unknown>;
      if (recordId) {
        const res = await api.progress.postureAssessments.update(recordId, payload) as { data?: Record<string, unknown> };
        row = res?.data ?? {};
      } else {
        const res = await api.progress.postureAssessments.create({ ...payload, client_id: clientId }) as { data?: Record<string, unknown> };
        row = res?.data ?? {};
        if (row.id) setRecordId(String(row.id));
      }
      const savedForm = { ...form, status };
      setForm(savedForm);
      initFormRef.current = savedForm;
      clear();
      return true;
    } catch (err: unknown) {
      toast.error(errorMessage(err, status === 'draft' ? 'Failed to save draft.' : 'Failed to save assessment.'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, recordId, clientId, toast, clear]);

  const handleNext = () => {
    const err = validateStep(step, form);
    if (err) { toast.error(err); return; }
    if (step < 5) setStep((s) => (s + 1) as StepId);
  };

  const handleStepClick = (id: StepId) => {
    if (id > step) {
      // One forward step at a time, through validation.
      if (id !== step + 1) return;
      handleNext();
      return;
    }
    setStep(id);
  };

  const handleBack = () => {
    if (step > 1) { setStep((s) => (s - 1) as StepId); return; }
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    onDone(false);
  };

  const handleSaveDraft = async () => {
    const localOk = saveNow();
    const saved = await persist('draft');
    if (saved) toast.success(localOk ? 'Draft saved.' : 'Draft saved to the server.');
  };

  const handleComplete = async () => {
    const allErrors: Partial<Record<StepId, string>> = {};
    for (const s of STEPS) {
      const err = validateStep(s.id, form);
      if (err) allErrors[s.id] = err;
    }
    const firstInvalid = STEPS.find((s) => allErrors[s.id]);
    if (firstInvalid) {
      setStep(firstInvalid.id);
      toast.error(allErrors[firstInvalid.id]!);
      return;
    }
    const saved = await persist('completed');
    if (saved) {
      toast.success(recordId ? 'Assessment completed.' : 'Assessment saved.');
      onDone(true);
    }
  };

  const handleDownload = async () => {
    if (!recordId) {
      toast.info('Save the assessment before downloading its report.');
      return;
    }
    setDownloading(true);
    try {
      const res = await api.progress.postureAssessments.get(recordId) as { data?: Record<string, unknown> };
      if (res?.data) downloadPosturePdf(res.data, clientName);
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not open the report.'));
    } finally {
      setDownloading(false);
    }
  };

  const addAiExercises = (section: 'mobility' | 'activation' | 'strengthening', entries: PlanExercise[]) => {
    set('correctivePlan', {
      ...form.correctivePlan,
      [section]: [...form.correctivePlan[section], ...entries],
    });
    toast.success(`Added ${entries.length} suggestion${entries.length === 1 ? '' : 's'} to ${section}.`);
  };

  const useAiRecommendations = (field: 'modifications' | 'follow_up', value: string) => {
    const existing = form.correctivePlan.recommendations[field];
    set('correctivePlan', {
      ...form.correctivePlan,
      recommendations: {
        ...form.correctivePlan.recommendations,
        [field]: existing ? `${existing}\n${value}` : value,
      },
    });
    toast.success('Added to recommendations. Review before saving.');
  };

  return (
    <div className="pb-32">
      <div className="mx-auto max-w-3xl pt-1">
        <PageHero
          icon={<Accessibility size={18} />}
          title={recordId ? 'Edit Assessment' : 'New Assessment'}
          subtitle={[clientName, form.assessmentType.replace('_', ' '), form.status].filter(Boolean).join(' · ')}
        >
          <StepperTimeline steps={STEPS} current={step} onStep={handleStepClick} />
        </PageHero>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 py-5">
        <ReferralBanner referrals={analysis.referrals} />
        <m.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: EASE }}>
          {step === 1 && (
            <StepAssessmentOverview
              form={form}
              set={set}
              clientName={clientName}
              previous={previous}
              assessmentNumber={editing?.assessment_number ? Number(editing.assessment_number) : null}
            />
          )}
          {step === 2 && <StepPostureObservations form={form} set={set} />}
          {step === 3 && <StepMuscleImbalance form={form} set={set} />}
          {step === 4 && (
            <div className="space-y-4">
              <AiPosturalInsightsPanel
                clientId={clientId}
                form={form}
                onApprove={addAiExercises}
                onUseRecommendations={useAiRecommendations}
              />
              <StepCorrectivePlan form={form} set={set} />
            </div>
          )}
          {step === 5 && <StepReview form={form} set={set} previous={previous} />}
        </m.div>

        {step === 5 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft={downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              onClick={handleDownload}
              disabled={downloading || !recordId}
            >
              Download report
            </Button>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {recordId ? 'The report reflects the last saved version.' : 'Save once to enable the report.'}
            </p>
          </div>
        )}
      </div>

      <div className="page-action-bar" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-8">
          <Button variant="outline" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={handleBack}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSaveDraft} loading={saving && form.status === 'draft'} disabled={saving}>
              Save Draft
            </Button>
            {step < 5 ? (
              <Button size="sm" iconLeft={<ArrowRight size={14} />} onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                size="sm"
                iconLeft={!saving ? <Check size={14} /> : undefined}
                loading={saving}
                disabled={saving}
                onClick={handleComplete}
              >
                Complete Assessment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
