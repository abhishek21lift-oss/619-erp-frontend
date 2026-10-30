'use client';
/**
 * Cardio & FITT calculator.
 *
 * Two kinds of percentage are shown side by side and never mixed:
 *
 *   K11 intensity bands   % of MAX heart rate   -> how hard today's cardio is
 *   Progression phases    % of HEART-RATE RESERVE -> which multi-week stage the
 *                                                    client is in
 *
 * All arithmetic lives in @/lib/cardio-calculations (the twin of the backend
 * module), so what a trainer previews here is the same formula the server
 * validates. Measured max HR is preferred; the age estimate is labelled as an
 * estimate everywhere it appears, because it is one.
 *
 * Saving is explicit. "Save for plan builder" writes a draft; the workout
 * builder offers to apply it to a cardio row. Calculating alone never writes a
 * plan or changes a client.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import { PageContainer, PageHero, FormField, TextInput, SelectInput } from '@/components/ui';
import { HeartPulse, Save, Trash2, TriangleAlert } from 'lucide-react';
import {
  CARDIO_FREQUENCY_LIMITS,
  CARDIO_GOALS,
  CARDIO_MAIN_WORK_LIMITS,
  CARDIO_MODALITY_CATEGORIES,
  CARDIO_PROGRAM_TYPES,
  FIVE_PHASE_CARDIO_DEFAULTS,
  FIVE_PHASE_CARDIO_TOTAL_MINUTES,
  K11_FITT_REFERENCE,
  K11_INTENSITY_BANDS,
  K11_PROGRESSION_PHASES,
  K11_TRAINEE_LEVELS,
  buildFittPrescription,
  buildFivePhaseCardio,
  buildProgressionPrescription,
  calcHrr,
  calcTargetRangeForBand,
  clearCardioPlanDraft,
  estimateMaxHeartRate,
  formatIntensityPercent,
  getK11IntensityBand,
  getProgressionPhase,
  isCardioIntensity,
  readCardioPlanDraft,
  resolveHeartRateInputs,
  toCardioPlanConfig,
  validateAge,
  validateFrequencyPerWeek,
  validateIntensityFraction,
  validateMainWorkMinutes,
  validateMeasuredMaxHeartRate,
  validateRestingHeartRate,
  writeCardioPlanDraft,
  type CardioCalculationMethod,
  type CardioIntensity,
  type CardioPlanDraft,
  type CardioProgressionPhase,
  type CardioProgramType,
  type CardioTraineeLevel,
  type FivePhaseKey,
} from '@/lib/cardio-calculations';

interface PhaseRow {
  key: FivePhaseKey;
  name: string;
  minutes: string;
  percent: string;
}

const DEFAULT_PHASES: PhaseRow[] = FIVE_PHASE_CARDIO_DEFAULTS.map((phase) => ({
  key: phase.key,
  name: phase.name,
  minutes: String(phase.durationMinutes),
  percent: String(Math.round(phase.intensityFraction * 100)),
}));

function parseFinite(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function parseWhole(text: string): number | null {
  const n = parseFinite(text);
  return n != null && Number.isInteger(n) ? n : null;
}

function formatPercent(fraction: number): string {
  return formatIntensityPercent(fraction);
}

function rangeText(range: { min: number; max: number } | null | undefined): string {
  return range ? `${range.min}–${range.max} BPM` : '—';
}

function Notice({
  tone, children,
}: { tone: 'error' | 'warning' | 'info'; children: ReactNode }) {
  const palette = {
    error: { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.28)', text: 'var(--danger-text, #b91c1c)' },
    warning: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.35)', text: '#92400e' },
    info: { bg: 'var(--bg-subtle)', border: 'var(--border)', text: 'var(--text-muted)' },
  }[tone];
  return (
    <div
      className="rounded-[10px] border px-3 py-2 text-[12px] leading-relaxed"
      style={{ background: palette.bg, borderColor: palette.border, color: palette.text }}
    >
      {children}
    </div>
  );
}

function NoticeList({
  tone, items,
}: { tone: 'error' | 'warning'; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <Notice key={item} tone={tone}>{item}</Notice>
      ))}
    </div>
  );
}

function Metric({
  label, value, hint,
}: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-[10px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
      <dt className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </dt>
      <dd className="mt-0.5 text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>{value}</dd>
      {hint && <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

/** Numbered section heading: inputs → prescription → results → guidance → saved. */
function SectionHeading({
  step, title, children,
}: { step: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-[800]"
          style={{ background: 'rgba(163,55,87,0.10)', color: 'var(--brand)' }}
        >
          {step}
        </span>
        <h2 className="text-[15px] font-[700]">{title}</h2>
      </div>
      {children && (
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>{children}</p>
      )}
    </div>
  );
}

export default function CardioCalculatorPage() {
  // Client inputs
  const [age, setAge] = useState('');
  const [measuredMhr, setMeasuredMhr] = useState('');
  const [rhr, setRhr] = useState('');
  const [traineeLevel, setTraineeLevel] = useState<CardioTraineeLevel>('intermediate');
  const [goal, setGoal] = useState('general-fitness');

  // FITT prescription
  const [method, setMethod] = useState<CardioCalculationMethod>('mhr');
  const [intensity, setIntensity] = useState<CardioIntensity>('moderate');
  const [frequency, setFrequency] = useState('3');
  const [mainWork, setMainWork] = useState('30');
  const [modality, setModality] = useState('Running');
  const [programType, setProgramType] = useState<CardioProgramType>('continuous-liss');

  // Progression phase
  const [progressionPhase, setProgressionPhase] = useState<CardioProgressionPhase>('initial');
  const [phaseIntensity, setPhaseIntensity] = useState('50');
  const [phaseFrequency, setPhaseFrequency] = useState('3');
  const [phaseMinutes, setPhaseMinutes] = useState('30');

  // Five-phase template
  const [phases, setPhases] = useState<PhaseRow[]>(DEFAULT_PHASES);
  const [savedDraft, setSavedDraft] = useState<CardioPlanDraft | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setSavedDraft(readCardioPlanDraft());
  }, []);

  // ── Client heart-rate inputs ──────────────────────────────────────────────
  const ageNumber = parseWhole(age);
  const measuredNumber = parseFinite(measuredMhr);
  const rhrNumber = parseFinite(rhr);

  const ageError = age.trim() !== '' && ageNumber == null
    ? 'Age must be a whole number.'
    : ageNumber != null
      ? validateAge(ageNumber)
      : null;
  const measuredError = measuredMhr.trim() !== '' && measuredNumber == null
    ? 'Enter a number, or leave this blank and use age.'
    : measuredNumber != null
      ? validateMeasuredMaxHeartRate(measuredNumber, rhrNumber)
      : null;
  const rhrError = rhr.trim() !== '' && rhrNumber == null
    ? 'Enter a number.'
    : rhrNumber != null
      ? validateRestingHeartRate(rhrNumber)
      : null;

  const heartRate = useMemo(
    () => resolveHeartRateInputs({
      age: ageNumber,
      measuredMaxHeartRate: measuredNumber,
      restingHeartRate: rhrNumber,
    }),
    [ageNumber, measuredNumber, rhrNumber],
  );

  const parseBlocked = Boolean(ageError || measuredError || rhrError);
  const hr = parseBlocked ? null : heartRate.value;
  const inputErrors = [...new Set([
    ...(parseBlocked ? [ageError, measuredError, rhrError] : []),
    ...heartRate.errors,
  ].filter((value): value is string => Boolean(value)))];

  const estimated = ageNumber != null && ageError == null ? estimateMaxHeartRate(ageNumber) : null;
  const band = getK11IntensityBand(intensity);
  const k11Target = hr && band && isCardioIntensity(intensity)
    ? calcTargetRangeForBand({
      maxHeartRate: hr.maxHeartRate,
      restingHeartRate: hr.restingHeartRate,
      method,
      intensity,
    })
    : null;

  const suggestedLevel = K11_TRAINEE_LEVELS.find((level) => level.key === traineeLevel);
  const suggestedBand = suggestedLevel ? getK11IntensityBand(suggestedLevel.suggestedIntensity) : null;

  // ── FITT prescription ─────────────────────────────────────────────────────
  const frequencyNumber = parseWhole(frequency);
  const mainWorkNumber = parseWhole(mainWork);
  const frequencyError = frequency.trim() !== '' && frequencyNumber == null
    ? 'Frequency must be a whole number.'
    : frequencyNumber != null
      ? validateFrequencyPerWeek(frequencyNumber)
      : null;
  const mainWorkError = mainWork.trim() !== '' && mainWorkNumber == null
    ? 'Main-work time must be a whole number.'
    : mainWorkNumber != null
      ? validateMainWorkMinutes(mainWorkNumber)
      : null;

  const fitt = useMemo(() => {
    if (!hr || frequencyNumber == null || mainWorkNumber == null) return null;
    return buildFittPrescription({
      maxHeartRate: hr.maxHeartRate,
      restingHeartRate: hr.restingHeartRate,
      method,
      intensity,
      frequencyPerWeek: frequencyNumber,
      mainWorkMinutes: mainWorkNumber,
      modality,
      programType,
    });
  }, [hr, frequencyNumber, mainWorkNumber, method, intensity, modality, programType]);

  const fittValue = fitt?.value ?? null;
  const fittErrors = [...new Set([
    ...(frequencyError ? [frequencyError] : []),
    ...(mainWorkError ? [mainWorkError] : []),
    ...(fitt?.errors ?? []),
  ])];
  const fittWarnings = fittValue?.warnings ?? [];

  // ── Progression phase ─────────────────────────────────────────────────────
  const phase = getProgressionPhase(progressionPhase);
  const phasePercentNumber = parseFinite(phaseIntensity);
  const phasePercentError = phaseIntensity.trim() === ''
    ? 'Enter a %HRR.'
    : phasePercentNumber == null
      ? 'Enter a number for %HRR.'
      : phasePercentNumber < 0 || phasePercentNumber > 100
        ? 'HRR intensity must be between 0% and 100%.'
        : validateIntensityFraction(phasePercentNumber / 100);
  const phaseFrequencyNumber = parseWhole(phaseFrequency);
  const phaseMinutesNumber = parseWhole(phaseMinutes);
  const phaseFrequencyError = phaseFrequency.trim() !== '' && phaseFrequencyNumber == null
    ? 'Phase frequency must be a whole number.'
    : phaseFrequencyNumber != null
      ? validateFrequencyPerWeek(phaseFrequencyNumber)
      : null;
  const phaseMinutesError = phaseMinutes.trim() !== '' && phaseMinutesNumber == null
    ? 'Phase time must be a whole number.'
    : phaseMinutesNumber != null
      ? validateMainWorkMinutes(phaseMinutesNumber)
      : null;

  const progression = useMemo(() => {
    if (
      !hr
      || phasePercentNumber == null
      || phasePercentError != null
      || phaseFrequencyNumber == null
      || phaseMinutesNumber == null
    ) return null;
    return buildProgressionPrescription({
      phase: progressionPhase,
      intensityFraction: phasePercentNumber / 100,
      frequencyPerWeek: phaseFrequencyNumber,
      minutesPerSession: phaseMinutesNumber,
      maxHeartRate: hr.maxHeartRate,
      restingHeartRate: hr.restingHeartRate,
    });
  }, [
    hr, progressionPhase, phasePercentNumber, phasePercentError,
    phaseFrequencyNumber, phaseMinutesNumber,
  ]);

  const progressionValue = progression?.value ?? null;
  const progressionErrors = [...new Set([
    ...(phasePercentError ? [phasePercentError] : []),
    ...(phaseFrequencyError ? [phaseFrequencyError] : []),
    ...(phaseMinutesError ? [phaseMinutesError] : []),
    ...(progression?.errors ?? []),
  ])];
  const progressionWarnings = progressionValue?.warnings ?? [];

  // ── Five-phase template ───────────────────────────────────────────────────
  const phaseRows = useMemo(() => phases.map((row) => {
    const minutes = row.minutes.trim() === '' ? null : parseWhole(row.minutes);
    const percent = parseFinite(row.percent);
    const minutesError = minutes == null || minutes < 1 || minutes > 180
      ? 'Use whole minutes between 1 and 180.'
      : null;
    const percentError = percent == null || percent < 0 || percent > 100
      ? 'Use a percentage between 0 and 100.'
      : null;
    return { ...row, minutes, percent, minutesError, percentError };
  }), [phases]);

  const templateErrors = phaseRows.flatMap((row) => [
    row.minutesError ? `${row.name}: ${row.minutesError}` : null,
    row.percentError ? `${row.name}: ${row.percentError}` : null,
  ]).filter((value): value is string => Boolean(value));

  const template = useMemo(() => {
    if (!hr || templateErrors.length > 0) return null;
    const overrides: Partial<Record<FivePhaseKey, { durationMinutes: number; intensityFraction: number }>> = {};
    for (const row of phaseRows) {
      if (row.minutes == null || row.percent == null) return null;
      overrides[row.key] = {
        durationMinutes: row.minutes,
        intensityFraction: row.percent / 100,
      };
    }
    return buildFivePhaseCardio(hr.maxHeartRate, hr.restingHeartRate, overrides);
  }, [hr, phaseRows, templateErrors.length]);

  const canSave = Boolean(hr && fittValue && k11Target && progressionValue);

  const saveDraft = () => {
    if (!hr || !fittValue || !k11Target || !progressionValue) return;
    const config = toCardioPlanConfig({
      method,
      intensity,
      targetHeartRate: fittValue.targetHeartRate,
      frequencyPerWeek: fittValue.frequencyPerWeek,
      mainWorkMinutes: fittValue.mainWorkMinutes,
      modality: fittValue.modality,
      modalityCategory: fittValue.modalityCategory,
      programType: fittValue.programType,
      goal,
      progression: progressionValue
        ? {
          phase: progressionValue.phase.key,
          intensityPercent: Math.round(progressionValue.intensityFraction * 100),
        }
        : null,
    });
    const draft: CardioPlanDraft = {
      version: 1,
      createdAt: new Date().toISOString(),
      config,
      summary: {
        intensityLabel: fittValue.intensity.label,
        minBpm: fittValue.targetHeartRate.minBpm,
        maxBpm: fittValue.targetHeartRate.maxBpm,
        programTypeLabel: CARDIO_PROGRAM_TYPES.find((type) => type.key === fittValue.programType)?.label
          ?? fittValue.programType,
        mainWorkMinutes: fittValue.mainWorkMinutes,
        frequencyPerWeek: fittValue.frequencyPerWeek,
      },
    };
    if (writeCardioPlanDraft(draft)) {
      setSavedDraft(draft);
      setSavedMessage('Saved for the plan builder. Open a cardio exercise to apply it.');
    } else {
      setSavedMessage('Could not save to this browser. Check storage permissions and try again.');
    }
  };

  const clearDraft = () => {
    clearCardioPlanDraft();
    setSavedDraft(null);
    setSavedMessage('Saved draft cleared.');
  };

  const resetTemplate = () => {
    setPhases(DEFAULT_PHASES);
  };

  return (
    <Guard roles={['trainer']}>
      <PageContainer>
        <PageHero
          icon={<HeartPulse size={20} color="#fff" />}
          title="Cardio & FITT"
          subtitle="K11 intensity bands (%MHR), Karvonen or MHR targets, FITT prescription, progression phases, and the five-phase session template."
        />

        <div className="space-y-5">
          {/* ── 1. Inputs ─────────────────────────────────────────────────── */}
          <section className="rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
            <SectionHeading step="1" title="Client inputs and assessment values">
              Heart-rate inputs used by every calculation below. Measured max HR is preferred; the age
              estimate is used only when it is absent.
            </SectionHeading>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Age (estimate only)" error={ageError ?? undefined}>
                <TextInput
                  inputMode="numeric"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 40"
                />
              </FormField>
              <FormField label="Measured max HR (preferred)" error={measuredError ?? undefined}>
                <TextInput
                  inputMode="numeric"
                  value={measuredMhr}
                  onChange={(e) => setMeasuredMhr(e.target.value)}
                  placeholder="e.g. 180"
                />
              </FormField>
              <FormField label="Resting HR" error={rhrError ?? undefined}>
                <TextInput
                  inputMode="numeric"
                  value={rhr}
                  onChange={(e) => setRhr(e.target.value)}
                  placeholder="e.g. 60"
                />
              </FormField>
              <FormField label="Training level">
                <SelectInput
                  value={traineeLevel}
                  onChange={(e) => setTraineeLevel(e.target.value as CardioTraineeLevel)}
                >
                  {K11_TRAINEE_LEVELS.map((level) => (
                    <option key={level.key} value={level.key}>{level.label}</option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField label="Fitness goal" className="sm:col-span-2">
                <SelectInput value={goal} onChange={(e) => setGoal(e.target.value)}>
                  {CARDIO_GOALS.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </SelectInput>
              </FormField>
            </div>

            <dl className="mt-4 grid gap-2 sm:grid-cols-3">
              <Metric
                label="Max HR used"
                value={hr ? `${hr.maxHeartRate} BPM` : '—'}
                hint={hr?.maxHeartRateSource === 'estimated'
                  ? 'Age estimate, not a measurement.'
                  : hr?.maxHeartRateSource === 'measured'
                    ? 'Measured value.'
                    : undefined}
              />
              <Metric label="Resting HR" value={hr ? `${hr.restingHeartRate} BPM` : '—'} />
              <Metric label="Heart-rate reserve" value={hr ? `${hr.heartRateReserve} BPM` : '—'} />
            </dl>

            {estimated != null && hr?.maxHeartRateSource === 'measured' && (
              <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Age estimate would be {estimated} BPM, but the measured value wins.
              </p>
            )}

            {inputErrors.length > 0 && (
              <div className="mt-3">
                <NoticeList tone="error" items={inputErrors} />
              </div>
            )}
          </section>

          {/* ── 2. Prescription inputs ────────────────────────────────────── */}
          <section className="rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
            <SectionHeading step="2" title="FITT prescription">
              Frequency {K11_FITT_REFERENCE.frequencyPerWeek.min}–{K11_FITT_REFERENCE.frequencyPerWeek.max} sessions/week,
              main work {K11_FITT_REFERENCE.mainWorkMinutes.min}–{K11_FITT_REFERENCE.mainWorkMinutes.max} min.
              Warm-up and cool-down sit outside that main-work time.
            </SectionHeading>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Target calculation">
                <SelectInput
                  value={method}
                  onChange={(e) => setMethod(e.target.value as CardioCalculationMethod)}
                >
                  <option value="mhr">MHR: THR = MHR × %</option>
                  <option value="karvonen">Karvonen: THR = ((MHR − RHR) × %) + RHR</option>
                </SelectInput>
              </FormField>
              <FormField label="K11 intensity band">
                <SelectInput
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value as CardioIntensity)}
                >
                  {K11_INTENSITY_BANDS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label} ({formatPercent(option.minFraction)}–{formatPercent(option.maxFraction)} MHR)
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField
                label="Sessions per week"
                error={frequencyError ?? undefined}
                description={`${CARDIO_FREQUENCY_LIMITS.min}–${CARDIO_FREQUENCY_LIMITS.max} accepted; ${K11_FITT_REFERENCE.frequencyPerWeek.min}–${K11_FITT_REFERENCE.frequencyPerWeek.max} is the FITT reference.`}
              >
                <TextInput
                  inputMode="numeric"
                  min={CARDIO_FREQUENCY_LIMITS.min}
                  max={CARDIO_FREQUENCY_LIMITS.max}
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                />
              </FormField>
              <FormField
                label="Main-work time (minutes)"
                error={mainWorkError ?? undefined}
                description={`${CARDIO_MAIN_WORK_LIMITS.min}–${CARDIO_MAIN_WORK_LIMITS.max} accepted; ${K11_FITT_REFERENCE.mainWorkMinutes.min}–${K11_FITT_REFERENCE.mainWorkMinutes.max} is the FITT reference.`}
              >
                <TextInput
                  inputMode="numeric"
                  min={CARDIO_MAIN_WORK_LIMITS.min}
                  max={CARDIO_MAIN_WORK_LIMITS.max}
                  value={mainWork}
                  onChange={(e) => setMainWork(e.target.value)}
                />
              </FormField>
              <FormField label="Modality" description="Free text. Unknown modalities stay unclassified rather than being forced into a category.">
                <TextInput
                  value={modality}
                  onChange={(e) => setModality(e.target.value)}
                  placeholder="Running, cycling, elliptical…"
                />
              </FormField>
              <FormField label="Programme type">
                <SelectInput
                  value={programType}
                  onChange={(e) => setProgramType(e.target.value as CardioProgramType)}
                >
                  {CARDIO_PROGRAM_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </SelectInput>
              </FormField>
            </div>

            {fittErrors.length > 0 && (
              <div className="mt-3"><NoticeList tone="error" items={fittErrors} /></div>
            )}
            {fittWarnings.length > 0 && (
              <div className="mt-3"><NoticeList tone="warning" items={fittWarnings} /></div>
            )}
          </section>

          {/* ── 3. Results ────────────────────────────────────────────────── */}
          <section className="rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
            <SectionHeading step="3" title="Calculations and results">
              These update as the inputs above change. Nothing here is stored until it is saved below.
            </SectionHeading>

            <div className="grid gap-4 xl:grid-cols-2">
              {/* K11 target */}
              <div className="rounded-[12px] p-3.5" style={{ background: 'var(--bg-subtle)' }}>
                <h3 className="text-[13px] font-[700]">K11 intensity target</h3>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Metric
                    label="Band"
                    value={band?.label ?? '—'}
                    hint={band ? `${formatPercent(band.minFraction)}–${formatPercent(band.maxFraction)} of max HR` : undefined}
                  />
                  <Metric
                    label="Target heart rate"
                    value={k11Target ? `${k11Target.minBpm}–${k11Target.maxBpm} BPM` : '—'}
                    hint={k11Target?.basisLabel}
                  />
                </dl>
                {hr && band && (
                  <p className="mt-2 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {method === 'mhr'
                      ? `THR = ${hr.maxHeartRate} × ${formatPercent(band.minFraction)}–${formatPercent(band.maxFraction)} = ${k11Target?.minBpm}–${k11Target?.maxBpm}`
                      : `THR = ((${hr.maxHeartRate} − ${hr.restingHeartRate}) × ${formatPercent(band.minFraction)}–${formatPercent(band.maxFraction)}) + ${hr.restingHeartRate} = ${k11Target?.minBpm}–${k11Target?.maxBpm}`}
                  </p>
                )}
              </div>

              {/* FITT result — the heart-rate pair lives in the K11 card above,
                  so it is not repeated here. */}
              <div className="rounded-[12px] p-3.5" style={{ background: 'var(--bg-subtle)' }}>
                <h3 className="text-[13px] font-[700]">FITT prescription results</h3>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Metric label="Frequency" value={fittValue ? `${fittValue.frequencyPerWeek}×/week` : '—'} />
                  <Metric
                    label="Main work"
                    value={fittValue ? `${fittValue.mainWorkMinutes} min` : '—'}
                    hint="Excludes warm-up and cool-down."
                  />
                  <Metric
                    label="Modality category"
                    value={fittValue?.modalityCategory
                      ? CARDIO_MODALITY_CATEGORIES.find((c) => c.key === fittValue.modalityCategory)?.label
                        ?? fittValue.modalityCategory
                      : 'Unclassified'}
                    hint={fittValue?.modality ? fittValue.modality : undefined}
                  />
                  <Metric
                    label="Programme"
                    value={fittValue ? CARDIO_PROGRAM_TYPES.find((t) => t.key === fittValue.programType)?.label : '—'}
                    hint={fittValue ? CARDIO_PROGRAM_TYPES.find((t) => t.key === fittValue.programType)?.description : undefined}
                  />
                </dl>
              </div>
            </div>

            {/* Progression is a second, separate assessment (%HRR, not %MHR). */}
            <div className="mt-4 rounded-[12px] border p-3.5" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-[13px] font-[700]">Progression phase</h3>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                These percentages are of heart-rate reserve, not of max HR. They are a separate
                reference from the K11 band above.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FormField label="Phase" className="sm:col-span-2">
                  <SelectInput
                    value={progressionPhase}
                    onChange={(e) => setProgressionPhase(e.target.value as CardioProgressionPhase)}
                  >
                    {K11_PROGRESSION_PHASES.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </SelectInput>
                </FormField>
                <FormField label="Prescribed %HRR" error={phasePercentError ?? undefined}>
                  <TextInput
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={phaseIntensity}
                    onChange={(e) => setPhaseIntensity(e.target.value)}
                  />
                </FormField>
                <FormField label="Phase sessions per week" error={phaseFrequencyError ?? undefined}>
                  <TextInput
                    inputMode="numeric"
                    value={phaseFrequency}
                    onChange={(e) => setPhaseFrequency(e.target.value)}
                  />
                </FormField>
                <FormField label="Phase session time (minutes)" error={phaseMinutesError ?? undefined}>
                  <TextInput
                    inputMode="numeric"
                    value={phaseMinutes}
                    onChange={(e) => setPhaseMinutes(e.target.value)}
                  />
                </FormField>
              </div>

              {phase && (
                <div className="mt-3 rounded-[10px] px-3 py-2.5 text-[12px]" style={{ background: 'var(--bg-subtle)' }}>
                  <p className="font-[700]">{phase.label} reference</p>
                  <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                    Duration: {phase.durationWeeks.min}–{phase.durationWeeks.max} weeks ·
                    {' '}Intensity: {formatPercent(phase.intensityHrr.min)}–{formatPercent(phase.intensityHrr.max)} HRR ·
                    {' '}Frequency: {phase.frequencyDays
                      ? `${phase.frequencyDays.min}–${phase.frequencyDays.max} days/week`
                      : 'varies (no default supplied)'} ·
                    {' '}Time: {phase.minutes
                      ? `${phase.minutes.min}–${phase.minutes.max} min`
                      : 'varies (no default supplied)'}
                  </p>
                  <p className="mt-1" style={{ color: 'var(--text-muted)' }}>{phase.note}</p>
                </div>
              )}

              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                These phase checks only compare against the phase reference. The saved prescription uses
                the FITT frequency and main-work time above.
              </p>

              {progressionErrors.length > 0 && (
                <div className="mt-3"><NoticeList tone="error" items={progressionErrors} /></div>
              )}
              {progressionWarnings.length > 0 && (
                <div className="mt-3"><NoticeList tone="warning" items={progressionWarnings} /></div>
              )}

              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <Metric
                  label="Phase target"
                  value={progressionValue ? `${progressionValue.prescribedBpm} BPM` : '—'}
                  hint={progressionValue
                    ? `${formatPercent(progressionValue.intensityFraction)} HRR via Karvonen`
                    : undefined}
                />
                <Metric
                  label="Phase reference range"
                  value={rangeText(progressionValue?.referenceRangeBpm)}
                  hint={phase
                    ? `${formatPercent(phase.intensityHrr.min)}–${formatPercent(phase.intensityHrr.max)} HRR`
                    : undefined}
                />
                <Metric label="Phase frequency" value={progressionValue ? `${progressionValue.frequencyPerWeek}×/week` : '—'} />
                <Metric label="Phase session time" value={progressionValue ? `${progressionValue.minutesPerSession} min` : '—'} />
              </dl>
            </div>

            {/* Five-phase template */}
            <div className="mt-4 rounded-[12px] border p-3.5" style={{ borderColor: 'var(--border)' }}>
              <div className="mb-1 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-[700]">Five-phase session template</h3>
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    Canonical default: {FIVE_PHASE_CARDIO_TOTAL_MINUTES} minutes. The main work is the work
                    phase only; the other four are warm-up, preparation, cool-down and stretching.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetTemplate}
                  className="inline-flex h-[44px] shrink-0 items-center rounded-[10px] border px-3 text-[11px] font-[700]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  Reset
                </button>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[430px] border-collapse text-[12px]">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)' }}>
                      <th className="pb-1 text-left font-[700]">Phase</th>
                      <th className="pb-1 text-left font-[700]">Min</th>
                      <th className="pb-1 text-left font-[700]">%HRR</th>
                      <th className="pb-1 text-right font-[700]">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseRows.map((row, index) => (
                      <tr key={row.key} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="py-1.5 pr-2">{row.name}</td>
                        <td className="py-1.5 pr-2">
                          <TextInput
                            aria-label={`${row.name} minutes`}
                            inputMode="numeric"
                            min={1}
                            max={180}
                            value={row.minutes ?? ''}
                            onChange={(e) => setPhases((prev) => prev.map((item, i) => (
                              i === index ? { ...item, minutes: e.target.value } : item
                            )))}
                            className="h-[44px] w-[64px] text-center"
                          />
                          {row.minutesError && (
                            <span className="mt-0.5 block text-[10px]" style={{ color: 'var(--danger-text, #b91c1c)' }}>
                              {row.minutesError}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2">
                          <TextInput
                            aria-label={`${row.name} percent HRR`}
                            inputMode="numeric"
                            min={0}
                            max={100}
                            value={row.percent ?? ''}
                            onChange={(e) => setPhases((prev) => prev.map((item, i) => (
                              i === index ? { ...item, percent: e.target.value } : item
                            )))}
                            className="h-[44px] w-[64px] text-center"
                          />
                          {row.percentError && (
                            <span className="mt-0.5 block text-[10px]" style={{ color: 'var(--danger-text, #b91c1c)' }}>
                              {row.percentError}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right font-[700]">
                          {template?.phases[index]?.targetHeartRate != null
                            ? `${template.phases[index].targetHeartRate} BPM`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px]">
                  Total planned duration:{' '}
                  <strong>{template ? `${template.totalMinutes} min` : '—'}</strong>
                </p>
                {template && (
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Sum of all five phases. Main work is {phaseRows.find((row) => row.key === 'work')?.minutes ?? 0} min.
                  </p>
                )}
              </div>

              {templateErrors.length > 0 && (
                <div className="mt-3"><NoticeList tone="error" items={templateErrors} /></div>
              )}
            </div>
          </section>

          {/* ── 4. Recommendations ────────────────────────────────────────── */}
          <section className="rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
            <SectionHeading step="4" title="Recommendations" />

            {suggestedBand && suggestedBand.key !== intensity && (
              <Notice tone="info">
                {suggestedLevel?.label} is usually paired with the {suggestedBand.label} band
                ({formatPercent(suggestedBand.minFraction)}–{formatPercent(suggestedBand.maxFraction)} MHR).
                Your selected band is different. That is a note, not a block.
              </Notice>
            )}

            {band && (
              <div className={suggestedBand && suggestedBand.key !== intensity ? 'mt-2' : ''}>
                <p className="text-[12px]">
                  <strong>{band.label}</strong> is {formatPercent(band.minFraction)}–{formatPercent(band.maxFraction)} of max HR ·
                  {' '}{band.rpe} · {band.talkTest}
                </p>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  RPE and talk-test text is application guidance, not part of the K11 percentage reference.
                </p>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              The five-phase template is a single session shape. It does not advance a client through
              Initial Conditioning, Improvement or Maintenance by itself.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Max HR estimates are not measurements. This page does not provide medical clearance, diagnosis
              or a universal safe ceiling; use clinical judgement and the client’s recorded restrictions.
            </p>
          </section>

          {/* ── 5. Saved assessment ───────────────────────────────────────── */}
          <section className="rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
            <SectionHeading step="5" title="Saved assessment">
              Saving writes a draft to this browser only — there is no server-side cardio history. The
              workout builder shows an Apply action on cardio rows; nothing is saved to a plan until that
              action is used.
            </SectionHeading>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveDraft}
                disabled={!canSave}
                className="inline-flex h-[44px] items-center gap-2 rounded-[12px] px-4 text-[13px] font-[700] text-white disabled:opacity-40"
                style={{ background: 'var(--brand)' }}
              >
                <Save size={15} /> Save for plan builder
              </button>
              {savedDraft && (
                <>
                  <Link
                    href="/pt-os/workout-plans"
                    className="inline-flex h-[44px] items-center rounded-[12px] border px-4 text-[13px] font-[700]"
                    style={{ borderColor: 'var(--border)', color: 'var(--brand)' }}
                  >
                    Open workout plans
                  </Link>
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="inline-flex h-[44px] items-center gap-1.5 rounded-[12px] border px-3 text-[12px] font-[700]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} /> Clear saved draft
                  </button>
                </>
              )}
            </div>

            {savedDraft && (
              <div className="mt-3 rounded-[10px] px-3 py-2.5 text-[12px]" style={{ background: 'var(--bg-subtle)' }}>
                <p className="font-[700]">
                  Saved: {savedDraft.summary.intensityLabel} · {savedDraft.summary.minBpm}–{savedDraft.summary.maxBpm} BPM
                </p>
                <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                  {savedDraft.summary.frequencyPerWeek}×/week · {savedDraft.summary.mainWorkMinutes} min main work ·{' '}
                  {savedDraft.summary.programTypeLabel}
                </p>
              </div>
            )}
            {savedMessage && (
              <p className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>{savedMessage}</p>
            )}

            {!canSave && (
              <div className="mt-3">
                <Notice tone="warning">
                  <span className="inline-flex items-center gap-1.5">
                    <TriangleAlert size={14} /> Add valid client numbers, a valid FITT prescription and a valid progression phase before saving.
                  </span>
                </Notice>
              </div>
            )}
          </section>
        </div>
      </PageContainer>
    </Guard>
  );
}
