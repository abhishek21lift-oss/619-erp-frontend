// Autosave for the workout builder.
//
// The brief asks for no save button and a `Saved ✓`. What actually needs
// testing is not the happy path but the three ways silent autosave loses work:
// merging edits that should not merge, dropping edits made while a request is
// in flight, and — worst — showing `Saved ✓` when the write failed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutosave, saveStatusLabel } from '@/components/pt-os/builder/useAutosave';

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

/** Advance past the 600ms debounce and let the flush promise settle. */
async function settle(ms = 700) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe('useAutosave — batching', () => {
  it('coalesces rapid edits to one exercise into a single request', async () => {
    // A trainer editing sets, then reps, then rest on one card produces three
    // edits a few hundred ms apart. Three PATCHes on the same row can also land
    // out of order; one merged request cannot.
    const save = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutosave({ save }));

    act(() => {
      result.current.enqueue('row-1', { sets: 4 });
      result.current.enqueue('row-1', { reps: 8 });
      result.current.enqueue('row-1', { rest_seconds: 90 });
    });
    await settle();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('row-1', { sets: 4, reps: 8, rest_seconds: 90 });
  });

  it('keeps edits to different exercises as separate requests', async () => {
    // Merging across rows would send one row's values to another.
    const save = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutosave({ save }));

    act(() => {
      result.current.enqueue('row-1', { sets: 4 });
      result.current.enqueue('row-2', { sets: 5 });
    });
    await settle();

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith('row-1', { sets: 4 });
    expect(save).toHaveBeenCalledWith('row-2', { sets: 5 });
  });

  it('does not fire before the debounce elapses', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutosave({ save }));
    act(() => { result.current.enqueue('row-1', { sets: 4 }); });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(save).not.toHaveBeenCalled();
  });

  it('a later edit to the same field wins', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutosave({ save }));
    act(() => {
      result.current.enqueue('row-1', { sets: 3 });
      result.current.enqueue('row-1', { sets: 5 });
    });
    await settle();
    expect(save).toHaveBeenCalledWith('row-1', { sets: 5 });
  });

  it('does not lose an edit made while a save is in flight', async () => {
    // The queue is taken and cleared before awaiting, so anything typed during
    // the request lands in the next flush rather than being wiped by the clear.
    let release: (v?: unknown) => void = () => {};
    const save = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { release = r; }))
      .mockResolvedValue({});
    const { result } = renderHook(() => useAutosave({ save }));

    act(() => { result.current.enqueue('row-1', { sets: 4 }); });
    await settle();
    expect(save).toHaveBeenCalledTimes(1);

    act(() => { result.current.enqueue('row-1', { reps: 10 }); });   // mid-flight
    await act(async () => { release(); await Promise.resolve(); });
    await settle();

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith('row-1', { reps: 10 });
  });
});

describe('useAutosave — status honesty', () => {
  it('reports pending, then saving, then saved', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutosave({ save }));

    act(() => { result.current.enqueue('row-1', { sets: 4 }); });
    expect(result.current.status).toBe('pending');

    await settle();
    await waitFor(() => expect(result.current.status).toBe('saved'));
  });

  it('NEVER shows saved when the request failed', async () => {
    // The whole risk of removing the save button. A trainer who sees `Saved ✓`
    // closes the tab; if that was a lie the programme is gone.
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    const onError = vi.fn();
    const { result } = renderHook(() => useAutosave({ save, onError }));

    act(() => { result.current.enqueue('row-1', { sets: 4 }); });
    await settle();

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.status).not.toBe('saved');
    expect(onError).toHaveBeenCalledOnce();
  });

  it('reports the failing row and patch, so a retry is possible', async () => {
    const save = vi.fn().mockRejectedValue(new Error('boom'));
    const onError = vi.fn();
    const { result } = renderHook(() => useAutosave({ save, onError }));
    act(() => { result.current.enqueue('row-7', { rpe: 8 }); });
    await settle();
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][1]).toBe('row-7');
    expect(onError.mock.calls[0][2]).toEqual({ rpe: 8 });
  });

  it('one failure among several does not mask the others as saved', async () => {
    const save = vi.fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useAutosave({ save }));
    act(() => {
      result.current.enqueue('row-1', { sets: 4 });
      result.current.enqueue('row-2', { sets: 5 });
    });
    await settle();
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('falls back to idle a while after saving', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutosave({ save }));
    act(() => { result.current.enqueue('row-1', { sets: 4 }); });
    await settle();
    await waitFor(() => expect(result.current.status).toBe('saved'));
    await act(async () => { vi.advanceTimersByTime(2100); });
    expect(result.current.status).toBe('idle');
  });
});

describe('useAutosave — flushing', () => {
  it('flushNow sends immediately, without waiting out the debounce', async () => {
    // Called on unmount, so navigating away mid-debounce still saves.
    const save = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutosave({ save }));
    act(() => { result.current.enqueue('row-1', { sets: 4 }); });
    await act(async () => { await result.current.flushNow(); });
    expect(save).toHaveBeenCalledOnce();
  });

  it('flushing an empty queue is a no-op', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutosave({ save }));
    await act(async () => { await result.current.flushNow(); });
    expect(save).not.toHaveBeenCalled();
  });

  it('clears its timers on unmount', async () => {
    // A pending debounce firing after unmount would setState on a dead hook.
    const save = vi.fn().mockResolvedValue({});
    const { result, unmount } = renderHook(() => useAutosave({ save }));
    act(() => { result.current.enqueue('row-1', { sets: 4 }); });
    unmount();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(save).not.toHaveBeenCalled();
  });
});

describe('saveStatusLabel', () => {
  it('never labels a failure as success', () => {
    expect(saveStatusLabel('error')).toMatch(/not saved/i);
    expect(saveStatusLabel('error')).not.toMatch(/^saved$/i);
  });

  it('says nothing when idle', () => {
    expect(saveStatusLabel('idle')).toBe('');
  });
});
