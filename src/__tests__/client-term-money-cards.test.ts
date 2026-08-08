// The Term Fee / Paid / Balance strip on a client's profile used to be one
// solid block in the hero's own navy blue, directly under the hero itself —
// so scrolling past it read as the hero continuing rather than as a new
// section answering a different question ("what do they owe", not "who is
// this"). Redesigned into three separate white KPI cards, each carrying its
// colour on the icon tile and value rather than on the card itself.
//
// The colours are not arbitrary: Term Fee keeps the hero's own blue, since
// it is the one neutral fact of the three (a fee is not good or bad news).
// Paid and Balance keep the green/amber/red they already had before this
// redesign — this app colours a settled-or-owed status the same way
// everywhere else, and that mapping did not need to change, only the shape
// of the card carrying it.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const page = readFileSync(
  join(process.cwd(), 'src', 'app', 'pt-os', 'clients', '[id]', 'page.tsx'), 'utf8');

describe('the Term Fee / Paid / Balance cards are not a copy of the hero', () => {
  it('drops the solid navy block the hero itself uses', () => {
    expect(page).not.toContain('linear-gradient(135deg, #0050ad 0%, #0059ce 100%)');
  });

  it('renders three separate white cards, not one bordered grid', () => {
    expect(page).toContain("background: 'var(--bg-card)', border: '1px solid var(--border)'");
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
    expect(page).toContain('currentTermBalance > 0 ? <AlertTriangle size={15} /> : <CheckCircle size={15} />');
  });
});
