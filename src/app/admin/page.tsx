// C-04 fix: /admin root was an orphan with no nav entry and no visible auth guard.
// This redirect ensures /admin always resolves to /admin/dashboard.
// NOTE: /admin/dashboard/page.tsx MUST enforce role === 'admin' on mount.
import { redirect } from 'next/navigation';

export default function AdminRoot() {
  redirect('/admin/dashboard');
}
