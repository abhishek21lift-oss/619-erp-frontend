// Resting vitals: clinical classification and the separate exercise-safety
// decision. Bands are the MPTS/AHA thresholds; where two bands overlap the
// higher-risk one wins, and a single reading is described, never diagnosed.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  classifyBp,
  classifyRhr,
  classifySpo2,
  assessVitalsSafety,
  type VitalsSafetyInput,
} from '@/lib/fitness-calculations';
import { FitnessDashboard, type FitnessScores } from '@/components/pt-os/fitness-testing/FitnessDashboard';

vi.mock('@/components/pt-os/FitnessRadarChart', () => ({ default: () => <div data-testid="radar-mock" /> }));

const safe: VitalsSafetyInput = { systolic: 118, diastolic: 76, restingHeartRate: 72, restingSpo2: 98 };
const assess = (over: Partial<VitalsSafetyInput> = {}) => assessVitalsSafety({ ...safe, ...over });

describe('classifyBp — bands and overlap precedence', () => {
  it.each([
    [89, 70, 'Hypotension'],
    [118, 59, 'Hypotension'],
    [90, 60, 'Normal'],
    [110, 75, 'Normal'],
    [119, 79, 'Normal'],
    // 120 is the top of "normal" and the bottom of "elevated": the higher-risk
    // band wins, so 120/79 is Elevated and 120/80 is Stage 1.
    [120, 79, 'Elevated'],
    [129, 79, 'Elevated'],
    [120, 70, 'Elevated'],
    [130, 79, 'Hypertension Stage 1'],
    [139, 85, 'Hypertension Stage 1'],
    [120, 80, 'Hypertension Stage 1'],
    [135, 89, 'Hypertension Stage 1'],
    [140, 85, 'Hypertension Stage 2'],
    [135, 90, 'Hypertension Stage 2'],
    [179, 119, 'Hypertension Stage 2'],
    [180, 70, 'Hypertensive Crisis'],
    [170, 120, 'Hypertensive Crisis'],
    // The dangerous band outranks the low one when the numbers disagree.
    [160, 58, 'Hypertension Stage 2'],
    [185, 55, 'Hypertensive Crisis'],
    [85, 55, 'Hypotension'],
  ])('%i/%i → %s', (systolic, diastolic, expected) => {
    expect(classifyBp(systolic, diastolic)).toBe(expected);
  });

  it('names a high band from one number but never "Normal"', () => {
    expect(classifyBp(120, null)).toBe('Elevated');
    expect(classifyBp(145, null)).toBe('Hypertension Stage 2');
    expect(classifyBp(null, 95)).toBe('Hypertension Stage 2');
    expect(classifyBp(110, null)).toBeNull();
    expect(classifyBp(null, null)).toBeNull();
  });
});

describe('classifyRhr — preferred 60–80, broad adult 60–100', () => {
  it.each([
    [39, 'Low'],
    [40, 'Low'],
    [59.5, 'Low'],
    [60, 'Normal'],
    [72, 'Normal'],
    [80, 'Normal'],
    [80.5, 'High Normal'],
    [100, 'High Normal'],
    [100.5, 'High'],
  ])('%s bpm → %s', (rhr, expected) => {
    expect(classifyRhr(rhr)).toBe(expected);
  });

  it('describes an athlete-range low reading instead of flagging it as disease', () => {
    // 40–50 is common in trained athletes; the classifier still says Low.
    expect(classifyRhr(45)).toBe('Low');
    expect(assess({ restingHeartRate: 45, athlete: true })).toMatchObject({
      level: 'safe', athleteLowRhr: true, reasons: [],
    });
    expect(assess({ restingHeartRate: 45, athlete: false }).level).toBe('caution');
  });

  it('is null for missing or non-finite input', () => {
    expect(classifyRhr(null)).toBeNull();
    expect(classifyRhr(Number.NaN)).toBeNull();
  });
});

describe('classifySpo2 — 95–100 normal, 90–94 mildly low, <90 critical', () => {
  it.each([
    [89.5, 'Critical'],
    [90, 'Mildly Low'],
    [92, 'Mildly Low'],
    [94.5, 'Mildly Low'],
    [95, 'Normal'],
    [100, 'Normal'],
  ])('%s%% → %s', (spo2, expected) => {
    expect(classifySpo2(spo2)).toBe(expected);
  });

  it('is null for missing or non-finite input', () => {
    expect(classifySpo2(null)).toBeNull();
    expect(classifySpo2(Number.NaN)).toBeNull();
  });
});

describe('assessVitalsSafety — the exercise decision, separate from labels', () => {
  it('all normal readings are safe, with no clearance or repeat', () => {
    expect(assess()).toEqual({
      level: 'safe', reasons: [], requiresMedicalClearance: false, repeatBp: false, athleteLowRhr: false,
    });
  });

  it('stops on crisis, stage 2 and hypotension', () => {
    for (const [systolic, diastolic] of [[185, 70], [160, 100], [85, 55], [135, 55]]) {
      const result = assess({ systolic, diastolic });
      expect(result.level).toBe('stop');
      expect(result.requiresMedicalClearance).toBe(true);
    }
    expect(assess({ systolic: 185, diastolic: 70 }).reasons[0]).toMatch(/crisis/i);
    expect(assess({ systolic: 160, diastolic: 100 }).reasons[0]).toMatch(/medical clearance/i);
  });

  it('cautions and asks for a repeat on stage 1 and elevated bands', () => {
    expect(assess({ systolic: 135, diastolic: 85 })).toMatchObject({ level: 'caution', repeatBp: true });
    expect(assess({ systolic: 125, diastolic: 78 })).toMatchObject({ level: 'caution', repeatBp: true });
    expect(assess({ systolic: 125, diastolic: 78 }).reasons[0]).toMatch(/5–10 minutes/i);
    // Classification alone does not stop a stage-1 reading.
    expect(classifyBp(135, 85)).toBe('Hypertension Stage 1');
    expect(assess({ systolic: 135, diastolic: 85 }).requiresMedicalClearance).toBe(false);
  });

  it('stops on RHR >100 and <40, cautions on 81–100 and 40–59 without athlete context', () => {
    expect(assess({ restingHeartRate: 105 }).level).toBe('stop');
    expect(assess({ restingHeartRate: 39 }).level).toBe('stop');
    expect(assess({ restingHeartRate: 85 }).level).toBe('caution');
    expect(assess({ restingHeartRate: 50 }).level).toBe('caution');
    expect(assess({ restingHeartRate: 38, athlete: true }).level).toBe('stop');
    expect(assess({ restingHeartRate: 50, athlete: true }).level).toBe('safe');
  });

  it('stops on SpO₂ <90 and cautions on 90–94', () => {
    expect(assess({ restingSpo2: 88 })).toMatchObject({ level: 'stop', requiresMedicalClearance: true });
    expect(assess({ restingSpo2: 92 })).toMatchObject({ level: 'caution' });
    expect(assess({ restingSpo2: 92 }).reasons[0]).toMatch(/90–94%/);
  });

  it('keeps every reason and reports the worst level when several readings are abnormal', () => {
    const result = assess({ systolic: 135, diastolic: 85, restingHeartRate: 85, restingSpo2: 88 });
    expect(result.level).toBe('stop');
    expect(result.reasons).toHaveLength(3);
    expect(result.reasons[0]).toMatch(/stage 1/i);
    expect(result.reasons[2]).toMatch(/SpO₂/i);
  });
});

const SCORES: FitnessScores = {
  cardioScore: 70, strengthScore: 70, enduranceScore: 70,
  mobilityScore: 70, bodyCompositionScore: 70, healthRiskScore: 70, overallScore: 70,
};

describe('FitnessDashboard — vitals display', () => {
  it('shows BP, RHR and SpO₂ with their clinical categories', () => {
    render(
      <FitnessDashboard
        scores={SCORES}
        vitals={{
          bpSystolic: 135, bpDiastolic: 85, bpCategory: 'Hypertension Stage 1',
          restingHeartRate: 72, rhrCategory: 'Normal',
          restingSpo2: 92, spo2Category: 'Mildly Low',
        }}
      />,
    );
    expect(screen.getByText('135/85 mmHg')).toBeTruthy();
    expect(screen.getByText('Hypertension Stage 1')).toBeTruthy();
    expect(screen.getByText('72 bpm')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('Mildly Low')).toBeTruthy();
  });

  it('omits the vitals block when the caller has none', () => {
    render(<FitnessDashboard scores={SCORES} />);
    expect(screen.queryByText('Resting Heart Rate')).toBeNull();
  });
});
