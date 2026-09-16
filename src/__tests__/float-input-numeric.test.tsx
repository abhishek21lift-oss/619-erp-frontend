/**
 * `FloatInput` is the field component the assessment screens are built from —
 * 43 files, and until now every one of them carried two defects it could not
 * fix for itself.
 *
 * 1. `type` passed straight through, so `type="number"` reached the DOM. A
 *    scroll wheel over a FOCUSED number input silently changes its value, and
 *    on these screens that value is a body measurement: a waist
 *    circumference, a blood pressure, a 1RM that becomes a
 *    "Novice / Intermediate / Advanced" label about a person. Same class as
 *    `Number('')` becoming `0` — a number that looks entered and was not.
 *
 * 2. `error` rendered a loose <p> beside the control. Visible to anyone
 *    looking at it, announced to nobody: no id, no `aria-describedby`, no
 *    `aria-invalid`.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FloatInput, { clampNumericText } from '@/components/ui/FloatInput';

function Field(props: Partial<React.ComponentProps<typeof FloatInput>> = {}) {
  const [value, setValue] = React.useState(props.value ?? '');
  return (
    <FloatInput
      label="Weight (kg)"
      {...props}
      value={value}
      onChange={(v) => { setValue(v); props.onChange?.(v); }}
    />
  );
}

describe('the wheel hazard', () => {
  it('never renders type="number", however the caller spells it', () => {
    render(<Field type="number" />);
    const input = screen.getByLabelText(/Weight/);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('still opens a numeric keypad on a phone', () => {
    render(<Field type="number" />);
    // inputMode is what §19 actually wants; type=number was never needed for it.
    expect(screen.getByLabelText(/Weight/)).toHaveAttribute('inputMode', 'decimal');
  });

  it('infers decimal from a bare type="number", so 62.5kg stays enterable', () => {
    render(<Field type="number" />);
    expect(screen.getByLabelText(/Weight/)).toHaveAttribute('inputMode', 'decimal');
  });

  it('opens the plain keypad for an integer field', () => {
    render(<Field numeric="integer" />);
    expect(screen.getByLabelText(/Weight/)).toHaveAttribute('inputMode', 'numeric');
  });

  it('lets an explicit inputMode win', () => {
    render(<Field numeric="integer" inputMode="decimal" />);
    expect(screen.getByLabelText(/Weight/)).toHaveAttribute('inputMode', 'decimal');
  });

  it('leaves every other type alone', () => {
    render(<Field type="date" />);
    expect(screen.getByLabelText(/Weight/)).toHaveAttribute('type', 'date');
  });
});

describe('keeping numeric text numeric', () => {
  // What type="number" gave for free is replicated rather than lost.
  it('drops letters a text input would otherwise accept', () => {
    const onChange = vi.fn();
    render(<Field type="number" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Weight/), { target: { value: '7a2b' } });
    expect(onChange).toHaveBeenLastCalledWith('72');
  });

  it("drops the 'e' that type=number accepted in Safari", () => {
    const onChange = vi.fn();
    render(<Field type="number" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Weight/), { target: { value: '1e5' } });
    expect(onChange).toHaveBeenLastCalledWith('15');
  });

  it('allows the intermediate states on the way to a real number', () => {
    // A filter that rejected "1." would make 1.5 unenterable.
    for (const partial of ['', '-', '1', '1.', '1.5', '0.']) {
      expect(clampNumericText(partial, 'decimal')).toBe(partial);
    }
  });

  it('keeps one decimal point, not the last one typed', () => {
    expect(clampNumericText('1.2.3', 'decimal')).toBe('1.23');
  });

  it('refuses a point in an integer field', () => {
    expect(clampNumericText('12.5', 'integer')).toBe('125');
  });

  it('keeps a leading minus rather than silently dropping it', () => {
    // Sign is the schema's call. A filter that ate the minus would make "-5"
    // unenterable and therefore unreportable as invalid.
    expect(clampNumericText('-5', 'decimal')).toBe('-5');
    expect(clampNumericText('5-3', 'decimal')).toBe('53');
  });

  it('leaves a non-numeric field completely alone', () => {
    const onChange = vi.fn();
    render(<Field onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Weight/), { target: { value: 'Bench Press' } });
    expect(onChange).toHaveBeenLastCalledWith('Bench Press');
  });
});

describe('the error, announced rather than merely drawn', () => {
  it('marks the control invalid', () => {
    render(<Field error="Weight must be between 20 and 400 kg." />);
    expect(screen.getByLabelText(/Weight/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('points the control at the message', () => {
    render(<Field error="Weight must be between 20 and 400 kg." />);
    const input = screen.getByLabelText(/Weight/);
    const id = input.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)?.textContent).toBe('Weight must be between 20 and 400 kg.');
  });

  it('says nothing when there is nothing wrong', () => {
    render(<Field />);
    const input = screen.getByLabelText(/Weight/);
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('carries required to assistive tech, not just to the asterisk', () => {
    render(<Field required />);
    expect(screen.getByLabelText(/Weight/)).toBeRequired();
  });

  it('wires a multiline field the same way', () => {
    render(<Field multiline error="Too long." />);
    const area = screen.getByLabelText(/Weight/);
    expect(area).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(area.getAttribute('aria-describedby')!)?.textContent)
      .toBe('Too long.');
  });
});
