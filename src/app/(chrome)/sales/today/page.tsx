import { redirect } from 'next/navigation';

/**
 * Today's Sales was a second page over the same two endpoints as Collected
 * Payments (GET /api/payments and /api/payments/stats), filtered to today.
 * Collected Payments now has a Today / This month / All period and the same
 * by-method breakdown, so this address opens it on "Today" — bookmarks and
 * old links keep working.
 */
export default function TodaysSalesRedirect() {
  redirect('/finance/collected-payments?period=today');
}
