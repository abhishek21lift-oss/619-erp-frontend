// Anthropometric norms (MPTS): adult Asian BMI bands, and the sex-specific
// low-risk waist circumference and waist-to-hip-ratio thresholds. The supplied
// norms only define the low-risk side of the last two, so an above-threshold
// reading must never be given an invented moderate/high category.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  classifyBmi, classifyWaistRisk, classifyWhrRisk,
} from '@/lib/fitness-calculations';
import StepAnthropometric from '@/components/pt-os/fitness-testing/StepAnthropometric';
import { FitnessDashboard, type FitnessScores } from '@/components/pt-os/fitness-testing/FitnessDashboard';
import { initAssessmentForm } from '@/components/pt-os/fitness-testing/types';

vi.mock('@/components/pt-os/FitnessRadarChart', () => ({ default: () => <div data-testid="radar-mock" /> }));

describe('classifyBmi — adult Asian bands', () => {
  it.each([
    [18.4, 'Underweight'],
    [18.5, 'Normal'],
    [22.9, 'Normal'],
    [23.0, 'Overweight'],
    [24.9, 'Overweight'],
    [25.0, 'Obese'],
    [40, 'Obese'],
  ])('%s → %s', (bmi, expected) => {
    expect(classifyBmi(bmi)).toBe(expected);
  });

  it('missing, non-finite and non-positive values are not a category', () => {
    expect(classifyBmi(null)).toBeNull();
    expect(classifyBmi(Number.NaN)).toBeNull();
    expect(classifyBmi(Number.POSITIVE_INFINITY)).toBeNull();
    expect(classifyBmi(0)).toBeNull();
    expect(classifyBmi(-1)).toBeNull();
  });
});

describe('classifyWaistRisk — male <90 cm, female <80 cm', () => {
  it.each([
    [89.9, 'Male', 'Low risk'],
    [90, 'Male', 'Above low-risk threshold'],
    [95, 'Male', 'Above low-risk threshold'],
    [79.9, 'Female', 'Low risk'],
    [80, 'Female', 'Above low-risk threshold'],
    [95, 'Female', 'Above low-risk threshold'],
    [89.9, 'male', 'Low risk'],
  ])('%s cm, %s → %s', (waist, gender, expected) => {
    expect(classifyWaistRisk(waist, gender)).toBe(expected);
  });

  it('never invents a category without a supported sex', () => {
    expect(classifyWaistRisk(85, null)).toBeNull();
    expect(classifyWaistRisk(85, 'Other')).toBeNull();
    expect(classifyWaistRisk(null, 'Male')).toBeNull();
    expect(classifyWaistRisk(Number.NaN, 'Male')).toBeNull();
    expect(classifyWaistRisk(0, 'Male')).toBeNull();
  });
});

describe('classifyWhrRisk — male <0.95, female <0.86', () => {
  it.each([
    [0.94, 'Male', 'Low risk'],
    [0.95, 'Male', 'Above low-risk threshold'],
    [1.05, 'Male', 'Above low-risk threshold'],
    [0.85, 'Female', 'Low risk'],
    [0.86, 'Female', 'Above low-risk threshold'],
    [0.95, 'Female', 'Above low-risk threshold'],
    [0.94, 'male', 'Low risk'],
  ])('%s, %s → %s', (whr, gender, expected) => {
    expect(classifyWhrRisk(whr, gender)).toBe(expected);
  });

  it('never invents a category without a supported sex', () => {
    expect(classifyWhrRisk(0.9, null)).toBeNull();
    expect(classifyWhrRisk(0.9, 'Other')).toBeNull();
    expect(classifyWhrRisk(null, 'Male')).toBeNull();
    expect(classifyWhrRisk(Number.NaN, 'Male')).toBeNull();
    expect(classifyWhrRisk(0, 'Male')).toBeNull();
  });
});

function formWith(overrides: Record<string, string>) {
  return { ...initAssessmentForm(), weight: '70', heightCm: '175', ...overrides };
}

describe('StepAnthropometric — labels the measurements it actually uses', () => {
  it('classifies waist from waist_cm and WHR from waist_cm ÷ hips', () => {
    render(
      <StepAnthropometric
        form={formWith({ waistCm: '89.9', waistIliacCm: '120', hipsCm: '100' })}
        set={() => {}}
        gender="Male"
      />,
    );
    // BMI 22.9 → Normal; both risk labels are the low-risk side.
    expect(screen.getByText('Normal')).toBeTruthy();
    expect(screen.getAllByText('Low risk')).toHaveLength(2);
    expect(screen.getByText('0.9')).toBeTruthy();
  });

  it('does not substitute the iliac measurement when waist_cm is missing', () => {
    render(
      <StepAnthropometric
        form={formWith({ waistCm: '', waistIliacCm: '120', hipsCm: '100' })}
        set={() => {}}
        gender="Male"
      />,
    );
    expect(screen.queryByText('Above low-risk threshold')).toBeNull();
    expect(screen.queryByText('Low risk')).toBeNull();
    // No WHR derived from the iliac reading.
    expect(screen.queryByText('1.2')).toBeNull();
  });

  it('shows the BMI band but no waist/WHR risk for an unsupported sex', () => {
    render(
      <StepAnthropometric
        form={formWith({ waistCm: '95', hipsCm: '100' })}
        set={() => {}}
        gender="Other"
      />,
    );
    expect(screen.getByText('Normal')).toBeTruthy();
    expect(screen.queryByText('Above low-risk threshold')).toBeNull();
    expect(screen.getByText(/Waist-circumference and waist-to-hip risk bands are sex-specific/)).toBeTruthy();
  });
});

const SCORES: FitnessScores = {
  cardioScore: 70, strengthScore: 70, enduranceScore: 70,
  mobilityScore: 70, bodyCompositionScore: 70, healthRiskScore: 70, overallScore: 70,
};

describe('FitnessDashboard — anthropometric display', () => {
  it('shows the measurements with their norm labels', () => {
    render(
      <FitnessDashboard
        scores={SCORES}
        anthropometric={{
          bmi: 24.2, bmiCategory: 'Overweight',
          waistCm: 92, waistRisk: 'Above low-risk threshold',
          waistHipRatio: 0.98, whrRisk: 'Above low-risk threshold',
        }}
      />,
    );
    expect(screen.getByText('24.2')).toBeTruthy();
    expect(screen.getByText('Overweight')).toBeTruthy();
    expect(screen.getByText('92 cm')).toBeTruthy();
    expect(screen.getByText('0.98')).toBeTruthy();
    expect(screen.getAllByText('Above low-risk threshold')).toHaveLength(2);
  });

  it('omits the block when the caller has no anthropometric data', () => {
    render(<FitnessDashboard scores={SCORES} />);
    expect(screen.queryByText('Waist Circumference')).toBeNull();
  });

  it('omits the block when every measurement is missing, rather than showing dashes', () => {
    render(
      <FitnessDashboard
        scores={SCORES}
        anthropometric={{ bmi: null, bmiCategory: null, waistCm: null, waistRisk: null, waistHipRatio: null, whrRisk: null }}
      />,
    );
    expect(screen.queryByText('Waist Circumference')).toBeNull();
  });
});
