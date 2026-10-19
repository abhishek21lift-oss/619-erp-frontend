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
