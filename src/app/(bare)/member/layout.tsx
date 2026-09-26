import type { Metadata } from 'next';

// ── The member portal is its own installable app ────────────────────────────
//
// Same reasoning as (platform)/layout.tsx: iOS and Android open an installed
// app at its manifest's `start_url`, whatever page it was installed from. The
// root manifest's is "/" — the studio app — so a member who added the portal
// to their home screen would open the trainer's sign-in page.
//
// Next merges a nested segment's metadata over its parent's, so this swaps the
// manifest for every /member page and changes nothing elsewhere. The layout
// itself adds no markup: each page mounts MemberShell, and Guard, itself.
export const metadata: Metadata = {
  manifest: '/member-manifest.json',
  appleWebApp: { capable: true, title: 'My PT', statusBarStyle: 'black-translucent' },
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return children;
}
