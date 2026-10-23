// K11 YMCA 3-Minute Step Test recovery-HR norms (whole-bpm bands, age- and
// sex-specific). These tests pin every published boundary and every place the
// published table deliberately does NOT classify a value.
import { describe, it, expect } from 'vitest';
import {
  classifyStepTestRecovery,
  scoreCategory,
  FITNESS_SCORING_VERSION,
} from '@/lib/fitness-calculations';
import type { FitnessCategory, Gender } from '@/lib/fitness-calculations';

type Case = [hr: number, expected: FitnessCategory | null];

const MALE_18_25: Case[] = [
  [78, 'Excellent'], [79, 'Good'], [89, 'Good'], [90, 'Above Average'], [99, 'Above Average'],
  [100, 'Average'], [105, 'Average'], [106, 'Below Average'], [116, 'Below Average'],
  [117, 'Poor'], [128, 'Poor'], [129, 'Very Poor'], [220, 'Very Poor'],
];
const MALE_26_35: Case[] = [
  [80, 'Excellent'], [81, 'Good'], [89, 'Good'], [90, 'Above Average'], [99, 'Above Average'],
  [100, 'Average'], [107, 'Average'], [108, 'Below Average'], [117, 'Below Average'],
  [118, 'Poor'], [128, 'Poor'], [129, 'Very Poor'],
];
const MALE_36_45: Case[] = [
  [82, 'Excellent'], [83, 'Good'], [96, 'Good'], [97, 'Above Average'], [103, 'Above Average'],
  [104, 'Average'], [112, 'Average'], [113, 'Below Average'], [119, 'Below Average'],
  [120, 'Poor'], [130, 'Poor'], [131, 'Very Poor'],
];
const MALE_46_55: Case[] = [
  [86, 'Excellent'], [87, 'Good'], [97, 'Good'], [98, 'Above Average'], [105, 'Above Average'],
  [106, 'Average'], [116, 'Average'], [117, 'Below Average'], [122, 'Below Average'],
  [123, 'Poor'], [132, 'Poor'], [133, 'Very Poor'],
];

// Female norms publish no Very Poor row: everything above the Poor ceiling is
// unclassified, never shifted into an invented band.
const FEMALE_18_25: Case[] = [
  [84, 'Excellent'], [85, 'Good'], [98, 'Good'], [99, 'Above Average'], [108, 'Above Average'],
  [109, 'Average'], [117, 'Average'], [118, 'Below Average'], [126, 'Below Average'],
  [127, 'Poor'], [140, 'Poor'], [141, null],
];
const FEMALE_26_35: Case[] = [
  [87, 'Excellent'], [88, 'Good'], [99, 'Good'], [100, 'Above Average'], [111, 'Above Average'],
  [112, 'Average'], [119, 'Average'], [120, 'Below Average'], [126, 'Below Average'],
  [127, 'Poor'], [138, 'Poor'], [139, null],
];
const FEMALE_36_45: Case[] = [
  [89, 'Excellent'], [90, 'Good'], [102, 'Good'], [103, 'Above Average'], [110, 'Above Average'],
  [111, 'Average'], [118, 'Average'], [119, 'Below Average'], [128, 'Below Average'],
  [129, 'Poor'], [140, 'Poor'], [141, null],
];
// The published female 46–55 row reads "Excellent <94" then "Good 95–104".
// 94 bpm is not in either band, so it is not classified. This is a source
// gap, not an arithmetic bug; see the classifier comment.
const FEMALE_46_55: Case[] = [
  [93, 'Excellent'], [94, null], [95, 'Good'], [104, 'Good'], [105, 'Above Average'],
  [115, 'Above Average'], [116, 'Average'], [120, 'Average'], [121, 'Below Average'],
  [126, 'Below Average'], [127, 'Poor'], [135, 'Poor'], [136, null],
];

const GROUPS: Array<[Gender, number, Case[]]> = [
  ['Male', 18, MALE_18_25], ['Male', 25, MALE_18_25],
  ['Male', 26, MALE_26_35], ['Male', 35, MALE_26_35],
  ['Male', 36, MALE_36_45], ['Male', 45, MALE_36_45],
  ['Male', 46, MALE_46_55], ['Male', 55, MALE_46_55],
  ['Female', 18, FEMALE_18_25], ['Female', 25, FEMALE_18_25],
  ['Female', 26, FEMALE_26_35], ['Female', 35, FEMALE_26_35],
  ['Female', 36, FEMALE_36_45], ['Female', 45, FEMALE_36_45],
  ['Female', 46, FEMALE_46_55], ['Female', 55, FEMALE_46_55],
];

describe('K11 YMCA step-test recovery HR norms', () => {
  for (const [gender, age, cases] of GROUPS) {
    it.each(cases)(`${gender} age ${age}: %i bpm → %s`, (hr, expected) => {
      expect(classifyStepTestRecovery(hr, age, gender)).toBe(expected);
    });
  }

  it('classifies lowercase sex input like the canonical form', () => {
    expect(classifyStepTestRecovery(81, 30, 'male' as Gender)).toBe('Good');
    expect(classifyStepTestRecovery(88, 30, 'female' as Gender)).toBe('Good');
  });

  it('has no K11 category outside the published 18–55 age range', () => {
    for (const age of [null, 17, 56, 80, 25.5, 35.5, 45.5]) {
      expect(classifyStepTestRecovery(100, age, 'Male')).toBeNull();
    }
  });

  it('does not classify a fractional bpm, which is not a published band', () => {
    expect(classifyStepTestRecovery(78.5, 20, 'Male')).toBeNull();
    expect(classifyStepTestRecovery(94.5, 50, 'Female')).toBeNull();
  });

  it('has no K11 category without a supported sex', () => {
    for (const gender of [null, 'Other'] as const) {
      expect(classifyStepTestRecovery(100, 30, gender)).toBeNull();
    }
  });

  it('has no category for missing or implausible heart rates', () => {
    for (const hr of [null, NaN, Infinity, -Infinity, 0, 39, 221]) {
      expect(classifyStepTestRecovery(hr, 30, 'Male')).toBeNull();
    }
  });

  it('never invents the missing female Very Poor band', () => {
    // Every female top band ends well below the implausibility guard.
    for (const age of [18, 26, 36, 46]) {
      expect(classifyStepTestRecovery(200, age, 'Female')).toBeNull();
    }
  });
});

describe('K11 category scoring', () => {
  it('scores the two new K11 categories between their neighbours', () => {
    expect(scoreCategory('Good')).toBe(80);
    expect(scoreCategory('Above Average')).toBe(70);
    expect(scoreCategory('Average')).toBe(60);
    expect(scoreCategory('Poor')).toBe(20);
    expect(scoreCategory('Very Poor')).toBe(10);
  });

  it('never turns a missing category into a score', () => {
    expect(scoreCategory(null)).toBeNull();
  });

  it('bumps the formula-bundle version for the changed classifier', () => {
    expect(FITNESS_SCORING_VERSION).toBe('5');
  });
});
