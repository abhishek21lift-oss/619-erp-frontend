import { notFound, redirect } from 'next/navigation';

/**
 * Old /settings/<tab> addresses. This used to render a generic workspace, but
 * every tab it accepted except "biometric" has its own page (which Next.js
 * always prefers over this dynamic route), so only /settings/biometric ever
 * reached it — as a second, generic copy of Member Passkeys. It now sends that
 * one address to the real page.
 */
const CANONICAL: Record<string, string> = {
  biometric: '/settings/biometrics',
};

export default async function SettingsTabRedirect({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const target = CANONICAL[tab];
  if (!target) notFound();
  redirect(target);
}
