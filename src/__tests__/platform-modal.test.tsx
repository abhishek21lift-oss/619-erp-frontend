// The console's shared Modal is the dialog behind every money action. The
// hook's own behaviour is covered in useDialogA11y.test.tsx; this pins that the
// modal actually uses it and exposes a named dialog, because a source scan for
// `role="dialog"` cannot see whether focus ever entered.

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';
import { Modal } from '@/app/(platform)/platform/_shared/ui';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Open payment</button>
      {open && (
        <Modal title="Record payment · Studio" onClose={() => setOpen(false)}>
          <label>Amount <input /></label>
        </Modal>
      )}
    </div>
  );
}

describe('the platform Modal is a real dialog', () => {
  it('takes its name from the title, labels the close, and returns focus on Escape', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open payment' });
    trigger.focus(); // jsdom does not focus on click; a real browser does.
    act(() => { fireEvent.click(trigger); });

    const dialog = screen.getByRole('dialog', { name: 'Record payment · Studio' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    screen.getByRole('button', { name: 'Close dialog' });

    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
