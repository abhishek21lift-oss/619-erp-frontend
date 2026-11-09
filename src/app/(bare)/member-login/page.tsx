import { redirect } from 'next/navigation';

// Member Login is now the same customer door as /login. Kept as a server
// redirect so old bookmarks, activation emails and installed member apps keep
// working; the ?redirect= target restores the member session and lands them on
// their dashboard.
export default function MemberLoginPage() {
  redirect('/login?redirect=/member/dashboard');
}
