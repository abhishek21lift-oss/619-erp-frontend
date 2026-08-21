import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// The New Programme sheet must sit on an OPAQUE surface.
//
// ── The bug ────────────────────────────────────────────────────────────────
//
// It was reported as "the popup is transparent", and it literally was. The
// panel used `background: var(--bg-card)`, and that token is not opaque:
//
//   light   --bg-card: rgba(255,255,255,0.8)
//   dark    --bg-card: rgba(30,41,59,0.7)
//
// It is a frosted-glass CARD token — it only reads as glass when something
// behind it is blurred. Used raw on a floating panel with no backdrop-filter,
// the page underneath showed straight through at 20-30%, over a backdrop that
// was itself only 45% and unblurred.
//
// `--bg-elevated` (#FFFFFF / #1E293B) is the opaque surface token, and is what
// every other dialog in the app already used. This is a one-token bug that no
// test could see, because nothing asserted which surface a dialog sits on.
//
// ── Why source assertions here ─────────────────────────────────────────────
//
// jsdom does not resolve CSS custom properties from a stylesheet, so a
// getComputedStyle check would return the literal `var(--bg-card)` either way
// and pass on both. The surface token is the whole finding, so it is asserted
// where it can actually be seen.

const SRC = path.join(__dirname, '..');
const raw = fs.readFileSync(
  path.join(SRC, 'components/pt-os/builder/NewProgrammeDialog.tsx'), 'utf8',
);
// Comments quote --bg-card to explain why it is wrong; a raw match would read
// the explanation as the defect still being present.
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const globals = fs.readFileSync(path.join(SRC, 'app/globals.css'), 'utf8');

describe('the panel sits on an opaque surface', () => {
  it('uses --bg-elevated, not --bg-card', () => {
    expect(src).toMatch(/background: 'var\(--bg-elevated\)'/);
    expect(src).not.toMatch(/var\(--bg-card\)/);
  });

  it('--bg-card really is translucent, which is why it was wrong here', () => {
    // Pins the premise. If someone makes --bg-card opaque later, this test
    // should be revisited rather than silently keep guarding nothing.
    const cardValues = [...globals.matchAll(/--bg-card:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(cardValues.length).toBeGreaterThan(0);
    for (const v of cardValues) expect(v).toMatch(/rgba\([^)]*,\s*0?\.\d+\s*\)/);
  });

  it('--bg-elevated really is opaque', () => {
    const elevated = [...globals.matchAll(/--bg-elevated:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(elevated.length).toBeGreaterThan(0);
    for (const v of elevated) expect(v).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('the backdrop matches the rest of the app', () => {
  it('uses the overlay token rather than a hardcoded rgba', () => {
    expect(src).toMatch(/background: 'var\(--bg-overlay\)'/);
    expect(src).not.toMatch(/rgba\(15,23,42,0\.45\)/);
  });

  it('is blurred, so the panel reads as floating above the page', () => {
    expect(src).toMatch(/backdropFilter: 'blur\(/);
    // Safari needs the prefix or the blur simply does not happen there.
    expect(src).toMatch(/WebkitBackdropFilter: 'blur\(/);
  });

  it('stays a mouse affordance only', () => {
    // Escape is the keyboard equivalent and useDialogA11y provides it; a key
    // handler here would add a tab stop that announces nothing.
    expect(src).toMatch(/aria-hidden="true"/);
    expect(src).toMatch(/useDialogA11y/);
  });
});

describe('the primary action cannot scroll out of reach', () => {
  it('scrolls the body, not the whole panel', () => {
    // The panel was one scrolling column, so on a short screen with the client
    // list open the CTA scrolled away and the sheet looked like a dead end.
    expect(src).toMatch(/className="relative flex max-h-\[92dvh\][^"]*flex-col overflow-hidden/);
    expect(src).toMatch(/min-h-0 flex-1 overflow-y-auto/);
  });

  it('keeps the footer opaque where it overlaps the scrolling body', () => {
    expect(src).toMatch(/borderTop: '1px solid var\(--border\)', background: 'var\(--bg-elevated\)'/);
  });

  it('clears the home indicator on a phone', () => {
    expect(src).toMatch(/env\(safe-area-inset-bottom\)/);
  });
});

describe('it still does what the page depends on', () => {
  it('keeps the contract the page and its tests use', async () => {
    const mod = await import('@/components/pt-os/builder/NewProgrammeDialog');
    expect(typeof mod.default).toBe('function');
    expect(typeof mod.clamp).toBe('function');
    expect(mod.PROGRAMME_GOALS.length).toBeGreaterThan(0);
  });

  it('uses `m`, never `motion` — AppShell mounts LazyMotion in strict mode', () => {
    // `motion.*` throws under LazyMotion strict; this is not a style choice.
    expect(src).toMatch(/import \{ m \} from 'framer-motion'/);
    expect(src).not.toMatch(/\bmotion\.\w+/);
  });
});
