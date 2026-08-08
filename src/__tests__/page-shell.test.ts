// Every page sits where the dashboard sits.
//
// The report pages had each grown their own shell: a pale `--bg-subtle` slab
// with `borderRadius: '0 0 36px 36px'` for the title, then a content block
// with `padding: '24px 32px'`. That 32px is applied INSIDE `.shell-main`,
// which already pays 16px on a phone — so these pages sat at 48px from the
// screen edge while the dashboard sat at 16, and flicking between them the
// content visibly jumped inward.
//
// The fix is that `PageContainer` carries the dashboard's own measurements,
// character for character. The test below is that claim, checked rather than
// asserted in a comment — because the failure mode is a one-word edit to
// either side that nothing else notices.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const code = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const src = (...p: string[]) => code(readFileSync(join(__dirname, '..', ...p), 'utf8'));

const shell = src('components', 'ui', 'PageHero.tsx');
const dashboard = src('components', 'dashboards', 'PtOsDashboard.tsx');

/** The classes PageContainer passes to cn(), flattened to one string. */
function containerClasses(): string {
  const block = shell.slice(shell.indexOf('export function PageContainer'));
  const args = block.slice(block.indexOf('cn('), block.indexOf('className,'));
  return (args.match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1)).join(' ').split(/\s+/).join(' ');
}

/** The dashboard's own scroll container. */
function dashboardClasses(): string {
  const m = /className="(relative mx-auto w-full max-w-7xl[^"]*)"/.exec(dashboard);
  if (!m) throw new Error('dashboard scroll container not found — did its classes change?');
  return m[1].split(/\s+/).join(' ');
}

describe('the page container is the dashboard container', () => {
  it('matches it exactly', () => {
    expect(containerClasses()).toBe(dashboardClasses());
  });

  it('leaves the gap under the top bar to pt-2, as the dashboard does', () => {
    expect(containerClasses()).toContain('pt-2');
  });

  it('adds no horizontal padding of its own', () => {
    // The gutter is `.shell-main`'s job — 16px on mobile, 24px from sm up. A
    // px-* here would be added on top of it and put the page out of line with
    // every other page in the app.
    expect(containerClasses()).not.toMatch(/\bp[xl]-/);
  });

  it('clears the mobile bottom nav', () => {
    expect(containerClasses()).toContain('env(safe-area-inset-bottom,0px)');
  });
});

describe('no page draws a container box around its own title', () => {
  // The specific shape that was on four pages. `0 0 36px 36px` is a slab
  // squared off against the top bar; it reads as a box drawn around the
  // heading rather than as the page's header.
  const pages = [
    ['app', 'reports', 'page.tsx'],
    ['app', 'insights', 'renewal', 'page.tsx'],
    ['app', 'insights', 'traffic', 'page.tsx'],
    ['app', 'insights', 'sessions', 'page.tsx'],
    ['app', 'operations', 'leaderboard', 'page.tsx'],
  ];

  it.each(pages)('%s/%s/%s has no slab header', (...p) => {
    expect(src(...p)).not.toContain("borderRadius: '0 0 36px 36px'");
  });

  it.each(pages)('%s/%s/%s pays no gutter of its own', (...p) => {
    const s = src(...p);
    expect(s).not.toMatch(/padding: '52px 32px/);
    expect(s).not.toMatch(/padding: '24px 32px'/);
    expect(s).not.toMatch(/padding: '0 32px/);
  });

  it.each(pages)('%s/%s/%s uses the shared hero and container', (...p) => {
    const s = src(...p);
    expect(s).toContain('<PageContainer>');
    expect(s).toContain('<PageHero');
  });

  it.each(pages)('%s/%s/%s is off the double-padding legacy scaffold', (...p) => {
    // `.page-main` sets its own 16px inside `.shell-main`'s 16px.
    expect(src(...p)).not.toContain('className="page-main"');
  });
});

describe('the hero', () => {
  it('carries the dashboard hero\'s shape and gradient', () => {
    expect(shell).toContain('rounded-[24px]');
    expect(shell).toContain('sm:rounded-[30px]');
    expect(shell).toContain('linear-gradient(158deg, #0F172A 0%, #0050AD 42%, #0F172A 72%, #0050AD 100%)');
  });

  it('does not copy the infinite sheen sweep', () => {
    // One perpetual animation on the screen you land on is a flourish. The
    // same loop on every report page is motion for its own sake, and it runs
    // forever on a page whose job is to be read.
    expect(shell).not.toContain('repeat: Infinity');
  });

  it('skips its entrance under prefers-reduced-motion', () => {
    expect(shell).toContain('useReducedMotion');
    expect(shell).toContain('initial={reduce ? false');
  });

  it('keeps the decoration behind the text and out of the tab order', () => {
    expect(shell).toContain('pointer-events-none');
    expect(shell).toContain('aria-hidden');
  });
});

describe('what the phone screenshots showed', () => {
  it('the reports KPI row is not four hard columns any more', () => {
    // `repeat(4,1fr)` at 390px left each tile ~85px, so the values rendered
    // as "₹..", "J.." and "₹90...".
    const reports = src('app', 'reports', 'page.tsx');
    expect(reports).not.toContain("gridTemplateColumns: 'repeat(4,1fr)'");
    expect(reports).toContain('grid-cols-2');
  });

  it('the attendance date fields cannot outgrow their column', () => {
    // `<input type="date">` sizes to its own content, which is how the "To"
    // field ended up off the right of the screen.
    const traffic = src('app', 'insights', 'traffic', 'page.tsx');
    expect(traffic).toContain('w-full min-w-0');
  });

  it('the 17-hour chart scrolls inside its card instead of squeezing', () => {
    const traffic = src('app', 'insights', 'traffic', 'page.tsx');
    expect(traffic).toContain('overflow-x-auto');
    expect(traffic).toContain('min-w-[520px]');
  });

  it('the report tabs use labels that fit', () => {
    // Measured: the full labels lay out at 400px in a strip that is 318px
    // wide on a 390px phone, which is why each one wrapped onto two lines.
    const reports = src('app', 'reports', 'page.tsx');
    expect(reports).toContain("short: 'Revenue'");
    expect(reports).toContain('aria-label={t.label}');
  });
});
