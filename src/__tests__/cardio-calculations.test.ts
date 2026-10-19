import { calcTargetHeartRate, buildFivePhaseCardio, classifyCardioModality, estimateMaxHeartRate } from '@/lib/cardio-calculations';

test('karvonen', () => {
  expect(calcTargetHeartRate({ maxHeartRate: 180, restingHeartRate: 60, intensityFraction: 0.7 })).toBe(144);
});

test('five phase total', () => {
  const r = buildFivePhaseCardio(180, 60);
  expect(r?.totalMinutes).toBe(38);
});

test('classify', () => {
  expect(classifyCardioModality('Running')).toBe('weight-bearing-high-impact');
});

test('estimate', () => {
  expect(estimateMaxHeartRate(30)).toBe(190);
});
