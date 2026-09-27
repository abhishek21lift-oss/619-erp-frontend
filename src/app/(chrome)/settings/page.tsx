import { redirect } from 'next/navigation';

/**
 * This was a standalone Security page: change password, a count of active
 * sessions, and a link to Passkeys. Profile → Security has all of that and
 * more (two-factor, login alerts, sign out everywhere), so this address opens
 * it — the sidebar's gear button and old links keep working.
 */
export default function SecurityRedirect() {
  redirect('/settings/profile?tab=security');
}
