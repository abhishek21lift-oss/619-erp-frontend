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

const page = readFileSync(
  appPath('pt-os', 'clients', '[id]', 'page.tsx'), 'utf8');

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
    expect(page).toContain('currentTermBalance > 0 ? <AlertTriangle size={16} /> : <CheckCircle size={16} />');
  });
});
