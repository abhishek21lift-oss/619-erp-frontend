'use client';

import { useEffect } from 'react';

/**
 * Recover the viewport after the iOS on-screen keyboard is dismissed.
 *
 * iOS does not shrink the layout viewport for the keyboard; it scrolls the
 * document so the focused field sits above it. That part is fine — the page
 * riding up when you tap a field is exactly what you want. The problem is the
 * way back: dismissing via the accessory bar's Done/✓ button often leaves the
 * document scrolled and the visual viewport offset, so `position: fixed`
 * chrome — the bottom nav — ends up floating short of the screen edge with a
 * strip of blank page under it.
 *
 * The correction depends on whether the page can be scrolled at all:
 *
 * - Fixed-height shells (the AI Coach chat console is exactly
 *   100dvh minus the chrome) cannot be scrolled back by hand, so the gap
 *   simply stays until navigation. Those get scrolled to 0.
 * - Scrollable pages get their *current* position re-asserted. That is enough
 *   to make iOS resync the visual viewport, and deliberately does not move the
 *   user — yanking someone to the top of a long form after they dismiss the
 *   keyboard would be a worse bug than the gap.
 *
 * No-ops entirely on browsers without visualViewport, which is every desktop
 * case that never had the problem.
 */
export default function useKeyboardViewportFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    // A keyboard occludes far more than this. The threshold keeps the fix from
    // firing on the much smaller viewport changes from browser chrome
    // collapsing as you scroll.
    const KEYBOARD_MIN_PX = 120;

    let keyboardOpen = false;
    let raf = 0;

    const correct = () => {
      cancelAnimationFrame(raf);
      // Wait a frame: iOS is still settling the viewport as the resize fires,
      // and a scroll issued mid-animation is discarded.
      raf = requestAnimationFrame(() => {
        const doc = document.scrollingElement ?? document.documentElement;
        const scrollable = doc.scrollHeight > window.innerHeight + 4;
        window.scrollTo(0, scrollable ? window.scrollY : 0);
      });
    };

    const onResize = () => {
      // innerHeight tracks the layout viewport and does not change for the
      // keyboard, so the difference is the occluded height.
      if (window.innerHeight - vv.height > KEYBOARD_MIN_PX) {
        keyboardOpen = true;
        return;
      }
      if (keyboardOpen) {
        keyboardOpen = false;
        correct();
      }
    };

    vv.addEventListener('resize', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);
}
