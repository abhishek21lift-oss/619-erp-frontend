import { redirect } from 'next/navigation';

/**
 * "PT Revenue Report" was one table — month, transactions, revenue,
 * incentives — over the same payments as Revenue Analytics, whose monthly
 * breakdown has all of it (plus net, the chart and a CSV export). This
 * address now opens that page.
 */
export default function PtRevenueReportRedirect() {
  redirect('/insights/revenue');
}
