'use client';

/**
 * "Pay ₹X" — a member settles their outstanding balance by UPI.
 *
 * The button asks the server for a balance order and opens the ordinary UPI
 * payment page for it. It sends no amount: the server prices the order from
 * the balance it holds for this member, so the figure on the button is only
 * a label and can never decide what is charged. Tapping again while an order
 * is open reopens that same order rather than creating a second one.
 */

import { useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { useToast } from '@/lib/toast';

export default function PayBalanceButton({
  children, className, style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    try {
      const res = await api.upiPayments.payBalance();
      router.push(`/member/pay/${res.data.order.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start the payment. Try again, or pay at the studio.'));
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={() => void pay()} disabled={busy} aria-busy={busy}
      className={`${className ?? ''} disabled:opacity-70`} style={style}>
      {busy ? <><Loader2 size={15} className="animate-spin" /> Opening payment…</> : children}
    </button>
  );
}
