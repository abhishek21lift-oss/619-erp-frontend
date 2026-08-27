'use client';

/**
 * PublicPullToRefresh — pull-to-refresh for the signed-out pages.
 *
 * The in-app PullToRefresh lives in AppShell, so it never mounts on the public
 * pages (landing, /login, /start-free) and those pages had no refresh gesture.
 * This adapter reuses the exact same hook and indicator — one implementation,
 * identical feel everywhere — with two public-page-specific differences:
 *
 *   1. It never translates the page content. The public topbar is fixed and
 *      must stay put; only the indicator follows the pull.
 *   2. Release past the threshold performs a full `window.location.reload()`.
 *      The public pages have no refetch pipeline, so a normal browser refresh
 *      is the honest equivalent of the in-app "refetch".
 *
 * Mount it once per public page. Form areas and the landing drawer opt out
 * with `data-no-pull-refresh` (see pull-refresh-optout.test.ts). Desktop is
 * never affected: the hook listens for touch events only.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePullToRefresh } from '@/components/common/PullToRefresh/usePullToRefresh';
import PullIndicator from '@/components/common/PullToRefresh/PullIndicator';
import { useNavScroll } from '@/contexts/nav-scroll-context';

/** Indicator rest position when no fixed header is measurable (96px). */
const FALLBACK_OFFSET = 96;
/** Air between the header's bottom edge and the indicator's resting point. */
const HEADER_AIR = 12;

export default function PublicPullToRefresh() {
  const { reducedMotion } = useNavScroll();
  const [offset, setOffset] = useState(FALLBACK_OFFSET);

  // The indicator must sit below the fixed public topbar. Its height depends on
  // the device's safe-area inset (notched phones reserve more above the bar),
  // so it is measured rather than assumed, and re-measured on resize/rotation.
  // The /login and /start-free pages render their header only AFTER the auth
  // bootstrap resolves, so the header is also watched for — the fallback
  // offset is a stopgap, never a resting place.
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('header');
      const bottom = header ? header.getBoundingClientRect().bottom : FALLBACK_OFFSET - HEADER_AIR;
      setOffset(Math.round(bottom) + HEADER_AIR);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    // Re-measure only when a header APPEARS (auth bootstrap on /login and
    // /start-free renders the topbar after it resolves). Presence flips are
    // rare; re-measuring on every mutation would force a layout read per
    // render. Resize/orientationchange above cover size changes.
    const seen = { header: !!document.querySelector('header') };
    const observer = new MutationObserver(() => {
      const has = !!document.querySelector('header');
      if (has && !seen.header) measure();
      seen.header = has;
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      observer.disconnect();
    };
  }, []);

  const onRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const { phase, pullDistance, progress } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    maxPull: 110,
  });

  return (
    <>
      {/* Anchor for the indicator — fixed so it tracks the viewport (not the
          page) and pointer-events-free so it never eats a touch. The indicator
          itself slides down from above this line, i.e. from behind the topbar. */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', top: offset, left: 0, right: 0, height: 0, zIndex: 40, pointerEvents: 'none' }}
      >
        <PullIndicator
          phase={phase}
          progress={progress}
          pullDistance={reducedMotion ? 0 : pullDistance}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Live region — independent of the visual gesture. */}
      <span className="sr-only" role="status" aria-live="polite">
        {phase === 'refreshing'
          ? 'Refreshing content'
          : phase === 'success'
            ? 'Refresh complete'
            : phase === 'ready'
              ? 'Release to refresh'
              : ''}
      </span>
    </>
  );
}