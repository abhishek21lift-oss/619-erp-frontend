// Resting vitals: clinical classification and the separate exercise-safety
// decision. Blood pressure uses the studio's supplied dual-criteria table
// (systolic OR diastolic); where two rows match, the more actionable one wins,
// and a single reading is described, never diagnosed.
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

describe('classifyBp — dual systolic/diastolic bands', () => {
  it.each([
    [85, 55, 'Hypotension'],
    [89, 60, 'Hypotension'],
    [110, 55, 'Hypotension'],
    [90, 60, 'Normal'],
    [110, 75, 'Normal'],
    [118, 59, 'Hypotension'],
    [119, 79, 'Normal'],
    // 80 is printed in both "Normal 60–80" and "Stage 1 80–89"; the
    // higher-risk row wins.
    [118, 80, 'Hypertension Stage 1'],
    [118, 85, 'Hypertension Stage 1'],
    [118, 90, 'Hypertension Stage 2'],
    // Crisis diastolic is ">120" exactly as printed, so 120 is stage 2.
    [118, 120, 'Hypertension Stage 2'],
    [118, 121, 'Hypertensive Crisis'],
    // 120 is printed in both "Normal 90–120" and "Elevated 120–129".
    [120, 70, 'Elevated'],
    [120, 79, 'Elevated'],
    [120, 80, 'Hypertension Stage 1'],
    [125, 75, 'Elevated'],
    [125, 85, 'Hypertension Stage 1'],
    [129, 79, 'Elevated'],
    [130, 79, 'Hypertension Stage 1'],
    [135, 55, 'Hypotension'],
    [135, 85, 'Hypertension Stage 1'],
    [135, 89, 'Hypertension Stage 1'],
    [135, 90, 'Hypertension Stage 2'],
    [139, 85, 'Hypertension Stage 1'],
    [140, 80, 'Hypertension Stage 2'],
    [140, 85, 'Hypertension Stage 2'],
    [160, 55, 'Hypertension Stage 2'],
    [170, 120, 'Hypertension Stage 2'],
    [179, 119, 'Hypertension Stage 2'],
    [180, 70, 'Hypertensive Crisis'],
    [180, 80, 'Hypertensive Crisis'],
    [85, 95, 'Hypertension Stage 2'],
  ])('%i/%i → %s', (systolic, diastolic, expected) => {
    expect(classifyBp(systolic, diastolic)).toBe(expected);
  });

  it('names a high band from one number but never "Normal"', () => {
    expect(classifyBp(120, null)).toBe('Elevated');
    expect(classifyBp(145, null)).toBe('Hypertension Stage 2');
    expect(classifyBp(85, null)).toBe('Hypotension');
    expect(classifyBp(null, 95)).toBe('Hypertension Stage 2');
    expect(classifyBp(null, 121)).toBe('Hypertensive Crisis');
    expect(classifyBp(110, null)).toBeNull();
    expect(classifyBp(null, 70)).toBeNull();
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
    // 40–50 (or lower) is common in trained athletes; the classifier still
    // says Low, but the safety decision treats it as context.
    expect(classifyRhr(45)).toBe('Low');
    for (const bpm of [45, 38]) {
      expect(assess({ restingHeartRate: bpm, athlete: true })).toMatchObject({
        level: 'safe', athleteLowRhr: true, reasons: [],
      });
    }
    expect(assess({ restingHeartRate: 45, athlete: false }).level).toBe('caution');
  });

  it('is null for missing or non-finite input', () => {
    expect(classifyRhr(null)).toBeNull();
    expect(classifyRhr(Number.NaN)).toBeNull();
  });
});

describe('classifySpo2 — 95–100 normal, 91–94 mild, 86–90 moderate, ≤85 severe', () => {
  it.each([
    [84, 'Severe Hypoxia'],
    [85, 'Severe Hypoxia'],
    [86, 'Moderate Hypoxia'],
    [88, 'Moderate Hypoxia'],
    [90, 'Moderate Hypoxia'],
    [91, 'Mild Hypoxia'],
    [92, 'Mild Hypoxia'],
    [94.5, 'Mild Hypoxia'],
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

  it('stops on crisis and stage 2, including a diastolic-only trigger', () => {
    for (const [systolic, diastolic] of [[185, 70], [160, 100], [145, 55], [118, 95], [118, 121]]) {
      const result = assess({ systolic, diastolic });
      expect(result.level).toBe('stop');
      expect(result.requiresMedicalClearance).toBe(true);
    }
    expect(assess({ systolic: 185, diastolic: 70 }).reasons[0]).toMatch(/crisis/i);
    expect(assess({ systolic: 160, diastolic: 100 }).reasons[0]).toMatch(/clearance/i);
  });

  it('cautions on hypotension with the table\'s symptom guidance', () => {
    const result = assess({ systolic: 85, diastolic: 55 });
    expect(result.level).toBe('caution');
    expect(result.requiresMedicalClearance).toBe(false);
    expect(result.repeatBp).toBe(true);
    expect(result.reasons[0]).toMatch(/dizziness|fainting/i);
    expect(classifyBp(85, 55)).toBe('Hypotension');
  });

  it('cautions and asks for a repeat on stage 1 and elevated bands', () => {
    expect(assess({ systolic: 135, diastolic: 85 })).toMatchObject({ level: 'caution', repeatBp: true });
    expect(assess({ systolic: 125, diastolic: 78 })).toMatchObject({ level: 'caution', repeatBp: true });
    expect(assess({ systolic: 125, diastolic: 78 }).reasons[0]).toMatch(/5–10 minutes/i);
    // Classification alone does not stop a stage-1 reading.
    expect(classifyBp(135, 85)).toBe('Hypertension Stage 1');
    expect(assess({ systolic: 135, diastolic: 85 }).requiresMedicalClearance).toBe(false);
  });

  it('applies the image RHR guidance: >100 stops, <60 in a non-athlete refers, 81–100 is not a caution', () => {
    const high = assess({ restingHeartRate: 105 });
    expect(high.level).toBe('stop');
    expect(high.reasons[0]).toMatch(/physician evaluation/i);

    // 60–100 is the supplied wider population range, considered non-pathological.
    expect(assess({ restingHeartRate: 85 })).toMatchObject({ level: 'safe', reasons: [] });

    const low = assess({ restingHeartRate: 50 });
    expect(low.level).toBe('caution');
    expect(low.reasons[0]).toMatch(/refer.*medical doctor/i);

    // Athletes may sit at 40–50 or lower; that is context, not a stop.
    expect(assess({ restingHeartRate: 38, athlete: true })).toMatchObject({
      level: 'safe', athleteLowRhr: true,
    });
  });

  it('applies the image SpO₂ guidance: ≤90 stops, 91–94 cautions', () => {
    expect(assess({ restingSpo2: 84 })).toMatchObject({ level: 'stop', requiresMedicalClearance: true });
    expect(assess({ restingSpo2: 84 }).reasons[0]).toMatch(/emergency|oxygen/i);
    // 90 is Moderate Hypoxia in the image, so it halts testing, not cautions.
    expect(assess({ restingSpo2: 90 })).toMatchObject({ level: 'stop', requiresMedicalClearance: true });
    expect(assess({ restingSpo2: 88 }).level).toBe('stop');
    expect(assess({ restingSpo2: 92 })).toMatchObject({ level: 'caution' });
    expect(assess({ restingSpo2: 92 }).reasons[0]).toMatch(/91–94%/);
  });

  it('keeps every reason and reports the worst level when several readings are abnormal', () => {
    const result = assess({ systolic: 135, diastolic: 85, restingHeartRate: 105, restingSpo2: 88 });
    expect(result.level).toBe('stop');
    expect(result.reasons).toHaveLength(3);
    expect(result.reasons[0]).toMatch(/stage 1/i);
    expect(result.reasons[2]).toMatch(/SpO₂/i);
  });
});

const SCORES: FitnessScores = {
  bpPoints: 7, anthropometricPoints: 7, bodyCompositionScore: 10,
  cardioScore: 13, strengthScore: 7.5, enduranceScore: 7.5, mobilityScore: 7.5,
  overallScore: 70, overallPoints: 59.5, overallMax: 85,
};

describe('FitnessDashboard — vitals display', () => {
  it('shows BP, RHR and SpO₂ with their clinical categories', () => {
    render(
      <FitnessDashboard
        scores={SCORES}
        vitals={{
          bpSystolic: 135, bpDiastolic: 85, bpCategory: 'Hypertension Stage 1',
          restingHeartRate: 72, rhrCategory: 'Normal',
          restingSpo2: 92, spo2Category: 'Mild Hypoxia',
        }}
      />,
    );
    expect(screen.getByText('135/85 mmHg')).toBeTruthy();
    expect(screen.getByText('Hypertension Stage 1')).toBeTruthy();
    expect(screen.getByText('72 bpm')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('Mild Hypoxia')).toBeTruthy();
  });

  it('omits the vitals block when the caller has none', () => {
    render(<FitnessDashboard scores={SCORES} />);
    expect(screen.queryByText('Resting Heart Rate')).toBeNull();
  });
});
