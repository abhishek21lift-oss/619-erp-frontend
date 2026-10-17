import { describe, it, expect } from 'vitest';
import { classifyFlexibilityROM, FLEXIBILITY_NORMS } from '@/lib/flexibility-norms';

describe('flexibility-norms', () => {
  it('has no fabricated norms', () => {
    expect(FLEXIBILITY_NORMS).toHaveLength(0);
  });
  it('returns unavailable for any input (no validated norms)', () => {
    const r = classifyFlexibilityROM('Sit and Reach', 30, 30, 'Male');
    expect(r.category).toBeNull();
    expect(r.norm).toBeNull();
    expect(r.message).toBe('Norm data unavailable');
  });
  it('returns unavailable for missing inputs', () => {
    expect(classifyFlexibilityROM('Sit and Reach', null, 30, 'Male').category).toBeNull();
    expect(classifyFlexibilityROM('Sit and Reach', 30, null, 'Male').category).toBeNull();
    expect(classifyFlexibilityROM('Sit and Reach', 30, 30, null).category).toBeNull();
  });
});