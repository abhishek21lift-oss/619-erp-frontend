// H-05 fix: /trainer root had no index page — bookmarks and breadcrumb
// ancestor clicks produced a Next.js 404. Redirect to the trainer portal.
import { redirect } from 'next/navigation';

export default function TrainerRoot() {
  redirect('/trainer/dashboard');
}
