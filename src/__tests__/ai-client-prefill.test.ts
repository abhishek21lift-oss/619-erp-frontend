// The AI generators' prefill: the fetch, and the translations from each
// record's vocabulary into the form's.
//
// What matters here is that a stored value the form cannot offer is either
// translated unambiguously (athlete → advanced) or dropped — never copied
// blind, and never invented. A prefilled number outside the form's own range
// must come back empty, because the form would otherwise refuse its own
// prefill at submit.

import { describe, expect, it, vi, beforeEach } from 'vitest';

const ptClient = vi.fn();
const interviewsList = vi.fn();
const lifestyleList = vi.fn();
const nutritionList = vi.fn();
const goalsList = vi.fn();
const assessmentsList = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    pt: { client: (...a: unknown[]) => ptClient(...a), interviews: { list: (...a: unknown[]) => interviewsList(...a) } },
    progress: {
      lifestyleAssessments: { list: (...a: unknown[]) => lifestyleList(...a) },
      nutritionAssessments: { list: (...a: unknown[]) => nutritionList(...a) },
      goals: { list: (...a: unknown[]) => goalsList(...a) },
      assessments: { list: (...a: unknown[]) => assessmentsList(...a) },
    },
  },
}));

import {
  ageFromDob, applyFacts, hasAnyFact, joinList, loadAiClientFacts, mapActivityLevel, mapBudget,
  mapDietGoal, mapExperience, mapMealFrequency, mapTrainingDays, mapWorkoutGoal,
} from '@/lib/ai-client-prefill';

beforeEach(() => {
  ptClient.mockReset();
  interviewsList.mockReset().mockResolvedValue({ data: [] });
  lifestyleList.mockReset().mockResolvedValue({ data: [] });
  nutritionList.mockReset().mockResolvedValue({ data: [] });
  goalsList.mockReset().mockResolvedValue({ data: [] });
  assessmentsList.mockReset().mockResolvedValue({ data: [] });
});

describe('vocabulary', () => {
  it('translates what the form can accept, and drops what it cannot', () => {
    expect(mapExperience('athlete')).toBe('advanced');
    expect(mapExperience(' Beginner ')).toBe('beginner');
    expect(mapExperience('olympian')).toBe('');

    expect(mapWorkoutGoal('fat_loss')).toBe('weight_loss');
    expect(mapWorkoutGoal('body_recomposition')).toBe('body_recomposition');
    expect(mapWorkoutGoal('recomposition')).toBe('body_recomposition');
    expect(mapWorkoutGoal('recovery')).toBe('');           // not a chip on the workout form
    expect(mapDietGoal('fat_loss')).toBe('weight_loss');
    expect(mapDietGoal('general_fitness')).toBe('');        // not a chip on the diet form

    expect(mapBudget('high')).toBe('premium');
    expect(mapBudget('medium')).toBe('moderate');
    expect(mapActivityLevel('Very Active')).toBe('very_active');
    expect(mapActivityLevel('moderately_active')).toBe('moderately_active');
  });

  it('takes a training frequency only when the chips can show it', () => {
    expect(mapTrainingDays('3x/week', null)).toBe('3');
    expect(mapTrainingDays('', '5')).toBe('5');
    expect(mapTrainingDays('1', null)).toBe('');   // below the 2–6 chips
    expect(mapTrainingDays('8', '9')).toBe('');    // above them too
    expect(mapMealFrequency(2)).toBe('');
    expect(mapMealFrequency('5')).toBe('5');
  });

  it('computes age in full years, and refuses an impossible one', () => {
    expect(ageFromDob('1990-05-04', new Date('2026-10-19T00:00:00Z'))).toBe('36');
    expect(ageFromDob('1990-10-20', new Date('2026-10-19T00:00:00Z'))).toBe('35');
    expect(ageFromDob('2025-01-01', new Date('2026-10-19T00:00:00Z'))).toBe('');   // under the form's minimum
    expect(ageFromDob('', new Date('2026-10-19T00:00:00Z'))).toBe('');
  });

  it('joins lists into one line and keeps within the field\'s limit', () => {
    expect(joinList(['gluten-free', ' vegan '])).toBe('gluten-free, vegan');
    expect(joinList('keto')).toBe('keto');
    expect(joinList(['x'.repeat(400)]).length).toBe(300);
  });
});

describe('loadAiClientFacts', () => {
  it('reads the client, the interview, and the newest of each assessment', async () => {
    ptClient.mockResolvedValue({ data: {
      name: 'Mina Rao', dob: '1990-05-04', gender: 'Female', weight: 68.4, height: 165,
      goal: 'fat_loss', injuries: 'Left knee', workout_experience_level: 'athlete', frequency: '3x/week',
    } });
    interviewsList.mockResolvedValue({ data: [
      { status: 'draft', updated_at: '2026-10-01', pain_and_injuries: 'Shoulder', lifestyle_training_days: 6 },
      { status: 'completed', updated_at: '2026-09-01', pain_and_injuries: 'Ankle', lifestyle_training_days: 4 },
    ] });
    lifestyleList.mockResolvedValue({ data: [
      { assessment_date: '2026-09-01', activity_level: 'Active', food_preferences: ['vegetarian'] },
      { assessment_date: '2026-10-01', activity_level: 'Sedentary', meal_frequency: 5, workout_experience_level: 'beginner' },
    ] });
    nutritionList.mockResolvedValue({ data: [
      { assessment_date: '2026-10-02', diet_preferences: ['no dairy'], food_allergies: ['peanut'], meals_per_day: 4, nutrition_budget: 'high' },
    ] });

    const facts = await loadAiClientFacts('c1');
    expect(facts.clientName).toBe('Mina Rao');

    expect(facts.workout).toMatchObject({
      age: '36', weight_kg: '68.4', height_cm: '165',
      goal: 'weight_loss',                 // fat_loss, translated
      experience_level: 'advanced',        // athlete → advanced
      injuries: 'Left knee',               // the client row beats the interview
      training_days: '3',                  // frequency beats the interview's 4
    });

    expect(facts.diet).toMatchObject({
      goal: 'weight_loss',
      activity_level: 'sedentary',         // the newest assessment, not the older one
      budget: 'premium',                   // high → premium
      meal_frequency: '4',
      dietary_preferences: 'no dairy',
      allergies: 'peanut',
    });
    expect(hasAnyFact(facts.workout)).toBe(true);
  });

  it('prefers the active goal, the enrolled sessions and the latest assessed weight', async () => {
    // The server programs to pt_goals.goal_type, pt_clients.sessions_per_week
    // and the newest pt_assessments.weight. The form used to show the
    // enrolment-era goal, the free-text frequency and the profile weight, so a
    // trainer could read one set of facts and the prompt use another.
    ptClient.mockResolvedValue({ data: {
      name: 'Mina Rao', weight: 90, goal: 'general_fitness',
      frequency: '2x/week', sessions_per_week: 5,
    } });
    goalsList.mockResolvedValue({ data: [
      { goal_type: 'fat_loss', is_active: false, status: 'achieved', created_at: '2026-08-01' },
      { goal_type: 'body_recomposition', is_active: true, status: 'active', created_at: '2026-10-19' },
    ] });
    assessmentsList.mockResolvedValue({ data: [
      { created_at: '2026-08-01', weight: 85 },
      { created_at: '2026-10-01', weight: 70 },
    ] });

    const facts = await loadAiClientFacts('c1');
    expect(facts.workout.goal).toBe('body_recomposition');
    expect(facts.workout.training_days).toBe('5');
    expect(facts.workout.weight_kg).toBe('70');
  });

  it('degrades to a thinner prefill when an optional record fails, and fails only without the client', async () => {
    ptClient.mockResolvedValue({ data: { name: 'Mina Rao' } });
    lifestyleList.mockRejectedValue(new Error('500'));
    nutritionList.mockRejectedValue(new Error('500'));
    interviewsList.mockRejectedValue(new Error('500'));

    const facts = await loadAiClientFacts('c1');
    expect(facts.workout.goal).toBe('');
    expect(hasAnyFact(facts.workout)).toBe(false);
    expect(hasAnyFact(facts.diet)).toBe(false);

    ptClient.mockRejectedValue(new Error('404'));
    await expect(loadAiClientFacts('nope')).rejects.toThrow('404');
  });
});

describe('applyFacts', () => {
  const form = { age: '', gender: 'male', goal: 'general_fitness', equipment: 'gym' };

  it('fills what the record holds and leaves what it does not', () => {
    expect(applyFacts(form, { age: '36', goal: '' }, new Set())).toEqual({ ...form, age: '36' });
  });

  it('never overwrites a field the trainer has edited', () => {
    expect(applyFacts(form, { age: '36' }, new Set(['age']))).toBe(form);
  });

  it('returns the same object when nothing applies, so no re-render is spent', () => {
    expect(applyFacts(form, { age: '', goal: 'general_fitness' }, new Set())).toBe(form);
  });
});
