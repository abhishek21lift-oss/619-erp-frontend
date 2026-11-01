'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, ClipboardCheck,
  History, CheckCircle2, Plus, Download, Sparkles, Pencil, Trash2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, PageContainer, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { downloadAssessmentPdf } from '@/lib/assessment-pdf';
import {
  computeAge, calcBmi, calcWhr, classifyBmi, classifyWaistRisk, classifyWhrRisk,
  classifyBp, classifyRhr, classifySpo2, assessVitalsSafety, calcVo2MaxRockport, calcVo2MaxCooper,
  calcVo2MaxBruce, calcHarvardPei, classifyHarvardPei, classifyVo2Max, classifyStepTestRecovery,
  calc1RM, classifyStrength, classifyEndurance,
  scoreCategory, scoreBodyComposition, scoreHealthRisk, scoreTestBattery, computeOverallScore,
  scoreNum, scoresFromAssessmentRow,
} from '@/lib/fitness-calculations';
import type { FitnessCategory, Gender } from '@/lib/fitness-calculations';
import { STEPS, initAssessmentForm, formFromAssessmentRow, n } from '@/components/pt-os/fitness-testing/types';
import { todayISO } from '@/lib/forms/domain';
import { rangeIssue, type Range } from '@/lib/forms/ranges';
import type { AssessmentFormData, FormErrors, StepId } from '@/components/pt-os/fitness-testing/types';
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import AssessmentInfoCard from '@/components/pt-os/fitness-testing/AssessmentInfoCard';
import StepBloodPressure from '@/components/pt-os/fitness-testing/StepBloodPressure';
import StepAnthropometric from '@/components/pt-os/fitness-testing/StepAnthropometric';
import StepBodyComposition from '@/components/pt-os/fitness-testing/StepBodyComposition';
import StepCardio from '@/components/pt-os/fitness-testing/StepCardio';
import StepStrength from '@/components/pt-os/fitness-testing/StepStrength';
import StepEndurance from '@/components/pt-os/fitness-testing/StepEndurance';
import StepFlexibility from '@/components/pt-os/fitness-testing/StepFlexibility';
import { FLEXIBILITY_PROTOCOLS, FLEXIBILITY_TEST_ORDER } from '@/components/pt-os/fitness-testing/flexibility/protocol-content';
import { buildFlexibilityPayload, formTest, legacyMobilityScore } from '@/lib/flexibility-protocol';
import FitnessDashboard, { type FitnessScores, type FitnessVitals, type FitnessAnthropometric } from '@/components/pt-os/fitness-testing/FitnessDashboard';
import { ScreeningStatusCard, ScreeningWarningsNotice } from '@/components/pt-os/fitness-testing/ScreeningStatusCard';
import ProgressComparison from '@/components/pt-os/fitness-testing/ProgressComparison';
import AiRecommendationsPanel from '@/components/pt-os/fitness-testing/AiRecommendationsPanel';
import { bandInk, gradient, tones } from '@/components/pt-os/fitness-testing/fitnessTheme';
import { emerald, tint } from '@/lib/palette';
import { errorMessage } from '@/lib/forms/errors';
import { screeningBlockOf } from '@/lib/screeningBlock';
import JourneyNextButton from '@/components/pt-os/client/JourneyNextButton';

interface TrainerOption { id: string; name: string; }

const EASE = [0.16, 1, 0.3, 1] as const;

function buildCardioTestData(form: AssessmentFormData): Record<string, unknown> {
  switch (form.cardioTestType) {
    case 'Rockport 1-Mile Walk': return { timeMin: n(form.cardioTimeMin), heartRate: n(form.cardioHeartRate) };
    case 'Cooper 12-Minute Run': return { distanceMeters: n(form.cardioDistanceMeters) };
    case 'Bruce Protocol': return { treadmillMinutes: n(form.cardioTreadmillMinutes) };
    case 'Harvard Step Test': return {
      durationSec: n(form.cardioDurationSec), pulse1: n(form.cardioPulse1),
      pulse2: n(form.cardioPulse2), pulse3: n(form.cardioPulse3),
    };
    case 'YMCA 3-Minute Step Test': return { recoveryHr: n(form.cardioRecoveryHr) };
    case 'Custom': return { notes: form.cardioDistanceMeters || undefined };
    default: return {};
  }
}

// Strength is a 2-test battery (same pattern as Endurance/Flexibility below),
// so every helper that used to read the single strengthXxx field now takes
// which of the two tests it means.
function strengthExerciseName(form: AssessmentFormData, testNum: 1 | 2 = 1): string {
  const exercise = testNum === 1 ? form.strengthExercise : form.strengthExercise2;
  const custom = testNum === 1 ? form.strengthCustomExercise : form.strengthCustomExercise2;
  return (exercise === 'Custom Exercise' ? custom : exercise) || '';
}

function estimateOneRM(form: AssessmentFormData, testNum: 1 | 2 = 1): number | null {
  const mode = testNum === 1 ? form.strengthMode : form.strengthMode2;
  const direct1RM = testNum === 1 ? form.strengthDirect1RM : form.strengthDirect1RM2;
  const weightKg = testNum === 1 ? form.strengthWeightKg : form.strengthWeightKg2;
  const reps = testNum === 1 ? form.strengthReps : form.strengthReps2;
  const formula = testNum === 1 ? form.strengthFormula : form.strengthFormula2;
  return mode === 'direct' ? n(direct1RM) : calc1RM(n(weightKg), n(reps), formula);
}

function validateStep(id: StepId, form: AssessmentFormData, isBeginner: boolean, vitalsStop = false): string | undefined {
  // Exertion tests are intentionally skipped when the resting vitals are
  // unsafe; they are not required (and must not block submission) then.
  if (vitalsStop && (id === 4 || id === 5 || id === 6)) return undefined;
  if (id === 1) {
    if (form.assessmentDate > todayISO()) return 'The assessment date cannot be in the future.';
    if (!form.bpSystolic && !form.bpDiastolic && !form.bpNotMeasured) {
      return 'Enter the resting blood pressure, or confirm it was not measured.';
    }
    return rangeIssue(
      ['Systolic', form.bpSystolic, 60, 260, 'mmHg'], ['Diastolic', form.bpDiastolic, 30, 160, 'mmHg'],
      ['Resting heart rate', form.restingHeartRate, 25, 220, 'bpm'], ['SpO₂', form.restingSpo2, 50, 100, '%'],
    );
  }
  if (id === 2) {
    return rangeIssue(
      ['Weight', form.weight, 20, 350, 'kg'], ['Height', form.heightCm, 80, 250, 'cm'],
      ['Waist', form.waistCm, 30, 250, 'cm'], ['Waist (iliac)', form.waistIliacCm, 30, 250, 'cm'],
      ['Hips', form.hipsCm, 30, 250, 'cm'], ['Neck', form.neckCm, 15, 80, 'cm'], ['Chest', form.chestCm, 40, 250, 'cm'],
      ['Right arm', form.armRightCm, 10, 100, 'cm'], ['Left arm', form.armLeftCm, 10, 100, 'cm'],
      ['Right thigh', form.thighRightCm, 20, 150, 'cm'], ['Left thigh', form.thighLeftCm, 20, 150, 'cm'],
      ['Right calf', form.calfRightCm, 15, 100, 'cm'], ['Left calf', form.calfLeftCm, 15, 100, 'cm'],
    );
  }
  if (id === 3) {
    return rangeIssue(
      ['Body fat', form.bodyFatPct, 2, 75, '%'], ['Muscle mass', form.muscleMassPct, 5, 80, '%'],
      ['Visceral fat', form.visceralFat, 1, 60], ['Subcutaneous fat', form.subcutaneousFatPct, 1, 70, '%'],
      ['Body water', form.bodyWaterPct, 20, 80, '%'], ['Bone mass', form.boneMassKg, 0.5, 10, 'kg'],
      ['BMR', form.bmr, 500, 5000, 'kcal'], ['Metabolic age', form.metabolicAge, 10, 110],
    );
  }
  if (id === 4) {
    if (!form.cardioTestType) return 'Please select a cardiorespiratory test.';
    if (form.cardioTestType === 'Rockport 1-Mile Walk') return rangeIssue(['Time', form.cardioTimeMin, 5, 30, 'min'], ['Heart rate', form.cardioHeartRate, 40, 220, 'bpm']);
    if (form.cardioTestType === 'Cooper 12-Minute Run') return rangeIssue(['Distance', form.cardioDistanceMeters, 100, 10000, 'm']);
    if (form.cardioTestType === 'Bruce Protocol') return rangeIssue(['Treadmill time', form.cardioTreadmillMinutes, 1, 30, 'min']);
    if (form.cardioTestType === 'Harvard Step Test') return rangeIssue(['Duration', form.cardioDurationSec, 60, 1200, 'sec'], ['Pulse 1', form.cardioPulse1, 40, 220, 'bpm'], ['Pulse 2', form.cardioPulse2, 40, 220, 'bpm'], ['Pulse 3', form.cardioPulse3, 40, 220, 'bpm']);
    if (form.cardioTestType === 'YMCA 3-Minute Step Test') return rangeIssue(['Recovery HR', form.cardioRecoveryHr, 40, 220, 'bpm']);
    return undefined;
  }
  // Muscular strength (1RM) testing isn't expected for beginner clients — optional for them.
  // Any exercise may be tested, but exactly 2 are required to complete the step.
  if (id === 5) {
    if (!isBeginner && !(form.strengthExercise && form.strengthExercise2)) return 'Please select both strength tests.';
    return rangeIssue(
      ['Test 1 weight', form.strengthWeightKg, 1, 500, 'kg'], ['Test 1 reps', form.strengthReps, 1, 100],
      ['Test 1 direct 1RM', form.strengthDirect1RM, 1, 500, 'kg'],
      ['Test 2 weight', form.strengthWeightKg2, 1, 500, 'kg'], ['Test 2 reps', form.strengthReps2, 1, 100],
      ['Test 2 direct 1RM', form.strengthDirect1RM2, 1, 500, 'kg'],
    );
  }
  if (id === 6) {
    if (!(form.enduranceTestType && form.enduranceTestType2)) return 'Please select both endurance tests.';
    const isRep = (t: string) => t === 'Push Up Test' || t === 'Curl Up Test';
    const checks: Range[] = [];
    if (isRep(form.enduranceTestType)) checks.push(['Test 1 reps', form.enduranceReps, 1, 200]);
    else checks.push(['Test 1 duration', form.enduranceDurationSec, 1, 3600, 'sec']);
    if (isRep(form.enduranceTestType2)) checks.push(['Test 2 reps', form.enduranceReps2, 1, 200]);
    else checks.push(['Test 2 duration', form.enduranceDurationSec2, 1, 3600, 'sec']);
    return rangeIssue(...checks);
  }
  // The K11 battery: every one of the four tests either recorded, or recorded
  // as not performed with a reason — and an override reason for the assessment
  // whenever any of them is not performed. A legacy row has no live fields to
  // range-check: it is posted back exactly as stored.
  if (id === 7) {
    const f = form.flexibility;
    if (!f.recording) return undefined;
    const notRecorded = FLEXIBILITY_TEST_ORDER.filter((k) => { const t = formTest(f, k); return !t.completed && !t.unable; });
    if (notRecorded.length) {
      return `${FLEXIBILITY_PROTOCOLS[notRecorded[0]].name} is not complete — record its measurements and mark it complete, or record why it could not be performed.`;
    }
    const reasonMissing = FLEXIBILITY_TEST_ORDER.filter((k) => formTest(f, k).unable && !formTest(f, k).unableReason.trim());
    if (reasonMissing.length) {
      return `${FLEXIBILITY_PROTOCOLS[reasonMissing[0]].name}: enter the reason it could not be performed.`;
    }
    if (!f.overrideReason.trim()
      && FLEXIBILITY_TEST_ORDER.some((k) => { const t = formTest(f, k); return t.unable || !t.completed; })) {
      return 'Some flexibility tests were not performed — enter the override reason for the assessment.';
    }
    return undefined;
  }
  return undefined;
}

export default function PtAssessmentPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#852E4E' }} /></div>}>
        <AssessmentContent />
      </Suspense>
    </Guard>
  );
}

function AssessmentContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Fitness Testing" icon={<ClipboardCheck size={20} color="#fff" />} basePath="/pt-os/assessment" />;
  return <AssessmentWizard key={clientId} clientId={clientId} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface AssessmentWizardProps {
  clientId: string;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

function AssessmentWizard({ clientId, router, toast }: AssessmentWizardProps) {
  const [clientName, setClientName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState<AssessmentFormData>(initAssessmentForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [lastSaved, setLastSaved] = useState<Record<string, unknown> | null>(null);
  // Server-computed screening snapshot embedded in GET /api/pt-os/clients/:id
  // (screeningSummary). Read-only here: the card renders it, never recomputes.
  const [screening, setScreening] = useState<unknown>(null);
  // screening_warnings returned with a successful save. Toast behavior is
  // unchanged; these also render inline so they are not lost.
  const [saveWarnings, setSaveWarnings] = useState<string[]>([]);
  const [historyAiId, setHistoryAiId] = useState<string | null>(null);
  /** The saved test being corrected, or null for a new one. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const initFormRef = useRef<AssessmentFormData>(initAssessmentForm());

  // A draft belongs to the new test only; an edit starts from the saved one.
  const draftKey = `fitness-testing-draft.v2:${clientId}:${editingId ?? 'new'}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, trainersRes, historyRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.pt.trainers() as Promise<{ data?: TrainerOption[] }>,
        api.progress.assessments.list({ client_id: clientId, limit: 50 }) as Promise<{ data?: Record<string, unknown>[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setAge(computeAge(c.dob ? String(c.dob) : null));
      const g = String(c.gender ?? '');
      setGender(g === 'Male' || g === 'Female' || g === 'Other' ? g : null);

      const list = Array.isArray(trainersRes?.data) ? trainersRes.data : [];
      const hist = Array.isArray(historyRes?.data) ? historyRes.data : [];
      setHistory(hist);

      // Training experience is recorded at Enrollment, on the client. It was
      // read from the latest Lifestyle assessment, which stopped asking it —
      // so every beginner was made to do two 1RM tests.
      setExperienceLevel(String(c.workout_experience_level ?? ''));
      setScreening(c.screening ?? null);

      const existingTrainerId = String(c.trainer_id ?? '');
      const existingTrainerName = String(c.trainer_name ?? '');
      const defaultTrainer = !existingTrainerId && list.length === 1 ? list[0] : null;

      const loaded: AssessmentFormData = {
        ...initAssessmentForm(),
        trainerId: defaultTrainer?.id || existingTrainerId,
        trainerName: defaultTrainer?.name || existingTrainerName,
      };

      const draft = restore();
      const finalForm = draft ? { ...loaded, ...draft } : loaded;
      setForm(finalForm);
      initFormRef.current = loaded;
      if (draft) toast.info('Restored your unsaved draft (saved on this device).');
    } catch (err: unknown) {
      setLoadError(errorMessage(err, 'Failed to load client.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const set = useCallback(<K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const liveScores = useMemo<FitnessScores>(() => {
    const bmi = calcBmi(n(form.weight), n(form.heightCm));
    const bpCategory = classifyBp(n(form.bpSystolic), n(form.bpDiastolic));
    const healthRiskScore = scoreHealthRisk(bpCategory, bmi);
    const bodyCompositionScore = scoreBodyComposition(n(form.bodyFatPct), gender);

    let vo2: number | null = null;
    let cardioCategory: FitnessCategory | null = null;
    if (form.cardioTestType === 'Rockport 1-Mile Walk') {
      vo2 = calcVo2MaxRockport(n(form.weight), age, gender, n(form.cardioTimeMin), n(form.cardioHeartRate));
    } else if (form.cardioTestType === 'Cooper 12-Minute Run') {
      vo2 = calcVo2MaxCooper(n(form.cardioDistanceMeters));
    } else if (form.cardioTestType === 'Bruce Protocol') {
      vo2 = calcVo2MaxBruce(n(form.cardioTreadmillMinutes));
    } else if (form.cardioTestType === 'Harvard Step Test') {
      const pei = calcHarvardPei(n(form.cardioDurationSec), n(form.cardioPulse1), n(form.cardioPulse2), n(form.cardioPulse3));
      cardioCategory = classifyHarvardPei(pei);
    } else if (form.cardioTestType === 'YMCA 3-Minute Step Test') {
      cardioCategory = classifyStepTestRecovery(n(form.cardioRecoveryHr), age, gender);
    }
    if (vo2 != null && !cardioCategory) cardioCategory = classifyVo2Max(vo2, age, gender);
    const cardioScore = scoreCategory(cardioCategory);

    const oneRM = estimateOneRM(form, 1);
    const strengthCategory = classifyStrength(oneRM, n(form.weight), form.strengthExercise || null, gender, age);
    const oneRM2 = estimateOneRM(form, 2);
    const strengthCategory2 = classifyStrength(oneRM2, n(form.weight), form.strengthExercise2 || null, gender, age);
    const strengthScore = scoreTestBattery(scoreCategory(strengthCategory), scoreCategory(strengthCategory2));

    // Interpret the result by the test's own protocol, not by a stored flag that
    // can drift out of sync with the selected test type (F7).
    const isRepBased = (t: string) => t === 'Push Up Test' || t === 'Curl Up Test';
    const enduranceValue = isRepBased(form.enduranceTestType) ? n(form.enduranceReps) : n(form.enduranceDurationSec);
    const enduranceCategory = classifyEndurance(form.enduranceTestType || null, enduranceValue, gender, age);
    const enduranceValue2 = isRepBased(form.enduranceTestType2) ? n(form.enduranceReps2) : n(form.enduranceDurationSec2);
    const enduranceCategory2 = classifyEndurance(form.enduranceTestType2 || null, enduranceValue2, gender, age);
    const enduranceScore = scoreTestBattery(scoreCategory(enduranceCategory), scoreCategory(enduranceCategory2));

    // A v3 battery has no single mobility score — four incompatible units, so
    // the derived columns stay null on purpose. Only a legacy {test1,test2}
    // blob still yields the old composite.
    const mobilityScore = form.flexibility.recording ? null : legacyMobilityScore(form.flexibility.legacy);

    const overallScore = computeOverallScore({
      bodyComposition: bodyCompositionScore, endurance: enduranceScore,
      mobility: mobilityScore, cardio: cardioScore, healthRisk: healthRiskScore, strength: strengthScore,
    });

    return { cardioScore, strengthScore, enduranceScore, mobilityScore, bodyCompositionScore, healthRiskScore, overallScore };
  }, [form, age, gender]);

  const isBeginner = experienceLevel === 'beginner';

  // The live vitals summary — the same labels the API recomputes and stores.
  const liveVitals = useMemo<FitnessVitals>(() => {
    const bpSystolic = n(form.bpSystolic);
    const bpDiastolic = n(form.bpDiastolic);
    const restingHeartRate = n(form.restingHeartRate);
    const restingSpo2 = n(form.restingSpo2);
    return {
      bpSystolic, bpDiastolic, bpCategory: classifyBp(bpSystolic, bpDiastolic),
      restingHeartRate, rhrCategory: classifyRhr(restingHeartRate),
      restingSpo2, spo2Category: classifySpo2(restingSpo2),
    };
  }, [form.bpSystolic, form.bpDiastolic, form.restingHeartRate, form.restingSpo2]);

  // The live anthropometric summary — the same labels the API recomputes and
  // stores. Waist uses waistCm only; waistIliacCm is never substituted.
  const liveAnthropometric = useMemo<FitnessAnthropometric>(() => {
    const bmi = calcBmi(n(form.weight), n(form.heightCm));
    const waistCm = n(form.waistCm);
    const waistHipRatio = calcWhr(waistCm, n(form.hipsCm));
    return {
      bmi, bmiCategory: classifyBmi(bmi),
      waistCm, waistRisk: classifyWaistRisk(waistCm, gender),
      waistHipRatio, whrRisk: classifyWhrRisk(waistHipRatio, gender),
    };
  }, [form.weight, form.heightCm, form.waistCm, form.hipsCm, gender]);

  // An unsafe resting vitals reading stops the exertion tests — cardio (4),
  // strength (5), endurance (6). The reading, measurements, body composition
  // and flexibility are still recorded; the API refuses exertion results
  // alongside a stop (VITALS_UNSAFE/BP_UNSAFE/...).
  const vitalsStop = useMemo(
    () => assessVitalsSafety({
      systolic: liveVitals.bpSystolic, diastolic: liveVitals.bpDiastolic,
      restingHeartRate: liveVitals.restingHeartRate, restingSpo2: liveVitals.restingSpo2,
      athlete: experienceLevel === 'athlete',
    }).level === 'stop',
    [liveVitals, experienceLevel],
  );
  const isExertionStep = (s: StepId) => s === 4 || s === 5 || s === 6;

  const goToStep = (s: StepId) => {
    if (vitalsStop && isExertionStep(s)) {
      toast.error('Resting vitals are unsafe — cardio, strength and endurance tests are skipped.');
      return;
    }
    setStep(s);
  };

  const handleNext = () => {
    const stepDef = STEPS.find((s) => s.id === step)!;
    const err = validateStep(step, form, isBeginner, vitalsStop);
    setErrors((e) => ({ ...e, [stepDef.key]: err }));
    if (err) { toast.error(err); return; }
    if (step === 7) { setReviewMode(true); return; }
    if (vitalsStop && step === 3) {
      toast.warning('Resting vitals are unsafe — skipping cardio, strength and endurance tests.');
      setStep(7);
      return;
    }
    setStep((s) => (s + 1) as StepId);
  };

  const handleBack = () => {
    if (reviewMode) { setReviewMode(false); return; }
    if (vitalsStop && step === 7) { setStep(3); return; }
    if (step > 1) { setStep((s) => (s - 1) as StepId); return; }
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    router.push(`/pt-os/clients/${clientId}`);
  };

  const handleSaveDraft = () => {
    const ok = saveNow();
    toast[ok ? 'success' : 'error'](ok ? 'Draft saved on this device.' : 'Could not save draft — storage unavailable.');
  };

  const handleSubmit = async () => {
    if (savingRef.current) return; // prevent duplicate submissions (ref guards the synchronous window)
    savingRef.current = true;
    // Complete validation pass over every step — including any reached only via
    // direct stepper navigation — before any API request is made.
    const stepErrors: FormErrors = {};
    let firstFailing: StepId | null = null;
    for (const s of STEPS) {
      const err = validateStep(s.id, form, isBeginner, vitalsStop);
      if (err) {
        stepErrors[s.key as keyof FormErrors] = err;
        if (firstFailing == null) firstFailing = s.id;
      }
    }
    if (firstFailing != null) {
      setErrors((e) => ({ ...e, ...stepErrors }));
      const failingKey = STEPS.find((s) => s.id === firstFailing)!.key as keyof FormErrors;
      toast.error(stepErrors[failingKey]!);
      setReviewMode(false);
      setStep(firstFailing);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      savingRef.current = false;
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        client_id: clientId,
        trainer_id: form.trainerId || undefined,
        assessment_date: form.assessmentDate,
        assessment_type: form.assessmentType,
        assessment_notes: form.assessmentNotes.trim() || null,
        testing_conditions: form.testingConditions.trim() || null,
        age: age ?? undefined, gender: gender ?? undefined,
        bp_not_measured: form.bpNotMeasured && !form.bpSystolic && !form.bpDiastolic,

        bp_systolic: n(form.bpSystolic) ?? null, bp_diastolic: n(form.bpDiastolic) ?? null,
        resting_heart_rate: n(form.restingHeartRate) ?? null, resting_spo2: n(form.restingSpo2) ?? null,

        weight: n(form.weight) ?? null, height_cm: n(form.heightCm) ?? null,
        waist_cm: n(form.waistCm) ?? null, waist_iliac_cm: n(form.waistIliacCm) ?? null, hips_cm: n(form.hipsCm) ?? null,
        neck_cm: n(form.neckCm) ?? null, chest_cm: n(form.chestCm) ?? null,
        arm_right_cm: n(form.armRightCm) ?? null, arm_left_cm: n(form.armLeftCm) ?? null,
        thigh_right_cm: n(form.thighRightCm) ?? null, thigh_left_cm: n(form.thighLeftCm) ?? null,
        calf_right_cm: n(form.calfRightCm) ?? null, calf_left_cm: n(form.calfLeftCm) ?? null,

        body_comp_method: form.bodyCompMethod || null,
        body_fat_pct: n(form.bodyFatPct) ?? null, muscle_mass_pct: n(form.muscleMassPct) ?? null,
        visceral_fat: n(form.visceralFat) ?? null, subcutaneous_fat_pct: n(form.subcutaneousFatPct) ?? null,
        body_water_pct: n(form.bodyWaterPct) ?? null, bone_mass_kg: n(form.boneMassKg) ?? null,
        bmr: n(form.bmr) ?? null, metabolic_age: n(form.metabolicAge) ?? null,

        cardio_test_type: form.cardioTestType || null,
        cardio_test_data: buildCardioTestData(form),

        strength_exercise: strengthExerciseName(form, 1) || null,
        strength_exercise_2: strengthExerciseName(form, 2) || null,
        strength_test_data: {
          test1: {
            weightKg: n(form.strengthWeightKg) ?? undefined, reps: n(form.strengthReps) ?? undefined,
            formula: form.strengthFormula, direct1RM: n(form.strengthDirect1RM) ?? undefined,
            isDirect: form.strengthMode === 'direct',
          },
          test2: {
            weightKg: n(form.strengthWeightKg2) ?? undefined, reps: n(form.strengthReps2) ?? undefined,
            formula: form.strengthFormula2, direct1RM: n(form.strengthDirect1RM2) ?? undefined,
            isDirect: form.strengthMode2 === 'direct',
          },
        },

        endurance_test_type: form.enduranceTestType || null,
        endurance_test_type_2: form.enduranceTestType2 || null,
        endurance_test_data: {
          test1: { reps: n(form.enduranceReps) ?? undefined, durationSec: n(form.enduranceDurationSec) ?? undefined },
          test2: { reps: n(form.enduranceReps2) ?? undefined, durationSec: n(form.enduranceDurationSec2) ?? undefined },
        },

        // v3 rows post the RAW battery — the server derives, validates and
        // stamps provenance. Legacy rows post the stored blob back untouched.
        flexibility_test_data: form.flexibility.recording
          ? buildFlexibilityPayload(form.flexibility)
          : form.flexibility.legacy,
      };

      if (vitalsStop) {
        // Anything typed into the exertion steps before the vitals reading was
        // corrected to an unsafe one is not sent — the API would refuse it.
        for (const k of ['cardio_test_type', 'cardio_test_data', 'strength_exercise', 'strength_exercise_2',
          'strength_test_data', 'endurance_test_type', 'endurance_test_type_2', 'endurance_test_data']) delete payload[k];
      }

      // The 1RMs reach Strength Tracking from the API now, which also keeps
      // them in step when a test is edited or deleted. They used to be
      // posted from here, one request per lift, after the test was saved.
      const res = (editingId
        ? await api.progress.assessments.update(editingId, payload)
        : await api.progress.assessments.create(payload)) as { data?: Record<string, unknown>; screening_warnings?: unknown };
      const created = res?.data;
      // screening_warnings rides along on the existing save contract; read it,
      // don't reshape the request or the response.
      const warns = Array.isArray(res?.screening_warnings)
        ? res.screening_warnings.filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
        : [];
      setSaveWarnings(warns);

      clear();
      if (created) setHistory((h) => [created, ...h.filter((x) => String(x.id) !== String(created.id))]);
      toast.success(
        created?.bp_unsafe || (created?.vitals_safety as { level?: string } | undefined)?.level === 'stop'
          ? 'Assessment saved. Resting vitals flagged unsafe — medical clearance recommended.'
          : editingId ? 'Assessment updated.' : 'Assessment saved.',
      );
      setEditingId(null);

      if (created) setLastSaved(created);
      setReviewMode(false);
    } catch (err: unknown) {
      const block = screeningBlockOf(err);
      if (block) {
        toast.error(`This client's ${block.reason} before fitness testing.`, {
          duration: 0, action: { label: block.actionLabel, onClick: () => router.push(block.path(clientId)) },
        });
      } else {
        toast.error(errorMessage(err, 'Failed to save assessment.'));
      }
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  /** Open a saved test in the wizard. */
  const handleEdit = (row: Record<string, unknown>) => {
    if (isDirty && !window.confirm('Discard the unsaved assessment and edit this one?')) return;
    const loaded = formFromAssessmentRow(row);
    setForm(loaded);
    initFormRef.current = loaded;
    setEditingId(String(row.id));
    setErrors({});
    setReviewMode(false);
    setLastSaved(null);
    setSaveWarnings([]);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    const date = String(row.assessment_date ?? '').slice(0, 10);
    if (!window.confirm(`Delete the assessment from ${date}? Its lifts are removed from Strength Tracking too.`)) return;
    try {
      await api.progress.assessments.delete(String(row.id));
      setHistory((h) => h.filter((x) => String(x.id) !== String(row.id)));
      if (editingId === String(row.id)) handleNewAssessment();
      // Clear any active state pointing at the deleted record (F4).
      if (lastSaved && String(lastSaved.id) === String(row.id)) {
        setLastSaved(null);
        setSaveWarnings([]);
      }
      toast.success('Assessment deleted.');
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not delete the assessment.'));
    }
  };

  const handleNewAssessment = () => {
    setEditingId(null);
    const fresh = initAssessmentForm();
    fresh.trainerId = form.trainerId;
    fresh.trainerName = form.trainerName;
    setForm(fresh);
    initFormRef.current = fresh;
    setErrors({});
    setStep(1);
    setLastSaved(null);
    setSaveWarnings([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin" style={{ color: '#852E4E' }} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-[color:var(--text-secondary)]">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  // Display number derived from the highest existing number, not the row count,
  // so a deletion does not reuse or duplicate a number (F11). Server-side
  // allocation uses MAX+1 under an advisory lock; this is the matching client view.
  const nextAssessmentNumber = history.reduce((m, r) => Math.max(m, Number(r.assessment_number) || 0), 0) + 1;
  const sortedHistory = [...history].sort((a, b) => {
    const d = String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? ''));
    if (d !== 0) return d;
    const ca = String(a.created_at ?? a.id ?? '');
    const cb = String(b.created_at ?? b.id ?? '');
    return cb.localeCompare(ca);
  });
  const initialAssessment = sortedHistory[sortedHistory.length - 1];
  const latestAssessment = sortedHistory[0];
  // Most recent saved flexibility result, for the step's comparison line. The
  // row being edited is skipped so a test never compares to itself.
  const previousFlexibility = (() => {
    const row = sortedHistory.find((a) => String(a.id) !== editingId && a.flexibility_test_data);
    if (!row) return null;
    return { date: String(row.assessment_date ?? '').slice(0, 10), data: row.flexibility_test_data };
  })();

  // Saved rows carry the categories the API derived. Old rows have no
  // category columns, so fall back to classifying their raw values.
  const cat = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const savedVitals: FitnessVitals | undefined = (() => {
    if (!lastSaved) return undefined;
    const bpSystolic = scoreNum(lastSaved.bp_systolic);
    const bpDiastolic = scoreNum(lastSaved.bp_diastolic);
    const restingHeartRate = scoreNum(lastSaved.resting_heart_rate);
    const restingSpo2 = scoreNum(lastSaved.resting_spo2);
    return {
      bpSystolic, bpDiastolic, bpCategory: cat(lastSaved.bp_category) ?? classifyBp(bpSystolic, bpDiastolic),
      restingHeartRate, rhrCategory: cat(lastSaved.rhr_category) ?? classifyRhr(restingHeartRate),
      restingSpo2, spo2Category: cat(lastSaved.spo2_category) ?? classifySpo2(restingSpo2),
    };
  })();

  const savedAnthropometric: FitnessAnthropometric | undefined = (() => {
    if (!lastSaved) return undefined;
    const bmi = scoreNum(lastSaved.bmi);
    const waistCm = scoreNum(lastSaved.waist_cm);
    const waistHipRatio = scoreNum(lastSaved.waist_hip_ratio);
    return {
      bmi, bmiCategory: cat(lastSaved.bmi_category) ?? classifyBmi(bmi),
      waistCm, waistRisk: cat(lastSaved.waist_risk) ?? classifyWaistRisk(waistCm, gender),
      waistHipRatio, whrRisk: cat(lastSaved.whr_risk) ?? classifyWhrRisk(waistHipRatio, gender),
    };
  })();

  return (
    <PageContainer>
      <PageHero icon={<ClipboardCheck size={18} />} title="Fitness Testing">
        {!reviewMode && !lastSaved && <StepperTimeline steps={STEPS} current={step} onStep={goToStep} />}
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-5">
        <ScreeningStatusCard screening={screening} clientId={clientId} />
        {lastSaved ? (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-5">
            <div className="flex items-center gap-4 rounded-[20px] p-5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[13px] text-white" style={{ background: `linear-gradient(135deg, ${emerald[400]}, ${emerald[600]})`, boxShadow: '0 10px 24px -12px rgba(16,185,129,0.6)' }}>
                <CheckCircle2 size={19} />
              </span>
              <div>
                <p className="text-[14px] font-[760] text-[color:var(--text-primary)]">
                  Assessment {String(lastSaved.assessment_number ?? '')} recorded for {clientName}.
                </p>
              </div>
            </div>

            <ScreeningWarningsNotice warnings={saveWarnings} clientId={clientId} />
            <FitnessDashboard scores={scoresFromAssessmentRow(lastSaved)} vitals={savedVitals} anthropometric={savedAnthropometric} />
            <AiRecommendationsPanel assessmentId={String(lastSaved.id)} />

            <div className="flex flex-wrap gap-3">
              <Button
                iconLeft={<Download size={14} />}
                onClick={() => downloadAssessmentPdf(lastSaved, clientName)}
                style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}
              >
                Download PDF Report
              </Button>
              <Button variant="outline" iconLeft={<Plus size={14} />} onClick={handleNewAssessment}>
                New Assessment
              </Button>
              <JourneyNextButton clientId={clientId} current="assessment" />
            </div>
          </m.div>
        ) : !reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && <AssessmentInfoCard form={form} set={set} clientName={clientName} nextAssessmentNumber={nextAssessmentNumber} />}
            {step === 1 && <StepBloodPressure form={form} set={set} error={errors.bp} athlete={experienceLevel === 'athlete'} />}
            {step === 2 && <StepAnthropometric form={form} set={set} error={errors.anthropometric} gender={gender} />}
            {step === 3 && <StepBodyComposition form={form} set={set} age={age} gender={gender} error={errors.bodyComposition} />}
            {step === 4 && <StepCardio form={form} set={set} age={age} gender={gender} error={errors.cardio} />}
            {step === 5 && <StepStrength form={form} set={set} gender={gender} age={age} error={errors.strength} isBeginner={isBeginner} />}
            {step === 6 && <StepEndurance form={form} set={set} gender={gender} age={age} error={errors.endurance} />}
            {step === 7 && (
              <StepFlexibility
                form={form}
                set={set}
                age={age}
                gender={gender}
                clientName={clientName}
                previous={previousFlexibility}
                onSaveDraft={handleSaveDraft}
                error={errors.flexibility}
              />
            )}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <FitnessDashboard scores={liveScores} vitals={liveVitals} anthropometric={liveAnthropometric} />
          </m.div>
        )}

        {sortedHistory.length >= 2 && (
          <ProgressComparison initial={initialAssessment} latest={latestAssessment} />
        )}

        {sortedHistory.length > 0 && (
          <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: gradient(tones.indigo), boxShadow: `0 8px 18px -10px ${tones.indigo.glow}` }}>
                  <History size={15} />
                </span>
                <h2 className="text-[15px] font-[760] text-[color:var(--text-primary)]">Assessment History</h2>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sortedHistory.map((a) => {
                  const overall = scoreNum(a.overall_fitness_score);
                  return (
                  <div key={String(a.id)} className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
                    <div>
                      <p className="text-[13px] font-[700] text-[color:var(--text-secondary)]">{String(a.assessment_date ?? '').slice(0, 10)}</p>
                      <p className="text-[11px] text-[color:var(--text-muted)] capitalize">{String(a.assessment_type ?? '').replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {overall != null && (
                        <span className="rounded-full px-2.5 py-1 text-[11.5px] font-[700]" style={{ background: tint(bandInk(overall), 0.12), color: bandInk(overall) }}>
                          Score {String(a.overall_fitness_score)}
                        </span>
                      )}
                      <button
                        type="button" title="AI Recommendations" onClick={() => setHistoryAiId(String(a.id))}
                        className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <Sparkles size={13} style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button
                        type="button" title="Download PDF" aria-label="Download PDF" onClick={() => downloadAssessmentPdf(a, clientName)}
                        className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <Download size={13} style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button
                        type="button" title="Edit" aria-label={`Edit the ${String(a.assessment_date ?? '').slice(0, 10)} assessment`} onClick={() => handleEdit(a)}
                        className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <Pencil size={13} style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button
                        type="button" title="Delete" aria-label={`Delete the ${String(a.assessment_date ?? '').slice(0, 10)} assessment`} onClick={() => handleDelete(a)}
                        className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <Trash2 size={13} style={{ color: '#dc2626' }} />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {!lastSaved && (
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
                  {step === 7 ? 'Review' : 'Next'}
                </Button>
              ) : (
                <Button
                  iconLeft={!saving ? <Check size={14} /> : undefined}
                  loading={saving} disabled={saving}
                  onClick={handleSubmit}
                  style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}
                >
                  {saving ? 'Saving...' : editingId ? 'Update Assessment' : 'Save Assessment'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!historyAiId} onOpenChange={(open) => { if (!open) setHistoryAiId(null); }}>
        <DialogContent className="!max-w-2xl max-h-[85vh] overflow-y-auto overscroll-contain">
          <DialogHeader>
            <DialogTitle>AI Recommendations</DialogTitle>
          </DialogHeader>
          {historyAiId && <AiRecommendationsPanel assessmentId={historyAiId} />}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
