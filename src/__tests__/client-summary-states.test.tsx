// A failed summary is not an empty client.
//
// Both components used to collapse loading/failure into "nothing to show":
// the snapshot vanished, and Check-ins said "No check-ins recorded yet" while
// the request was still in flight or had failed. These pin the three states
// and the retry.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClientSnapshot, { normaliseSnapshot } from '@/components/pt-os/ClientSnapshot';
import RecoveryPanel from '@/components/pt-os/client/RecoveryPanel';
import type { ClientSnapshot as Snapshot } from '@/lib/api';

const empty = {
  alerts: [],
  goal: { present: false },
  prs: [],
  coach: [],
  recovery: { present: false, weeks: [] },
  baseline_done: false,
} as unknown as Snapshot;

describe('ClientSnapshot states', () => {
  it('shows a skeleton, not silence, while loading', () => {
    render(<ClientSnapshot clientId="c1" state={{ status: 'loading' }} onRetry={() => {}} />);
    const region = screen.getByLabelText('Loading client summary');
    expect(region).toHaveAttribute('aria-busy', 'true');
  });

  it('says the request failed and offers a retry', () => {
    const onRetry = vi.fn();
    render(
      <ClientSnapshot
        clientId="c1"
        state={{ status: 'error', message: 'network down' }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/network down/);
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the summary once it answers', () => {
    render(<ClientSnapshot clientId="c1" state={{ status: 'ready', snapshot: empty }} onRetry={() => {}} />);
    expect(screen.getByText(/Nothing needs attention/)).toBeInTheDocument();
  });

  it('reads a partial payload as empty instead of throwing', () => {
    const safe = normaliseSnapshot({ alerts: null } as unknown as Snapshot);
    expect(safe.alerts).toEqual([]);
    expect(safe.prs).toEqual([]);
    expect(safe.coach).toEqual([]);
    expect(safe.baseline_done).toBe(false);
  });
});

describe('RecoveryPanel states', () => {
  it('does not claim there are no check-ins while loading', () => {
    render(<RecoveryPanel clientId="c1" status="loading" />);
    expect(screen.getByLabelText('Loading readiness')).toBeInTheDocument();
    expect(screen.queryByText(/No check-ins recorded yet/)).toBeNull();
  });

  it('does not claim there are no check-ins when the summary failed', () => {
    const onRetry = vi.fn();
    render(<RecoveryPanel clientId="c1" status="error" error="network down" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/network down/);
    expect(screen.queryByText(/No check-ins recorded yet/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the genuine empty state only after an answer', () => {
    render(<RecoveryPanel clientId="c1" status="ready" recovery={{ present: false, weeks: [] }} />);
    expect(screen.getByText(/No check-ins recorded yet/)).toBeInTheDocument();
  });
});
