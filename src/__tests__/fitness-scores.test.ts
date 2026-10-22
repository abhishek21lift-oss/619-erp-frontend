// Extraction test — the assessment row → FitnessScores mapping and the
// score → radar mapping used to live inline in the assessment page and the
// Fitness Dashboard. The cockpit's Progress Radar card reads the same
// stored row through these helpers, so the label order and the null
// behaviour are pinned here once, in both consumers' name.
import { describe, it, expect } from 'vitest';
import { scoresFromAssessmentRow, classifyBmi, scoreHealthRisk } from '@/lib/fitness-calculations';
import { radarDataFromScores } from '@/components/pt-os/fitness-testing/FitnessDashboard';

describe('scoresFromAssessmentRow', () => {
  it('coerces the numeric strings pg returns from the API row', () => {
    const s = scoresFromAssessmentRow({
      cardio_score_computed: '72.5',
      strength_score_computed: 64,
      endurance_score_computed: '55',
      mobility_score_computed: '61',
      body_composition_score: '58',
      health_risk_score: '80',
      overall_fitness_score: '65',
    });
    expect(s).toEqual({
      cardioScore: 72.5,
      strengthScore: 64,
      enduranceScore: 55,
      mobilityScore: 61,
      bodyCompositionScore: 58,
      healthRiskScore: 80,
      overallScore: 65,
    });
  });

  it('reads a missing or non-numeric metric as null, never as 0', () => {
    const s = scoresFromAssessmentRow({
      cardio_score_computed: null,
      strength_score_computed: '',
      endurance_score_computed: 'abc',
      mobility_score_computed: undefined,
    });
    expect(s.cardioScore).toBeNull();
    expect(s.strengthScore).toBeNull();
    expect(s.enduranceScore).toBeNull();
    expect(s.mobilityScore).toBeNull();
    expect(s.overallScore).toBeNull();
  });
});

// The anthropometric block uses the adult Asian BMI bands, but the stored
// Health Score deliberately keeps its older project bands (18.5–<25 healthy).
// The divergence is intentional and stays visible; it is pinned here so a
// future "cleanup" cannot silently move Health Score bands.
describe('Health Score vs anthropometric BMI category', () => {
  it.each([
    [18.4, 'Underweight', 80],
    [23.0, 'Overweight', 100],
    [24.9, 'Overweight', 100],
    [25.0, 'Obese', 80],
  ] as const)('BMI %p is %s while Health Score remains %p', (bmi, category, healthScore) => {
    expect(classifyBmi(bmi)).toBe(category);
    expect(scoreHealthRisk('Normal', bmi)).toBe(healthScore);
  });
});

describe('radarDataFromScores', () => {
  it('maps the six categories in the dashboard order and passes nulls through as gaps', () => {
    const data = radarDataFromScores({
      cardioScore: 70,
      strengthScore: null,
      enduranceScore: 50,
      mobilityScore: null,
      bodyCompositionScore: 60,
      healthRiskScore: 90,
      overallScore: 66,
    });
    expect(data.map((d) => d.category)).toEqual([
      'Cardio', 'Strength', 'Endurance', 'Flexibility', 'Body Comp.', 'Health Score',
    ]);
    expect(data.map((d) => d.score)).toEqual([70, null, 50, null, 60, 90]);
  });
});
