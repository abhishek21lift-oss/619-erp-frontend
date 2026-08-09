'use client';

import { useEffect } from 'react';

/**
 * Keeps bottom-anchored fixed chrome glued to the bottom of what is actually
 * VISIBLE, rather than to the bottom of the layout viewport.
 *
 * ── The bug this exists to make impossible ─────────────────────────────────
 *
 * `position: fixed; bottom: 0` resolves against the LAYOUT viewport. iOS
 * changes the VISUAL one instead — it does not shrink the layout viewport for
 * the on-screen keyboard, it scrolls the web view inside it and offsets the
 * visual viewport. When the two fall out of step the bottom nav is laid out
 * against a bottom edge that is no longer where the screen ends, so it floats
 * with a strip of blank page beneath it.
 *
 * This app is installed as a standalone PWA (manifest `display: standalone`,
 * apple-mobile-web-app-capable), which is the context where iOS is worst at
 * putting that back: dismissing the keyboard frequently leaves the web view
 * shifted, and it stays shifted until something forces a recompute.
 *
 * ── Why the existing fix could not cover this ──────────────────────────────
 *
 * useViewportDesyncFix corrects by re-asserting the document's own scroll
 * position, which is enough to make Safari recompute — but ONLY on a page
 * that scrolls. The AI Coach console is deliberately exactly viewport-height
 * with `overflow: hidden`, so its document cannot scroll at all and that
 * correction is a no-op there. It is also the page with a text input sitting
 * directly above the nav, so it is the page where the keyboard is opened next
 * to it most often. A fix that depends on scrolling cannot help the one
 * screen that cannot scroll, which is why this measures instead.
 *
 * ── What it publishes ──────────────────────────────────────────────────────
 *
 * `--vv-bottom-inset` on <html>: how far BELOW the visible area a
 * `bottom: 0` element would currently land. Bottom-anchored chrome adds it to
 * its own `bottom` offset, so it tracks the real bottom edge no matter what
 * the layout viewport believes. Zero in the healthy case, so this changes
 * nothing when nothing is wrong.
 *
 * The keyboard itself is deliberately NOT compensated for. When it is open it
 * occludes hundreds of pixels, and lifting the nav clear of it would park it
 * on top of the very input being typed into. Anything at or above
 * KEYBOARD_MIN_PX is therefore left alone — the nav sits behind the keyboard,
 * exactly as it does today. What gets corrected is the much smaller residual
 * displacement left behind AFTER the keyboard goes away, which is the bug.
 *
 * No-ops entirely without visualViewport, which is every desktop browser and
 * every case that never had the problem.
 */
export default function useVisualViewportAnchor() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    if (!vv) {
      // Declared even here so the calc() consumers never fall back to an
      // undefined custom property.
      root.style.setProperty('--vv-bottom-inset', '0px');
      return;
    }

    // An open keyboard, not a desync. Same threshold useViewportDesyncFix
    // uses to tell the two apart, for the same reason.
    const KEYBOARD_MIN_PX = 120;
    // Nothing legitimate displaces the bar further than a browser chrome bar
    // plus a home indicator. Bounded so that a reading taken mid-animation,
    // or on some future iOS that reports these differently, can only ever be
    // a small nudge — never enough to shove the nav off the screen, which
    // would be a worse bug than the gap it is correcting.
    const MAX_SHIFT_PX = 96;

    let raf = 0;
    // Tracked separately from the rAF id rather than reusing it as the
    // "already queued" flag: clearing the id inside apply() races the
    // assignment of the id itself, so a synchronous callback would leave a
    // stale non-zero id behind and latch the guard shut permanently.
    let pending = false;

    const apply = () => {
      pending = false;

      // Where `bottom: 0` lands, and where the screen actually ends, both in
      // layout-viewport coordinates.
      const layoutBottom = window.innerHeight;
      const visibleBottom = vv.offsetTop + vv.height;

      // Signs matter here, and the reported symptom is the NEGATIVE one:
      //   < 0  the layout viewport ends ABOVE the screen, so a bottom: 0 bar
      //        is drawn short of the edge with blank page beneath it — the
      //        bug in the screenshots. Corrected by pushing the bar DOWN,
      //        which a negative `bottom` does.
      //   > 0  the layout viewport ends BELOW the screen, so the bar is off
      //        the fold. Small values (chrome mid-collapse) are lifted; a
      //        big one is the keyboard and is left alone on purpose.
      const shift = layoutBottom - visibleBottom;

      const inset = Math.abs(shift) >= KEYBOARD_MIN_PX
        ? 0
        : Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, Math.round(shift)));

      root.style.setProperty('--vv-bottom-inset', `${inset}px`);
    };

    // Coalesced to one write per frame: iOS fires a burst of both events
    // while the keyboard animates and while browser chrome collapses.
    const schedule = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(apply);
    };

    apply();
    vv.addEventListener('resize', schedule);
    // `scroll` on the visual viewport is what fires when iOS shifts the web
    // view without changing its size — the standalone-PWA case above.
    vv.addEventListener('scroll', schedule);
    window.addEventListener('orientationchange', schedule);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      window.removeEventListener('orientationchange', schedule);
    };
  }, []);
}
