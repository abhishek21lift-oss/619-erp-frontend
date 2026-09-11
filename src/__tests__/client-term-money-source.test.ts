// WHERE the Term Fee / Paid / Balance cards get their numbers.
//
// The sibling test in client-term-money-cards.test.ts pins how these cards
// LOOK. This one pins where their figures come from, which is what actually
// broke: the page used to prefer
//
//     subscriptionHistory[subscriptionHistory.length - 1]
//
// over the client row. A pt_client_subscriptions row is a per-term SNAPSHOT
// written once at enrollment or renewal, and no payment path updates it — so
// the source the page trusted FIRST was the one guaranteed to go stale the
// moment a client paid anything afterwards. In production a client who had
// paid ₹60,000 of an ₹80,000 term rendered ₹0 / ₹0 / ₹0, because their single
// snapshot row had been written with zeros before the money landed.
//
// It also selected by ARRAY POSITION, which only means "current" while the
// API's ORDER BY holds. That ordering is `start_date ASC NULLS LAST`, so one
// row with a NULL start_date sorts last and becomes "the current term"
// however old it is.
//
// The backend now owns the definition (GET /api/pt-os/clients/:id returns
// current_term_fee / _paid / _balance). This test fails the build if the page
// ever goes back to deriving money from subscription history.
//
// Comments are STRIPPED before matching. Without that this test passes on its
// own explanation: the block below is documented with a comment naming
// `subscriptionHistory` and the snapshot fields, and an earlier draft of this
// test matched that comment rather than the code. That exact false pass has
// bitten this repo before, in the api-transport guardrail.

import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {appPath} from '@/__tests__/helpers/app-routes';

const page = readFileSync(
  appPath('pt-os', 'clients', '[id]', 'page.tsx'), 'utf8');

/** Drop line and block comments so claims are made about code, not prose. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * The money derivation itself: the three current-term consts plus the
 * lifetime total.
 *
 * It stops at `lifetimeTermCount`, which is deliberately OUTSIDE the block —
 * counting how many terms a client has had is exactly what subscription
 * history is for, and the "never reads subscriptionHistory" claim below is
 * about money, not about the count.
 */
const moneyBlock = (() => {
  const start = page.indexOf('const currentTermFee');
  const end = page.indexOf('const lifetimeTermCount');
  expect(start, 'the currentTermFee derivation').toBeGreaterThan(-1);
  expect(end, 'the lifetimeTermCount line that closes the money block').toBeGreaterThan(start);
  return stripComments(page.slice(start, end));
})();

describe('the money cards read the client record, never subscription history', () => {
  it('takes each figure from the backend-computed current_term_* fields', () => {
    expect(moneyBlock).toMatch(/currentTermFee\s*=[^;]*client\?\.current_term_fee/);
    expect(moneyBlock).toMatch(/currentTermPaid\s*=[^;]*client\?\.current_term_paid/);
    expect(moneyBlock).toMatch(/currentTermBalance\s*=[^;]*client\?\.current_term_balance/);
  });

  it('never reads subscription history for any of the three figures', () => {
    // The whole bug in one assertion. Any reappearance of a subscription row
    // in this block — by index, by .at(), by find, however dressed up — is
    // the defect coming back.
    expect(moneyBlock).not.toContain('subscriptionHistory');
  });

  it('never reads the snapshot money fields, which no payment updates', () => {
    for (const field of ['selling_price', 'amount_paid']) {
      expect(moneyBlock, `${field} is a pt_client_subscriptions column`)
        .not.toContain(field);
    }
  });

  it('falls back to the client row, not to a subscription row', () => {
    // A fallback matters: it is what renders if the API response predates
    // current_term_*. It must land on the client's own fields.
    expect(moneyBlock).toMatch(/current_term_fee\s*\?\?\s*client\?\.final_amount/);
    expect(moneyBlock).toMatch(/current_term_paid\s*\?\?\s*client\?\.paid_amount/);
    expect(moneyBlock).toMatch(/current_term_balance\s*\?\?\s*client\?\.balance_amount/);
  });

  it('takes lifetime paid from the client row, which is the lifetime total', () => {
    // pt_clients.paid_amount accumulates across terms — every payment
    // increments it and /renew adds to it. Summing the snapshot rows instead
    // undercounts by every payment made after a term row was written.
    expect(moneyBlock).toMatch(/lifetimePaid\s*=\s*Number\(client\?\.paid_amount/);
  });

  it('still shows a term COUNT from the history, which is what history is for', () => {
    // History is preserved and still used — for counting terms, not for money.
    expect(stripComments(page)).toMatch(/lifetimeTermCount\s*=[^;]*subscriptionHistory\.length/);
  });
});
