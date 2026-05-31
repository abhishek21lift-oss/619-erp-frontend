// C-02 fix: /member root was unreachable (orphan). Redirect to the member portal dashboard.
import { redirect } from 'next/navigation';

export default function MemberRoot() {
  redirect('/member/dashboard');
}
