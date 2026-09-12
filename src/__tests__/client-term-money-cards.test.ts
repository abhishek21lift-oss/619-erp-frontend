// The Term Fee / Paid / Balance strip on a client's profile used to be one
// solid block in the hero's own navy blue, directly under the hero itself —
// so scrolling past it read as the hero continuing rather than as a new
// section answering a different question ("what do they owe", not "who is
// this"). First redesigned into three plain white KPI cards with only the
// icon tinted — which then read as flat next to the colourful tab strip and
// panels beneath it, so each card picked up the same soft colour wash Quick
// Actions itself uses on its chips, rather than staying plain white.
//
// The colours are not arbitrary: Term Fee keeps the hero's own blue, since
// it is the one neutral fact of the three (a fee is not good or bad news).
// Paid and Balance keep the green/amber/red they already had before either
// redesign — this app colours a settled-or-owed status the same way
// everywhere else, and that mapping never needed to change, only the shape
// of the card carrying it.

import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {appPath} from '@/__tests__/helpers/app-routes';
import {stripComments} from '@/__tests__/helpers/strip-comments';

const page = readFileSync(
  appPath('pt-os', 'clients', '[id]', 'page.tsx'), 'utf8');

// Comments blanked, offsets intact. The two assertions about what the card no
// longer has were both tripped by the comment EXPLAINING that it no longer has
// it — 'aspect-square' and 'Current term' each appear in the prose describing
// their own removal. That is the self-defeating pattern helpers/strip-comments
// exists for, and it caught it here on the first run.
const code = stripComments(page);

describe('the Term Fee / Paid / Balance cards are not a copy of the hero', () => {
  it('drops the solid navy block the hero itself uses', () => {
    expect(page).not.toContain('linear-gradient(135deg, #0050ad 0%, #0059ce 100%)');
  });

  it('tints each card in its own colour, not a flat white one', () => {
    // Plain white with only the icon coloured was the first cut of this and
    // read as flat next to everything colourful around it. Scoped to the
    // money cards' own block — the page uses a plain white card elsewhere,
    // legitimately, for unrelated UI.
    const block = page.slice(page.indexOf('MONEY'), page.indexOf('CLIENT LOGIN'));
    expect(block).not.toContain("background: 'var(--bg-card)'");
    expect(block).toContain('background: `linear-gradient(160deg, ${k.color}14 0%, ${k.color}05 100%)`');
  });

  it('still carries all three labels', () => {
    for (const label of ['Term Fee', 'Paid', 'Balance']) {
      expect(page).toContain(`label: '${label}'`);
    }
  });

  it('keeps Term Fee on the hero\'s own blue — the one neutral fact of the three', () => {
    expect(page).toMatch(/label: 'Term Fee'[\s\S]{0,120}?color: '#0067e0'/);
  });

  it('keeps the paid-or-owed colouring this app uses everywhere: green, amber, or red', () => {
    expect(page).toContain("color: '#10b981'"); // Paid, and Balance when cleared
    expect(page).toContain("color: currentTermBalance > 0 ? (client.due_status === 'OVERDUE' ? '#ef4444' : '#f59e0b') : '#10b981'");
  });

  it('switches the Balance icon with the same state its colour already reads', () => {
    // A red balance with a "things are fine" checkmark would contradict its
    // own colour. The icon and the colour are driven by the same condition.
    //
    // The SIZE is not part of that claim and is no longer written into it:
    // this used to pin `size={16}` inside the match, so shrinking the mark on
    // all three cards failed a test about which icon shows, not how big it
    // is. What must hold is the shared condition and the pairing.
    expect(page).toMatch(
      /currentTermBalance > 0 \? <AlertTriangle size=\{\d+\} \/> : <CheckCircle size=\{\d+\} \/>/,
    );
  });

  it('keeps the mark smaller than the figure it belongs to', () => {
    // The reason these cards were rebuilt: a 36px chip with a 16px glyph sat
    // above the number and read as the loudest thing on a card whose whole
    // job is the figure. A mark identifies a card; it does not announce it.
    const chip = page.match(/className="flex h-\[(\d+)px\] w-\[\d+px\] items-center justify-center rounded-\[9px\] text-white"/);
    expect(chip, 'the money cards\' icon chip').not.toBeNull();
    expect(Number(chip![1])).toBeLessThanOrEqual(28);

    const glyphs = [...page.matchAll(/<(?:IndianRupee|CheckCircle|AlertTriangle) size=\{(\d+)\} \/>/g)]
      .map((m) => Number(m[1]));
    expect(glyphs.length).toBeGreaterThanOrEqual(3);
    for (const g of glyphs) expect(g).toBeLessThanOrEqual(14);
  });

  it('is a short rectangle sized by its content, not a square', () => {
    // These were square, which made each card as tall as a third of the
    // viewport is wide — most of it empty. On a phone that is a whole band of
    // nothing between the hero and the actions below it.
    //
    // No fixed height replaces aspect-square: a pixel height is right on one
    // handset and wrong on the next. Three cards holding the same three rows
    // come out the same height as each other on every one of them, which is
    // the property the square was actually bought for.
    expect(code).not.toContain('aspect-square');
    expect(code).toContain('flex flex-col gap-1.5 rounded-[18px]');
  });

  it('carries no sub-label under the figure', () => {
    // 'Current term' under Term Fee and 'Cleared' under a balance of zero
    // restated what the figure already said, and they are what made the card
    // tall enough to need the empty space above them.
    const block = code.slice(code.indexOf('grid grid-cols-3'), code.indexOf('CLIENT LOGIN'));
    expect(block).not.toContain('sub:');
    expect(block).not.toContain('{k.sub}');
    expect(block).not.toContain("'Current term'");
    expect(block).not.toContain('% complete');
  });

  it('still tells a screen reader whether the balance is overdue, due or cleared', () => {
    // Balance is the one card whose state is carried ONLY by colour now that
    // the sub-labels are gone — and red-versus-amber is exactly the
    // distinction a colour-blind reader cannot make. Dropping the text from
    // the design must not drop the fact, so it is announced rather than drawn.
    const block = code.slice(code.indexOf('grid grid-cols-3'), code.indexOf('CLIENT LOGIN'));
    expect(block).toMatch(/state: currentTermBalance > 0 \? \(client\.due_status === 'OVERDUE' \? 'Overdue' : 'Due'\) : 'Cleared'/);
    expect(block).toContain('className="sr-only"');
  });
});
