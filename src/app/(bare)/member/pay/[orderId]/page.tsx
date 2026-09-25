'use client';

/**
 * Member — pay one UPI order: a membership, or their outstanding balance.
 *
 * The same payment screen the studio app mounts at /pay/[orderId], inside the
 * member shell. The API scopes the order to the signed-in member, so another
 * member's order id is a "not found", never someone else's payment.
 */

import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import UpiPayScreen from '@/components/payments/UpiPayScreen';

export default function MemberPayPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <UpiPayScreen backHref="/member/payments" backLabel="Back to my payments" />
      </MemberShell>
    </Guard>
  );
}
