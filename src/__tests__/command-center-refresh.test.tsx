// The Command Center refresh registry.
//
// Pull-to-refresh and the shell's desktop button share this registry, so the
// properties that matter are about concurrency and honesty:
//
//   * two triggers at once must run one refresh, not two;
//   * the second caller must await the first and get its real result;
//   * a failing screen must be counted, not swallowed;
//   * an unmounted screen must stop being refreshed.

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import {
  CommandCenterRefreshProvider, useCommandCenterRefresh, useCommandCenterRefreshRegistry,
} from '@/contexts/command-center-refresh';

function Screen({ load }: { load: () => unknown | Promise<unknown> }) {
  useCommandCenterRefresh(load);
  return <div>screen</div>;
}

function Controls() {
  const { refreshAll, refreshing, failed, lastRefreshedAt } = useCommandCenterRefreshRegistry();
  return (
    <div>
      <span data-testid="refreshing">{String(refreshing)}</span>
      <span data-testid="failed">{String(failed)}</span>
      <span data-testid="at">{String(lastRefreshedAt)}</span>
      <button onClick={() => { void refreshAll(); }}>refresh</button>
      <span data-testid="result" />
    </div>
  );
}

describe('CommandCenterRefreshProvider', () => {
  it('runs registered loaders and reports success', async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    let api: ReturnType<typeof useCommandCenterRefreshRegistry> | null = null;
    function Probe() {
      api = useCommandCenterRefreshRegistry();
      return null;
    }
    render(
      <CommandCenterRefreshProvider>
        <Screen load={load} />
        <Probe />
      </CommandCenterRefreshProvider>,
    );
    let out: { ok: number; failed: number } | undefined;
    await act(async () => { out = await api!.refreshAll(); });
    expect(load).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ ok: 1, failed: 0 });
  });

  it('collapses two concurrent refreshes into one request', async () => {
    let release: (() => void) | null = null;
    const load = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    let api: ReturnType<typeof useCommandCenterRefreshRegistry> | null = null;
    function Probe() {
      api = useCommandCenterRefreshRegistry();
      return null;
    }
    render(
      <CommandCenterRefreshProvider>
        <Screen load={load} />
        <Probe />
      </CommandCenterRefreshProvider>,
    );

    let first: Promise<{ ok: number; failed: number }>;
    let second: Promise<{ ok: number; failed: number }>;
    act(() => { first = api!.refreshAll(); });
    act(() => { second = api!.refreshAll(); });
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => { release?.(); });
    await expect(first!).resolves.toEqual({ ok: 1, failed: 0 });
    await expect(second!).resolves.toEqual({ ok: 1, failed: 0 });
  });

  it('counts a rejected loader without failing the others', async () => {
    const ok = vi.fn().mockResolvedValue(undefined);
    const bad = vi.fn().mockRejectedValue(new Error('collector down'));
    let api: ReturnType<typeof useCommandCenterRefreshRegistry> | null = null;
    function Probe() {
      api = useCommandCenterRefreshRegistry();
      return null;
    }
    render(
      <CommandCenterRefreshProvider>
        <Screen load={ok} />
        <Screen load={bad} />
        <Probe />
      </CommandCenterRefreshProvider>,
    );
    let out: { ok: number; failed: number } | undefined;
    await act(async () => { out = await api!.refreshAll(); });
    expect(out).toEqual({ ok: 1, failed: 1 });
  });

  it('stops refreshing a screen that unmounts', async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    let api: ReturnType<typeof useCommandCenterRefreshRegistry> | null = null;
    function Probe() {
      api = useCommandCenterRefreshRegistry();
      return null;
    }
    const view = render(
      <CommandCenterRefreshProvider>
        <Screen load={load} />
        <Probe />
      </CommandCenterRefreshProvider>,
    );
    view.rerender(
      <CommandCenterRefreshProvider>
        <Probe />
      </CommandCenterRefreshProvider>,
    );
    await act(async () => { await api!.refreshAll(); });
    expect(load).not.toHaveBeenCalled();
  });

  it('is inert outside the provider', async () => {
    const view = render(<Controls />);
    await act(async () => {
      view.getByRole('button').click();
    });
    // No throw, no stuck spinner: the inert registry resolves with zero work.
    await waitFor(() => expect(view.getByTestId('refreshing').textContent).toBe('false'));
  });
});
