/**
 * What a trainer may state about a client for one AI generation.
 *
 * Both generator forms did this:
 *
 *     const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
 *
 * Blank was handled. Nothing else was. `Number('12abc')` is NaN, which
 * `JSON.stringify` writes as `null`; `-70` is a negative weight; `750` is a
 * weight and `9999` is an age. Each went into a prompt that writes a training
 * programme, or a day's calories, for a real person.
 *
 * The bounds below are copies of `STATED_RANGE` in
 * `619-erp-backend/src/modules/pt-os/client-facts.js`, which both generators
 * share. A drift is a client that spends a billed model call to be told
 * nothing.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  aiWorkoutInputSchema, aiDietInputSchema, stated, STATED_RANGE,
} from '@/lib/forms/schemas/aiGenerator';
import { ChoiceChips, useStandaloneField } from '@/components/ui/form';

const blankWorkout = { age: '', weight_kg: '', height_cm: '', training_days: '', injuries: '' };
const blankDiet = {
  age: '', weight_kg: '', height_cm: '', meal_frequency: '',
  dietary_preferences: '', allergies: '',
};

describe('the stated facts are optional', () => {
  it('accepts an entirely blank workout form', () => {
    const r = aiWorkoutInputSchema.safeParse(blankWorkout);
    expect(r.success).toBe(true);
    // Blank is `null` here and `undefined` on the wire: the server's rule is
    // "a field the client did not send is left alone", and null is a value.
    expect(r.success && r.data.age).toBeNull();
    expect(stated(r.success ? r.data.age : null)).toBeUndefined();
  });

  it('accepts an entirely blank diet form', () => {
    expect(aiDietInputSchema.safeParse(blankDiet).success).toBe(true);
  });
});

describe('impossible figures are refused before the call is billed', () => {
  it.each([
    ['age', '9999'],
    ['age', '3'],
    ['weight_kg', '750'],
    ['weight_kg', '-70'],
    ['height_cm', '10'],
    ['training_days', '400'],
    ['training_days', '0'],
  ])('refuses %s = %p', (field, value) => {
    const r = aiWorkoutInputSchema.safeParse({ ...blankWorkout, [field]: value });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues[0].path[0]).toBe(field);
  });

  it('refuses a meal frequency the model would try to satisfy', () => {
    const r = aiDietInputSchema.safeParse({ ...blankDiet, meal_frequency: '40' });
    expect(r.success).toBe(false);
  });

  it('refuses a number with a tail, which used to become NaN and then null', () => {
    const r = aiWorkoutInputSchema.safeParse({ ...blankWorkout, weight_kg: '12abc' });
    expect(r.success).toBe(false);
  });

  it('names the field in the message, not "invalid input"', () => {
    const r = aiWorkoutInputSchema.safeParse({ ...blankWorkout, weight_kg: '750' });
    expect(r.success === false && r.error.issues[0].message).toMatch(/Weight/);
  });
});

describe('the bounds exclude the impossible, not the unusual', () => {
  it('accepts a 95-year-old client', () => {
    const r = aiWorkoutInputSchema.safeParse({ ...blankWorkout, age: '95' });
    expect(r.success && r.data.age).toBe(95);
  });

  it('accepts a 180kg client', () => {
    const r = aiWorkoutInputSchema.safeParse({ ...blankWorkout, weight_kg: '180' });
    expect(r.success && r.data.weight_kg).toBe(180);
  });

  it('accepts a decimal weight', () => {
    const r = aiWorkoutInputSchema.safeParse({ ...blankWorkout, weight_kg: '82.4' });
    expect(r.success && r.data.weight_kg).toBe(82.4);
  });

  it('accepts every edge of every range', () => {
    for (const [field, [lo, hi]] of Object.entries(STATED_RANGE)) {
      const schema = field === 'meal_frequency' ? aiDietInputSchema : aiWorkoutInputSchema;
      const blank = field === 'meal_frequency' ? blankDiet : blankWorkout;
      for (const edge of [lo, hi]) {
        const r = schema.safeParse({ ...blank, [field]: String(edge) });
        expect(r.success, `${field} = ${edge}`).toBe(true);
      }
    }
  });
});

describe('parity with the server', () => {
  // Copies of `STATED_RANGE` in client-facts.js. A drift here is a form that
  // accepts what the prompt will silently drop.
  it('mirrors the server ranges', () => {
    expect(STATED_RANGE).toEqual({
      age: [10, 120],
      weight_kg: [20, 400],
      height_cm: [90, 260],
      training_days: [1, 7],
      meal_frequency: [1, 12],
    });
  });
});

/* ── ChoiceChips ─────────────────────────────────────────────────────────── */

function Chips({ onChange = () => {} }: { onChange?: (v: string) => void }) {
  const [value, setValue] = React.useState('3');
  const field = useStandaloneField('training_days', value, (v: string) => {
    setValue(v); onChange(v);
  });
  return (
    <ChoiceChips
      field={field} legend="Training Days"
      options={['2', '3', '4'].map((d) => ({ value: d, label: d }))}
    />
  );
}

describe('ChoiceChips', () => {
  it('is a named group, which a row of plain buttons never was', () => {
    render(<Chips />);
    const group = screen.getByRole('radiogroup', { name: 'Training Days' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('says which chip is chosen', () => {
    render(<Chips />);
    expect(screen.getByRole('radio', { name: '3' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '2' })).toHaveAttribute('aria-checked', 'false');
  });

  it('is one tab stop, not one per chip', () => {
    render(<Chips />);
    // Roving tabindex: only the selected chip is reachable by Tab, so leaving
    // the field does not mean pressing Tab six times.
    expect(screen.getByRole('radio', { name: '3' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: '2' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: '4' })).toHaveAttribute('tabindex', '-1');
  });

  it('moves and selects with the arrow keys, as a radio group does', () => {
    const onChange = vi.fn();
    render(<Chips onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: '3' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('4');
  });

  it('wraps at the end', () => {
    const onChange = vi.fn();
    render(<Chips onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: '3' }), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('radio', { name: '4' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('2');
  });

  it('jumps to the ends with Home and End', () => {
    const onChange = vi.fn();
    render(<Chips onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: '3' }), { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('4');
  });

  it('selects on click', () => {
    const onChange = vi.fn();
    render(<Chips onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    expect(onChange).toHaveBeenCalledWith('2');
  });
});
