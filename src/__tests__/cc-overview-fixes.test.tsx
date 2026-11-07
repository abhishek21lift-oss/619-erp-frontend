// Two Command Center defects from the 2026-11-07 mobile screenshots:
//
//   1. The hero said "1 signal need a look" — the noun was pluralized but
//      the verb was not conjugated.
//   2. The tokens-per-day chart labels were rendered as "9 1. 1. 2. 2. 2. 6":
//      every bar's label span lived in a one-bar-wide flex cell, so two-digit
//      day numbers were ellipsized into garbage. Labels are already shown
//      every Nth slot when a series is long, so a sparse label may overflow
//      its own cell (its neighbours are blank) — but dense series (≤ 8 bars,
//      a label under every bar) must keep truncating or they overlap.
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CcBars } from '@/components/platform/cc-viz';
import { attentionHeadline } from '@/components/platform/CommandCenterOverview';

const labelSpans = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('span[class*="text-[9.5px]"]')) as HTMLElement[];

describe('the attention headline conjugates its verb', () => {
  it('says "needs a look" for one signal', () => {
    expect(attentionHeadline(1)).toBe('1 signal needs a look');
  });

  it('pluralises both noun and verb for several signals', () => {
    expect(attentionHeadline(11)).toBe('11 signals need a look');
  });
});

describe('the tokens-per-day axis is readable on narrow screens', () => {
  const month = Array.from({ length: 30 }, (_, i) => ({
    label: String(i + 1),
    value: 1 + (i % 7),
    title: `day ${i + 1}`,
  }));
  const week = Array.from({ length: 6 }, (_, i) => ({
    label: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][i],
    value: i + 1,
  }));

  it('renders one label per thinning step, at full text, not ellipsized', () => {
    const { container } = render(<CcBars data={month} />);
    const shown = labelSpans(container).filter((s) => s.textContent);
    // 30 bars at a thinning step of 4 → labels on slots 0,4,8,12,16,20,24,28.
    expect(shown.map((s) => s.textContent)).toEqual(['1', '5', '9', '13', '17', '21', '25', '29']);
    for (const s of shown) expect(s.className).not.toContain('truncate');
  });

  it('keeps dense series (≤ 8 bars) truncating so labels cannot overlap', () => {
    const { container } = render(<CcBars data={week} />);
    const shown = labelSpans(container).filter((s) => s.textContent);
    expect(shown).toHaveLength(6);
    for (const s of shown) expect(s.className).toContain('truncate');
  });
});
