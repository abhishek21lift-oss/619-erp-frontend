import { redirect } from 'next/navigation';

/**
 * A second trainer dashboard from before the PT OS home. Nothing linked to it,
 * and it read fields (earnings, schedule, clients, earningsHistory, stats) that
 * GET /api/pt-os/dashboard no longer returns, so it could not render. The
 * studio's dashboard is the home page.
 */
export default function TrainerDashboardRedirect() {
  redirect('/');
}
