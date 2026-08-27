// FormField's contract, exercised against a real render.
//
// These assert the things the audit found missing everywhere else in the app:
// aria-describedby existed in one component, aria-invalid in one, and a
// description that is rendered but never referenced announces nothing. The
// point of putting the wiring in context is that a call site cannot get those
// wrong — so the tests check the wiring, not the call sites.

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  FormField, TextInput, TextArea, SelectInput, SearchField, TextFieldRow,
} from '@/components/ui/form';

describe('the name', () => {
  it('associates the label with the control', () => {
    render(<FormField label="Weight (kg)"><TextInput /></FormField>);
    // getByLabelText resolves the same way an AT does — htmlFor/id, wrapping,
    // aria-label, aria-labelledby. If the association broke, this throws.
    expect(screen.getByLabelText('Weight (kg)')).toBeInstanceOf(HTMLInputElement);
  });

  it('gives the control exactly one name', () => {
    // The failure this design exists to prevent: an aria-label added to a
    // field that already has a <label> wins over it silently.
    render(<FormField label="Weight (kg)"><TextInput /></FormField>);
    const input = screen.getByLabelText('Weight (kg)');
    expect(input.getAttribute('aria-label')).toBeNull();
    expect(input.getAttribute('aria-labelledby')).toBeNull();
  });

  it('does not disappear when the field has a value', () => {
    // The whole point of the phase. A placeholder-as-label vanishes on input.
    render(<FormField label="Total sessions"><TextInput /></FormField>);
    fireEvent.change(screen.getByLabelText('Total sessions'), { target: { value: '12' } });
    expect(screen.getByLabelText('Total sessions')).toHaveValue('12');
    expect(screen.getByText('Total sessions')).toBeVisible();
  });

  it('generates a unique id per field', () => {
    render(<>
      <FormField label="First"><TextInput /></FormField>
      <FormField label="Second"><TextInput /></FormField>
    </>);
    const a = screen.getByLabelText('First').id;
    const b = screen.getByLabelText('Second').id;
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('the description', () => {
  it('is referenced by aria-describedby, not merely rendered', () => {
    render(
      <FormField label="Link valid for" description="Minutes, 5 to 1440.">
        <TextInput />
      </FormField>,
    );
    const input = screen.getByLabelText('Link valid for');
    const id = input.getAttribute('aria-describedby');
    expect(id, 'description rendered but not announced').toBeTruthy();
    expect(document.getElementById(id!)).toHaveTextContent('Minutes, 5 to 1440.');
  });

  it('leaves aria-describedby unset when there is nothing to describe', () => {
    // Pointing at an id that does not exist is worse than not pointing.
    render(<FormField label="Plain"><TextInput /></FormField>);
    expect(screen.getByLabelText('Plain').getAttribute('aria-describedby')).toBeNull();
  });
});

describe('the error', () => {
  it('is announced and marks the control invalid', () => {
    render(
      <FormField label="GST %" error="Must be between 0 and 28.">
        <TextInput />
      </FormField>,
    );
    const input = screen.getByLabelText('GST %');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const id = input.getAttribute('aria-describedby');
    expect(document.getElementById(id!)).toHaveTextContent('Must be between 0 and 28.');
  });

  it('replaces the description rather than joining it', () => {
    // Both at once reads the hint before the thing that went wrong.
    render(
      <FormField label="GST %" description="0 hides the line." error="Out of range.">
        <TextInput />
      </FormField>,
    );
    expect(screen.queryByText('0 hides the line.')).toBeNull();
    expect(screen.getByText('Out of range.')).toBeVisible();
  });

  it('is not aria-invalid when there is no error', () => {
    render(<FormField label="Fine"><TextInput /></FormField>);
    expect(screen.getByLabelText('Fine').getAttribute('aria-invalid')).toBeNull();
  });

  it('can reserve its row so appearing does not shift the fields below', () => {
    const { container } = render(
      <FormField label="Amount" reserveMessageSpace><TextInput /></FormField>,
    );
    expect(container.querySelector('.min-h-\\[16px\\]')).not.toBeNull();
  });
});

describe('state', () => {
  it('marks required on the control, and hides the asterisk from AT', () => {
    render(<FormField label="Trainer" required><SelectInput><option>A</option></SelectInput></FormField>);
    expect(screen.getByLabelText('Trainer')).toBeRequired();
    // The star is decoration; `required` already carries the meaning.
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('disables the control from the field', () => {
    render(<FormField label="Locked" disabled><TextInput /></FormField>);
    expect(screen.getByLabelText('Locked')).toBeDisabled();
  });

  it('sets readOnly without disabling, so the value stays selectable', () => {
    render(<FormField label="Reference" readOnly><TextInput defaultValue="INV-1" /></FormField>);
    const input = screen.getByLabelText('Reference');
    expect(input).toHaveAttribute('readonly');
    expect(input).not.toBeDisabled();
  });
});

describe('the controls', () => {
  it('wires a textarea the same way', () => {
    render(<FormField label="Notes" description="Optional."><TextArea /></FormField>);
    const area = screen.getByLabelText('Notes');
    expect(area.tagName).toBe('TEXTAREA');
    expect(area.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('wires a select the same way', () => {
    render(
      <FormField label="Duration">
        <SelectInput defaultValue="60"><option value="30">30 min</option><option value="60">60 min</option></SelectInput>
      </FormField>,
    );
    expect(screen.getByLabelText('Duration')).toHaveValue('60');
  });

  it('passes native attributes straight through', async () => {
    // A wrapper that swallows inputMode or autoComplete is worse than none —
    // those are what make a phone show the right keyboard.
    render(
      <FormField label="Mobile Number">
        <TextInput type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} />
      </FormField>,
    );
    const input = screen.getByLabelText('Mobile Number');
    expect(input).toHaveAttribute('type', 'tel');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('autocomplete', 'tel');
    expect(input).toHaveAttribute('maxlength', '10');
  });

  it('keeps the caller onChange working', () => {
    let seen = '';
    render(
      <FormField label="Package name">
        <TextInput onChange={(e) => { seen = e.target.value; }} />
      </FormField>,
    );
    fireEvent.change(screen.getByLabelText('Package name'), { target: { value: 'PT12' } });
    expect(seen).toBe('PT12');
  });

  it('never sets an inline outline, so the global focus ring applies', () => {
    // 56 inline outline:none declarations were removed last phase precisely so
    // controls inherit the :focus-visible ring. Reintroducing one here would
    // undo that for every field in the system at once.
    render(<FormField label="Focusable"><TextInput /></FormField>);
    const input = screen.getByLabelText('Focusable') as HTMLInputElement;
    input.focus();
    expect(input).toHaveFocus();
    expect(input.style.outline).toBe('');
  });

  it('gives every control a 44px touch target', () => {
    // globals.css sets html{font-size:14px}, so padding-derived heights land
    // under what a thumb needs.
    render(<>
      <FormField label="A"><TextInput /></FormField>
      <FormField label="B"><SelectInput><option>x</option></SelectInput></FormField>
    </>);
    for (const name of ['A', 'B']) {
      expect((screen.getByLabelText(name) as HTMLElement).style.minHeight).toBe('44px');
    }
  });

  it('works standalone, outside a FormField', () => {
    // Several places need a bare control with their own label; throwing there
    // would make these less reusable than the raw element they wrap.
    render(<><label htmlFor="own">Own label</label><TextInput id="own" /></>);
    expect(screen.getByLabelText('Own label')).toBeInstanceOf(HTMLInputElement);
  });
});

describe('SearchField', () => {
  it('has a real associated label that is only visually hidden', () => {
    render(<SearchField label="Search clients" />);
    const input = screen.getByLabelText('Search clients');
    expect(input).toHaveAttribute('type', 'search');
    // Named by a <label>, not an aria-label bolted on.
    expect(input.getAttribute('aria-label')).toBeNull();
    expect(screen.getByText('Search clients').closest('.sr-only')).not.toBeNull();
  });

  it('keeps its name after the user types', () => {
    render(<SearchField label="Search clients" placeholder="Search clients…" />);
    fireEvent.change(screen.getByLabelText('Search clients'), { target: { value: 'ana' } });
    expect(screen.getByLabelText('Search clients')).toHaveValue('ana');
  });

  it('defaults the placeholder to the label', () => {
    render(<SearchField label="Search invoices" />);
    expect(screen.getByLabelText('Search invoices')).toHaveAttribute('placeholder', 'Search invoices');
  });
});

describe('TextFieldRow', () => {
  it('is the whole field in one element', () => {
    render(
      <TextFieldRow label="Email Address" type="email" description="We only use this for receipts."
        required defaultValue="a@b.com" />,
    );
    const input = screen.getByLabelText('Email Address');
    expect(input).toBeRequired();
    expect(input).toHaveValue('a@b.com');
    expect(document.getElementById(input.getAttribute('aria-describedby')!))
      .toHaveTextContent('We only use this for receipts.');
  });
});
