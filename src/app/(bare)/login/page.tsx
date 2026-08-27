'use client';

// Admin Login — the studio side.
//
// Both sign-in routes render the same screen (src/components/auth/SignInScreen)
// with a different `portal`. One component, because the two share Google
// sign-in, passkeys, the 2FA challenge and the remembered-account handling —
// five hundred lines that must not drift apart between two copies.
//
// The `portal` is not decoration. It goes to the server, which refuses a
// member account here after checking the password. A screen that merely looks
// separate is not separate: the same POST works from either page, or from curl.

import SignInScreen from '@/components/auth/SignInScreen';
import PublicPullToRefresh from '@/components/PublicPullToRefresh';

export default function LoginPage() {
  return (
    <>
      <PublicPullToRefresh />
      <SignInScreen portal="staff" />
    </>
  );
}
