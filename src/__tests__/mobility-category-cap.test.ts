// A movement screen with pain must not read "Excellent" while the same row
// tells the trainer to refer. Mirrors the backend's mobilityCategoryCap test.

import { describe, expect, it } from 'vitest';
import { calcMobilityScore, classifyMobility } from '@/lib/mobility-calculations';
import type { BodyRegionScore } from '@/lib/mobility-calculations';

const item = (over: Partial<BodyRegionScore> = {}): BodyRegionScore => ({
  region: 'Neck', score: 5, pain: false, restriction: false, ...over,
});

describe('mobility category cap', () => {
  it('keeps a perfect screen with no pain or restriction at Excellent', () => {
    const body = [item({ region: 'Neck' }), item({ region: 'Shoulder' })];
    const score = calcMobilityScore(body, []);
    expect(score).toBe(100);
    expect(classifyMobility(score, body, [])).toBe('Excellent');
  });

  it('caps pain at Average even when the mean is perfect', () => {
    const body = [item({ region: 'Neck' }), item({ region: 'Shoulder', pain: true }), item({ region: 'Hip', pain: true })];
    const score = calcMobilityScore(body, []);
    expect(score).toBe(90);
    expect(classifyMobility(score, body, [])).toBe('Average');
  });

  it('caps restriction at Good', () => {
    const body = [item({ region: 'Neck' }), item({ region: 'Hip', restriction: true })];
    const score = calcMobilityScore(body, []);
    expect(score).toBe(97);
    expect(classifyMobility(score, body, [])).toBe('Good');
  });

  it('takes the stricter cap when pain and restriction coexist', () => {
    const body = [item({ region: 'Neck', pain: true, restriction: true }), item({ region: 'Hip' })];
    expect(classifyMobility(calcMobilityScore(body, []), body, [])).toBe('Average');
  });

  it('never raises a lower score', () => {
    const body = [item({ region: 'Neck', score: 1, pain: true }), item({ region: 'Hip', score: 1 })];
    expect(classifyMobility(calcMobilityScore(body, []), body, [])).toBe('Poor');
  });

  it('has no category without scores', () => {
    expect(classifyMobility(null, [], [])).toBeNull();
  });
});
