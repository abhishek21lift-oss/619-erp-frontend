// The client facts the two calculator pages prefill from.
//
// The brief is the primary read; the client row fills what the brief does not
// carry (sessions per week is on pt_clients, not in the brief's sections).
// A missing fact is '', never a plausible substitute.
import { describe, expect, it, vi } from 'vitest';

const trainingBrief = vi.fn();
const client = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      trainingBrief: (...a: unknown[]) => trainingBrief(...a),
      client: (...a: unknown[]) => client(...a),
    },
  },
}));

import { loadClientTrainingFacts } from '@/lib/client-training-facts';

describe('loadClientTrainingFacts', () => {
  it('reads age, resting HR, experience and goal from the brief', async () => {
    trainingBrief.mockResolvedValue({
      data: {
        client: { age: 34, goal: 'fat_loss', name: 'Amit' },
        body: { resting_hr: 62 },
        lifestyle: { experience_level: 'intermediate' },
        goal: { goal_type: 'weight_loss' },
        history: { days_per_week: 4 },
      },
    });
    client.mockResolvedValue({ data: { name: 'Amit', sessions_per_week: 5, frequency: '5x/week' } });

    await expect(loadClientTrainingFacts('c1')).resolves.toEqual({
      name: 'Amit',
      age: '34',
      restingHeartRate: '62',
      experienceLevel: 'intermediate',
      goal: 'weight_loss',
      trainingDays: '5',
    });
  });

  it('falls back to the brief frequency and leaves missing facts empty', async () => {
    trainingBrief.mockResolvedValue({
      data: { client: {}, body: {}, lifestyle: {}, goal: {}, history: { days_per_week: 3 } },
    });
    client.mockResolvedValue({ data: {} });

    await expect(loadClientTrainingFacts('c1')).resolves.toEqual({
      name: '',
      age: '',
      restingHeartRate: '',
      experienceLevel: '',
      goal: '',
      trainingDays: '3',
    });
  });
});
