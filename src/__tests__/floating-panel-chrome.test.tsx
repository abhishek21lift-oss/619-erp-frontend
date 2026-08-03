// The slide-over panel has to know the device has a notch.
//
// It did not. `pt-6` was the entire top clearance, so on a phone the panel's
// title rendered under the status bar — a screenshot of the session detail
// screen showed "3:18" printed through a client's name, and the close button
// sat behind the battery indicator. That button is the only way out of a
// full-screen panel, which makes this a trap rather than a cosmetic fault.
//
// Everything else in the app already handles this: AppShell publishes
// --topbar-h as calc(46px + env(safe-area-inset-top)) and page headers align
// to it. A fixed-position panel owns its own inset, and had none.
//
// These assertions are on the style contract rather than on measured pixels,
// because jsdom performs no layout and resolves no env(). The real geometry
// was measured in a browser at two insets: with a 54px notch the title sits at
// 70px, and with none it sits at 16px — the inset is consumed when present and
// costs nothing when absent.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FloatingPanel } from '@/components/premium/FloatingPanel';

// jsdom's CSS parser mangles `env(safe-area-inset-top, 0px)` into
// `env(0px * , * safe-area-inset-top)` when a declaration is read back, so
// asserting on style.paddingTop would test jsdom rather than the component.
// The env() contract is asserted against the source; the real geometry was
// measured in a browser.
const RAW = readFileSync(join(process.cwd(), 'src/components/premium/FloatingPanel.tsx'), 'utf8');
// Comments stripped: the file's docblock quotes AppShell's own
// `env(safe-area-inset-top)` — without a fallback, because that is how
// AppShell writes it — and scanning prose would flag the explanation rather
// than the code.
const SRC = RAW.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');

const open = (extra: Record<string, unknown> = {}) =>
  render(
    <FloatingPanel open onClose={() => {}} title="Hari Narayan Singh" subtitle="Session with Abhishek Katiyar" {...extra}>
      <p>body</p>
    </FloatingPanel>
  );

function header() {
  return document.querySelector('[role="dialog"] header') as HTMLElement;
}

afterEach(cleanup);

describe('safe areas', () => {
  it('reserves the notch above the header', () => {
    // The inset PLUS a gap, not a flat number: a hard-coded 54px would leave
    // a dead band at the top of the drawer on every device without a notch.
    expect(SRC).toMatch(/calc\(env\(safe-area-inset-top, 0px\) \+ [\d.]+rem\)/);
    // And it is actually applied to the header, which jsdom can confirm even
    // though it garbles the value.
    open();
    expect(header().getAttribute('style')).toMatch(/padding-top/);
  });

  it('reserves the home indicator below the body', () => {
    // The mirror of the notch problem: without this the last row of a long
    // panel sits half-hidden behind the indicator.
    expect(SRC).toMatch(/calc\(env\(safe-area-inset-bottom, 0px\) \+ [\d.]+rem\)/);
    open();
    const body = header().nextElementSibling as HTMLElement;
    expect(body.getAttribute('style')).toMatch(/padding-bottom/);
  });

  it('falls back to zero rather than to nothing', () => {
    // env() with no fallback resolves to an invalid value where it is not
    // supported, taking the whole calc() with it — and the padding silently
    // becomes none. Every env() here carries the 0px fallback.
    const envs = SRC.match(/env\(safe-area-inset-[a-z]+[^)]*\)/g) ?? [];
    expect(envs.length).toBeGreaterThan(0);
    for (const e of envs) expect(e).toContain('0px');
  });
});

describe('the close button', () => {
  it('is a 44px target set in pixels, not rems', () => {
    // globals.css sets a 14px root, so h-11 measures 38.5px — under the
    // minimum it was chosen to satisfy. Measured at 39px in a browser before
    // this was pinned.
    open();
    const btn = screen.getByRole('button', { name: 'Close' });
    expect(btn.style.height).toBe('44px');
    expect(btn.style.width).toBe('44px');
    expect(btn.className).not.toMatch(/\bh-\d+\b/);
  });

  it('is reachable by name', () => {
    // It was an unlabelled icon button — "button" and nothing else to a
    // screen reader, on the only control that dismisses the panel.
    open();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});

describe('the design system', () => {
  it('uses theme tokens rather than a hard-coded palette', () => {
    // The chip was bg-indigo-50 / text-indigo-600 and the borders were
    // slate-*. Indigo appears nowhere else in this product, and it slipped
    // past the palette guard because that scans hex literals and these were
    // Tailwind class names.
    open({ icon: <span data-testid="icon" /> });
    const html = document.querySelector('[role="dialog"]')!.innerHTML;
    expect(html).not.toMatch(/indigo/);
    expect(html).not.toMatch(/slate-\d/);
    expect(html).toContain('var(--brand-soft)');
  });

  it('follows the theme rather than pinning itself to light mode', () => {
    open();
    const panel = header().parentElement as HTMLElement;
    expect(panel.style.background).toContain('var(--bg-base)');
    expect(panel.style.borderLeft).toContain('var(--border)');
  });
});

describe('dialog semantics', () => {
  it('announces itself as a modal named after its title', () => {
    open();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Hari Narayan Singh');
  });

  it('locks the page behind it while open, and restores on close', () => {
    // Without this the page underneath scrolls once the panel's own content
    // reaches its end, which on a phone reads as the panel drifting.
    const { unmount } = open();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('renders nothing at all when closed', () => {
    render(
      <FloatingPanel open={false} onClose={() => {}} title="Closed">
        <p>body</p>
      </FloatingPanel>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
