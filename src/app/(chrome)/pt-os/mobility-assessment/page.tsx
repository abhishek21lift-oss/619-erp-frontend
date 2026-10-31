'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Move,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { calcMobilityScore, classifyMobility, calcMobilityReferrals } from '@/lib/mobility-calculations';
import ReferralBanner from '@/components/pt-os/shared/ReferralBanner';
import {
  STEPS, initMobilityForm, n, unscoredBodyRegions, unscoredMobilityTests,
} from '@/components/pt-os/mobility-assessment/types';
import type { MobilityFormData, StepId } from '@/components/pt-os/mobility-assessment/types';
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import AssessmentHistoryHub from '@/components/pt-os/shared/AssessmentHistoryHub';
import StepBodyRegions from '@/components/pt-os/mobility-assessment/StepBodyRegions';
import StepFunctionalTests from '@/components/pt-os/mobility-assessment/StepFunctionalTests';
import StepPerformanceMetrics from '@/components/pt-os/mobility-assessment/StepPerformanceMetrics';
import MobilityDashboard from '@/components/pt-os/mobility-assessment/MobilityDashboard';
import MobilityComparison from '@/components/pt-os/mobility-assessment/MobilityComparison';
import MobilityCard from '@/components/pt-os/mobility-assessment/MobilityCard';
import { errorMessage } from '@/lib/forms/errors';
import AssessmentDateField, { assessmentDateIssue } from '@/components/pt-os/shared/AssessmentDateField';
import { rangeIssue } from '@/lib/forms/ranges';

const EASE = [0.16, 1, 0.3, 1] as const;

/** What each step needs before it can be left, and before the form can be
 *  saved. Scores are deliberately not defaulted, so the wizard has to ask. */
function validateStep(id: StepId, form: MobilityFormData): string | undefined {
  if (id === 1) {
    const dateErr = assessmentDateIssue(form.assessmentDate);
    if (dateErr) return dateErr;
    const missing = unscoredBodyRegions(form);
    if (missing) return `Score every body region before continuing — ${missing} still unscored.`;
  }
  if (id === 2) {
    const missing = unscoredMobilityTests(form);
    if (missing) return `Score every movement screen before continuing — ${missing} still unscored.`;
  }
  if (id === 3) {
    return rangeIssue(['Grip strength', form.gripStrengthKg, 1, 150, 'kg'], ['Vertical jump', form.verticalJumpCm, 1, 150, 'cm'],
      ['Balance test', form.balanceTestSeconds, 0, 600, 's'], ['Reaction time', form.reactionTimeMs, 50, 3000, 'ms']);
  }
  return undefined;
}

function formFromRow(row: Record<string, unknown>): MobilityFormData {
  const fresh = initMobilityForm();
  return {
    ...fresh,
    assessmentDate: row.assessment_date ? String(row.assessment_date).slice(0, 10) : fresh.assessmentDate,
    bodyRegions: Array.isArray(row.body_regions) && row.body_regions.length ? row.body_regions as MobilityFormData['bodyRegions'] : fresh.bodyRegions,
    mobilityTests: Array.isArray(row.mobility_tests) && row.mobility_tests.length ? row.mobility_tests as MobilityFormData['mobilityTests'] : fresh.mobilityTests,
    gripStrengthKg: row.grip_strength_kg != null ? String(row.grip_strength_kg) : '',
    verticalJumpCm: row.vertical_jump_cm != null ? String(row.vertical_jump_cm) : '',
    sitReachCm: row.sit_reach_cm != null ? String(row.sit_reach_cm) : '',
    balanceTestSeconds: row.balance_test_seconds != null ? String(row.balance_test_seconds) : '',
    reactionTimeMs: row.reaction_time_ms != null ? String(row.reaction_time_ms) : '',
    performanceNotes: row.performance_notes ? String(row.performance_notes) : '',
  };
}

export default function PtMobilityAssessmentPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#852E4E' }} /></div>}>
        <MobilityContent />
      </Suspense>
    </Guard>
  );
}

function MobilityContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Mobility Assessment" icon={<Move size={20} color="#fff" />} basePath="/pt-os/mobility-assessment" />;
  return <MobilityHub key={clientId} clientId={clientId} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── HUB (list + wizard) */
interface MobilityHubProps {
  clientId: string;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

function MobilityHub({ clientId, toast }: MobilityHubProps) {
  const [clientName, setClientName] = useState('');
  const [assessments, setAssessments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, listRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.mobilityPerformanceAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setAssessments(Array.isArray(listRes?.data) ? listRes.data : []);
    } catch (err: unknown) {
      setLoadError(errorMessage(err, 'Failed to load client.'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openWizard = (id: string | null) => { setEditingId(id); setView('wizard'); };
  const closeWizard = (refresh: boolean) => { setView('list'); setEditingId(null); if (refresh) loadData(); };

  if (view === 'wizard') {
    const editing = editingId ? assessments.find((a) => String(a.id) === editingId) : null;
    return <MobilityWizard clientId={clientId} clientName={clientName} editing={editing || null} toast={toast} onDone={closeWizard} />;
  }

  return (
    <AssessmentHistoryHub
      title={`${clientName}'s Mobility`}
      icon={<Move size={18} />}
      emptyLabel="No mobility assessments yet."
      loading={loading}
      loadError={loadError}
      onRetry={loadData}
      onNew={() => openWizard(null)}
      assessments={assessments}
      renderComparison={(initial, latest) => <MobilityComparison initial={initial} latest={latest} />}
      renderCard={(a) => <MobilityCard key={String(a.id)} assessment={a} onClick={() => openWizard(String(a.id))} />}
    />
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface MobilityWizardProps {
  clientId: string;
  clientName: string;
  editing: Record<string, unknown> | null;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function MobilityWizard({ clientId, clientName, editing, toast, onDone }: MobilityWizardProps) {
  const assessmentId = editing ? String(editing.id) : null;
  const initial = useMemo(() => (editing ? formFromRow(editing) : initMobilityForm()), [editing]);

  const [form, setForm] = useState<MobilityFormData>(initial);
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<MobilityFormData>(initial);

  const draftKey = `mobility-assessment-draft.v1:${clientId}:${assessmentId || 'new'}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  useEffect(() => {
    // Never lay a local draft over a record saved after it.
    const savedAt = editing ? Date.parse(String(editing.updated_at ?? editing.created_at ?? '')) || 0 : 0;
    const draft = restore(savedAt ? { notBefore: savedAt } : undefined);
    if (draft) { setForm({ ...initial, ...draft }); toast.info('Restored your unsaved draft.'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const set = useCallback(<K extends keyof MobilityFormData>(key: K, val: MobilityFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const analysis = useMemo(() => {
    const mobilityScore = calcMobilityScore(form.bodyRegions, form.mobilityTests);
    const mobilityCategory = classifyMobility(mobilityScore, form.bodyRegions, form.mobilityTests);
    const referrals = calcMobilityReferrals(form.bodyRegions, form.mobilityTests);
    return { mobilityScore, mobilityCategory, referrals };
  }, [form.bodyRegions, form.mobilityTests]);

  const handleNext = () => {
    const err = validateStep(step, form);
    if (err) { toast.error(err); return; }
    if (step === 3) { setReviewMode(true); return; }
    setStep((s) => (s + 1) as StepId);
  };

  // The timeline offers exactly one forward jump (step + 1), so route that
  // through handleNext() — a click must not skip the score check. Backward
  // clicks are re-viewing an answered step and stay unguarded.
  const handleStepClick = (id: StepId) => {
    if (id === step + 1) { handleNext(); return; }
    setStep(id);
  };

  const handleBack = () => {
    if (reviewMode) { setReviewMode(false); return; }
    if (step > 1) { setStep((s) => (s - 1) as StepId); return; }
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    onDone(false);
  };

  const handleSaveDraft = () => {
    const ok = saveNow();
    toast[ok ? 'success' : 'error'](ok ? 'Draft saved.' : 'Could not save draft — storage unavailable.');
  };

  const handleSubmit = async () => {
    // Back-navigation can leave an earlier step unanswered, and a loaded
    // record may predate the unscored state. Check every step before posting.
    const allErrors: Partial<Record<StepId, string>> = {};
    for (const s of STEPS) {
      const err = validateStep(s.id, form);
      if (err) allErrors[s.id] = err;
    }
    const firstInvalid = STEPS.find((s) => allErrors[s.id]);
    if (firstInvalid) {
      setReviewMode(false);
      setStep(firstInvalid.id);
      toast.error(allErrors[firstInvalid.id]!);
      return;
    }
    setSaving(true);
    try {
      // Blank goes as null so an edit can clear a value — `undefined` dropped
      // the key and the old number stayed.
      const payload: Record<string, unknown> = {
        client_id: clientId,
        assessment_date: form.assessmentDate,
        body_regions: form.bodyRegions,
        mobility_tests: form.mobilityTests,
        grip_strength_kg: n(form.gripStrengthKg) ?? null,
        vertical_jump_cm: n(form.verticalJumpCm) ?? null,
        sit_reach_cm: n(form.sitReachCm) ?? null,
        balance_test_seconds: n(form.balanceTestSeconds) ?? null,
        reaction_time_ms: n(form.reactionTimeMs) ?? null,
        performance_notes: form.performanceNotes.trim() || null,
      };

      if (assessmentId) {
        await api.progress.mobilityPerformanceAssessments.update(assessmentId, payload);
        toast.success('Assessment updated.');
      } else {
        await api.progress.mobilityPerformanceAssessments.create(payload);
        toast.success('Assessment saved.');
      }
      clear();
      onDone(true);
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to save assessment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      {/* The shared hero, as on Consent, PAR-Q, Fitness and Goal. This page
          had its own plain header, and a Cancel that discarded the wizard
          without the "Discard changes?" check Back makes; Back on the first
          step is the way out now. */}
      <div className="mx-auto max-w-3xl pt-1">
        <PageHero icon={<Move size={18} />} title={assessmentId ? 'Edit Assessment' : 'New Assessment'}>
          {!reviewMode && <StepperTimeline steps={STEPS} current={step} onStep={handleStepClick} />}
        </PageHero>
      </div>

      <div className="mx-auto max-w-3xl py-6 space-y-5">
        <ReferralBanner referrals={analysis.referrals} />
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && (
              <div className="space-y-6">
                <AssessmentDateField value={form.assessmentDate} onChange={(v) => set('assessmentDate', v)} />
                <StepBodyRegions form={form} set={set} />
              </div>
            )}
            {step === 2 && <StepFunctionalTests form={form} set={set} />}
            {step === 3 && <StepPerformanceMetrics form={form} set={set} />}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-5">
            <MobilityDashboard mobilityScore={analysis.mobilityScore} mobilityCategory={analysis.mobilityCategory} bodyRegions={form.bodyRegions} />
          </m.div>
        )}
      </div>

      <div className="page-action-bar" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <Button variant="outline" iconLeft={<ArrowLeft size={14} />} onClick={handleBack}>Back</Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
            {!reviewMode ? (
              <Button
                iconLeft={<ArrowRight size={14} />}
                onClick={handleNext}
                style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}
              >
                {step === 3 ? 'Review' : 'Next'}
              </Button>
            ) : (
              <Button
                iconLeft={!saving ? <Check size={14} /> : undefined}
                loading={saving} disabled={saving}
                onClick={handleSubmit}
                style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}
              >
                {saving ? 'Saving...' : assessmentId ? 'Update Assessment' : 'Save Assessment'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
