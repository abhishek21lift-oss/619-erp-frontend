// Copying a client ID: the control must announce what it does, not just the
// ID, and the copy must be confirmed in a live region rather than by colour.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CopyId } from '@/components/ui/CopyId';

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

describe('CopyId', () => {
  it('names the action, not the ID', () => {
    render(<CopyId id="PT-001" />);
    expect(screen.getByRole('button', { name: 'Copy client ID' })).toBeInTheDocument();
  });

  it('confirms the copy in a live region', async () => {
    render(<CopyId id="PT-001" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy client ID' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('PT-001'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Client ID copied'));
    expect(screen.getByRole('button', { name: 'Client ID copied' })).toBeInTheDocument();
  });
});
