// The printable invoice's HTML.
//
// This lives in its own module rather than in the page for two reasons.
//
// Escaping: it used to be a function inside
// app/(chrome)/finance/invoices/page.tsx, which meant the only way to test that
// its values were escaped was to render the whole page. That is why the
// injection went unnoticed — every test of this template either rendered the
// screen (which never calls the generator) or read the source as text (which
// cannot tell a rendered field from an unescaped one). print-popup-xss.test.ts
// imports this directly and asserts on the parsed DOM.
//
// Next.js constraint: a page.tsx may only export default, metadata,
// generateStaticParams and a handful of other known names, so exporting the
// generator from there is a type error, not a style choice.
//
// The page imports it. The template markup is unchanged from what shipped.

import { escapeHtml } from '@/lib/escapeHtml';

export type PaymentMethod = 'upi' | 'credit-card' | 'cash' | 'razorpay' | 'stripe' | 'bank-transfer';
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft' | 'cancelled';

export interface Invoice {
  id: string;
  memberName: string;
  description: string;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  amount: number;
  paymentMethod?: PaymentMethod | string;
}

// A module-level constant of literals, referenced by the template for its
// label. Kept here so the generator is self-contained; the page imports the
// same map for its list rendering, so the two cannot disagree.
const PAYMENT_ICONS: Record<string, { label: string }> = {
  'upi': { label: 'UPI' },
  'credit-card': { label: 'Card' },
  'cash': { label: 'Cash' },
  'razorpay': { label: 'Razorpay' },
  'stripe': { label: 'Stripe' },
  'bank-transfer': { label: 'Bank Transfer' },
  'manual': { label: 'Manual' },
};

export function generateInvoiceHTML(invoice: Invoice): string {
  // Every value below is escaped. The tags are ours; the text between them is
  // a member name, a description and dates, and this string is written into a
  // same-origin popup where an inline <script> is still permitted by the
  // enforced CSP. See lib/escapeHtml.ts for why the template is not escaped
  // wholesale instead.
  const e = escapeHtml;
  // status is compared for the palette but also printed, so it needs both.
  const statusLabel = e(invoice.status.toUpperCase());
  return `<!DOCTYPE html><html><head><title>Invoice ${e(invoice.id)}</title>
<style>body{font-family:sans-serif;padding:40px;color:#0f172a}h1{font-size:24px;margin-bottom:4px}
.row{display:flex;gap:32px;margin-bottom:24px}.field{flex:1}
label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;font-weight:700}
p{font-size:15px;font-weight:600;margin:4px 0}
.amount{font-size:28px;font-weight:800;color:#0f172a}
.status{display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;
background:${invoice.status==='paid'?'#d1fae5':invoice.status==='overdue'?'#fee2e2':'#fef3c7'};
color:${invoice.status==='paid'?'#059669':invoice.status==='overdue'?'#dc2626':'#d97706'}}
@media print{button{display:none}}</style></head><body>
<h1>Invoice</h1><p style="color:#64748b;margin-bottom:24px">${e(invoice.id)}</p>
<div class="row"><div class="field"><label>Bill To</label><p>${e(invoice.memberName)}</p></div>
<div class="field"><label>Status</label><div style="margin-top:4px"><span class="status">${statusLabel}</span></div></div></div>
<div class="row"><div class="field"><label>Issue Date</label><p>${e(invoice.date)}</p></div>
<div class="field"><label>Due Date</label><p>${e(invoice.dueDate)}</p></div></div>
<div style="border-top:2px solid #e2e8f0;padding-top:16px;margin-bottom:24px">
<label>Description</label><p>${e(invoice.description)}</p></div>
<div style="background:#f8fafc;border-radius:12px;padding:24px;text-align:right">
<label>Total Amount</label><div class="amount">&#8377;${e(invoice.amount.toLocaleString('en-IN'))}</div>
${invoice.paymentMethod?`<p style="color:#64748b;font-size:13px;margin-top:8px">Via ${e(PAYMENT_ICONS[invoice.paymentMethod]?.label)}</p>`:''}
</div></body></html>`;
}