// The diet engine plans around dietary pattern, food culture, regional
// cuisines and meal timing. Asked here, once, so the generator reads a fact
// instead of guessing the pattern from free text and ignoring culture entirely.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import StepDietPreference from '@/components/pt-os/nutrition-assessment/StepDietPreference';
import StepMealPatternBehaviour from '@/components/pt-os/nutrition-assessment/StepMealPatternBehaviour';
import { initNutritionForm } from '@/components/pt-os/nutrition-assessment/types';

describe('nutrition planning inputs', () => {
  it('starts every new field blank — a plan default is not a stored fact', () => {
    const form = initNutritionForm();
    expect(form.dietaryPattern).toBe('');
    expect(form.foodCulture).toBe('');
    expect(form.regionalCuisines).toEqual([]);
    expect(form.mealTimingPreference).toBe('');
  });

  it('sets the dietary pattern', () => {
    const set = vi.fn();
    render(<StepDietPreference form={initNutritionForm()} set={set} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dietary pattern: Vegetarian' }));
    expect(set).toHaveBeenCalledWith('dietaryPattern', 'vegetarian');
  });

  it('clears the dietary pattern on a second click, so "not recorded" is reachable', () => {
    const set = vi.fn();
    const form = { ...initNutritionForm(), dietaryPattern: 'vegetarian' as const };
    render(<StepDietPreference form={form} set={set} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dietary pattern: Vegetarian' }));
    expect(set).toHaveBeenCalledWith('dietaryPattern', '');
  });

  it('offers regional cuisines only for an Indian or mixed kitchen', () => {
    const { rerender } = render(
      <StepDietPreference form={{ ...initNutritionForm(), foodCulture: 'indian' }} set={vi.fn()} />,
    );
    expect(screen.getByText('Regional cuisines')).toBeInTheDocument();

    rerender(<StepDietPreference form={{ ...initNutritionForm(), foodCulture: 'western' }} set={vi.fn()} />);
    expect(screen.queryByText('Regional cuisines')).not.toBeInTheDocument();
  });

  it('drops regional cuisines when the culture changes to Western', () => {
    const set = vi.fn();
    const form = {
      ...initNutritionForm(), foodCulture: 'indian' as const, regionalCuisines: ['Punjabi'],
    };
    render(<StepDietPreference form={form} set={set} />);

    fireEvent.click(screen.getByRole('button', { name: 'Food culture: Western' }));
    expect(set).toHaveBeenCalledWith('foodCulture', 'western');
    expect(set).toHaveBeenCalledWith('regionalCuisines', []);
  });

  it('records the meal timing preference', () => {
    const set = vi.fn();
    render(<StepMealPatternBehaviour form={initNutritionForm()} set={set} />);

    fireEvent.click(screen.getByRole('button', { name: 'Meal timing: Early' }));
    expect(set).toHaveBeenCalledWith('mealTimingPreference', 'early');
  });

  it('sends the four fields snake_case, blank as null, and hydrates them on edit', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(chrome)/pt-os/nutrition-assessment/page.tsx'), 'utf8',
    );
    const submit = src.slice(src.indexOf('const payload'), src.indexOf('if (assessmentId)'));

    expect(submit).toContain('dietary_pattern: form.dietaryPattern || null');
    expect(submit).toContain('food_culture: form.foodCulture || null');
    expect(submit).toContain('regional_cuisines: form.regionalCuisines');
    expect(submit).toContain('meal_timing_preference: form.mealTimingPreference || null');

    expect(src).toContain('dietaryPattern: (row.dietary_pattern');
    expect(src).toContain('foodCulture: (row.food_culture');
    expect(src).toContain('mealTimingPreference: (row.meal_timing_preference');
  });
});
