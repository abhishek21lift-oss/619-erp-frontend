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

import type { Metadata } from 'next';
import Guard from '@/components/Guard';

// ── The console is its own installable app ──────────────────────────────────
//
// Installing /platform to a home screen used to produce an icon that opened
// the STUDIO app. iOS and Android ignore the page you installed from and honour
// the manifest's `start_url`, and the only manifest on the origin declared
// `"start_url": "/"`. So the operator installed the console and got the
// customer's product — the home-screen version of the mixing this whole
// separation exists to end.
//
// Next merges a nested segment's metadata over its parent's, so declaring
// `manifest` here overrides the root layout's for every page under (platform)
// and changes nothing anywhere else.
//
// ── Two choices inside platform-manifest.json worth stating ─────────────────
//
// `scope` is "/" rather than "/platform", which looks wrong and is deliberate.
// Scope decides which URLs stay inside the installed app; anything outside it
// opens in the browser instead. The operator legitimately navigates OUT of the
// console — impersonating a studio, or pinning the org-switcher — and a
// /platform scope would eject them into Safari halfway through supporting a
// customer. Once the console has its own hostname the question disappears,
// because the origin is the boundary.
//
// `id` is set on this manifest and deliberately NOT added to the studio's.
// It is what keeps the two installs distinct, but adding an `id` to a manifest
// whose app is ALREADY installed can orphan that install — so the new one
// declares its identity and the existing one is left exactly as it is.
//
// Both manifests currently point at the same icons. A distinct mark for the
// console would be better — two identical icons on one home screen is a poor
// joke — but that is artwork, not code, and the labels differ ("Command
// Center" vs "MY PT STUDIO") so they are at least tellable apart.
export const metadata: Metadata = {
  manifest: '/platform-manifest.json',
  title: 'Command Center',
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard role="super_admin">
      <div id="main-content">{children}</div>
    </Guard>
  );
}
