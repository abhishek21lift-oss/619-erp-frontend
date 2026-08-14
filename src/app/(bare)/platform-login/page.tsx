'use client';

// Command Center Login — the platform operator's door.
//
// The third sign-in route, rendering the same screen as /login and
// /member-login with a different `portal`. See the note in /login for why one
// component serves all three.
//
// What makes this one different from the other two is what the `portal` value
// buys. For staff and member it is a refusal: the server checks the account
// against the door and rejects the mismatch. Here it additionally decides the
// session's AUDIENCE — the token minted through this page is the only kind
// that may drive the platform control plane, and it is refused by the studio
// app in return. A super_admin who signs in at /login gets a studio session
// and cannot open the console with it.
//
// In production this page is served only on the Command Center host; the edge
// proxy 404s it on the studio host (see src/proxy.ts).

import SignInScreen from '@/components/auth/SignInScreen';

export default function PlatformLoginPage() {
  return <SignInScreen portal="platform" />;
}
