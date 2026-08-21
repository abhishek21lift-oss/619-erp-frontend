// Batch-adding exercises must preserve the order they were picked in.
//
// The server appends each row to the end of the day, so position is decided by
// the order requests ARRIVE. Firing the batch with Promise.all hands the day's
// running order to the network — a trainer who picked Squat, Bench, Row gets
// them back in whatever sequence the requests happened to land, and has to
// drag them into the order they already chose.
//
// This is extracted from WorkoutBuilder precisely so the guarantee can be
// tested. A mutation swapping the loop for Promise.all passed every other test
// in the suite, because nothing else looks at ordering.

import { describe, it, expect, vi } from 'vitest';
import { addSequentially } from '@/components/pt-os/builder/addSequentially';

const ex = (id: string) => ({ id, name: id });

describe('order is preserved', () => {
  it('returns rows in the order they were picked', async () => {
    const { created, failed } = await addSequentially(
      [ex('a'), ex('b'), ex('c')],
      async (id) => `row-${id}`,
    );
    expect(created).toEqual(['row-a', 'row-b', 'row-c']);
    expect(failed).toBe(0);
  });

  it('waits for each add before starting the next', async () => {
    // The assertion that actually distinguishes a loop from Promise.all:
    // with concurrency, every start is logged before the first finish.
    const events: string[] = [];
    await addSequentially([ex('a'), ex('b'), ex('c')], async (id) => {
      events.push(`start:${id}`);
      await new Promise((r) => setTimeout(r, 5));
      events.push(`end:${id}`);
      return id;
    });
    expect(events).toEqual([
      'start:a', 'end:a',
      'start:b', 'end:b',
      'start:c', 'end:c',
    ]);
  });

  it('is not fooled by a slow first request', async () => {
    // Promise.all with a slow first item returns b before a, which is exactly
    // the real-world shape of this bug on a flaky connection.
    const delays: Record<string, number> = { a: 30, b: 1, c: 1 };
    const { created } = await addSequentially(
      [ex('a'), ex('b'), ex('c')],
      async (id) => {
        await new Promise((r) => setTimeout(r, delays[id]));
        return id;
      },
    );
    expect(created).toEqual(['a', 'b', 'c']);
  });
});

describe('a partial failure keeps what landed', () => {
  it('counts the failures and returns the successes', async () => {
    // Those rows exist server-side. Discarding them locally to make the batch
    // look atomic would show a day that disagrees with the database.
    const { created, failed } = await addSequentially(
      [ex('a'), ex('b'), ex('c')],
      async (id) => {
        if (id === 'b') throw new Error('nope');
        return `row-${id}`;
      },
    );
    expect(created).toEqual(['row-a', 'row-c']);
    expect(failed).toBe(1);
  });

  it('does not abandon the rest of the batch after one rejection', async () => {
    const add = vi.fn(async (id: string) => {
      if (id === 'a') throw new Error('nope');
      return id;
    });
    const { created, failed } = await addSequentially([ex('a'), ex('b')], add);
    expect(add).toHaveBeenCalledTimes(2);
    expect(created).toEqual(['b']);
    expect(failed).toBe(1);
  });

  it('reports a total failure without throwing', async () => {
    const { created, failed } = await addSequentially(
      [ex('a'), ex('b')],
      async () => { throw new Error('nope'); },
    );
    expect(created).toEqual([]);
    expect(failed).toBe(2);
  });
});

describe('an empty batch is a no-op', () => {
  it('makes no requests', async () => {
    const add = vi.fn();
    const { created, failed } = await addSequentially([], add);
    expect(add).not.toHaveBeenCalled();
    expect(created).toEqual([]);
    expect(failed).toBe(0);
  });
});
