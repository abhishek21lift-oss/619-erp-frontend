// Charts draw only what they were given.
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
// This file used to cover ModuleWorkspace's "Performance Trend" and "Status
// Mix", which plotted `index * 8 + (index % 2) * 11` and showed
// `(records.length + index * 3) % 19` under labels like "Campaign ROI". The
// component was retired: its two [tab] routes are canonical redirects, and no
// page imports it any more. That half of the file went with it.
//
// The rule it enforced is kept where it still has a live subject: a chart
// renders one slice per datum, drops categories with no value, and shows an
// explicit empty state rather than inventing a placeholder slice.

import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Recharts needs real layout to place a slice, and jsdom has none — but what
// is under test is which colour each slice is handed and how many there are,
// and that is a decision the component makes before recharts is involved.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  Cell: ({ fill }: { fill: string }) => <span data-testid="slice" data-fill={fill} />,
  Tooltip: () => null,
  Legend: () => null,
}));

import { DonutChart } from '@/components/ui/DonutChart';

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

describe('DonutChart draws only what it was given', () => {
  it('draws one slice per datum, not one per label', () => {
    render(
      <DonutChart
        data={[
          { name: 'active', value: 3 },
          { name: 'paused', value: 1 },
        ]}
      />,
    );

    expect(fills()).toHaveLength(2);
  });

  it('drops zero-value categories instead of drawing them as real slices', () => {
    // A status nothing is in must not become a slice the legend then names.
    render(
      <DonutChart
        data={[
          { name: 'active', value: 3 },
          { name: 'empty', value: 0 },
        ]}
      />,
    );

    expect(fills()).toHaveLength(1);
  });

  it('says there is no data instead of drawing an empty ring', () => {
    render(<DonutChart data={[]} />);

    expect(screen.getByRole('img', { name: /no data/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId('slice')).toHaveLength(0);
  });
});
