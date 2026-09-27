import { redirect } from 'next/navigation';

/**
 * "Session Utilisation" was a second page over the Attendance Report's own
 * endpoint (GET /api/insights/attendance): the same totals, plus check-ins by
 * day of week. That chart is now on the Attendance Report, so this address
 * opens it.
 */
export default function SessionUtilisationRedirect() {
  redirect('/insights/traffic');
}
