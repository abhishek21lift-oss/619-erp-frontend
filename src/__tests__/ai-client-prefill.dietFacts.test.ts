import { describe, expect, it } from 'vitest';
import {
  mapWorkoutTime, mapFoodCulture, mapDietaryPattern, mapMealTiming, newest,
} from '@/lib/ai-client-prefill';

describe('diet prefill maps', () => {
  it('normalises workout times to HH:MM', () => {
    expect(mapWorkoutTime('7:05 pm')).toBe('19:05');
    expect(mapWorkoutTime('07:00')).toBe('07:00');
    expect(mapWorkoutTime('morning')).toBe('07:00');
    expect(mapWorkoutTime('25:00')).toBe('');
    expect(mapWorkoutTime(null)).toBe('');
  });

  it('passes only the engine vocabulary through', () => {
    expect(mapFoodCulture('Indian')).toBe('indian');
    expect(mapFoodCulture('Mediterranean')).toBe('');
    expect(mapDietaryPattern('Non-Vegetarian')).toBe('non_vegetarian');
    expect(mapDietaryPattern('Jain')).toBe('');
    expect(mapMealTiming('no preference')).toBe('no_preference');
  });

  it('sorts by assessment date first, created_at second', () => {
    const rows = [
      { assessment_date: '2026-01-01', created_at: '2026-09-01' },
      { assessment_date: '2026-08-01', created_at: '2026-08-02' },
      { created_at: '2026-09-02' },
    ];
    expect(newest(rows, 'assessment_date')).toBe(rows[1]);
  });
});
