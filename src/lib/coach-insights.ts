// What the AI Coach card is actually looking at.
//
// The old Copilot read six aggregate numbers off the dashboard summary and
// wrote a sentence about each. It could tell you "3 packages expired" but not
// *whose*, so every card was a dead end that dropped you on a list page to
// start the search again. Colour was the only signal of urgency, and every
// item rendered as a tinted box — so it read as a wall of alerts rather than a
// list of things to do.
//
// This reads the rows instead of the totals. renewals_due and top_dues each
// carry a name and a mobile number, which is the whole difference: an insight
// that knows who it is about can offer to message them.
//
// Kept out of the component and free of React so the prioritisation is
// testable on its own — the ordering is the part with actual judgement in it.

export type Urgency = 'critical' | 'warning' | 'info';

/** Someone an insight is about, and how to reach them. */
export interface Contact {
  id: string;
  name: string;
  mobile?: string | null;
}

export interface CoachInsight {
  id: string;
  urgency: Urgency;
  /** Drives the badge. Always the real size of the cohort, not the slice shown. */
  count: number;
  title: string;
  detail: string;
  /** Where "view all" goes. */
  href: string;
  /** Everyone this is about. May be empty when only a total is known. */
  contacts: Contact[];
  /** Prefilled WhatsApp body, per contact. */
  message: (name: string) => string;
}

/* ── Inputs ────────────────────────────────────────────────────────────────
   Structural rather than importing the dashboard's own types: this module is
   the thing under test, and it should not need a page to compile. */

export interface CoachDash {
  active_pt_clients: number;
  expired_clients: number;
  clients_with_balance: number;
  total_outstanding: number;
}

export interface CoachRenewal {
  id: string; name: string; mobile: string | null;
  days_left: number; balance_amount: number;
}

export interface CoachDue {
  id: string; name: string; mobile: string | null;
  balance_amount: number; due_status: 'overdue' | 'due';
}

export interface CoachUnscheduled {
  client_id: string; client_name: string | null; plan_name: string;
}

export interface CoachBirthday {
  id: string; name: string; mobile?: string | null; days_until_birthday: number;
}

export interface CoachInput {
  dash?: CoachDash | null;
  renewals?: CoachRenewal[];
  dues?: CoachDue[];
  unscheduled?: CoachUnscheduled[];
  birthdays?: CoachBirthday[];
  studioName?: string;
}

const URGENCY_RANK: Record<Urgency, number> = { critical: 0, warning: 1, info: 2 };

/** Indian money, short. Matches how the rest of the dashboard writes amounts. */
function money(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${Math.round(n / 1e3)}K`;
  return `₹${Math.round(n)}`;
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/**
 * Every insight worth surfacing, most urgent first.
 *
 * Ordering is urgency band, then cohort size. Size second rather than first on
 * purpose: one client whose package ran out yesterday is worth more of the
 * trainer's next ten minutes than nine birthdays, and sorting by count alone
 * buries the expiry under the confetti.
 */
export function buildCoachInsights(input: CoachInput): CoachInsight[] {
  const { dash, renewals = [], dues = [], unscheduled = [], birthdays = [], studioName = 'the studio' } = input;
  const out: CoachInsight[] = [];

  // ── Packages already expired ────────────────────────────────────────────
  const lapsed = renewals.filter((r) => r.days_left < 0);
  if (lapsed.length > 0) {
    out.push({
      id: 'expired',
      urgency: 'critical',
      count: lapsed.length,
      title: `${lapsed.length} PT ${plural(lapsed.length, 'package')} expired`,
      detail: 'Winning a lapsed client back costs less than finding a new one.',
      href: '/pt-os/clients',
      contacts: lapsed.map((r) => ({ id: r.id, name: r.name, mobile: r.mobile })),
      message: (name) =>
        `Hi ${name}, your personal training package with ${studioName} has ended. Shall we get your next block booked in so you don't lose momentum?`,
    });
  }

  // ── Expiring this week ──────────────────────────────────────────────────
  const expiring = renewals.filter((r) => r.days_left >= 0 && r.days_left <= 7);
  if (expiring.length > 0) {
    const soonest = Math.min(...expiring.map((r) => r.days_left));
    out.push({
      id: 'expiring',
      urgency: 'critical',
      count: expiring.length,
      title: `${expiring.length} ${plural(expiring.length, 'package')} expiring this week`,
      detail: soonest === 0 ? 'One ends today.' : `The soonest ends in ${soonest} ${plural(soonest, 'day')}.`,
      href: '/pt-os/clients',
      contacts: expiring.map((r) => ({ id: r.id, name: r.name, mobile: r.mobile })),
      message: (name) =>
        `Hi ${name}, your PT package is about to finish. Want me to hold your usual slots for the next block?`,
    });
  }

  // ── Money already late ──────────────────────────────────────────────────
  const overdue = dues.filter((d) => d.due_status === 'overdue');
  if (overdue.length > 0) {
    const total = overdue.reduce((s, d) => s + Number(d.balance_amount || 0), 0);
    out.push({
      id: 'overdue',
      urgency: 'critical',
      count: overdue.length,
      title: `${money(total)} overdue`,
      detail: `${overdue.length} ${plural(overdue.length, 'client')} past the due date.`,
      href: '/pt-os/balance-sheet',
      contacts: overdue.map((d) => ({ id: d.id, name: d.name, mobile: d.mobile })),
      message: (name) =>
        `Hi ${name}, a quick reminder that your training payment is now past due. Happy to share payment options — just let me know.`,
    });
  }

  // ── Money due, not yet late ─────────────────────────────────────────────
  const dueSoon = dues.filter((d) => d.due_status === 'due');
  if (dueSoon.length > 0) {
    const total = dueSoon.reduce((s, d) => s + Number(d.balance_amount || 0), 0);
    out.push({
      id: 'due',
      urgency: 'warning',
      count: dueSoon.length,
      title: `${money(total)} due`,
      detail: `${dueSoon.length} ${plural(dueSoon.length, 'client')} with a balance coming up.`,
      href: '/pt-os/balance-sheet',
      contacts: dueSoon.map((d) => ({ id: d.id, name: d.name, mobile: d.mobile })),
      message: (name) => `Hi ${name}, just a heads up that your next training payment is coming due shortly.`,
    });
  }

  // ── Due to train today, nothing booked ──────────────────────────────────
  if (unscheduled.length > 0) {
    out.push({
      id: 'unbooked',
      urgency: 'warning',
      count: unscheduled.length,
      title: `${unscheduled.length} ${plural(unscheduled.length, 'client')} due to train, unbooked`,
      detail: 'Their programme says today, but there is no slot on the calendar.',
      href: '/pt-os/schedule-session',
      // today_unscheduled carries no mobile, so this one links rather than messages.
      contacts: [],
      message: (name) => `Hi ${name}, are you coming in today? I can hold a slot for you.`,
    });
  }

  // ── Lapsed clients the renewals list does not cover ──────────────────────
  const unlisted = (dash?.expired_clients ?? 0) - lapsed.length;
  if (unlisted > 0) {
    out.push({
      id: 'inactive',
      urgency: 'warning',
      count: unlisted,
      title: `${unlisted} inactive ${plural(unlisted, 'client')}`,
      detail: 'No live package. Worth a check-in before they settle into not coming.',
      href: '/pt-os/clients',
      contacts: [],
      message: (name) => `Hi ${name}, we've missed you at ${studioName}. Fancy getting back into it?`,
    });
  }

  // ── Birthdays ───────────────────────────────────────────────────────────
  const bdays = birthdays.filter((b) => b.days_until_birthday >= 0 && b.days_until_birthday <= 7);
  if (bdays.length > 0) {
    const today = bdays.filter((b) => b.days_until_birthday === 0);
    // Today's birthdays are the cohort when there are any: wishing someone a
    // happy birthday four days early is worse than not doing it. The badge
    // counts whoever the action will actually reach, so it can never disagree
    // with the heading above it or the list underneath.
    const cohort = today.length > 0 ? today : bdays;
    const later = bdays.length - cohort.length;
    out.push({
      id: 'birthdays',
      urgency: 'info',
      count: cohort.length,
      title: today.length > 0
        ? `${today.length} ${plural(today.length, 'birthday')} today`
        : `${bdays.length} ${plural(bdays.length, 'birthday')} this week`,
      detail: later > 0
        ? `A message costs nothing. ${later} more later this week.`
        : 'A message costs nothing and is remembered for months.',
      href: '/pt-os/clients/birthdays',
      contacts: cohort.map((b) => ({ id: b.id, name: b.name, mobile: b.mobile })),
      message: (name) => `Happy birthday ${name}! Everyone at ${studioName} is wishing you a brilliant year ahead. 🎉`,
    });
  }

  return out.sort(
    (a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || b.count - a.count,
  );
}

/**
 * A mobile number in the shape wa.me and tel: want.
 *
 * Numbers are entered by hand in this app and arrive as "98765 43210",
 * "+91-98765-43210" or "09876543210". wa.me takes digits only and needs the
 * country code, so a bare ten-digit Indian mobile is prefixed rather than sent
 * as-is — without that the link silently opens a chat with nobody.
 */
export function normaliseMobile(raw?: string | null): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.length === 10) d = `91${d}`;
  else if (d.length === 11 && d.startsWith('0')) d = `91${d.slice(1)}`;
  else if (d.length === 12 && d.startsWith('91')) { /* already right */ }
  else if (d.length < 10) return null;
  return d;
}

/** wa.me deep link with the body prefilled, or null when unreachable. */
export function whatsappLink(contact: Contact, body: string): string | null {
  const n = normaliseMobile(contact.mobile);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(body)}` : null;
}

/** tel: link, or null when unreachable. */
export function telLink(contact: Contact): string | null {
  const n = normaliseMobile(contact.mobile);
  return n ? `tel:+${n}` : null;
}

/** Only the people an action can actually reach. */
export function reachable(contacts: Contact[]): Contact[] {
  return contacts.filter((c) => normaliseMobile(c.mobile) !== null);
}
