import {
  CARDIO_PLAN_DRAFT_KEY,
  FIVE_PHASE_CARDIO_DEFAULTS,
  FIVE_PHASE_CARDIO_TOTAL_MINUTES,
  K11_INTENSITY_BANDS,
  K11_PROGRESSION_PHASES,
  buildCardioSession,
  buildFittPrescription,
  buildFivePhaseCardio,
  buildProgressionPrescription,
  calcHrr,
  calcMhrTargetHeartRate,
  calcTargetHeartRate,
  calcTargetRangeForBand,
  classifyCardioModality,
  clearCardioPlanDraft,
  estimateMaxHeartRate,
  formatIntensityPercent,
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
  type CardioPlanDraft,
} from '@/lib/cardio-calculations';

beforeEach(() => {
  window.localStorage.clear();
});

describe('Case A: K11 intensity bands use %MHR', () => {
  test('age 40 -> MHR 180 -> 90-108 / 108-126 / 126-153 / 153-180', () => {
    const resolved = resolveHeartRateInputs({ age: 40, restingHeartRate: 60 });
    expect(resolved.errors).toEqual([]);
    expect(resolved.value?.maxHeartRate).toBe(180);
    expect(resolved.value?.maxHeartRateSource).toBe('estimated');

    const ranges = K11_INTENSITY_BANDS.map((band) => (
      calcTargetRangeForBand({
        maxHeartRate: 180,
        restingHeartRate: 60,
        method: 'mhr',
        intensity: band.key,
      })
    ));
    expect(ranges.map((r) => [r?.minBpm, r?.maxBpm])).toEqual([
      [90, 108],
      [108, 126],
      [126, 153],
      [153, 180],
    ]);
    expect(ranges.every((r) => r?.basisLabel === '% MHR')).toBe(true);
  });

  test('MHR method does not include resting heart rate', () => {
    expect(calcMhrTargetHeartRate(180, 0.7)).toBe(126);
    expect(calcMhrTargetHeartRate(180, 0.7)).not.toBe(
      calcTargetHeartRate({ maxHeartRate: 180, restingHeartRate: 60, intensityFraction: 0.7 }),
    );
  });
});

describe('Case B: Karvonen uses %HRR', () => {
  test('MHR 180, RHR 60 -> 108/120/132/144/156/162/168', () => {
    const fractions = [0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9];
    const targets = fractions.map((intensityFraction) => (
      calcTargetHeartRate({ maxHeartRate: 180, restingHeartRate: 60, intensityFraction })
    ));
    expect(targets).toEqual([108, 120, 132, 144, 156, 162, 168]);
    expect(calcHrr(180, 60)).toBe(120);
  });
});

describe('Case C: canonical five-phase template', () => {
  test('5@40 + 3@50 + 20@70 + 5@40 + 5@30 = 38 min and targets 108/120/144/108/96', () => {
    expect(FIVE_PHASE_CARDIO_DEFAULTS.map((p) => [p.durationMinutes, p.intensityFraction])).toEqual([
      [5, 0.4],
      [3, 0.5],
      [20, 0.7],
      [5, 0.4],
      [5, 0.3],
    ]);
    expect(FIVE_PHASE_CARDIO_TOTAL_MINUTES).toBe(38);

    const session = buildFivePhaseCardio(180, 60);
    expect(session?.totalMinutes).toBe(38);
    expect(session?.phases.map((p) => p.targetHeartRate)).toEqual([108, 120, 144, 108, 96]);
  });

  test('editing one phase changes the total and keeps targets coherent', () => {
    const session = buildFivePhaseCardio(180, 60, {
      work: { durationMinutes: 30, intensityFraction: 0.8 },
    });
    expect(session?.totalMinutes).toBe(48);
    expect(session?.phases[2].targetHeartRate).toBe(156);
  });
});

describe('Case D: valid boundaries accepted', () => {
  test('age 1 and 120 are accepted; 0, 121, decimals, NaN and infinity are rejected', () => {
    expect(validateAge(1)).toBeNull();
    expect(validateAge(120)).toBeNull();
    expect(validateAge(0)).not.toBeNull();
    expect(validateAge(121)).not.toBeNull();
    expect(validateAge(40.5)).not.toBeNull();
    expect(validateAge(Number.NaN)).not.toBeNull();
    expect(validateAge(Number.POSITIVE_INFINITY)).not.toBeNull();
  });

  test('positive resting HR, measured MHR above resting, and positive reserve', () => {
    expect(validateRestingHeartRate(1)).toBeNull();
    expect(validateRestingHeartRate(0)).not.toBeNull();
    expect(validateRestingHeartRate(-1)).not.toBeNull();
    expect(validateRestingHeartRate(Number.NaN)).not.toBeNull();
    expect(validateMeasuredMaxHeartRate(181, 60)).toBeNull();
    expect(validateMeasuredMaxHeartRate(60, 60)).not.toBeNull();
    expect(validateMeasuredMaxHeartRate(59, 60)).not.toBeNull();
    expect(calcHrr(180, 60)).toBe(120);
    expect(calcHrr(60, 60)).toBeNull();
    expect(calcHrr(59, 60)).toBeNull();
  });

  test('intensity 0 and 1 accepted, outside rejected', () => {
    expect(validateIntensityFraction(0)).toBeNull();
    expect(validateIntensityFraction(1)).toBeNull();
    expect(validateIntensityFraction(-0.01)).not.toBeNull();
    expect(validateIntensityFraction(1.01)).not.toBeNull();
    expect(validateIntensityFraction(Number.NaN)).not.toBeNull();
    expect(validateIntensityFraction(Number.POSITIVE_INFINITY)).not.toBeNull();
  });

  test('frequency and main-work boundaries accepted, invalid values rejected', () => {
    expect(validateFrequencyPerWeek(1)).toBeNull();
    expect(validateFrequencyPerWeek(14)).toBeNull();
    expect(validateFrequencyPerWeek(0)).not.toBeNull();
    expect(validateFrequencyPerWeek(15)).not.toBeNull();
    expect(validateFrequencyPerWeek(3.5)).not.toBeNull();
    expect(validateMainWorkMinutes(5)).toBeNull();
    expect(validateMainWorkMinutes(180)).toBeNull();
    expect(validateMainWorkMinutes(4)).not.toBeNull();
    expect(validateMainWorkMinutes(181)).not.toBeNull();
    expect(validateMainWorkMinutes(30.5)).not.toBeNull();
  });

  test('progression phase boundaries are inclusive and outside values are rejected', () => {
    const base = { frequencyPerWeek: 3, minutesPerSession: 30, maxHeartRate: 180, restingHeartRate: 60 };
    expect(buildProgressionPrescription({ ...base, phase: 'initial', intensityFraction: 0.4 }).errors).toEqual([]);
    expect(buildProgressionPrescription({ ...base, phase: 'initial', intensityFraction: 0.6 }).errors).toEqual([]);
    expect(buildProgressionPrescription({ ...base, phase: 'improvement', intensityFraction: 0.6 }).errors).toEqual([]);
    expect(buildProgressionPrescription({ ...base, phase: 'improvement', intensityFraction: 0.8 }).errors).toEqual([]);
    expect(buildProgressionPrescription({ ...base, phase: 'maintenance', intensityFraction: 0.8 }).errors).toEqual([]);
    expect(buildProgressionPrescription({ ...base, phase: 'maintenance', intensityFraction: 0.9 }).errors).toEqual([]);

    expect(buildProgressionPrescription({ ...base, phase: 'initial', intensityFraction: 0.39 }).value).toBeNull();
    expect(buildProgressionPrescription({ ...base, phase: 'initial', intensityFraction: 0.61 }).value).toBeNull();
    expect(buildProgressionPrescription({ ...base, phase: 'improvement', intensityFraction: 0.59 }).value).toBeNull();
    expect(buildProgressionPrescription({ ...base, phase: 'maintenance', intensityFraction: 0.91 }).value).toBeNull();
  });

  test('phase reference table matches the supplied K11 values', () => {
    expect(K11_PROGRESSION_PHASES.map((p) => ({
      key: p.key,
      weeks: [p.durationWeeks.min, p.durationWeeks.max],
      hrr: [p.intensityHrr.min, p.intensityHrr.max],
      days: p.frequencyDays ? [p.frequencyDays.min, p.frequencyDays.max] : null,
      minutes: p.minutes ? [p.minutes.min, p.minutes.max] : null,
    }))).toEqual([
      { key: 'initial', weeks: [4, 8], hrr: [0.4, 0.6], days: [3, 5], minutes: [20, 40] },
      { key: 'improvement', weeks: [8, 20], hrr: [0.6, 0.8], days: [3, 6], minutes: [45, 60] },
      { key: 'maintenance', weeks: [24, 50], hrr: [0.8, 0.9], days: null, minutes: null },
    ]);
  });
});

describe('MHR estimation and source selection', () => {
  test('220 - age only when measured MHR is absent', () => {
    expect(estimateMaxHeartRate(40)).toBe(180);
    const estimated = resolveHeartRateInputs({ age: 40, restingHeartRate: 60 });
    expect(estimated.value?.maxHeartRateSource).toBe('estimated');
    expect(estimated.value?.estimatedMaxHeartRate).toBe(180);
  });

  test('measured MHR wins and is never overwritten by the estimate', () => {
    const resolved = resolveHeartRateInputs({
      age: 40,
      measuredMaxHeartRate: 200,
      restingHeartRate: 60,
    });
    expect(resolved.value?.maxHeartRate).toBe(200);
    expect(resolved.value?.maxHeartRateSource).toBe('measured');
    expect(resolved.value?.estimatedMaxHeartRate).toBe(180);
  });

  test('missing age and measured MHR is an error', () => {
    const resolved = resolveHeartRateInputs({ restingHeartRate: 60 });
    expect(resolved.value).toBeNull();
    expect(resolved.errors.join(' ')).toMatch(/age|measured/i);
  });
});

describe('FITT prescription', () => {
  const base = {
    maxHeartRate: 180,
    restingHeartRate: 60,
    method: 'karvonen' as const,
    intensity: 'high' as const,
    frequencyPerWeek: 4,
    mainWorkMinutes: 45,
    modality: 'Rowing',
    programType: 'hiit' as const,
  };

  test('produces frequency, intensity, time, category and programme', () => {
    const result = buildFittPrescription(base);
    expect(result.errors).toEqual([]);
    expect(result.value?.frequencyPerWeek).toBe(4);
    expect(result.value?.intensity.key).toBe('high');
    expect(result.value?.targetHeartRate).toEqual({
      minBpm: 144,
      maxBpm: 162,
      minFraction: 0.7,
      maxFraction: 0.85,
      method: 'karvonen',
      basisLabel: '% HRR',
    });
    expect(result.value?.mainWorkMinutes).toBe(45);
    expect(result.value?.modalityCategory).toBe('non-weight-bearing');
    expect(result.value?.programType).toBe('hiit');
  });

  test('outside the FITT reference warns but is still a valid prescription', () => {
    const result = buildFittPrescription({
      ...base,
      frequencyPerWeek: 6,
      mainWorkMinutes: 80,
    });
    expect(result.value).not.toBeNull();
    expect(result.value?.warnings.join(' ')).toMatch(/6 sessions\/week/);
    expect(result.value?.warnings.join(' ')).toMatch(/80 min/);
  });

  test('unknown modality stays unclassified instead of being forced', () => {
    const result = buildFittPrescription({ ...base, modality: 'Mystery machine' });
    expect(result.value?.modalityCategory).toBeNull();
    expect(result.value?.warnings.join(' ')).toMatch(/unclassified/i);
    expect(classifyCardioModality('Running')).toBe('weight-bearing-high-impact');
    expect(classifyCardioModality('Elliptical')).toBe('weight-bearing-low-impact');
    expect(classifyCardioModality('Cycling')).toBe('non-weight-bearing');
    expect(classifyCardioModality('Mystery machine')).toBeNull();
  });

  test('invalid frequency, time, programme and blank modality are rejected', () => {
    expect(buildFittPrescription({ ...base, frequencyPerWeek: 0 }).value).toBeNull();
    expect(buildFittPrescription({ ...base, mainWorkMinutes: 4 }).value).toBeNull();
    expect(buildFittPrescription({ ...base, programType: 'sprint' as never }).value).toBeNull();
    expect(buildFittPrescription({ ...base, modality: '   ' }).value).toBeNull();
  });

  test('modality is limited to the backend boundary of 80 characters', () => {
    expect(buildFittPrescription({ ...base, modality: 'x'.repeat(80) }).value).not.toBeNull();
    const tooLong = buildFittPrescription({ ...base, modality: 'x'.repeat(81) });
    expect(tooLong.value).toBeNull();
    expect(tooLong.errors.join(' ')).toMatch(/80 characters or fewer/);
  });
});

describe('plan persistence', () => {
  test('stores a flat config with min/max authoritative and target as midpoint', () => {
    const fitt = buildFittPrescription({
      maxHeartRate: 180,
      restingHeartRate: 60,
      method: 'mhr',
      intensity: 'high',
      frequencyPerWeek: 4,
      mainWorkMinutes: 30,
      modality: 'Running',
      programType: 'fartlek',
    });
    const config = toCardioPlanConfig({
      method: 'mhr',
      intensity: 'high',
      targetHeartRate: fitt.value!.targetHeartRate,
      frequencyPerWeek: fitt.value!.frequencyPerWeek,
      mainWorkMinutes: fitt.value!.mainWorkMinutes,
      modality: fitt.value!.modality,
      modalityCategory: fitt.value!.modalityCategory,
      programType: fitt.value!.programType,
      goal: 'endurance',
      progression: {
        phase: 'initial',
        intensityPercent: 50,
      },
    });

    expect(config).toMatchObject({
      cardio_source: 'k11',
      target_heart_rate_min: 126,
      target_heart_rate_max: 153,
      target_heart_rate: 140,
      target_heart_rate_basis: '% MHR',
      cardio_method: 'mhr',
      cardio_intensity: 'high',
      cardio_frequency_per_week: 4,
      cardio_main_work_minutes: 30,
      cardio_modality: 'Running',
      cardio_modality_category: 'weight-bearing-high-impact',
      cardio_program_type: 'fartlek',
      cardio_goal: 'endurance',
      cardio_progression_phase: 'initial',
      cardio_progression_intensity_percent: 50,
    });
  });

  test('saved draft round-trips and a corrupted draft is discarded', () => {
    const fitt = buildFittPrescription({
      maxHeartRate: 180,
      restingHeartRate: 60,
      method: 'karvonen',
      intensity: 'moderate',
      frequencyPerWeek: 3,
      mainWorkMinutes: 30,
      modality: 'Cycling',
      programType: 'continuous-liss',
    });
    const draft: CardioPlanDraft = {
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      config: toCardioPlanConfig({
        method: 'karvonen',
        intensity: 'moderate',
        targetHeartRate: fitt.value!.targetHeartRate,
        frequencyPerWeek: 3,
        mainWorkMinutes: 30,
        modality: 'Cycling',
        modalityCategory: fitt.value!.modalityCategory,
        programType: 'continuous-liss',
        progression: null,
      }),
      summary: {
        intensityLabel: 'Moderate',
        minBpm: 132,
        maxBpm: 144,
        programTypeLabel: 'Continuous / LISS',
        mainWorkMinutes: 30,
        frequencyPerWeek: 3,
      },
    };

    expect(writeCardioPlanDraft(draft)).toBe(true);
    expect(readCardioPlanDraft()).toEqual(draft);

    window.localStorage.setItem(CARDIO_PLAN_DRAFT_KEY, '{not json');
    expect(readCardioPlanDraft()).toBeNull();
    window.localStorage.setItem(CARDIO_PLAN_DRAFT_KEY, JSON.stringify({ version: 99 }));
    expect(readCardioPlanDraft()).toBeNull();

    clearCardioPlanDraft();
    expect(readCardioPlanDraft()).toBeNull();
  });
});

describe('session builder validation', () => {
  test('rejects a decimal phase duration, a negative duration and an invalid fraction', () => {
    expect(buildCardioSession({
      maxHeartRate: 180,
      restingHeartRate: 60,
      phases: [{ name: 'Work', durationMinutes: 20.5 }],
    })).toBeNull();
    expect(buildCardioSession({
      maxHeartRate: 180,
      restingHeartRate: 60,
      phases: [{ name: 'Work', durationMinutes: -1 }],
    })).toBeNull();
    expect(buildCardioSession({
      maxHeartRate: 180,
      restingHeartRate: 60,
      phases: [{ name: 'Work', durationMinutes: 20, intensityFraction: 1.2 }],
    })).toBeNull();
  });

  test('formats whole percentages only', () => {
    expect(formatIntensityPercent(0.7)).toBe('70%');
    expect(formatIntensityPercent(0.85)).toBe('85%');
  });
});
