// The hour chart opens on the busiest hour instead of on 06:00.
//
// Seventeen hours do not fit a phone-width card, so the chart scrolls inside
// its own card. It opened at the far left — the quietest hour of the day in a
// gym — which put the peak that the KPI card names off-screen, to be hunted
// for by dragging.
//
// The 220px height, the horizontal scrolling and the bar design are all
// untouched; the only thing that changes is where the strip starts.
//
// jsdom does no layout, so scrollWidth/clientWidth/offsetLeft are all 0 unless
// they are defined. They are defined here to model a real phone: a 350px
// viewport over a 520px track (the card's min-width), 17 columns.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { scrollIndexIntoCentre } from '@/lib/chart-scroll';
import { srcPath } from '@/__tests__/helpers/app-routes';

const HOURS = 17;
const VIEWPORT = 350;
const TRACK = 520;
const COL = TRACK / HOURS;

/** A scroller with `HOURS` columns and phone-shaped geometry. */
function strip({ viewport = VIEWPORT, track = TRACK } = {}) {
  const el = document.createElement('div');
  const fix = (node: HTMLElement, prop: string, value: number) =>
    Object.defineProperty(node, prop, { value, configurable: true });
  fix(el, 'clientWidth', viewport);
  fix(el, 'scrollWidth', track);
  // jsdom's scrollLeft is a plain writable property, which is what we want.
  el.scrollLeft = 0;
  for (let i = 0; i < HOURS; i++) {
    const col = document.createElement('div');
    col.setAttribute('data-hour-index', String(i));
    fix(col, 'offsetLeft', Math.round(i * (track / HOURS)));
    fix(col, 'offsetWidth', Math.round(track / HOURS));
    el.appendChild(col);
  }
  return el;
}

const maxScroll = TRACK - VIEWPORT;

describe('centring the peak hour', () => {
  it('centres a peak in the middle of the day', () => {
    const el = strip();
    expect(scrollIndexIntoCentre(el, 8)).toBe(true);
    // Read the geometry back off the node rather than recomputing it here:
    // the fixture rounds offsetLeft/offsetWidth to whole pixels the way a
    // browser does, and a parallel unrounded calculation disagrees by half a
    // pixel — which says nothing about whether the bar is centred.
    const bar = el.querySelector<HTMLElement>('[data-hour-index="8"]')!;
    const barCentre = bar.offsetLeft + bar.offsetWidth / 2;
    expect(barCentre - el.scrollLeft).toBeCloseTo(VIEWPORT / 2, 5);
    // …and the bar really is on screen afterwards.
    expect(barCentre).toBeGreaterThan(el.scrollLeft);
    expect(barCentre).toBeLessThan(el.scrollLeft + VIEWPORT);
  });

  it('clamps at the left rather than scrolling to a negative offset', () => {
    // 06:00 is index 0 and is a real peak for an early-opening studio.
    // Centring it wants a negative scrollLeft.
    const el = strip();
    scrollIndexIntoCentre(el, 0);
    expect(el.scrollLeft).toBe(0);
  });

  it('clamps at the right rather than scrolling past the end', () => {
    const el = strip();
    scrollIndexIntoCentre(el, HOURS - 1);
    expect(el.scrollLeft).toBe(maxScroll);
    // The last bar is still visible at that clamp — the point of the clamp.
    const lastBarLeft = (HOURS - 1) * COL;
    expect(lastBarLeft).toBeGreaterThanOrEqual(el.scrollLeft);
    expect(lastBarLeft).toBeLessThan(el.scrollLeft + VIEWPORT);
  });

  it('never leaves the scrollable range, for any peak hour', () => {
    for (let i = 0; i < HOURS; i++) {
      const el = strip();
      scrollIndexIntoCentre(el, i);
      expect(el.scrollLeft).toBeGreaterThanOrEqual(0);
      expect(el.scrollLeft).toBeLessThanOrEqual(maxScroll);
    }
  });

  it('does nothing when everything already fits', () => {
    // Desktop. Touching scrollLeft here would be a no-op anyway, but reporting
    // false is what lets the caller know it did not move the user's view.
    const el = strip({ viewport: 900 });
    expect(scrollIndexIntoCentre(el, 8)).toBe(false);
    expect(el.scrollLeft).toBe(0);
  });

  it('does nothing when the peak column is not in the DOM', () => {
    const el = strip();
    expect(scrollIndexIntoCentre(el, 99)).toBe(false);
    expect(el.scrollLeft).toBe(0);
  });

  it('reports false when it is already in the right place', () => {
    const el = strip();
    expect(scrollIndexIntoCentre(el, 8)).toBe(true);
    expect(scrollIndexIntoCentre(el, 8)).toBe(false);
  });
});

describe('what the page must keep doing', () => {
  const raw = readFileSync(srcPath('app', '(chrome)', 'insights', 'traffic', 'page.tsx'), 'utf8');
  // Comments stripped, because a comment explaining that scrollIntoView is
  // deliberately NOT used contains the string "scrollIntoView" and made the
  // assertion below fail against prose. This repo has made that mistake before
  // in the other direction, rewriting a token name inside its own explanation.
  const page = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('positions before paint, so nothing is seen to move', () => {
    // useEffect would paint the chart at 06:00 and then jump it. A layout
    // effect runs before the browser paints, so the first frame is correct.
    expect(page).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]*?scrollIndexIntoCentre/);
  });

  it('never calls scrollIntoView, which would move the page too', () => {
    // scrollIntoView walks up and scrolls every scrollable ancestor, so
    // centring a bar would also scroll the document vertically — the exact
    // jump this was supposed to avoid.
    expect(page).not.toMatch(/scrollIntoView/);
  });

  it('stops for the session as soon as the user touches the strip', () => {
    // pointer/wheel/touch/key, not scroll: the scroll event fires for our own
    // write to scrollLeft, so listening to it would make this think it had
    // been overridden the instant it ran.
    for (const handler of ['onPointerDown', 'onWheel', 'onTouchStart', 'onKeyDown']) {
      expect(page, `${handler} missing`).toMatch(new RegExp(`${handler}=\\{stopAutoScroll\\}`));
    }
    expect(page).not.toMatch(/onScroll=\{stopAutoScroll\}/);
  });

  it('kept the 220px chart and the horizontal scrolling', () => {
    // Both were deliberate. The height is not to be compressed and the
    // overflow is not to be removed; this change is only about where the
    // strip starts.
    expect(page).toMatch(/alignItems: 'flex-end', gap: 6, height: 220/);
    expect(page).toMatch(/className="-mx-1 overflow-x-auto px-1"/);
    expect(page).toMatch(/className="min-w-\[520px\]"/);
    // The loading and empty states reserve the same 220px, so the chart
    // arriving never resizes the card.
    expect(page.match(/height: 220/g) ?? []).toHaveLength(3);
  });
});
