// The Command Center's chrome — deliberately almost none of it.
//
// ── Why this route group exists ─────────────────────────────────────────────
//
// /platform used to live under `(chrome)`, which meant the owner's control
// plane rendered inside the customer's application: the studio sidebar, the
// studio bottom nav, the studio's notification poller, all wrapped around a
// console for administering every studio at once. That is not a cosmetic
// complaint. It meant the two planes shared a React tree, a shell, a set of
// providers and a session, and the only thing dividing them was a role
// comparison in Guard. One forgotten `role ===` anywhere in that shared shell
// and a tenant admin is looking at platform furniture.
//
// A separate route group gives the console its own layout with none of the
// tenant chrome in it, so there is no shared shell left to leak through. The
// pages under it already render their own header and navigation
// (components/platform/console), which is why this file adds a wrapper and
// nothing else — the console was always self-contained; it was just being
// mounted inside somebody else's frame.
//
// ── What still holds the boundary ───────────────────────────────────────────
//
// This layout is the third of four gates, and the weakest of them by design:
//
//   1. The edge proxy (src/proxy.ts) refuses /platform on the studio host, so
//      in production the console is not served at all from the app's domain.
//   2. Guard, below, refuses any account whose portal is not 'platform'.
//   3. Every request the console makes goes to /api/platform, which the
//      backend gates on requirePlatformOwner — explicit grant, platform
//      session audience, no impersonation.
//
// Only (3) is load-bearing against an attacker; (1) and (2) exist so that a
// tenant user never sees a frame of a console they cannot use, and so that a
// bug in one of them is not the whole story.
//
// Guard sits here rather than in the pages for the same reason it does in
// (chrome)/layout.tsx: the shell must not paint before the session is known.

import Guard from '@/components/Guard';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard role="super_admin">
      <div id="main-content">{children}</div>
    </Guard>
  );
}
