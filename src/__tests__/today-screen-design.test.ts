// Design rules for the Today screen, kept as assertions because none of them
// break a build and none of them show up in a screenshot taken on the machine
// they were written on.
//
// This screen is read one-handed, at arm's length, in a bright room, by a
// trainer who is mid-conversation with a client. Every rule below is one this
// file has already broken once.
//
// ── Reading source text ────────────────────────────────────────────────────
//
// Assertions run against COMMENT-STRIPPED source. This suite's ancestors were
// bitten three separate times by a prose paragraph that named the very thing
// the test was checking had gone — the sentence explaining why a hard-coded
// rgba() was removed is itself a hard-coded rgba() as far as `toContain` is
// concerned. `code()` removes /* … */ blocks (which covers JSX comments) and
// whole-line // comments before anything is matched.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fmtTime12 } from '@/lib/format';

const code = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const src = (...p: string[]) => code(readFileSync(join(__dirname, '..', ...p), 'utf8'));

const page = src('app', 'pt-os', 'today', 'page.tsx');
const card = src('components', 'dashboards', 'PtOsDashboard.tsx');

describe('one clock, one format', () => {
  // The dashboard card and this page render the same start_time off the same
  // endpoint, and the card is how you reach the page. They had a private
  // formatter each — except only one of them had one, so a 6am slot read
  // "6:00 AM" on the card and "06:00" on the screen it linked to.
  it('both screens use the shared formatter', () => {
    expect(page).toContain('fmtTime12(c.start_time)');
    expect(card).toContain('fmtTime12(r.time)');
  });

  it('neither keeps a private copy', () => {
    expect(page).not.toMatch(/function fmt(12|Time12)\s*\(/);
    expect(card).not.toMatch(/function fmt12\s*\(/);
  });

  it('formats midnight and noon the way a clock does, not the way a modulo does', () => {
    expect(fmtTime12('00:30')).toBe('12:30 AM');
    expect(fmtTime12('12:05')).toBe('12:05 PM');
    expect(fmtTime12('06:00')).toBe('6:00 AM');
    expect(fmtTime12('18:45')).toBe('6:45 PM');
  });

  it('tolerates the seconds Postgres time columns arrive with', () => {
    expect(fmtTime12('07:00:00')).toBe('7:00 AM');
  });

  it('passes through anything that is not a time rather than printing NaN', () => {
    expect(fmtTime12(null)).toBeNull();
    expect(fmtTime12('')).toBeNull();
    expect(fmtTime12('sometime')).toBe('sometime');
  });
});

describe('the dark theme is not a tint of the light one', () => {
  // A chip painted rgba(15,23,42,0.05) is a faint dark wash — invisible on a
  // dark card, where it is meant to be the thing separating the time from the
  // name. Same for the amber wash on Resume. Tokens flip with the theme;
  // literals do not.
  it('paints the time chip and buttons from tokens', () => {
    expect(page).not.toContain('rgba(15,23,42');
    expect(page).not.toContain('rgba(245,158,11');
    expect(page).toContain('var(--brand-soft)');
    expect(page).toContain('var(--bg-subtle)');
  });

  it('uses the brand shade that stays readable in both themes', () => {
    // --brand is #0067E0 in both, which is 2.5:1 on a dark card. --brand-hi is
    // the same blue in light and a light blue in dark: readable either way.
    expect(page).toContain('var(--brand-hi)');
  });
});

describe('nothing is said in colour alone', () => {
  it('marks a booked slot with an icon, not only a tint', () => {
    expect(page).toContain('<CalendarCheck size={10}');
    expect(page).toContain('<Clock size={10}');
  });

  it('spells out what the chip means for a screen reader', () => {
    expect(page).toContain('booked slot');
    expect(page).toContain('usual training time');
    expect(page).toContain('sr-only');
  });

  it('does not park the meaning in a hover tooltip', () => {
    // `title` is a hover affordance. This screen is only ever touched, so the
    // explanation was reachable by nobody who uses it.
    expect(page).not.toContain('title={c.source');
    expect(page).not.toContain("title=\"Booked slot\"");
  });
});

describe('nothing legible is dimmed', () => {
  it('does not fade the whole rest-day row', () => {
    // 0.72 on the row took a --text-muted subtitle from 4.4:1 to about 3:1, to
    // say something the moon badge, the wording and the outline button were
    // each already saying.
    expect(page).not.toMatch(/opacity:\s*c\.is_rest_day/);
    expect(page).not.toMatch(/is_rest_day.*\?\s*0\.7/);
  });

  it('sets a rest day apart by shape instead', () => {
    expect(page).toContain('<Moon size={9}');
    expect(page).toContain("c.is_rest_day ? 'transparent'");
  });

  it('keeps the muted button label above the contrast floor', () => {
    // --text-muted (#64748B) on --bg-subtle (#F1F5F9) is 4.35:1 — under AA for
    // 13px text. --text-secondary is not.
    expect(page).toContain("doneAlready ? 'var(--text-secondary)'");
  });
});

describe('motion is optional', () => {
  it('skips the row stagger under prefers-reduced-motion rather than shortening it', () => {
    expect(page).toContain('useReducedMotion');
    expect(page).toContain('initial={reduce ? false : { opacity: 0, y: 8 }}');
    expect(page).toContain('delay: reduce ? 0 :');
  });
});

describe('a start cannot be fired twice', () => {
  it('locks every button while any start is in flight, not just the one tapped', () => {
    // The screen is a column of identical buttons and the round trip is a
    // network call. Disabling only the tapped row left a second tap on a
    // second row opening a second session.
    expect(page).toContain('disabled={busy}');
    expect(page).toContain('if (starting) return;');
  });

  it('says which row is working', () => {
    expect(page).toContain('aria-busy={starting}');
  });
});

describe('a failed load does not read as an empty day', () => {
  it('keeps the failure on screen after the toast has gone', () => {
    // Falling through to "Nobody is in today" is the one wrong reading a
    // trainer cannot recover from: it tells them to stop looking.
    expect(page).toContain('setFailed(true)');
    expect(page).toContain('Could not load today');
  });

  it('offers a way out of it', () => {
    expect(page).toContain('onClick={load}');
    expect(page).toContain('Try again');
  });
});

describe('the wait has a shape', () => {
  it('reserves the row layout instead of centring a spinner in empty space', () => {
    expect(page).toContain('function RosterSkeleton');
    expect(page).toContain('animate-pulse');
  });

  it('shows the day\'s progress with a labelled bar', () => {
    expect(page).toContain('role="progressbar"');
    expect(page).toContain('aria-valuenow={done}');
  });
});

describe('touch', () => {
  it('keeps every action at the 44px minimum', () => {
    // Three buttons on this screen: Start/Resume on each row, and the two
    // empty-state actions.
    const heights = page.match(/h-\[44px\]/g) ?? [];
    expect(heights.length).toBeGreaterThanOrEqual(3);
  });

  it('marks them as clickable', () => {
    expect(page.match(/cursor-pointer/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('answers the tap before the network does', () => {
    expect(page).toContain('active:scale-95');
  });
});
