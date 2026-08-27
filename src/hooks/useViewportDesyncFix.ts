'use client';

import { useEffect } from 'react';

/**
 * Re-sync the viewport when iOS leaves `position: fixed` chrome short of the
 * screen edge.
 *
 * The symptom is always the same: the bottom nav floats above the bottom of
 * the display with a strip of blank page under it. iOS does not shrink the
 * layout viewport when the visual one changes; it scrolls the document and
 * offsets the visual viewport instead, and fixed elements are laid out against
 * the layout viewport. When the two fall out of step, fixed chrome lands in
 * the wrong place and stays there until something makes Safari recompute.
 *
 * ── Two triggers, not one ──────────────────────────────────────────────────
 *
 * This was written for the KEYBOARD: tapping a field scrolls the page up,
 * which is correct, and dismissing via the accessory bar's Done button often
 * leaves the document scrolled and the viewport offset, which is not.
 *
 * It ignored everything smaller than 120px "to keep the fix from firing on the
 * much smaller viewport changes from browser chrome collapsing as you scroll"
 * — and browser chrome collapsing is the OTHER way the two fall out of step.
 * The gap was reported on /ai/business-insights, a page with no text input on
 * it at all: no keyboard can open there, so `keyboardOpen` was never true, so
 * the correction could never run. The fix was structurally incapable of
 * helping on exactly the kind of short, input-less page where the problem is
 * easiest to hit.
 *
 * So the small changes are handled too, debounced until the viewport settles
 * rather than corrected on every frame of a collapse.
 *
 * ── Why re-asserting is safe to do more often ─────────────────────────────
 *
 * The correction depends on whether the page can be scrolled at all:
 *
 * - A scrollable page has its CURRENT position re-asserted. That is enough to
 *   make iOS resync, and deliberately does not move the reader — yanking
 *   someone to the top of a long form would be a worse bug than the gap.
 * - A fixed-height shell (the AI Coach console is exactly 100dvh minus the
 *   chrome) cannot be scrolled back by hand, so the gap would stay until
 *   navigation. Those get scrolled to 0, which is where such a page already
 *   is unless it is displaced — so the call is a no-op in the healthy case.
 *
 * Neither branch moves the user when nothing is wrong, which is what makes it
 * defensible to run on chrome collapse as well as on keyboard dismissal.
 *
 * ── Why the correction also runs once on mount ─────────────────────────────
 *
 * AppShell is rendered per-page, not from a shared root layout — every one of
 * the ~200 pages using it renders its own `<AppShell>`, so this hook unmounts
 * and remounts on every client-side navigation. A resize this hook needs to
 * see can land in the gap between the old page's listener being torn down and
 * the new page's being attached: tapping a bottom-nav link both blurs the
 * focused field and navigates in the same gesture, and the keyboard-dismiss
 * resize can fire mid-navigation, after the old listener is gone and before
 * the new one exists. The new page then mounts already desynced, and — on a
 * page with no text input to ever trigger another resize — nothing would
 * correct it, ever. Running the correction once at mount as well closes
 * exactly that gap: a page that lands already desynced fixes itself
 * immediately instead of waiting on an event that may never come. It is a
 * no-op in the ordinary case for the same reason the resize-triggered call
 * is — a freshly mounted page has nothing to re-assert.
 *
 * No-ops entirely on browsers without visualViewport, which is every desktop
 * case that never had the problem.
 */
export default function useViewportDesyncFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    // A keyboard occludes far more than browser chrome does. The threshold
    // still separates the two, but now to pick the RESPONSE rather than to
    // discard the smaller case.
    const KEYBOARD_MIN_PX = 120;
    // Long enough that a chrome collapse — which fires a burst of resizes as
    // it animates — is corrected once at the end instead of on every frame.
    const SETTLE_MS = 250;

    let keyboardOpen = false;
    let raf = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;

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
        // Dismissal: correct immediately, as before. This is the case where
        // the displacement is largest and most obvious.
        keyboardOpen = false;
        clearTimeout(settle);
        correct();
        return;
      }
      // Browser chrome collapsing or expanding. Wait for the burst to stop,
      // then correct once.
      clearTimeout(settle);
      settle = setTimeout(correct, SETTLE_MS);
    };

    // Catches a page that mounts already desynced — see the mount comment
    // above. Unconditional and immediate, not debounced: unlike a resize
    // burst there is only ever one of these per mount.
    correct();

    vv.addEventListener('resize', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      clearTimeout(settle);
      cancelAnimationFrame(raf);
    };
  }, []);
}
