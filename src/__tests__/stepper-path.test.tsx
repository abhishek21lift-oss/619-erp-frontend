import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import { chapterAccents } from '@/components/pt-os/fitness-testing/fitnessTheme';

const STEPS = [
  { id: 1, label: 'Blood pressure' }, { id: 2, label: 'Anthropometric' },
  { id: 3, label: 'Body composition' }, { id: 4, label: 'Cardio' },
  { id: 5, label: 'Strength' }, { id: 6, label: 'Endurance' },
  { id: 7, label: 'Flexibility' },
] as const;

it('pins the warm→cool chapter ramp', () => {
  expect(chapterAccents).toEqual([
    '#a33757', '#d95f7a', '#ff9500', '#30b0c7', '#4a9fe0', '#5856d6', '#34c759',
  ]);
});

it('marks done, active and upcoming nodes', () => {
  render(<StepperTimeline steps={STEPS} current={4} onStep={() => {}} variant="path" accents={chapterAccents} />);
  const active = screen.getByRole('button', { name: 'Cardio' });
  expect(active).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('button', { name: 'Blood pressure' })).toHaveAttribute('aria-disabled', 'false');
  expect(screen.getByRole('button', { name: 'Flexibility' })).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('button', { name: 'Strength' })).toHaveAttribute('aria-disabled', 'false');
});

it('only navigates to a reachable node', () => {
  const onStep = vi.fn();
  render(<StepperTimeline steps={STEPS} current={4} onStep={onStep} variant="path" accents={chapterAccents} />);
  fireEvent.click(screen.getByRole('button', { name: 'Endurance' }));
  expect(onStep).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Strength' }));
  expect(onStep).toHaveBeenCalledWith(5);
});

it('keeps the active number readable on light and dark accents', () => {
  const { unmount } = render(<StepperTimeline steps={STEPS} current={1} onStep={() => {}} variant="path" accents={chapterAccents} />);
  expect(screen.getByRole('button', { name: 'Blood pressure' }).querySelector('span')?.style.color).toBe('rgb(255, 255, 255)');
  unmount();
  render(<StepperTimeline steps={STEPS} current={3} onStep={() => {}} variant="path" accents={chapterAccents} />);
  expect(screen.getByRole('button', { name: 'Body composition' }).querySelector('span')?.style.color).toBe('rgb(15, 23, 42)');
});
