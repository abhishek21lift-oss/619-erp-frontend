// The goal wizard's baseline card reports whether a PAR-Q is on file.
//
// It checked `status === 'completed'`, which is not a ParqStatus — the real
// states are draft, submitted and reviewed — so a submitted or reviewed form
// always rendered as "In progress".

import { describe, expect, it } from 'vitest';
import { parqBaselineState } from '@/components/pt-os/goal-assessment/BaselineScreeningCard';

describe('PAR-Q baseline state', () => {
  it('is missing when no PAR-Q has a date', () => {
    expect(parqBaselineState(null, false)).toBe('missing');
    expect(parqBaselineState('submitted', false)).toBe('missing');
  });

  it('is complete once submitted or reviewed', () => {
    expect(parqBaselineState('submitted', true)).toBe('complete');
    expect(parqBaselineState('reviewed', true)).toBe('complete');
  });

  it('is pending while still a draft', () => {
    expect(parqBaselineState('draft', true)).toBe('pending');
  });
});
