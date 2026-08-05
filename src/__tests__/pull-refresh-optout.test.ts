// Every floating overlay must opt out of pull-to-refresh.
//
// usePullToRefresh listens on `window`, so it sees every touch on every page,
// and it claims any downward drag while `window.scrollY === 0`. The hook
// declines a drag that starts inside a list which is already scrolled — that is
// the general fix and it needs no cooperation from anybody. But an overlay
// sitting at the TOP of its own scroll is still a hole: dragging down there
// pulls the page down BEHIND an open dropdown, which is wrong at any scroll
// position and looks like the app has come apart.
//
// The opt-out is one attribute, which means the only way it goes wrong is
// somebody adding an overlay and not knowing the attribute exists. So this test
// reads the source rather than the behaviour: it finds overlay roots by their
// own class names and fails when one is not covered.
//
// It is deliberately a source scan and not a render test. Rendering every modal
// in the app would need every modal's props, mocks and open-state, and would
// still only cover the ones somebody remembered to add.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');

/** How far around a match to look for the attribute. Overlay roots spread
 *  their attributes over several lines and the attribute is rarely on the
 *  className line itself — it can be above it (most modals, which put
 *  `data-no-pull-refresh` before `className`) or below it (MobileBottomNav
 *  puts it on the very next line). An earlier version only looked up, which
 *  reported MobileBottomNav as an offender when it has been tagged all along. */
const LOOKBACK = 10;
const LOOKAHEAD = 4;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** A full-viewport overlay: modal, sheet, drawer, lightbox, command palette. */
const FULL_SCREEN = /fixed inset-0/;

/**
 * An anchored dropdown, menu or popover.
 *
 * Absolutely positioned, stacked above its surroundings, and shaped like a
 * floating panel — offset from its anchor (`top-full`, `mt-*`) or clipping its
 * own contents (`overflow-hidden`).
 *
 * An earlier version required `top-full` and let the ORIGINALLY REPORTED bug
 * through: the Record Payment client picker is `absolute left-4 right-4 z-40
 * mt-1`, anchored by insets rather than by `top-full`. Deleting its opt-out
 * left this file green, which is the one thing a guard test may never do. The
 * `mt-`/`overflow-hidden` arms exist because of that.
 *
 * Verified against the whole tree: this matches every real overlay and nothing
 * else — no badge, no icon, no decorative absolute element trips it.
 */
const DROPDOWN = /\babsolute\b(?=[^"'`]*\bz-)(?=[^"'`]*(?:\btop-full\b|\bbottom-full\b|\bmt-|\bmb-|\boverflow-hidden\b))/;

/**
 * A bottom sheet or a full-height side drawer.
 *
 * `fixed inset-0` was never the only shape an overlay comes in, and this arm
 * exists because the AI assistant's sheet proved it. That sheet is
 * `fixed inset-x-0 bottom-0 z-[140]` — it takes drags exactly like a modal
 * does, and neither of the patterns above saw it. Deleting its opt-out left
 * this file green, which is the one thing a guard test may never do. That is
 * the second time this has happened here; the first was the Record Payment
 * picker, which is why the DROPDOWN arm looks the way it does.
 *
 * Bottom-anchored or full-height-side, AND stacked (`z-`). Deliberately NOT
 * top-docked bars: a header pinned to `top-0` is page chrome, and dragging
 * down from it is how you perform the refresh, not a bug in it. Widening this
 * to `top-0` flags the app header, the landing header and the public nav, none
 * of which should swallow the gesture.
 */
const FIXED_PANEL = /\bfixed\b(?=[^"'`]*\bz-)(?=[^"'`]*(?:\bbottom-0\b|\binset-y-0\b))/;

/**
 * Decorative layers are not overlays.
 *
 * `pointer-events-none fixed inset-0` is a gradient or a grain texture behind
 * the page. It can never be a touch target, so it never needs the attribute —
 * and tagging one WOULD be the bug, because a full-viewport element carrying
 * the opt-out is exactly how you disable pull-to-refresh for a whole page by
 * accident.
 */
const DECORATIVE = /pointer-events-none/;

interface Offender { file: string; line: number; text: string }

function scan(): Offender[] {
  const offenders: Offender[] = [];
  for (const file of walk(SRC)) {
    // The hook itself, and its own docs, mention the attribute in prose.
    if (file.includes(join('common', 'PullToRefresh'))) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    // Where the previous overlay root was, so one overlay's opt-out cannot be
    // read as the next one's.
    //
    // A scrim and the sheet it dims are siblings about eight lines apart. With
    // a plain 10-line lookback, deleting the SHEET's attribute left this file
    // green — the scan walked back past the sheet, found the SCRIM's
    // attribute, and called the sheet covered. That is the second hole of this
    // kind, after the bottom-sheet shape itself, and it is the same failure:
    // the guard quietly stops guarding.
    let prevOverlay = -1;
    lines.forEach((line, i) => {
      const isOverlay = FULL_SCREEN.test(line) || DROPDOWN.test(line) || FIXED_PANEL.test(line);
      if (!isOverlay || DECORATIVE.test(line)) return;
      const from = Math.max(0, i - LOOKBACK, prevOverlay + 1);
      prevOverlay = i;
      const window = lines.slice(from, i + 1 + LOOKAHEAD).join('\n');
      if (window.includes('data-no-pull-refresh')) return;
      offenders.push({
        file: file.replace(`${process.cwd()}/`, ''),
        line: i + 1,
        text: line.trim().slice(0, 100),
      });
    });
  }
  return offenders;
}

describe('pull-to-refresh opt-out', () => {
  it('covers every floating overlay in the app', () => {
    // Reported as one bug on the Record Payment client picker; it was never one
    // screen's bug. Anything listed here will pull the whole page down when a
    // finger drags inside it at the top of the page.
    expect(scan().map((o) => `${o.file}:${o.line}  ${o.text}`)).toEqual([]);
  });

  it('finds overlays at all — the scan is not vacuously passing', () => {
    // Without this, deleting the patterns above would make the test green and
    // the guard would silently stop guarding.
    let overlays = 0;
    for (const file of walk(SRC)) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if ((FULL_SCREEN.test(line) || DROPDOWN.test(line) || FIXED_PANEL.test(line)) && !DECORATIVE.test(line)) overlays += 1;
      }
    }
    expect(overlays).toBeGreaterThan(20);
  });

  it('does not require the attribute on decorative full-screen layers', () => {
    // A `pointer-events-none fixed inset-0` gradient must stay untagged: it is
    // never a touch target, and tagging a full-viewport element is how you
    // disable the gesture for an entire page without meaning to.
    const tagged: string[] = [];
    for (const file of walk(SRC)) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (FULL_SCREEN.test(line) && DECORATIVE.test(line) && line.includes('data-no-pull-refresh')) {
          tagged.push(`${file.replace(`${process.cwd()}/`, '')}:${i + 1}`);
        }
      });
    }
    expect(tagged).toEqual([]);
  });
});
