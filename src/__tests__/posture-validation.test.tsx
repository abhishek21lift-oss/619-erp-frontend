// Posture could be saved with every view untouched.
//
// Zero selected issues is a real finding — "assessed, nothing noted" — but it
// was also what an unopened screen looked like. The wizard now needs either a
// recorded finding or the trainer's explicit "no issues noted" confirmation.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StepPostureObservations from '@/components/pt-os/posture-assessment/StepPostureObservations';
import {
  initPostureForm, validatePostureFindings,
} from '@/components/pt-os/posture-assessment/types';
import type { PostureFormData } from '@/components/pt-os/posture-assessment/types';

const form = (over: Partial<PostureFormData> = {}): PostureFormData => ({
  ...initPostureForm(),
  ...over,
});

describe('a posture assessment needs an observation', () => {
  it('refuses an untouched screen', () => {
    expect(validatePostureFindings(form())).toMatch(/posture finding|no issues/i);
  });

  it('accepts an explicit "no issues noted" confirmation', () => {
    expect(validatePostureFindings(form({ noIssuesNoted: true }))).toBeUndefined();
  });

  it('accepts a finding from any view', () => {
    expect(validatePostureFindings(form({ backIssues: ['Scoliosis'] }))).toBeUndefined();
  });

  it('accepts notes describing a finding', () => {
    expect(validatePostureFindings(form({ otherIssueNotes: 'Mild winging on the left' }))).toBeUndefined();
  });
});

describe('the confirmation cannot contradict a finding', () => {
  it('is offered on an untouched screen', () => {
    render(<StepPostureObservations form={form()} set={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /no posture issues noted/i })).toBeEnabled();
  });

  it('is disabled once an issue is selected', () => {
    render(<StepPostureObservations form={form({ frontIssues: ['Uneven Shoulders'] })} set={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /no posture issues noted/i })).toBeDisabled();
  });
});
