// An untouched mobility form used to score 60/100 ("Average").
//
// Every region and movement screen started at a hardcoded 3, so a trainer who
// opened the wizard and pressed Review without touching a slider got a
// perfectly average assessment that nobody had performed. The form must start
// unscored, and an unscored item must not be averaged in as a 3.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { calcMobilityScore } from '@/lib/mobility-calculations';
import StepBodyRegions from '@/components/pt-os/mobility-assessment/StepBodyRegions';
import {
  initMobilityForm, unscoredBodyRegions, unscoredMobilityTests,
} from '@/components/pt-os/mobility-assessment/types';
import type { MobilityFormData } from '@/components/pt-os/mobility-assessment/types';

describe('a blank mobility form has no score', () => {
  it('starts every body region and movement screen unscored', () => {
    const form = initMobilityForm();
    expect(form.bodyRegions.every((r) => r.score === null)).toBe(true);
    expect(form.mobilityTests.every((t) => t.score === null)).toBe(true);
  });

  it('computes no percentage from an untouched form', () => {
    const form = initMobilityForm();
    expect(calcMobilityScore(form.bodyRegions, form.mobilityTests)).toBeNull();
  });

  it('still computes a score once every item is answered', () => {
    const form = initMobilityForm();
    form.bodyRegions.forEach((r) => { r.score = 3; });
    form.mobilityTests.forEach((t) => { t.score = 3; });
    expect(calcMobilityScore(form.bodyRegions, form.mobilityTests)).toBe(60);
  });
});

describe('the wizard can tell what is still unanswered', () => {
  it('counts every unscored body region', () => {
    const form = initMobilityForm();
    expect(unscoredBodyRegions(form)).toBe(form.bodyRegions.length);
    form.bodyRegions[0].score = 4;
    expect(unscoredBodyRegions(form)).toBe(form.bodyRegions.length - 1);
  });

  it('counts every unscored movement screen', () => {
    const form = initMobilityForm();
    expect(unscoredMobilityTests(form)).toBe(form.mobilityTests.length);
    form.mobilityTests.forEach((t) => { t.score = 2; });
    expect(unscoredMobilityTests(form)).toBe(0);
  });
});

describe('the unscored state is visible on the screen', () => {
  it('renders each body-region slider as "Not set", not as 3', () => {
    const form: MobilityFormData = initMobilityForm();
    render(<StepBodyRegions form={form} set={vi.fn()} />);
    expect(screen.getAllByText('Not set')).toHaveLength(form.bodyRegions.length);
    expect(screen.queryByText('3')).toBeNull();
  });
});
