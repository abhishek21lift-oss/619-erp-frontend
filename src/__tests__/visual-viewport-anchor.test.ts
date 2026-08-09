// The bottom nav must sit on the bottom edge of what is actually VISIBLE.
//
// `position: fixed; bottom: 0` resolves against the LAYOUT viewport, and iOS
// changes the VISUAL one instead — for the keyboard it scrolls the web view
// and offsets the visual viewport rather than shrinking the layout one. In a
// standalone PWA (which is how this app installs) dismissing the keyboard
// routinely leaves the web view shifted, and the nav then floats with a strip
// of blank page under it.
//
// useViewportDesyncFix already corrects that by re-asserting the document's
// own scroll — but only on a page that HAS a document scroll. The AI Coach
// console is exactly viewport-height with overflow:hidden, so that correction
// is a no-op on the very screen where a text input sits directly above the
// nav and the keyboard is opened next to it most. This hook measures the gap
// instead of scrolling, so it works on both.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import useVisualViewportAnchor from '@/hooks/useVisualViewportAnchor';

const src = (...p: string[]) => readFileSync(join(process.cwd(), 'src', ...p), 'utf8');

type Listener = () => void;

let listeners: Record<string, Listener[]>;

function setViewport({ height, offsetTop = 0 }: { height: number; offsetTop?: number }) {
  const vv = window.visualViewport as unknown as { height: number; offsetTop: number };
  vv.height = height;
  vv.offsetTop = offsetTop;
}

function fire(type: 'resize' | 'scroll') {
  (listeners[type] ?? []).forEach((l) => l());
}

function inset(): string | null {
  return document.documentElement.style.getPropertyValue('--vv-bottom-inset') || null;
}

beforeEach(() => {
  listeners = {};
  document.documentElement.style.removeProperty('--vv-bottom-inset');

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      height: 800,
      offsetTop: 0,
      addEventListener: (t: string, l: Listener) => { (listeners[t] ??= []).push(l); },
      removeEventListener: (t: string, l: Listener) => {
        listeners[t] = (listeners[t] ?? []).filter((x) => x !== l);
      },
    },
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800, writable: true });
  // rAF synchronously, so assertions need no extra flush.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('the healthy case stays untouched', () => {
  it('publishes a zero inset when both viewports agree', () => {
    renderHook(() => useVisualViewportAnchor());
    expect(inset()).toBe('0px');
  });

  it('publishes it on mount, before any event fires', () => {
    // A page can be navigated into while already displaced, so waiting for
    // the next resize would leave the gap on screen until something moved.
    renderHook(() => useVisualViewportAnchor());
    expect(inset()).toBe('0px');
    expect(listeners.resize ?? []).toHaveLength(1);
  });
});

// THE reported symptom: a bar drawn short of the bottom edge with blank page
// under it. That happens when the layout viewport ends ABOVE the screen, so
// the gap measures NEGATIVE and the correction has to push the bar DOWN. An
// earlier draft of this hook clamped negatives away and would have shipped
// doing nothing at all for the exact screenshot it was written from.
describe('the bar is drawn short of the bottom edge', () => {
  it('pushes it back down by the size of the gap', () => {
    renderHook(() => useVisualViewportAnchor());

    // Screen ends 80px below where `bottom: 0` lands.
    setViewport({ height: 800, offsetTop: 80 });
    fire('scroll');

    expect(inset()).toBe('-80px');
  });

  it('reacts to a visual-viewport scroll, not only a resize', () => {
    // The standalone-PWA case moves the web view WITHOUT resizing it, so a
    // resize-only listener would never hear about it at all.
    renderHook(() => useVisualViewportAnchor());

    setViewport({ height: 800, offsetTop: 40 });
    fire('scroll');

    expect(inset()).toBe('-40px');
  });

  it('returns to zero once the viewports line up again', () => {
    renderHook(() => useVisualViewportAnchor());

    setViewport({ height: 800, offsetTop: 80 });
    fire('scroll');
    expect(inset()).toBe('-80px');

    setViewport({ height: 800, offsetTop: 0 });
    fire('scroll');
    expect(inset()).toBe('0px');
  });
});

describe('the bar is pushed below the fold', () => {
  it('lifts it by a small gap, e.g. chrome mid-collapse', () => {
    renderHook(() => useVisualViewportAnchor());

    setViewport({ height: 720, offsetTop: 0 });
    fire('resize');

    expect(inset()).toBe('80px');
  });
});

describe('an open keyboard is deliberately not compensated', () => {
  it('leaves the nav where it is rather than lifting it over the keyboard', () => {
    // Lifting the bar clear of a 300px keyboard would park it on top of the
    // input being typed into — worse than the gap this hook exists to fix.
    renderHook(() => useVisualViewportAnchor());

    setViewport({ height: 500 });
    fire('resize');

    expect(inset()).toBe('0px');
  });

  it('picks up the residual the moment the keyboard goes away', () => {
    renderHook(() => useVisualViewportAnchor());

    setViewport({ height: 500 });     // keyboard up — ignored
    fire('resize');
    expect(inset()).toBe('0px');

    setViewport({ height: 740 });     // dismissed, 60px still displaced
    fire('resize');
    expect(inset()).toBe('60px');
  });
});

describe('a wrong reading can only ever be a nudge', () => {
  it('bounds how far it will shift the bar', () => {
    // Whatever a future iOS reports, the correction must not be able to shove
    // the nav off the screen — that would be a worse bug than the gap.
    renderHook(() => useVisualViewportAnchor());

    setViewport({ height: 800, offsetTop: 110 });
    fire('scroll');

    expect(inset()).toBe('-96px');
  });
});

describe('it cleans up after itself', () => {
  it('removes both listeners on unmount', () => {
    const { unmount } = renderHook(() => useVisualViewportAnchor());
    expect(listeners.resize).toHaveLength(1);
    expect(listeners.scroll).toHaveLength(1);

    unmount();

    expect(listeners.resize).toHaveLength(0);
    expect(listeners.scroll).toHaveLength(0);
  });
});

describe('browsers without visualViewport', () => {
  it('still declares the variable, so no calc() falls back to undefined', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    expect(() => renderHook(() => useVisualViewportAnchor())).not.toThrow();
    expect(inset()).toBe('0px');
  });
});

// Measuring the gap is only half of it — something has to consume the
// variable. These pin the wiring, because a hook publishing a value nothing
// reads would keep passing every test above while the bar stayed broken.
describe('the bottom chrome actually consumes the inset', () => {
  it('the nav takes its bottom from the class, not from Tailwind bottom-0', () => {
    const nav = src('components', 'MobileBottomNav.tsx');
    expect(nav).toContain('mobile-bottom-nav');
    // bottom-0 would be the same specificity and win or lose on source
    // order — an argument this should not be having at all.
    expect(nav).not.toMatch(/className="[^"]*\bbottom-0\b/);
  });

  it('globals.css defines that class in terms of the variable', () => {
    const css = src('app', 'globals.css');
    expect(css).toMatch(/\.mobile-bottom-nav\s*\{[^}]*bottom:\s*var\(--vv-bottom-inset, 0px\)/);
  });

  it('the mobile page action bar clears the nav by the same inset', () => {
    // It sits directly on top of the nav, so if the nav tracks the real
    // bottom edge and this does not, the two come apart.
    //
    // Indexed rather than loosely matched: there are two of these rules and
    // a single-match regex is satisfied by EITHER, so it passes with the
    // wrong one carrying the variable.
    const css = src('app', 'globals.css');
    const rules = [...css.matchAll(/\.page-action-bar\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(rules).toHaveLength(2);
    expect(rules[0]).toContain('var(--vv-bottom-inset, 0px)');
  });

  it('leaves the desktop action bar alone', () => {
    // The inset corrects an iOS bug. Desktop page zoom also moves the visual
    // viewport, legitimately, and is the supported route for larger text —
    // feeding it in would drag this bar around for a bug desktop never had.
    const css = src('app', 'globals.css');
    const rules = [...css.matchAll(/\.page-action-bar\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(rules[1]).not.toContain('--vv-bottom-inset');
  });

  it('the shell mounts the hook', () => {
    const shell = src('components', 'AppShell.tsx');
    expect(shell).toContain('useVisualViewportAnchor()');
  });
});

// The member portal does not go through AppShell — each page renders its own
// chrome — so the first version of this fix stopped dead at the portal
// boundary: the variable was never published there and the member tab bar was
// pinned at a plain bottom-0. Members kept the bug the staff side had fixed.
describe('the member portal is covered too', () => {
  it('mounts the hook, since it never goes through AppShell', () => {
    const layout = src('app', 'member', 'layout.tsx');
    expect(layout).toContain('useVisualViewportAnchor()');
  });

  it('its tab bar takes the inset rather than pinning itself to bottom-0', () => {
    const nav = src('components', 'member', 'MemberNav.tsx');
    expect(nav).toContain('mobile-bottom-nav');
    expect(nav).not.toMatch(/className="[^"]*\bbottom-0\b/);
  });

  it('every member page ends with that same bar', () => {
    // The bar used to live inside the dashboard page as a local component, so
    // only the dashboard had one: /member/classes rendered none at all (a
    // dead end — back button or nothing) and /member/payments rendered the
    // STAFF nav instead. Checked per page rather than trusting the shared
    // component to have been adopted everywhere.
    const pages = ['dashboard', 'classes', 'payments'];
    for (const p of pages) {
      const s = src('app', 'member', p, 'page.tsx');
      expect(s, `${p} must render the member nav, directly or via MemberShell`)
        .toMatch(/MemberNav|MemberShell/);
    }
  });

  it('no member page borrows the staff shell', () => {
    // AppShell brings the staff sidebar and a bottom nav offering Clients /
    // Sessions / Check-in — routes Guard bounces a member out of the moment
    // they tap one.
    for (const p of ['dashboard', 'classes', 'payments']) {
      const s = src('app', 'member', p, 'page.tsx');
      expect(s, `${p} must not render AppShell`).not.toMatch(/<AppShell|from '@\/components\/AppShell'/);
    }
  });

  it('the .member-bottom-nav rule takes it as well', () => {
    const css = src('app', 'globals.css');
    expect(css).toMatch(/\.member-bottom-nav\s*\{[^}]*bottom:\s*var\(--vv-bottom-inset, 0px\)/);
  });

  it('the portal pays the top safe-area inset, having no top bar to carry it', () => {
    // The staff shell's fixed header pays this, and /member/classes pays it
    // on .member-header. The dashboard had neither and started its first card
    // under the status bar on a notched phone. Asserted on the shared shell,
    // so it covers every page that adopts it rather than one of them.
    const shell = src('components', 'member', 'MemberShell.tsx');
    expect(shell).toContain("'env(safe-area-inset-top, 0px)'");
    // …and the escape hatch for a page that already pays it, so the inset is
    // never counted twice.
    expect(shell).toContain('headerPaysTopInset');
  });
});
