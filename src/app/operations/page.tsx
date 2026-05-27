// H-06 fix: /operations root had no index page — only /operations/leaderboard
// existed. Any link to /operations/ produced a Next.js 404.
import { redirect } from 'next/navigation';

export default function OperationsRoot() {
  redirect('/operations/leaderboard');
}
