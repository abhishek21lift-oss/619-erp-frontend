'use client';

import useVisualViewportAnchor from '@/hooks/useVisualViewportAnchor';

/**
 * The member portal's shared layout.
 *
 * It exists for one reason today: this portal does not go through AppShell.
 * Each member page renders its own chrome, so the viewport anchor that keeps
 * bottom-fixed bars on the real bottom edge — the fix for the nav floating
 * with a strip of blank page under it on iOS — had no mount point here at
 * all, and --vv-bottom-inset stayed on its 0px fallback. The staff side was
 * fixed and the portal boundary quietly stopped it.
 *
 * One layout is the cheapest place to publish it for every member page at
 * once, and it keeps working if a fourth page is added later. /member/payments
 * goes through AppShell and so mounts the hook twice; that is harmless — both
 * copies compute the same value from the same source and write the same
 * variable.
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  useVisualViewportAnchor();
  return <>{children}</>;
}
