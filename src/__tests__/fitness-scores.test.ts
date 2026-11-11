// Extraction test — the assessment row → FitnessScores mapping and the
// score → radar mapping used to live inline in the assessment page and the
// Fitness Dashboard. The cockpit's Progress Radar card reads the same
// stored row through these helpers, so the label order and the null
// behaviour are pinned here once, in both consumers' name.
import { describe, it, expect } from 'vitest';
import {
  scoresFromAssessmentRow,
  STEP_MAX, scoreBpPoints, scoreAnthropometricPoints, scoreBodyCompositionPoints,
  scoreCardioPoints, scoreStrengthBattery, scoreEnduranceBatteryPoints,
  scoreFlexibilityPoints, tierForScore, computeTotalScore,
  type FitnessCategory, type StrengthClassification, type StrengthPercentile,
} from '@/lib/fitness-calculations';
import { radarDataFromScores } from '@/components/pt-os/fitness-testing/FitnessDashboard';

describe('scoresFromAssessmentRow', () => {
  it('coerces the numeric strings pg returns from the API row', () => {
    const s = scoresFromAssessmentRow({
      bp_points: '7',
      anthropometric_points: '6.7',
      body_composition_score: '11',
      cardio_score_computed: '16',
      strength_score_computed: '7.5',
      endurance_score_computed: '9',
      mobility_score_computed: '12',
      overall_fitness_score: '72',
      overall_points: '69.2',
      overall_max: '92.5',
    });
    expect(s).toEqual({
      bpPoints: 7,
      anthropometricPoints: 6.7,
      bodyCompositionScore: 11,
      cardioScore: 16,
      strengthScore: 7.5,
      enduranceScore: 9,
      mobilityScore: 12,
      overallScore: 72,
      overallPoints: 69.2,
      overallMax: 92.5,
    });
  });

  it('reads a missing or non-numeric metric as null, never as 0', () => {
    const s = scoresFromAssessmentRow({
      bp_points: null,
      anthropometric_points: '',
      strength_score_computed: 'abc',
      mobility_score_computed: undefined,
    });
    expect(s.bpPoints).toBeNull();
    expect(s.anthropometricPoints).toBeNull();
    expect(s.strengthScore).toBeNull();
    expect(s.mobilityScore).toBeNull();
    expect(s.overallScore).toBeNull();
    expect(s.overallPoints).toBeNull();
    expect(s.overallMax).toBeNull();
  });
});

describe('radarDataFromScores', () => {
  it('plots the seven steps in framework order as points over the fixed max', () => {
    const data = radarDataFromScores({
      bpPoints: 7,
      anthropometricPoints: 6,
      bodyCompositionScore: 7.5,
      cardioScore: 10,
      strengthScore: null,
      enduranceScore: 15,
      mobilityScore: 12,
      overallScore: 66,
      overallPoints: 57.5,
      overallMax: 85,
    });
    expect(data.map((d) => d.category)).toEqual([
      'Blood Pressure', 'Anthropometrics', 'Body Comp.', 'Cardio',
      'Strength', 'Endurance', 'Flexibility',
    ]);
    expect(data.map((d) => d.score)).toEqual([70, 60, 50, 50, null, 100, 80]);
  });
});

// The frontend mirror is used client-side for the live review only; the
// backend recomputes and stores the authoritative values. These assertions
// duplicate the backend's tables so a drift on either side fails a suite.
describe('100-point framework mirror', () => {
  it('BP points follow the framework', () => {
    expect(scoreBpPoints('Normal')).toEqual({ points: 10, max: 10 });
    expect(scoreBpPoints('Elevated')).toEqual({ points: 7, max: 10 });
    expect(scoreBpPoints('Hypertension Stage 1')).toEqual({ points: 4, max: 10 });
    expect(scoreBpPoints('Hypertension Stage 2')).toEqual({ points: 0, max: 10 });
    expect(scoreBpPoints('Hypotension')).toEqual({ points: 7, max: 10 });
    expect(scoreBpPoints(null)).toEqual({ points: null, max: 0 });
  });

  it('anthropometry counts parameters out of range', () => {
    const all = { bmi: 22, waistIliacCm: 85, waistCm: 80, waistHipRatio: 0.9 };
    expect(scoreAnthropometricPoints(all, 'Male')).toEqual({ points: 10, max: 10 });
    expect(scoreAnthropometricPoints({ ...all, bmi: 27.1 }, 'Male')).toEqual({ points: 7, max: 10 });
    expect(scoreAnthropometricPoints({ bmi: 22 }, null)).toEqual({ points: 3.3, max: 3.3 });
    expect(scoreAnthropometricPoints({}, 'Male')).toEqual({ points: null, max: 0 });
  });

  it('body composition points follow the stored category', () => {
    // Exactly 15% male / 20% female is Acceptable / Average, so the points
    // match the label the tile shows beside them.
    expect(scoreBodyCompositionPoints(15, 'Male')).toEqual({ points: 11, max: 15 });
    expect(scoreBodyCompositionPoints(14, 'Male')).toEqual({ points: 15, max: 15 });
    expect(scoreBodyCompositionPoints(20, 'Female')).toEqual({ points: 11, max: 15 });
    expect(scoreBodyCompositionPoints(null, 'Male')).toEqual({ points: null, max: 0 });
  });

  it('cardio maps every K11 category into the six framework buckets', () => {
    expect(scoreCardioPoints('Superior')).toEqual({ points: 20, max: 20 });
    expect(scoreCardioPoints('Above Average')).toEqual({ points: 13, max: 20 });
    expect(scoreCardioPoints('Average')).toEqual({ points: 10, max: 20 });
    expect(scoreCardioPoints('Below Average')).toEqual({ points: 6, max: 20 });
    expect(scoreCardioPoints('Below Supported Range')).toEqual({ points: 2, max: 20 });
    expect(scoreCardioPoints(null)).toEqual({ points: null, max: 0 });
  });

  it('strength battery gives 7.5 per classified test', () => {
    const d = (percentile: StrengthPercentile | null, category: FitnessCategory = 'Average'): StrengthClassification => ({
      percentile, category, ratio: 1, ageBand: '30-39',
    });
    expect(scoreStrengthBattery(d(90), d(90))).toEqual({ points: 15, max: 15 });
    expect(scoreStrengthBattery(d(70), d(90))).toEqual({ points: 13.5, max: 15 });
    expect(scoreStrengthBattery(d(10), null)).toEqual({ points: 1.5, max: 7.5 });
    expect(scoreStrengthBattery({ percentile: null, category: 'Below Supported Range', ratio: 0.5, ageBand: '30-39' }, null))
      .toEqual({ points: 1.5, max: 7.5 });
    expect(scoreStrengthBattery(null, null)).toEqual({ points: null, max: 0 });
  });

  it('endurance battery maps category buckets', () => {
    expect(scoreEnduranceBatteryPoints('Excellent', 'Good')).toEqual({ points: 12, max: 15 });
    expect(scoreEnduranceBatteryPoints('Poor', null)).toEqual({ points: 1.5, max: 7.5 });
    expect(scoreEnduranceBatteryPoints(null, null)).toEqual({ points: null, max: 0 });
  });

  it('flexibility scores recorded ROM tests and the sit-and-reach norm', () => {
    const derived = {
      tests: {
        quadriceps: { overall_interpretation: 'Normal' },
        hamstrings: {
          sides_interpretation: { left: 'Within reference range', right: 'Above reference range' },
          sides_validity: { left: 'valid', right: 'valid' },
        },
        sit_and_reach: { norm: { category: 'Good' } },
      },
    };
    expect(scoreFlexibilityPoints(derived)).toEqual({ points: 9, max: 11 });
    expect(scoreFlexibilityPoints(null, 80)).toEqual({ points: 12, max: 15 });
    expect(scoreFlexibilityPoints(null, null)).toEqual({ points: null, max: 0 });
  });

  it('tier boundaries are inclusive at the bottom', () => {
    expect(tierForScore(85)).toBe('Optimal');
    expect(tierForScore(84)).toBe('Fit');
    expect(tierForScore(70)).toBe('Fit');
    expect(tierForScore(69)).toBe('Moderate');
    expect(tierForScore(50)).toBe('Moderate');
    expect(tierForScore(49)).toBe('Needs Attention');
    expect(tierForScore(null)).toBeNull();
  });

  it('total scales by measured max and withholds a tier while partial', () => {
    const full = {
      bp: { points: 10, max: STEP_MAX.bp },
      anthropometric: { points: 10, max: STEP_MAX.anthropometric },
      bodyComposition: { points: 15, max: STEP_MAX.bodyComposition },
      cardio: { points: 20, max: STEP_MAX.cardio },
      strength: { points: 15, max: STEP_MAX.strength },
      endurance: { points: 15, max: STEP_MAX.endurance },
      flexibility: { points: 15, max: STEP_MAX.flexibility },
    };
    expect(computeTotalScore(full)).toEqual({ points: 100, max: 100, score: 100, tier: 'Optimal' });
    const partial = { bp: { points: 4, max: 10 }, anthropometric: { points: 2, max: 10 }, cardio: { points: 10, max: 20 } };
    expect(computeTotalScore(partial)).toEqual({ points: 16, max: 40, score: 40, tier: null });
    expect(computeTotalScore({ bp: { points: null, max: 0 } })).toEqual({ points: 0, max: 0, score: null, tier: null });
  });
});
