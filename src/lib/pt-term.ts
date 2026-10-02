// Does this client have a PT term? The one rule every Enroll-or-Renew choice
// in the app reads.
//
// The server decides it (`has_pt_term` on GET /api/pt-os/clients/:id — see
// lib/ptTerm.js in the backend): an end date, a duration or a charged price on
// the row (the app's long-standing "enrolled" test), or any renewal or
// subscription history. This reads that flag.
//
// It deliberately does NOT look at pt_start_date. The client profile used to
// decide on `!!client.pt_start_date`, and client creation defaulted that date
// to today for everyone — so a client who had never been enrolled was offered
// "Renew PT", and renewing them locked them out of enrolling.
//
// The fallback, for a response without the flag, is the part of the same rule
// that is on the row itself; the history half needs the server.

export interface PtTermFields {
  has_pt_term?: boolean | null;
  pt_end_date?: string | null;
  duration_months?: number | string | null;
  final_amount?: number | string | null;
}

export function hasPtTerm(client: PtTermFields | null | undefined): boolean {
  if (!client) return false;
  if (typeof client.has_pt_term === 'boolean') return client.has_pt_term;
  return /^\d{4}-\d{2}-\d{2}/.test(String(client.pt_end_date ?? '').trim())
    || Number(client.duration_months) > 0
    || Number(client.final_amount) > 0;
}
