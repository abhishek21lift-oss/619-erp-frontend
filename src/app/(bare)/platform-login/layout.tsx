import type { Metadata } from 'next';

// The Command Center's door gets the Command Center's manifest.
//
// This segment cannot live under (platform) — that group is wrapped in
// `<Guard role="super_admin">`, and a sign-in page behind a sign-in check is a
// locked door with the key inside. So it sits in (bare) with the other public
// pages, which means it inherits the ROOT manifest unless something says
// otherwise, and the root manifest opens the studio app.
//
// That matters more than it looks. This is the page an operator is most likely
// to install: they navigate to the console's URL, and the browser offers
// "Add to Home Screen" on the sign-in screen before they have got anywhere
// else. Installing it and receiving an icon that opens somebody's client list
// is precisely the bug this pairs with — fixed on /platform and still present
// one page earlier is not fixed.
//
// A layout rather than a `metadata` export on the page itself, because
// page.tsx is a client component ('use client' — it owns form state, the
// passkey prompt and the 2FA challenge) and a client component cannot export
// metadata. This wrapper is a server component that renders its children
// untouched; its only job is the manifest.
export const metadata: Metadata = {
  manifest: '/platform-manifest.json',
  title: 'Command Center',
};

export default function PlatformLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
