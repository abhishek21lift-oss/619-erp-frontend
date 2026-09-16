/**
 * `resetTo`, and the render that used to undo it.
 *
 * ── The bug ────────────────────────────────────────────────────────────────
 *
 * TanStack's `useForm` calls `form.update(options)` on every render, and
 * `update` re-seeds the values whenever the incoming `defaultValues` is not
 * deeply equal to the previous one and the form is untouched. `form.reset(v)`
 * also sets `options.defaultValues` to `v`.
 *
 * Put those together with the ordinary call shape —
 *
 *     useAppForm({ defaultValues: blankAutomationRule(), … })
 *
 * — and `resetTo` lasts exactly one frame: reset stores the record as the new
 * defaults, the component re-renders and passes a fresh blank object, update
 * finds them unequal and the form untouched, and the values go back to blank.
 *
 * What that looked like in the product: clicking Edit on an automation rule
 * opened the form with the rule's name, template and delay for a single frame
 * and then cleared it, so the studio owner edited a blank form over their own
 * rule. `resetTo` is the documented way to rebuild a form from the
 * authoritative record — the whole reset contract is written in terms of it —
 * so it has to survive a render.
 *
 * Caught by an end-to-end journey (edit rule A, then rule B) rather than by
 * any unit test, because it needs a render AFTER the reset and nothing in the
 * unit suite was doing that.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';
import { z } from 'zod';
import { useAppForm } from '@/lib/forms/useAppForm';
import { textField } from '@/lib/forms/primitives';

const schema = z.object({
  name: textField({ label: 'Name', required: true, maxLength: 50 }),
  note: textField({ label: 'Note', maxLength: 50 }),
});

type State = { name: string; note: string };
const blank = (): State => ({ name: '', note: '' });

/**
 * A component shaped exactly like the real call sites: `defaultValues` is a
 * fresh object on every render, and a piece of unrelated state re-renders it.
 */
function Harness({ record }: { record: State }) {
  const [tick, setTick] = useState(0);

  const f = useAppForm({
    schema,
    defaultValues: blank(),
    onSubmit: async () => {},
  });

  return (
    <div>
      <f.form.Field name="name">
        {(field) => (
          <input
            aria-label="Name"
            value={String(field.state.value ?? '')}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </f.form.Field>
      <f.form.Field name="note">
        {(field) => (
          <input
            aria-label="Note"
            value={String(field.state.value ?? '')}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </f.form.Field>
      <button type="button" onClick={() => f.resetTo(record)}>Load record</button>
      <button type="button" onClick={() => setTick((t) => t + 1)}>Re-render</button>
      <button type="button" onClick={() => f.resetTo(blank())}>Clear</button>
      <span data-testid="tick">{tick}</span>
    </div>
  );
}

const RECORD: State = { name: 'ALPHA RULE', note: 'Hi {{name}}' };

describe('useAppForm resetTo', () => {
  it('seeds the form from a record', () => {
    render(<Harness record={RECORD} />);
    fireEvent.click(screen.getByText('Load record'));

    expect(screen.getByLabelText('Name')).toHaveValue('ALPHA RULE');
    expect(screen.getByLabelText('Note')).toHaveValue('Hi {{name}}');
  });

  it('survives a re-render — the whole bug', () => {
    render(<Harness record={RECORD} />);
    fireEvent.click(screen.getByText('Load record'));

    // Anything at all re-rendering the component: a refetch resolving, a
    // parent's state changing, a toast appearing.
    act(() => { fireEvent.click(screen.getByText('Re-render')); });
    expect(screen.getByTestId('tick')).toHaveTextContent('1');

    expect(screen.getByLabelText('Name'), 'the record is still there').toHaveValue('ALPHA RULE');
    expect(screen.getByLabelText('Note')).toHaveValue('Hi {{name}}');
  });

  it('survives several re-renders', () => {
    render(<Harness record={RECORD} />);
    fireEvent.click(screen.getByText('Load record'));
    for (let i = 0; i < 5; i += 1) {
      act(() => { fireEvent.click(screen.getByText('Re-render')); });
    }
    expect(screen.getByLabelText('Name')).toHaveValue('ALPHA RULE');
  });

  it('still lets a later reset clear the form', () => {
    // The seed must not become sticky: cancelling has always reset to blank,
    // and it still has to.
    render(<Harness record={RECORD} />);
    fireEvent.click(screen.getByText('Load record'));
    fireEvent.click(screen.getByText('Clear'));
    act(() => { fireEvent.click(screen.getByText('Re-render')); });

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Note')).toHaveValue('');
  });

  it('does not eat what the user types afterwards', () => {
    render(<Harness record={RECORD} />);
    fireEvent.click(screen.getByText('Load record'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'EDITED' } });
    act(() => { fireEvent.click(screen.getByText('Re-render')); });

    expect(screen.getByLabelText('Name'), 'the edit survives too').toHaveValue('EDITED');
  });

  it('lets the caller re-seed by changing its own defaultValues', () => {
    // The `editing ? toFormValues(editing) : blank()` shape a few components
    // use. When the CALLER's defaults change, the caller wins — otherwise the
    // fix above would make a form permanently deaf to its own props.
    function CallerSeeded({ initial }: { initial: State }) {
      const f = useAppForm({ schema, defaultValues: { ...initial }, onSubmit: async () => {} });
      return (
        <f.form.Field name="name">
          {(field) => <input aria-label="Name" readOnly value={String(field.state.value ?? '')} />}
        </f.form.Field>
      );
    }

    const { rerender } = render(<CallerSeeded initial={{ name: 'FIRST', note: '' }} />);
    expect(screen.getByLabelText('Name')).toHaveValue('FIRST');

    rerender(<CallerSeeded initial={{ name: 'SECOND', note: '' }} />);
    expect(screen.getByLabelText('Name'), 'the caller changed its mind').toHaveValue('SECOND');
  });
});
