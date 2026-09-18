/**
 * Turning a stored phone number into one WhatsApp can actually reach.
 *
 * ── The bug this centralises away ──────────────────────────────────────────
 *
 * Five screens each carried their own copy of:
 *
 *     const num = p.startsWith('91') ? p : `91${p}`;
 *
 * — the member profile, the birthdays list, the outstanding-dues list, the
 * trainer profile and the WhatsApp engagement screen. It is wrong in one
 * specific case, and that case is not rare: Indian mobiles begin 6-9, so the
 * perfectly ordinary ten-digit number 9198765432 starts with "91" and the test
 * reads it as already carrying a country code. The link then opens a chat with
 * +91 98765 432 — a different number, or nobody.
 *
 * The same mistake, in the same shape, was found and fixed on the backend
 * earlier: `modules/messaging/phone.js` decides by LENGTH rather than by
 * prefix, precisely because a prefix test cannot tell those two apart. This is
 * the browser's half of that rule, so a number the server would address one
 * way is not addressed another way by a link on the page.
 *
 * A correct implementation already existed in `lib/coach-insights.ts` — it just
 * lived inside a coaching module and none of the five screens knew about it.
 * That function now delegates here.
 */

/** India. The market this product serves; see `WHATSAPP_DEFAULT_COUNTRY_CODE` on the API. */
const DEFAULT_COUNTRY_CODE = '91';
const NATIONAL_NUMBER_LENGTH = 10;

/**
 * Digits WhatsApp can address, or null when the number cannot be resolved.
 *
 * Decided by length, never by prefix:
 *
 *   · exactly the national length          → prefix the country code
 *   · national length + a leading 0        → drop the trunk 0, then prefix
 *   · country code + national length,
 *     and it starts with the country code  → already international
 *   · anything else at least as long       → taken as written
 *   · shorter than the national length     → null, rather than a guess
 *
 * Returning null matters: the alternative is an href of '#' or a wa.me link to
 * a fragment of a number, and both look like working buttons.
 */
export function toWhatsAppNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === NATIONAL_NUMBER_LENGTH) return `${DEFAULT_COUNTRY_CODE}${digits}`;

  if (digits.length === NATIONAL_NUMBER_LENGTH + 1 && digits.startsWith('0')) {
    return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }

  if (
    digits.length === DEFAULT_COUNTRY_CODE.length + NATIONAL_NUMBER_LENGTH
    && digits.startsWith(DEFAULT_COUNTRY_CODE)
  ) {
    return digits;
  }

  // Longer than a national number and not the shape above: an international
  // number from somewhere else, written without its '+'. Taken as given.
  if (digits.length > NATIONAL_NUMBER_LENGTH) return digits;

  return null;
}

/**
 * A wa.me link with the message prefilled, or null when unreachable.
 *
 * Null rather than '#': a caller that renders a button unconditionally then
 * has to decide what to do about it, instead of shipping one that scrolls the
 * page to the top when tapped.
 */
export function whatsAppHref(phone?: string | null, message?: string): string | null {
  const num = toWhatsAppNumber(phone);
  if (!num) return null;
  return message
    ? `https://wa.me/${num}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${num}`;
}
