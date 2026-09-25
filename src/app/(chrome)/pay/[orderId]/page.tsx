'use client';

/**
 * The studio's view of a UPI payment — an order the trainer opened at the
 * desk. Members pay at /member/pay/[orderId]; the portal guard keeps each
 * account in its own app, so this route is the trainer's only.
 */

import Guard from '@/components/Guard';
import UpiPayScreen from '@/components/payments/UpiPayScreen';

export default function PayPage() {
  return (
    <Guard>
      <UpiPayScreen backHref="/finance/verify-payments" backLabel="Back to payments" />
    </Guard>
  );
}
