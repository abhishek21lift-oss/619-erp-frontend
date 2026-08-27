import { describe, expect, it } from 'vitest';
import {
  buildCardioPayload,
  durationSeconds,
  emptyCardioDraft,
  guessCardioType,
} from '@/components/pt-os/training/CardioLogger';

describe('cardio logger payloads', () => {
  it('converts the human duration fields to seconds', () => {
    expect(durationSeconds({ minutes: '20', seconds: '14' })).toBe(1214);
    expect(durationSeconds({ minutes: '', seconds: '' })).toBeNull();
  });

  it('prefills mode-specific prescription values without sets or reps', () => {
    const draft = emptyCardioDraft({
      prescription_type: 'TIME_SPEED',
      target_duration_seconds: 1200,
      target_speed: 8,
      target_incline: 3,
    });
    expect(draft.minutes).toBe('20');
    expect(draft.speed).toBe('8');
    expect(draft.incline).toBe('3');
  });

  it('writes actual cardio metrics to the cardio payload', () => {
    const payload = buildCardioPayload({
      minutes: '20', seconds: '14', distance: '2.91', distanceUnit: 'km',
      speed: '8.2', paceSeconds: '', incline: '3', resistance: '', heartRate: '151',
      calories: '215', cadence: '', floors: '', steps: '', workSeconds: '',
      restSeconds: '', rounds: '', rpe: '7',
    }, 'TREADMILL');
    expect(payload).toMatchObject({
      cardio_type: 'TREADMILL', duration_seconds: 1214, distance: 2.91,
      average_speed: 8.2, incline: 3, average_heart_rate: 151,
      calories_burned: 215, rpe: 7, completed: true,
    });
  });

  it('classifies the upgraded cardio modalities', () => {
    expect(guessCardioType('Step Mill')).toBe('STEP_MILL');
    expect(guessCardioType('Prowler Sprint')).toBe('PROWLER');
    expect(guessCardioType('Rope Jumping')).toBe('JUMP_ROPE');
    expect(guessCardioType('Skating')).toBe('SKATING');
  });
});
