// Two charts that were drawing things that were not there.
//
// ── The donut ─────────────────────────────────────────────────────────────
//
// DonutChart carried a local palette of eight entries whose comments named
// eight hues — "cyan", "purple", "teal", "indigo" — while five of the eight
// held the identical brand blue. A five-slice donut drew four slices the eye
// could not separate, and the legend beside it then named four things that
// looked the same. Thirteen call sites.
//
// The colours are asserted through the component rather than by reading its
// source: a palette can be "fixed" in the file and still not reach the
// slices, and it was the comments naming absent hues that made the original
// bug survive review in the first place.
//
// ── The module workspace ──────────────────────────────────────────────────
//
// Its "Performance Trend" area chart plotted eight points computed as
// `index * 8 + (index % 2) * 11`, so it rose because the arithmetic made it
// rise, and the panel beside it showed `(records.length + index * 3) % 19`
// under labels like "Campaign ROI". Neither read a record. It rendered on
// every tab of eight route groups.
//
// The test is not "the fake chart is gone" — that is a fact about a file, and
// it would pass just as well if the replacement were fake too. It is that
// every number the surviving card puts on screen equals a count of the
// records it was given.

import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// One stub serves both components. Recharts needs real layout to place a
// slice, and jsdom has none — but what is under test is which colour each
// slice is handed and how many there are, and that is a decision the
// component makes before recharts is involved.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  Cell: ({ fill }: { fill: string }) => <span data-testid="slice" data-fill={fill} />,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: new Proxy({}, {
    get: (_t, tag: string) => ({ children, ...rest }: Record<string, unknown>) =>
      React.createElement(tag, rest, children as React.ReactNode),
  }),
}));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }),
}));

const list = vi.fn();
vi.mock('@/lib/module-service', () => ({
  moduleService: {
    list: (...args: unknown[]) => list(...args),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { DonutChart } from '@/components/ui/DonutChart';
import ModuleWorkspace from '@/components/modules/ModuleWorkspace';
import { getModuleConfig } from '@/lib/module-config';
import type { ModuleRecord } from '@/lib/module-config';

const fills = () =>
  screen.getAllByTestId('slice').map((el) => el.getAttribute('data-fill') ?? '');

describe('DonutChart gives every slice its own colour', () => {
  it('draws six slices in six different colours', () => {
    // The exact shape of the bug: before the fix this produced four distinct
    // values for six slices, three of them the same blue.
    render(
      <DonutChart
        data={['a', 'b', 'c', 'd', 'e', 'f'].map((name, i) => ({ name, value: i + 1 }))}
      />,
    );

    const drawn = fills();
    expect(drawn).toHaveLength(6);
    expect(new Set(drawn).size).toBe(6);
  });

  it('never gives two neighbouring slices the same colour', () => {
    // Past the length of the ramp the colours wrap, which is fine — what is
    // never acceptable is two slices that share an edge sharing a fill, since
    // the 2px separator is then the only thing between them.
    render(
      <DonutChart
        data={Array.from({ length: 9 }, (_, i) => ({ name: `s${i}`, value: i + 1 }))}
      />,
    );

    const drawn = fills();
    expect(drawn).toHaveLength(9);
    for (let i = 1; i < drawn.length; i++) {
      expect(drawn[i], `slice ${i} repeats slice ${i - 1}`).not.toBe(drawn[i - 1]);
    }
  });

  it('still lets a datum name its own colour', () => {
    // Existing behaviour worth keeping: a caller that means a specific colour
    // (paid vs outstanding) is not overruled by the ramp.
    render(
      <DonutChart
        data={[
          { name: 'paid', value: 3, color: '#10B981' },
          { name: 'due', value: 1 },
        ]}
      />,
    );
    expect(fills()[0]).toBe('#10B981');
  });
});

/** A record with only the fields the status mix reads. */
function record(status: string, id: string): ModuleRecord {
  return {
    id,
    title: `t-${id}`,
    owner: 'o',
    status,
    priority: 'Low',
    amount: 0,
    dueDate: '2026-01-01',
    channel: 'App',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('the module workspace shows only numbers it can count', () => {
  const config = getModuleConfig('engagement', 'overview');

  beforeEach(() => {
    list.mockReset();
  });

  it('reports each status as the number of records holding it', async () => {
    // Three Active, one Paused, no Draft. Anything on screen that is not one
    // of those counts came from somewhere other than these records.
    const records = [
      record(config.statuses[2], 'a'),
      record(config.statuses[2], 'b'),
      record(config.statuses[2], 'c'),
      record(config.statuses[3], 'd'),
    ];
    list.mockResolvedValue({ records, source: 'api' });

    render(<ModuleWorkspace config={config} />);

    const card = await screen.findByRole('img', { name: /status mix/i });
    const label = card.getAttribute('aria-label') ?? '';

    expect(label).toContain(`${config.statuses[2]} 3`);
    expect(label).toContain(`${config.statuses[3]} 1`);
    // A status nothing is in is absent, not drawn as an empty slice.
    expect(label).not.toContain(config.statuses[0]);
    expect(fills()).toHaveLength(2);
  });

  it('says so when there is nothing to draw, instead of drawing something', async () => {
    // The old card met an empty module with a single grey "Empty" slice,
    // which reads as one real category rather than as no data.
    list.mockResolvedValue({ records: [], source: 'api' });

    render(<ModuleWorkspace config={config} />);

    await waitFor(() =>
      expect(screen.getByText(/no .* yet — add one above/i)).toBeInTheDocument(),
    );
    expect(screen.queryAllByTestId('slice')).toHaveLength(0);
  });

  it('puts no number on screen that is not a status count', async () => {
    // The generalisation of the bug. Every standalone integer rendered in the
    // status card has to be one of the counts; `(records.length + i*3) % 19`
    // produced numbers matching nothing, and would fail here whatever it was
    // labelled.
    const records = [
      record(config.statuses[1], 'a'),
      record(config.statuses[1], 'b'),
      record(config.statuses[4], 'c'),
    ];
    list.mockResolvedValue({ records, source: 'api' });

    render(<ModuleWorkspace config={config} />);

    const card = (await screen.findByRole('img', { name: /status mix/i }))
      .closest('section') as HTMLElement;

    const shown = Array.from(card.querySelectorAll('span'))
      .map((el) => el.textContent?.trim() ?? '')
      .filter((t) => /^\d+$/.test(t))
      .map(Number);

    expect(shown.length).toBeGreaterThan(0);
    for (const n of shown) expect([2, 1]).toContain(n);
  });
});
