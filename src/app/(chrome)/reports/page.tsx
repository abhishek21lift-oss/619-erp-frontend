import { redirect } from 'next/navigation';

/**
 * The old Reports dashboard had two tabs, and each was a thinner copy of a
 * page that already existed:
 *   • Monthly Revenue → Revenue Analytics (/insights/revenue), which has the
 *     same monthly figures plus incentives, the target and the date range,
 *     and now the CSV export, best month and average this page led with;
 *   • Pending Dues   → Outstanding Dues (/finance/dues), which has the same
 *     search plus risk bands and WhatsApp reminders.
 * The address stays so bookmarks and ?tab= links land on the right one.
 */
export default async function ReportsRedirect({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(tab === 'dues' ? '/finance/dues' : '/insights/revenue');
}
