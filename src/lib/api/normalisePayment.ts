// Normalises a raw payment row into the Payment shape.
//
// Only endpoints/money.ts calls it today, so this could have been a local
// function there. It is its own module because the grouping of namespaces into
// files is a judgement call that will change — payments and invoices are one
// file today and need not be tomorrow — while this helper belongs to neither
// of them in particular. It is also not a type, so types.ts is not its home.

import type { Payment } from './types';

export function normalisePayment(raw: Record<string, unknown>): Payment {
  return {
    ...raw,
    id: String(raw.id ?? ''),
    client_id: raw.client_id != null ? String(raw.client_id) : undefined,
    amount: Number(raw.amount ?? 0),
  } as Payment;
}
