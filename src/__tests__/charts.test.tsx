// Chart primitives.
//
// The failure mode these guard against is not a crash — it is a chart that
// renders happily and lies. A bar whose height is measured from a non-zero
// floor, a segment whose width does not reflect its share, a divide-by-zero
// that silently produces NaN and collapses every mark: all of those look like
// a working chart to anyone who is not checking the numbers.
//
// So these assert the GEOMETRY against the data, not that something rendered.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarChart, HBarChart, StackedBar, Ring, SERIES } from '@/components/platform/charts';

/** The inline height/width a mark actually got, as a number of percent. */
const pctOf = (el: Element, prop: 'height' | 'width'): number => {
  const v = (el as HTMLElement).style[prop];
  const m = /([\d.]+)%/.exec(v);
  return m ? Number(m[1]) : NaN;
};

const bars = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('button > div'));

describe('BarChart — bars are zero-anchored', () => {
  it('scales every bar against the largest value', () => {
    const { container } = render(
      <BarChart title="Revenue" points={[
        { label: 'Jan', value: 0 },
        { label: 'Feb', value: 50 },
        { label: 'Mar', value: 100 },
      ]} />
    );
    const h = bars(container).map((b) => pctOf(b, 'height'));
    expect(h).toEqual([0, 50, 100]);
  });

  it('gives an empty bucket a visible sliver rather than nothing', () => {
    // A zero month must read as "measured, and it was zero" — not as a gap,
    // which is the visual language for "no data".
    const { container } = render(
      <BarChart title="Revenue" points={[{ label: 'Jan', value: 0 }, { label: 'Feb', value: 10 }]} />
    );
    // The scale still says zero; the floor is applied as a separate layout
    // minimum so it can never distort the ratio.
    expect(pctOf(bars(container)[0], 'height')).toBe(0);
    expect((bars(container)[0] as HTMLElement).style.minHeight).toBe('2px');
  });

  it('survives an all-zero series without NaN', () => {
    // The live platform genuinely has all-zero months. A naive value/max here
    // divides by zero and every bar becomes NaN%, which renders as nothing.
    const { container } = render(
      <BarChart title="Revenue" points={[
        { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 },
      ]} />
    );
    for (const b of bars(container)) {
      expect(pctOf(b, 'height')).toBe(0);
    }
  });

  it('labels only the ends of the axis', () => {
    // Twelve ticks under twelve bars is unreadable at 390pt.
    render(<BarChart title="Revenue" points={[
      { label: 'Aug 25', value: 1 }, { label: 'Dec 25', value: 2 }, { label: 'Jul 26', value: 3 },
    ]} />);
    expect(screen.getByText('Aug 25')).toBeTruthy();
    expect(screen.getByText('Jul 26')).toBeTruthy();
    expect(screen.queryByText('Dec 25')).toBeNull();
  });

  it('gives every bar an accessible name carrying its value', () => {
    // The marks are the only place these numbers appear; without this the
    // chart is invisible to a screen reader.
    render(<BarChart title="Revenue" points={[{ label: 'Jan', value: 42 }]} />);
    expect(screen.getByLabelText('Jan: 42')).toBeTruthy();
  });
});

describe('HBarChart', () => {
  it('scales rows against the largest, not against the total', () => {
    const { container } = render(
      <HBarChart title="Plans" rows={[
        { label: 'Starter', value: 3 },
        { label: 'Growth', value: 6 },
      ]} />
    );
    const fills = Array.from(container.querySelectorAll('.rounded-full > div'));
    expect(pctOf(fills[0], 'width')).toBe(50);
    expect(pctOf(fills[1], 'width')).toBe(100);
  });

  it('shows its own empty copy rather than an empty frame', () => {
    render(<HBarChart title="Plans" rows={[]} empty="No studio is on a paid plan yet." />);
    expect(screen.getByText('No studio is on a paid plan yet.')).toBeTruthy();
  });
});

describe('StackedBar — parts reflect shares', () => {
  it('sizes each segment by its share of the total', () => {
    const { container } = render(
      <StackedBar title="Lifecycle" segments={[
        { label: 'Active', value: 1 },
        { label: 'On trial', value: 2 },
        { label: 'At risk', value: 1 },
        { label: 'Ended', value: 0 },
      ]} />
    );
    const segs = Array.from(container.querySelectorAll('[title]'));
    expect(segs.map((s) => pctOf(s, 'width'))).toEqual([25, 50, 25]);
  });

  it('honours an explicit total over the sum of its parts', () => {
    // states.total is authoritative; the four buckets are a projection of
    // eight raw states and must not silently redefine the denominator.
    const { container } = render(
      <StackedBar title="Lifecycle" total={10} segments={[{ label: 'Active', value: 5 }]} />
    );
    expect(pctOf(container.querySelector('[title]')!, 'width')).toBe(50);
  });

  it('omits zero segments from the bar but keeps them in the legend', () => {
    // A zero-width fill is invisible; a missing legend row reads as "this
    // state does not exist" rather than "this state is currently empty".
    const { container } = render(
      <StackedBar title="Lifecycle" segments={[
        { label: 'Active', value: 4 },
        { label: 'Ended', value: 0 },
      ]} />
    );
    expect(container.querySelectorAll('[title]')).toHaveLength(1);
    expect(screen.getByText('Ended')).toBeTruthy();
  });

  it('keeps a segment on its own colour when an earlier one is empty', () => {
    // The legend indexes the palette by position in `segments`; the bar
    // filters zeros out first. If the bar indexed the filtered array instead,
    // every segment after an empty one would be painted the wrong colour and
    // stop matching its own legend swatch.
    const { container } = render(
      <StackedBar title="Lifecycle" segments={[
        { label: 'Active', value: 0 },
        { label: 'On trial', value: 5 },
      ]} />
    );
    const seg = container.querySelector('[title]') as HTMLElement;
    // jsdom normalises hex to rgb(), so compare on the parsed channels.
    const hex = SERIES[1].replace('#', '');
    const rgb = `rgb(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)})`;
    expect(seg.style.background).toBe(rgb);
  });

  it('renders nothing to read when the total is zero', () => {
    render(<StackedBar title="Lifecycle" segments={[{ label: 'Active', value: 0 }]} />);
    expect(screen.getByText('Nothing to show yet.')).toBeTruthy();
  });
});

describe('Ring', () => {
  it('reports the ratio as a percentage', () => {
    render(<Ring title="Founders" value={3} max={20} label="3 of 20" />);
    expect(screen.getByText('15%')).toBeTruthy();
  });

  it('reads 0% rather than NaN when nothing has happened yet', () => {
    // trial_conversion.started is 0 on a new platform.
    render(<Ring title="Trials" value={0} max={0} label="No trials yet" />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('never draws past full', () => {
    render(<Ring title="Founders" value={25} max={20} label="over" />);
    expect(screen.getByText('100%')).toBeTruthy();
  });
});

describe('the palette', () => {
  it('carries four distinct hues', () => {
    // Guards against a copy-paste that would make two lifecycle states
    // indistinguishable while still looking like a deliberate palette.
    expect(new Set(SERIES).size).toBe(SERIES.length);
    expect(SERIES).toHaveLength(4);
  });
});
