/**
 * Turning a stored number into one WhatsApp can reach.
 *
 * ── The bug, and why it had five copies ────────────────────────────────────
 *
 * Five screens each carried:
 *
 *     const num = p.startsWith('91') ? p : `91${p}`;
 *
 * the member profile, the birthdays list, the outstanding-dues list, the
 * trainer profile and the WhatsApp engagement screen. Indian mobiles begin
 * 6-9, so the ordinary ten-digit number 9198765432 starts with "91" and the
 * prefix test reads it as already international — the link then opens a chat
 * with a different number, or nobody.
 *
 * The same mistake in the same shape was fixed on the API earlier
 * (modules/messaging/phone.js), which decides by LENGTH precisely because a
 * prefix test cannot tell those two apart. These tests are the browser half of
 * that rule, so a number the server addresses one way is not addressed another
 * way by a link on the page.
 */

import { describe, it, expect } from 'vitest';
import { toWhatsAppNumber, whatsAppHref } from '@/lib/phone';

describe('toWhatsAppNumber', () => {
  it('prefixes a bare ten-digit mobile', () => {
    expect(toWhatsAppNumber('8756562310')).toBe('918756562310');
  });

  // The case every one of the five copies got wrong.
  it('prefixes a ten-digit mobile that HAPPENS to begin 91', () => {
    expect(toWhatsAppNumber('9198765432')).toBe('919198765432');
  });

  it('leaves a genuine country-coded number alone', () => {
    expect(toWhatsAppNumber('918756562310')).toBe('918756562310');
  });

  it('drops the domestic trunk zero', () => {
    expect(toWhatsAppNumber('08756562310')).toBe('918756562310');
  });

  it('ignores punctuation and spacing', () => {
    expect(toWhatsAppNumber('+91 87565-62310')).toBe('918756562310');
    expect(toWhatsAppNumber('87565 62310')).toBe('918756562310');
  });

  it('takes a longer international number as written', () => {
    expect(toWhatsAppNumber('+14155552671')).toBe('14155552671');
  });

  it('returns null rather than guessing at something too short', () => {
    // The alternative is a wa.me link to a fragment of a number, which looks
    // exactly like a working button.
    expect(toWhatsAppNumber('12345')).toBeNull();
    expect(toWhatsAppNumber('')).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
    expect(toWhatsAppNumber(undefined)).toBeNull();
  });
});

describe('whatsAppHref', () => {
  it('builds a wa.me link with the message encoded', () => {
    const href = whatsAppHref('8756562310', 'Hi Asha, see you at 6.');
    expect(href).toBe('https://wa.me/918756562310?text=Hi%20Asha%2C%20see%20you%20at%206.');
  });

  it('omits the query when there is no message', () => {
    expect(whatsAppHref('8756562310')).toBe('https://wa.me/918756562310');
  });

  it('returns null for an unreachable number, never "#"', () => {
    // A caller that renders the button unconditionally then has to decide what
    // to do, rather than shipping one that scrolls the page to the top.
    expect(whatsAppHref('', 'hi')).toBeNull();
    expect(whatsAppHref('123', 'hi')).toBeNull();
  });
});

describe('the rule matches the API', () => {
  // modules/messaging/phone.js on the backend resolves the same inputs. If the
  // two ever diverge, a studio sees one number in a link and the automation
  // sends to another — which is the failure this consolidation removes.
  it.each([
    ['8756562310', '918756562310'],
    ['9198765432', '919198765432'],
    ['918756562310', '918756562310'],
    ['08756562310', '918756562310'],
  ])('%s → %s, the same answer the server gives', (input, expected) => {
    expect(toWhatsAppNumber(input)).toBe(expected);
  });
});
