// PDF score/classification display (F1, F8). The report must never imply a
// classification that does not exist: battery means, continuous Body
// Composition and Health Score values print as bare numbers.
import { describe, it, expect } from 'vitest';
import { generateAssessmentReportHTML } from '@/lib/assessment-pdf';

const base = {
  assessment_number: 3,
  assessment_date: '2026-10-01',
  assessment_type: 'initial',
  health_risk_score: 55,
  cardio_score_computed: 20,
  strength_score_computed: 80,
  endurance_score_computed: 60,
  mobility_score_computed: 87,
  body_composition_score: 84,
  overall_fitness_score: 35,
};

describe('assessment report — score presentation', () => {
  it('labels the higher-is-better score "Health Score" and never "Health Risk"', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).toContain('<label>Health Score</label>');
    expect(html).not.toContain('Health Risk');
  });

  it('a missing health score prints as an em dash, not a risk label or zero', () => {
    const html = generateAssessmentReportHTML({ ...base, health_risk_score: null }, 'Test Client');
    expect(html).toContain('<label>Health Score</label><p>—</p>');
  });

  it('a bucket score (20) keeps its band label', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).toContain('20 (Poor)');
  });

  it('a battery mean (87) prints as a bare number, no misleading band', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).toContain('87');
    expect(html).not.toContain('87 (');
  });

  it('a continuous body-composition score (84) prints as a bare number', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).toContain('84');
    expect(html).not.toContain('84 (');
  });

  it('a health score (55) prints as a bare number, not "55 (—)"', () => {
    const html = generateAssessmentReportHTML(base, 'Test Client');
    expect(html).toContain('<label>Health Score</label><p>55</p>');
    expect(html).not.toContain('55 (');
  });

  it('a zero score is a valid scored value, not a missing one', () => {
    const html = generateAssessmentReportHTML({ ...base, body_composition_score: 0 }, 'Test Client');
    expect(html).toContain('0');
    expect(html).not.toContain('<label>Body Composition</label><p>—</p>');
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

// Resting vitals on the report (MPTS vitals norms). Every classification is a
// stored value; the safety line is the exercise decision, and the note is the
// reminder that one reading is not a diagnosis.
describe('assessment report — resting vitals', () => {
  const vitals = {
    bp_systolic: 135, bp_diastolic: 85, bp_category: 'Hypertension Stage 1',
    resting_heart_rate: 72, rhr_category: 'Normal',
    resting_spo2: 92, spo2_category: 'Mildly Low',
    vitals_safety: 'caution',
  };

  it('prints each reading with its category and the safety state', () => {
    const html = generateAssessmentReportHTML({ ...base, ...vitals }, 'Test Client');
    expect(html).toContain('<label>Blood Pressure Classification</label><p>Hypertension Stage 1</p>');
    expect(html).toContain('<label>Heart Rate Classification</label><p>Normal</p>');
    expect(html).toContain('<label>SpO₂ Classification</label><p>Mildly Low</p>');
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
