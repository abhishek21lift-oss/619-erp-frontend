'use client';

// Member Login — the client side.
//
// The twin of /login; see the note there for why both render one component.
// A studio account cannot sign in here, enforced server-side.

import SignInScreen from '@/components/auth/SignInScreen';

export default function MemberLoginPage() {
  return <SignInScreen portal="member" />;
}
