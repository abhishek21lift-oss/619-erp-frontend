// What the AI Coach decides to show, and in what order.
//
// The old Copilot read six aggregate numbers and wrote a sentence about each.
// It could say "3 packages expired" but not whose, so every card dead-ended on
// a list page. This reads the rows — which carry a name and a mobile — so the
// tests worth writing are about prioritisation and reachability, not wording.
import { describe, expect, it } from 'vitest';
import {
  buildCoachInsights, normaliseMobile, whatsappLink, telLink, reachable,
  type CoachInput,
} from '@/lib/coach-insights';

const dash = { active_pt_clients: 12, expired_clients: 0, clients_with_balance: 0, total_outstanding: 0 };

const renewal = (over: Partial<{ id: string; name: string; mobile: string | null; days_left: number; balance_amount: number }> = {}) => ({
  id: 'r1', name: 'Rashi Bhatia', mobile: '98765 43210', days_left: 3, balance_amount: 0, ...over,
});
const due = (over: Partial<{ id: string; name: string; mobile: string | null; balance_amount: number; due_status: 'overdue' | 'due' }> = {}) => ({
  id: 'd1', name: 'Vipul Bhatia', mobile: '9876543211', balance_amount: 5000, due_status: 'overdue' as const, ...over,
});

const build = (input: CoachInput) => buildCoachInsights({ dash, ...input });

describe('what the coach surfaces', () => {
  it('says nothing when there is nothing to do', () => {
    // An empty card is the correct output for a studio that is on top of
    // things — inventing an insight to fill the space is how it became a wall
    // of alerts in the first place.
    expect(build({})).toEqual([]);
  });

  it('separates a package that has already lapsed from one about to', () => {
    const out = build({ renewals: [renewal({ id: 'a', days_left: -2 }), renewal({ id: 'b', days_left: 3 })] });
    expect(out.map((i) => i.id).sort()).toEqual(['expired', 'expiring']);
    expect(out.find((i) => i.id === 'expired')!.count).toBe(1);
    expect(out.find((i) => i.id === 'expiring')!.count).toBe(1);
  });

  it('ignores a renewal that is weeks away', () => {
    // Everything on this card should be actionable today. A package with a
    // month left is not.
    expect(build({ renewals: [renewal({ days_left: 30 })] })).toEqual([]);
  });

  it('counts overdue money separately from money merely due', () => {
    const out = build({ dues: [due({ id: 'a' }), due({ id: 'b', due_status: 'due' })] });
    const overdue = out.find((i) => i.id === 'overdue')!;
    const soon = out.find((i) => i.id === 'due')!;
    expect(overdue.urgency).toBe('critical');
    expect(soon.urgency).toBe('warning');
  });

  it('does not double-count lapsed clients it already listed by name', () => {
    // expired_clients is a total that includes the named rows in renewals_due.
    // Reporting both would tell the trainer there are four problems when there
    // are three.
    const out = build({
      dash: { ...dash, expired_clients: 3 },
      renewals: [renewal({ id: 'a', days_left: -1 }), renewal({ id: 'b', days_left: -5 })],
    });
    expect(out.find((i) => i.id === 'expired')!.count).toBe(2);
    expect(out.find((i) => i.id === 'inactive')!.count).toBe(1);
  });

  it('drops the inactive row entirely when the named rows account for all of them', () => {
    const out = build({
      dash: { ...dash, expired_clients: 2 },
      renewals: [renewal({ id: 'a', days_left: -1 }), renewal({ id: 'b', days_left: -5 })],
    });
    expect(out.some((i) => i.id === 'inactive')).toBe(false);
  });

  it('treats a birthday as nice-to-do, never urgent', () => {
    const out = build({ birthdays: [{ id: 'b1', name: 'Ajeet', mobile: '9876543212', days_until_birthday: 0 }] });
    expect(out[0].urgency).toBe('info');
    expect(out[0].title).toMatch(/birthday today/);
  });

  it('acts on today rather than wishing someone happy birthday four days early', () => {
    const out = build({
      birthdays: [
        { id: 'b1', name: 'Akash', mobile: '9876543214', days_until_birthday: 0 },
        { id: 'b2', name: 'Priya', mobile: '9876543215', days_until_birthday: 3 },
      ],
    });
    const b = out.find((i) => i.id === 'birthdays')!;
    expect(b.contacts.map((c) => c.name)).toEqual(['Akash']);
    expect(b.detail).toMatch(/1 more later this week/);
  });

  it('never lets a badge disagree with its own heading', () => {
    // The badge counts whoever the action reaches. It read "2" over a heading
    // saying "1 birthday today", which makes the number meaningless.
    const out = build({
      birthdays: [
        { id: 'b1', name: 'Akash', mobile: '9876543214', days_until_birthday: 0 },
        { id: 'b2', name: 'Priya', mobile: '9876543215', days_until_birthday: 3 },
      ],
      renewals: [renewal({ id: 'a', days_left: -1 }), renewal({ id: 'b', days_left: -2 })],
      dues: [due({ id: 'x' })],
    });
    for (const ins of out) {
      const leading = Number(ins.title.match(/^(\d+)/)?.[1]);
      // Only headings that open with a count are making this claim; the money
      // ones lead with an amount instead.
      if (!Number.isNaN(leading)) {
        expect(ins.count, `"${ins.title}" carries a badge of ${ins.count}`).toBe(leading);
      }
      // And where the insight can reach people, the badge must not promise
      // more than the cohort it holds.
      if (ins.contacts.length > 0) expect(ins.count).toBe(ins.contacts.length);
    }
  });
});

describe('ordering', () => {
  it('puts one expiry above nine birthdays', () => {
    // Urgency first, size second. Sorting by count alone buries the thing that
    // costs money under the confetti.
    const out = build({
      renewals: [renewal({ days_left: 0 })],
      birthdays: Array.from({ length: 9 }, (_, i) => ({
        id: `b${i}`, name: `Client ${i}`, mobile: '9876543210', days_until_birthday: 1,
      })),
    });
    expect(out[0].id).toBe('expiring');
    expect(out[out.length - 1].id).toBe('birthdays');
  });

  it('ranks by size within the same urgency band', () => {
    const out = build({
      renewals: [renewal({ id: 'a', days_left: -1 })],
      dues: [due({ id: 'x' }), due({ id: 'y' }), due({ id: 'z' })],
    });
    const critical = out.filter((i) => i.urgency === 'critical');
    expect(critical[0].id).toBe('overdue');   // 3 clients
    expect(critical[0].count).toBeGreaterThan(critical[1].count);
  });
});

describe('reaching people', () => {
  it('adds the country code to a bare Indian mobile', () => {
    // wa.me takes digits only and needs the country code. Without this the
    // link opens a chat with nobody, which fails silently.
    expect(normaliseMobile('98765 43210')).toBe('919876543210');
    expect(normaliseMobile('+91-98765-43210')).toBe('919876543210');
    expect(normaliseMobile('09876543210')).toBe('919876543210');
    expect(normaliseMobile('919876543210')).toBe('919876543210');
  });

  it('refuses a number that cannot be dialled', () => {
    expect(normaliseMobile(null)).toBeNull();
    expect(normaliseMobile('')).toBeNull();
    expect(normaliseMobile('12345')).toBeNull();
  });

  it('builds a WhatsApp link with the message prefilled', () => {
    const link = whatsappLink({ id: '1', name: 'Rashi', mobile: '9876543210' }, 'Hi Rashi, your package is ending.');
    expect(link).toBe('https://wa.me/919876543210?text=Hi%20Rashi%2C%20your%20package%20is%20ending.');
  });

  it('builds a tel link', () => {
    expect(telLink({ id: '1', name: 'Rashi', mobile: '9876543210' })).toBe('tel:+919876543210');
  });

  it('returns nothing to open rather than a broken link', () => {
    const c = { id: '1', name: 'No Phone', mobile: null };
    expect(whatsappLink(c, 'hi')).toBeNull();
    expect(telLink(c)).toBeNull();
  });

  it('filters a cohort down to the people actually reachable', () => {
    const out = reachable([
      { id: '1', name: 'Has phone', mobile: '9876543210' },
      { id: '2', name: 'No phone', mobile: null },
      { id: '3', name: 'Junk phone', mobile: '123' },
    ]);
    expect(out.map((c) => c.name)).toEqual(['Has phone']);
  });

  it('carries the client name into the message', () => {
    const out = build({ renewals: [renewal({ name: 'Navneet' })], studioName: 'MY PT STUDIO' });
    const msg = out[0].message('Navneet');
    expect(msg).toContain('Navneet');
  });

  it('leaves the unbooked insight without contacts, since that feed has no mobile', () => {
    const out = build({ unscheduled: [{ client_id: 'c1', client_name: 'Ajeet', plan_name: 'PPL' }] });
    expect(out[0].id).toBe('unbooked');
    expect(out[0].contacts).toEqual([]);
  });
});
