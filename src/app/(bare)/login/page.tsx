'use client';

// The customer sign-in — trainer and member in one place.
//
// Both account types render the same screen (src/components/auth/SignInScreen)
// with `unified`, and the server resolves the account's door from the users
// row after the password checks out. `/member-login` is now only a redirect
// here, and `/platform-login` keeps the operator's separate door.
//
// The `portal` sent to the server is `'unified'`: a request selector, never an
// authorization fact. A screen that merely looks separate is not separate.

import SignInScreen from '@/components/auth/SignInScreen';
import PublicPullToRefresh from '@/components/PublicPullToRefresh';

export default function LoginPage() {
  return (
    <>
      <PublicPullToRefresh />
      <SignInScreen unified />
    </>
  );
}
