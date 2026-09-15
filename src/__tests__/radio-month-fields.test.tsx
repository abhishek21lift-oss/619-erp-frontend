/**
 * RadioField and MonthFieldControl.
 *
 * The radio tests are mostly accessibility, because a radio group is the one
 * control where the obvious structure is wrong: `FormField` renders
 * `<label htmlFor>`, and a label points at exactly one control, so a group of
 * five radios has no valid `htmlFor`. These assert the `fieldset`/`legend`
 * structure that does name a group, and the shared `name` that makes arrow keys
 * work.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RadioField, MonthFieldControl, type FieldLike } from '@/components/ui/form';
import { monthField } from '@/lib/forms/primitives';

/** A minimal stand-in for a TanStack field. */
function makeField<T extends string>(
  value: T,
  overrides: Partial<FieldLike<T>> = {},
): FieldLike<T> & { handleChange: ReturnType<typeof vi.fn> } {
  const handleChange = vi.fn();
  return {
    name: 'reason',
    state: { value, meta: { errors: [], isTouched: false } },
    handleChange,
    handleBlur: vi.fn(),
    ...overrides,
  } as FieldLike<T> & { handleChange: ReturnType<typeof vi.fn> };
}

const REASONS = [
  { value: 'wrong_amount', label: 'Wrong amount' },
  { value: 'not_received', label: 'Not received', description: 'No matching credit' },
  { value: 'duplicate', label: 'Duplicate' },
] as const;

describe('RadioField — naming a group', () => {
  it('names the group with a legend, not a label', () => {
    // A <label> cannot name three radios. <legend> can, and an AT announces it
    // before each option.
    render(<RadioField field={makeField('wrong_amount')} legend="Reject reason" options={REASONS} />);
    const group = screen.getByRole('group', { name: 'Reject reason' });
    expect(group.tagName).toBe('FIELDSET');
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
  });

  it('gives every option its own accessible name', () => {
    render(<RadioField field={makeField('wrong_amount')} legend="Reject reason" options={REASONS} />);
    for (const o of REASONS) {
      expect(screen.getByLabelText(o.label, { exact: false })).toBeInstanceOf(HTMLInputElement);
    }
  });

  it('shares one name across the options, so they are one group', () => {
    // Without a shared name every radio is its own group: two could be checked
    // at once and arrow keys would do nothing.
    render(<RadioField field={makeField('wrong_amount')} legend="Reject reason" options={REASONS} />);
    const names = new Set(screen.getAllByRole('radio').map((r) => (r as HTMLInputElement).name));
    expect(names.size).toBe(1);
  });

  it('checks exactly the selected option', () => {
    render(<RadioField field={makeField('duplicate')} legend="Reject reason" options={REASONS} />);
    const checked = screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked);
    expect(checked).toHaveLength(1);
    expect((checked[0] as HTMLInputElement).value).toBe('duplicate');
  });

  it('reports the chosen value, not the event', () => {
    const field = makeField('wrong_amount');
    render(<RadioField field={field} legend="Reject reason" options={REASONS} />);
    fireEvent.click(screen.getByLabelText('Duplicate', { exact: false }));
    expect(field.handleChange).toHaveBeenCalledWith('duplicate');
  });
});

describe('RadioField — state', () => {
  it('announces a description through aria-describedby', () => {
    render(
      <RadioField
        field={makeField('wrong_amount')}
        legend="Reject reason"
        options={REASONS}
        description="The member is told this."
      />,
    );
    const group = screen.getByRole('group', { name: 'Reject reason' });
    const describedBy = group.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe('The member is told this.');
  });

  it('marks the group invalid and announces the error, replacing the description', () => {
    const field = makeField('wrong_amount', {
      state: { value: 'wrong_amount', meta: { errors: ['Choose a reason.'], isTouched: true } },
    });
    render(
      <RadioField
        field={field}
        legend="Reject reason"
        options={REASONS}
        description="The member is told this."
      />,
    );
    const group = screen.getByRole('group', { name: 'Reject reason' });
    expect(group.getAttribute('aria-invalid')).toBe('true');
    const describedBy = group.getAttribute('aria-describedby')!;
    // The error takes the row: a hint read before the thing that went wrong is
    // the wrong order once something has gone wrong.
    expect(document.getElementById(describedBy)?.textContent).toBe('Choose a reason.');
  });

  it('hides a client error until the field is touched', () => {
    const untouched = makeField('wrong_amount', {
      state: { value: 'wrong_amount', meta: { errors: ['Choose a reason.'], isTouched: false } },
    });
    render(<RadioField field={untouched} legend="Reject reason" options={REASONS} />);
    expect(screen.queryByText('Choose a reason.')).toBeNull();
  });

  it('shows a server error immediately, touched or not', () => {
    // The user has already submitted; there is nothing left to wait for.
    render(
      <RadioField
        field={makeField('wrong_amount')}
        legend="Reject reason"
        options={REASONS}
        serverError="That reason is no longer accepted."
      />,
    );
    expect(screen.getByText('That reason is no longer accepted.')).toBeTruthy();
  });

  it('disables every option when the group is disabled', () => {
    render(
      <RadioField field={makeField('wrong_amount')} legend="Reject reason" options={REASONS} disabled />,
    );
    for (const r of screen.getAllByRole('radio')) {
      expect((r as HTMLInputElement).disabled).toBe(true);
    }
  });

  it('disables only the option that asks for it', () => {
    const options = [...REASONS.slice(0, 2), { value: 'duplicate', label: 'Duplicate', disabled: true }];
    render(<RadioField field={makeField('wrong_amount')} legend="Reject reason" options={options} />);
    const byValue = Object.fromEntries(
      screen.getAllByRole('radio').map((r) => [(r as HTMLInputElement).value, r as HTMLInputElement]),
    );
    expect(byValue.duplicate!.disabled).toBe(true);
    expect(byValue.wrong_amount!.disabled).toBe(false);
  });

  it('marks the group required without adding the asterisk to the accessible name', () => {
    render(
      <RadioField field={makeField('wrong_amount')} legend="Reject reason" options={REASONS} required />,
    );
    // The name must stay "Reject reason" — WCAG 2.5.3 is about the visible and
    // accessible names matching, and "Reject reason *" matches neither well.
    const group = screen.getByRole('group', { name: 'Reject reason' });
    expect(group.getAttribute('aria-required')).toBe('true');
  });
});

describe('MonthFieldControl', () => {
  it('renders a month input associated with its label', () => {
    render(<MonthFieldControl field={makeField('2026-03')} label="Payout month" />);
    const input = screen.getByLabelText('Payout month') as HTMLInputElement;
    expect(input.type).toBe('month');
    expect(input.value).toBe('2026-03');
  });

  it('passes the raw string through without parsing it', () => {
    const field = makeField('2026-03');
    render(<MonthFieldControl field={field} label="Payout month" />);
    fireEvent.change(screen.getByLabelText('Payout month'), { target: { value: '2026-04' } });
    expect(field.handleChange).toHaveBeenCalledWith('2026-04');
  });
});

describe('the month primitive', () => {
  const m = monthField({ label: 'Payout month' });

  it('accepts a month and normalises a full date to one', () => {
    // An API returning 2026-03-01 for a month is describing the same month;
    // rejecting it would stop an edit form loading its own saved value.
    expect(m.safeParse('2026-03').data).toBe('2026-03');
    expect(m.safeParse('2026-03-01').data).toBe('2026-03');
  });

  it('rejects a month outside 01–12', () => {
    expect(m.safeParse('2026-13').success).toBe(false);
    expect(m.safeParse('2026-00').success).toBe(false);
  });

  it('rejects a shape that is not a month', () => {
    expect(m.safeParse('March 2026').success).toBe(false);
    expect(m.safeParse('2026').success).toBe(false);
  });

  it('treats empty as absent, and required as required', () => {
    expect(m.safeParse('').data).toBe(null);
    expect(monthField({ label: 'Payout month', required: true }).safeParse('').success).toBe(false);
  });

  it('bounds by string comparison, which needs no timezone', () => {
    const bounded = monthField({ label: 'Payout month', min: '2026-01', max: '2026-06' });
    expect(bounded.safeParse('2026-03').success).toBe(true);
    expect(bounded.safeParse('2025-12').success).toBe(false);
    expect(bounded.safeParse('2026-07').success).toBe(false);
  });
});
