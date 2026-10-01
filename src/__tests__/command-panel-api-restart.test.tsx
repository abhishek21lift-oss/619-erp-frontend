// "Restart API container" restarts the process that answers the press, so its
// response is usually lost. These pin what the panel does about that: it picks
// the request id itself, treats a dropped connection as "restarting" rather
// than "failed", and reports the verdict the NEW process recorded — never the
// 204 Docker gave the old one.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const run = vi.fn();
const status = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    superAdmin: {
      commandCenterCommands: async () => ({
        data: {
          commands: [{
            name: 'container.restart', label: 'Restart API container', description: 'Rung 5',
            blast_radius: 'The API is unreachable for a few seconds.', destructive: true,
            accepts_queue: false, queues: null, unavailable_reason: null, cooldown_ms: 60_000,
          }],
        },
      }),
      runCommandCenterCommand: (...a: unknown[]) => run(...a),
      commandCenterApiRestartStatus: (...a: unknown[]) => status(...a),
    },
  },
}));

import CommandPanel from '@/components/platform/command-panel';
import { ApiError } from '@/lib/http';

async function pressAndConfirm() {
  render(<CommandPanel />);
  fireEvent.click(await screen.findByRole('button', { name: /^\s*run\s*$/i }));
  const input = await screen.findByLabelText(/to confirm/i);
  fireEvent.change(input, { target: { value: 'container.restart' } });
  const dialog = await screen.findByRole('dialog');
  const buttons = Array.from(dialog.querySelectorAll('button'));
  fireEvent.click(buttons[buttons.length - 1]);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  run.mockReset();
  status.mockReset();
  // First press: the server asks for the typed confirmation.
  run.mockRejectedValueOnce(new ApiError('confirm', 428, 'CONFIRMATION_REQUIRED'));
});
afterEach(() => { vi.useRealTimers(); });

describe('Restart API container', () => {
  it('sends its own request id and reports the verdict the new process recorded', async () => {
    // The restart kills the connection — what a real press usually looks like.
    run.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    status
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))            // API still down
      .mockResolvedValueOnce({ data: { state: 'pending', request_id: 'x' } })
      .mockResolvedValueOnce({ data: {
        state: 'verified', request_id: 'x', outcome: 'recovered', downtime_ms: 7000,
        summary: 'The API restarted and is serving; database and Redis are reachable.',
      } });

    await pressAndConfirm();
    await waitFor(() => expect(run).toHaveBeenCalledTimes(2));
    const [, body, opts] = run.mock.calls[1];
    expect(body).toMatchObject({ confirm: 'container.restart' });
    expect(opts.requestId).toMatch(/^[0-9a-f-]{36}$/);

    expect(await screen.findByText(/waiting for the new process/i)).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(await screen.findByText(/API restarted and is serving.*back after 7s/)).toBeTruthy();
    expect(status).toHaveBeenCalledWith(opts.requestId);
  });

  it('reports a restart that did not recover as a failure, not a success', async () => {
    run.mockResolvedValueOnce({ data: { command: 'container.restart', outcome: 'ok', duration_ms: 40, queue: null,
      output: { outcome: 'restart_requested' } } });
    status.mockResolvedValue({ data: {
      state: 'verified', request_id: 'x', outcome: 'not_recovered',
      summary: 'The API restarted, but database is still critical.',
    } });
    await pressAndConfirm();
    await act(async () => { await vi.advanceTimersByTimeAsync(4_000); });
    expect(await screen.findByText(/database is still critical/)).toBeTruthy();
  });

  it('a ladder refusal is shown as it is and nothing is polled', async () => {
    run.mockRejectedValueOnce(new ApiError('Restart the worker first.', 409, 'LADDER_ORDER'));
    await pressAndConfirm();
    expect(await screen.findByText(/Restart the worker first/)).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(status).not.toHaveBeenCalled();
  });
});
