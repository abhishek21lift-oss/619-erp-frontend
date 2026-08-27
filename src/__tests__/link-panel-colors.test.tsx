// The rows a tab strip opens used to be a plain grey list — one flat colour
// for a "Workout programmes" link and a "Goals" link alike, in a panel whose
// own header icon was the same neutral grey too. Tapping a vivid, colourful
// tab landed on a page that went back to being plain, which is exactly the
// "you redesigned the buttons, not the dropdown" gap this closes: the panel
// a tab opens now carries the same colourful, icon-tile language the tab
// strip itself does — LinkPanel's header and every row it renders, and
// EmptyPanel's own icon tile for the one tab with nothing on file yet.
//
// Two levels: a component test that LinkPanel/EmptyPanel actually render the
// colour they're given, and a static scan that every call site in the client
// profile actually gives them one, drawn from the shared TAB_COLOR rotation
// rather than an invented hex.

import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {LinkPanel, EmptyPanel, TAB_COLOR} from '@/components/pt-os/client/ClientTabs';
import {Dumbbell, Target} from 'lucide-react';
import {appPath} from '@/__tests__/helpers/app-routes';

describe('LinkPanel colours its header and every row it is given', () => {
  it('tints the header icon tile when a colour is passed', () => {
    render(
      <LinkPanel
        icon={<Dumbbell size={16} />}
        title="Training"
        color={TAB_COLOR.success}
        links={[{ label: 'Goals', href: '/pt-os/goals', icon: <Target size={15} />, color: TAB_COLOR.dangerDeep }]}
      />
    );
    // jsdom normalises a hex it's given to rgb(), so this checks for the
    // gradient shape rather than the exact string — the "falls back" test
    // below is what pins the untinted case still being the plain grey.
    const header = screen.getByText('Training').previousSibling as HTMLElement;
    expect(header.style.background).toContain('linear-gradient');
  });

  it('falls back to the plain grey tile when no colour is given', () => {
    render(
      <LinkPanel icon={<Dumbbell size={16} />} title="Untinted" links={[{ label: 'x', href: '/pt-os/goals' }]} />
    );
    const header = screen.getByText('Untinted').previousSibling as HTMLElement;
    expect(header.style.background).toBe('var(--bg-subtle)');
  });

  it('gives a row its own icon tile only when the row supplies both icon and colour', () => {
    render(
      <LinkPanel
        icon={<Dumbbell size={16} />}
        title="Training"
        color={TAB_COLOR.success}
        links={[
          { label: 'Goals', href: '/pt-os/goals', icon: <Target size={15} />, color: TAB_COLOR.dangerDeep },
          { label: 'Bare link', href: '/pt-os/goals' },
        ]}
      />
    );
    const goalsRow = screen.getByText('Goals').closest('a')!;
    expect(goalsRow.querySelector('span[style*="linear-gradient"]')).not.toBeNull();

    const bareRow = screen.getByText('Bare link').closest('a')!;
    expect(bareRow.querySelector('span[style*="linear-gradient"]')).toBeNull();
  });

  it('tints EmptyPanel the same way', () => {
    render(<EmptyPanel icon={<Dumbbell size={16} />} title="Nothing yet" body="…" color={TAB_COLOR.success} />);
    const tile = screen.getByText('Nothing yet').previousSibling as HTMLElement;
    expect(tile.style.background).toContain('linear-gradient');
  });
});

describe('every panel the client profile opens is coloured, not just the tabs', () => {
  const page = readFileSync(
    appPath('pt-os', 'clients', '[id]', 'page.tsx'), 'utf8');

  it('finds panels at all — a passing test on an empty list proves nothing', () => {
    const panels = [...page.matchAll(/<(?:LinkPanel|EmptyPanel)\b/g)];
    expect(panels.length).toBeGreaterThan(5);
  });

  it('gives every LinkPanel and EmptyPanel a header colour', () => {
    // A panel's own props end where the next panel (or the next TabPanel
    // wrapper) begins — matching to the nearest `/>` instead would stop
    // inside `icon={<Wallet size={16} />}`, the first self-closing tag in
    // the props, and never reach `color=` at all.
    const starts = [...page.matchAll(/<(?:LinkPanel|EmptyPanel)\b/g)].map((m) => m.index!);
    const boundary = /<LinkPanel\b|<EmptyPanel\b|<TabPanel\b|<\/TabPanel>/g;
    const offenders: number[] = [];
    for (const start of starts) {
      boundary.lastIndex = start + 1;
      const next = boundary.exec(page);
      const block = page.slice(start, next ? next.index : page.length);
      if (!/color=\{TAB_COLOR\./.test(block)) offenders.push(start);
    }
    expect(offenders).toEqual([]);
  });

  it('gives every link an icon and a colour, not just the panel header', () => {
    // Every `{ label: '...', href: ..., hint: '...'` entry is a LinkPanel
    // row (a `hint:` is what distinguishes it from EmptyPanel's own single
    // CTA button, which carries no hint and is styled as a button rather
    // than an icon-tile row on purpose). Each is written on one line, so
    // matching to the end of the line — rather than to the first `}`, which
    // would stop inside a nested prop like `icon={<Wallet size={15} />}` —
    // captures the whole object.
    const offenders: string[] = [];
    for (const m of page.matchAll(/\{ label: '[^']+', href: [^\n]*hint: [^\n]*\}/g)) {
      if (!m[0].includes('icon:') || !m[0].includes('color: TAB_COLOR.')) offenders.push(m[0]);
    }
    expect(offenders).toEqual([]);
  });
});
