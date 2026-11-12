// PDF score display. The framework reports seven steps as points out of
// their fixed maximum, plus one bare 0-100 total. Points never borrow a
// category word: 20/20 is a perfect cardio step, not "Poor".
import { describe, it, expect } from 'vitest';
import { generateAssessmentReportHTML } from '@/lib/assessment-pdf';

const base = {
  assessment_number: 3,
  assessment_date: '2026-10-01',
  assessment_type: 'initial',
  scoring_formula_version: 2,
  bp_points: 8,
  anthropometric_points: 6.7,
  body_composition_score: 11,
  cardio_score_computed: 20,
  strength_score_computed: 12,
  endurance_score_computed: 9,
  mobility_score_computed: 10,
  overall_points: 76.7,
  overall_max: 100,
  overall_fitness_score: 72,
};

describe('assessment report — score presentation', () => {
  it('lists the seven steps as points out of their fixed maximum', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).toContain('<label>Blood Pressure</label><p>8 / 10</p>');
    expect(html).toContain('<label>Anthropometrics</label><p>6.7 / 10</p>');
    expect(html).toContain('<label>Body Composition</label><p>11 / 15</p>');
    expect(html).toContain('<label>Cardio</label><p>20 / 20</p>');
    expect(html).toContain('<label>Strength</label><p>12 / 15</p>');
    expect(html).toContain('<label>Endurance</label><p>9 / 15</p>');
    expect(html).toContain('<label>Flexibility</label><p>10 / 15</p>');
    // The per-step sections carry the same denominator.
    expect(html).toContain('<label>Combined Strength Score</label><p>12 / 15</p>');
    expect(html).toContain('<label>Combined Endurance Score</label><p>9 / 15</p>');
    expect(html).toContain('<label>Combined Flexibility Score</label><p>10 / 15</p>');
  });

  it('drops the retired Health Score row', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).not.toContain('Health Score');
    expect(html).not.toContain('Health Risk');
  });

  it('never attaches a category to a points value', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).toContain('20 / 20');
    expect(html).not.toContain('20 (Poor)');
    expect(html).not.toContain('20 (Excellent)');
  });

  it('prints the overall score bare, without a denominator or a band', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).toContain('<label>Overall Fitness Score</label><div class="big">72</div>');
    expect(html).not.toContain('72 /');
    expect(html).not.toContain('72 (');
  });

  it('withholds 100-point scores from a v1 row instead of inventing fractions', () => {
    const html = generateAssessmentReportHTML(
      { ...base, scoring_formula_version: 1, overall_points: null, overall_max: null },
      'Test Client',
    );
    expect(html).not.toContain('12 / 15');
    expect(html).not.toContain('20 / 20');
    expect(html).toContain('<label>Strength</label><p>—</p>');
    expect(html).toContain('Scored on the previous formula');
    expect(html).not.toContain('<div class="big">72</div>');
  });

  it('a missing step prints as an em dash, not zero and not a denominator', () => {
    const html = generateAssessmentReportHTML({ ...base, cardio_score_computed: null }, 'Test Client');
    expect(html).toContain('<label>Cardio</label><p>—</p>');
  });

  it('a zero point score is a valid scored value, not a missing one', () => {
    const html = generateAssessmentReportHTML({ ...base, body_composition_score: 0 }, 'Test Client');
    expect(html).toContain('<label>Body Composition</label><p>0 / 15</p>');
  });

  it('prints a stored K11 classification verbatim', () => {
    const html = generateAssessmentReportHTML(
      { ...base, cardio_test_type: 'YMCA 3-Minute Step Test', cardio_category: 'Very Poor', cardio_score_computed: 10 },
      'Test Client',
    );
    expect(html).toContain('<label>Classification</label><p>Very Poor</p>');
  });

  it('a partial assessment still renders the dashboard with missing values as dashes', () => {
    const html = generateAssessmentReportHTML(
      { ...base, strength_score_computed: null, endurance_score_computed: null },
      'Test Client',
    );
    expect(html).toContain('—');
    expect(html).toContain('Overall Fitness Score');
  });
});

describe('assessment report — anthropometric norms', () => {
  const anthro = {
    bmi: 24.2, bmi_category: 'Overweight',
    waist_cm: 92, waist_iliac_cm: 74,
    waist_risk: 'Low risk',
    hips_cm: 94, waist_hip_ratio: 0.98, whr_risk: 'Above low-risk threshold',
    body_fat_pct: 22, body_fat_category: 'Above Ideal Range',
  };

  it('prints each stored classification beside its measurement', () => {
    const html = generateAssessmentReportHTML({ ...base, ...anthro }, 'Test Client');
    expect(html).toContain('<label>BMI Classification</label><p>Overweight</p>');
    expect(html).toContain('<label>Waist Narrowest</label><p>92 cm</p>');
    // Waist risk reads the iliac landmark; WHR reads the narrowest waist.
    expect(html).toContain('<label>Waist Iliac Risk</label><p>Low risk</p>');
    expect(html).toContain('<label>Waist-Hip Ratio Risk</label><p>Above low-risk threshold</p>');
    expect(html).toContain('<label>Waist Iliac</label><p>74 cm</p>');
    expect(html).toContain('<label>Body Fat Classification</label><p>Above Ideal Range</p>');
  });

  it('does not invent a classification for a row saved before the columns existed', () => {
    const html = generateAssessmentReportHTML({
      ...base, bmi: 24.2, waist_cm: 92, waist_iliac_cm: 74, hips_cm: 94,
      waist_hip_ratio: 0.98, body_fat_pct: 22,
    }, 'Test Client');
    expect(html).toContain('<label>BMI Classification</label><p>—</p>');
    expect(html).toContain('<label>Waist Iliac Risk</label><p>—</p>');
    expect(html).toContain('<label>Waist-Hip Ratio Risk</label><p>—</p>');
    expect(html).toContain('<label>Body Fat Classification</label><p>—</p>');
  });

  it('states the norm basis and that only the low-risk cut-off is defined', () => {
    const html = generateAssessmentReportHTML({ ...base, ...anthro }, 'Test Client');
    expect(html).toContain('adult Asian bands');
    expect(html).toContain('only the low-risk cut-off is defined');
  });
});

// K11 strength: the stored category plus the percentile computed at save
// time. Legacy rows have no percentile and print the category alone.
describe('assessment report — K11 strength percentiles', () => {
  const withStrength = (category: string | null, percentile: number | null, extra: Record<string, unknown> = {}) => ({
    ...base,
    strength_exercise: 'Bench Press',
    strength_category: category,
    strength_test_data: JSON.stringify({ test1: { k11_percentile: percentile }, test2: {} }),
    ...extra,
  });

  it('prints the stored percentile beside its category', () => {
    const html = generateAssessmentReportHTML(withStrength('Above Average', 80), 'Test Client');
    expect(html).toContain('<label>Test 1 Classification</label><p>Above Average (80th percentile)</p>');
  });

  it('keeps both tests and their own percentiles separate', () => {
    const html = generateAssessmentReportHTML({
      ...withStrength('Above Average', 70),
      strength_exercise_2: 'Leg Press',
      strength_category_2: 'Below Average',
      strength_test_data: JSON.stringify({ test1: { k11_percentile: 70 }, test2: { k11_percentile: 30 } }),
    }, 'Test Client');
    expect(html).toContain('<p>Above Average (70th percentile)</p>');
    expect(html).toContain('<p>Below Average (30th percentile)</p>');
  });

  it('a legacy row prints the category alone, never an inferred percentile', () => {
    const html = generateAssessmentReportHTML({ ...base, strength_category: 'Average' }, 'Test Client');
    expect(html).toContain('<label>Test 1 Classification</label><p>Average</p>');
    expect(html).not.toContain('th percentile');
  });

  it('a ratio below every supplied row prints the explicit label with no percentile', () => {
    const html = generateAssessmentReportHTML(withStrength('Below Supported Range', null), 'Test Client');
    expect(html).toContain('<p>Below Supported Range</p>');
    expect(html).not.toContain('Below Supported Range (');
  });

  it('states the K11 basis and the two supplied lifts', () => {
    const html = generateAssessmentReportHTML(withStrength('Average', 50), 'Test Client');
    expect(html).toContain('K11 relative strength (1RM ÷ body weight)');
    expect(html).toContain('Bench Press and Leg Press only');
  });
});

// Resting vitals on the report (MPTS vitals norms). Every classification is a
// stored value; the safety line is the exercise decision, and the note is the
// reminder that one reading is not a diagnosis.
describe('assessment report — resting vitals', () => {
  const vitals = {
    bp_systolic: 135, bp_diastolic: 85, bp_category: 'Hypertension Stage 1',
    resting_heart_rate: 72, rhr_category: 'Normal',
    resting_spo2: 92, spo2_category: 'Mild Hypoxia',
    vitals_safety: 'caution',
  };

  it('prints each reading with its category and the safety state', () => {
    const html = generateAssessmentReportHTML({ ...base, ...vitals }, 'Test Client');
    expect(html).toContain('<label>Blood Pressure Classification</label><p>Hypertension Stage 1</p>');
    expect(html).toContain('<label>Heart Rate Classification</label><p>Normal</p>');
    expect(html).toContain('<label>SpO₂ Classification</label><p>Mild Hypoxia</p>');
    expect(html).toContain('<label>Resting Heart Rate</label><p>72 bpm</p>');
    expect(html).toContain('<label>Exercise Safety</label><p>Caution — recheck before exertion testing</p>');
  });

  it('prints stop as medical clearance required', () => {
    const html = generateAssessmentReportHTML({ ...base, ...vitals, vitals_safety: 'stop' }, 'Test Client');
    expect(html).toContain('Stop — medical clearance required before exertion testing');
  });

  it('an unknown or absent safety state prints as a dash, never as safe', () => {
    const html = generateAssessmentReportHTML({ ...base, ...vitals, vitals_safety: null }, 'Test Client');
    expect(html).toContain('<label>Exercise Safety</label><p>—</p>');
    expect(html).not.toContain('No exercise-safety stop recorded');
  });

  it('always carries the repeat-and-not-a-diagnosis note', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).toContain('A single resting reading is not a diagnosis.');
    expect(html).toContain('5–10 minutes');
  });
});
