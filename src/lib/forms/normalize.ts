/**
 * Normalization — the single source of truth for turning what a control gives
 * us into what a schema may validate.
 *
 * This layer exists because of one fact about the DOM: **every control returns
 * a string**. `<input type="number">` included. Which makes `Number(raw)` the
 * most dangerous expression in the codebase, for a reason that is easy to miss:
 *
 *     Number('')       === 0          // a cleared field becomes a real zero
 *     Number('   ')    === 0          // so does whitespace
 *     Number(null)     === 0
 *     Number([])       === 0
 *     Number('1e999')  === Infinity   // and survives JSON.stringify as null
 *
 * So a user who clears a price submits ₹0, and nothing in the stack can tell
 * that apart from a deliberate ₹0. The audit found this exact coercion at the
 * offers form (`Number(e.target.value)`), and it is the shape every numeric
 * field in the app currently uses.
 *
 * The rule here, applied without exception: **an empty control is `null`, never
 * `0`.** Absence and zero are different facts and the difference is the whole
 * point — "no discount recorded" and "a discount of zero" lead to different
 * decisions, and only one of them is a number.
 *
 * Nothing in this file throws. Normalizers answer `null` for "no value" and let
 * the schema layer above decide whether that is allowed. Separating the two is
 * what lets one numeric normalizer serve a required field and an optional one.
 */

/** Characters that carry no meaning in a numeric field but survive a paste. */
const NUMERIC_NOISE = /[\s,_  ]/g;

/** Currency symbols and unit suffixes a user may paste in with a figure. */
const CURRENCY_NOISE = /[₹$€£]/g;

/**
 * A numeric control's value, normalized.
 *
 * Returns `null` for absent (empty, whitespace, null, undefined) and `NaN` for
 * present-but-unparseable. Those are deliberately different: the first is a
 * field nobody filled in, the second is a field somebody filled in wrongly, and
 * a schema needs to say different things about them ("Required" vs "Enter a
 * number"). Infinity is unparseable — it is never a legitimate business value
 * and it serializes to `null` in JSON, so letting it through means the server
 * receives a silent null for what the user saw as a number.
 */
export function toNumberOrNull(raw: unknown): number | null | typeof NaN {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : NaN;
  }
  if (typeof raw !== 'string') return NaN;

  const cleaned = raw.replace(CURRENCY_NOISE, '').replace(NUMERIC_NOISE, '');
  if (cleaned === '') return null;

  // Reject anything Number() would coerce through a non-numeric route:
  // '0x10', '1e999', '', '  '. An explicit shape test is the only way to keep
  // Number()'s permissiveness out of the result.
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * A text control's value, normalized: trimmed, with `''` collapsed to `null`.
 *
 * Trimming the ends only. Interior whitespace is the user's content — a gym
 * called "Iron  Temple" typed with two spaces is a typo to a human and data to
 * us, and §15's "do not destroy intentional user content" means we do not get
 * to decide that. Newlines survive for the same reason.
 */
export function toTextOrNull(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = typeof raw === 'string' ? raw : String(raw);
  const trimmed = s.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Like `toTextOrNull` but preserves an empty string as `''`.
 *
 * For the handful of fields where clearing the box is a meaningful edit that
 * must reach the server as "set this to empty" rather than "leave it alone".
 */
export function toTextOrEmpty(raw: unknown): string {
  return toTextOrNull(raw) ?? '';
}

/**
 * An email, normalized for storage and comparison.
 *
 * Lowercased and trimmed. The local part of an address is technically
 * case-sensitive per RFC 5321, but no mail provider anyone uses treats it that
 * way, and storing `Abhishek@…` alongside `abhishek@…` creates two accounts for
 * one person — which is the failure this prevents. Only the ends are trimmed;
 * interior spaces make it invalid, and that is the schema's job to say.
 */
export function toEmailOrNull(raw: unknown): string | null {
  const s = toTextOrNull(raw);
  return s === null ? null : s.toLowerCase();
}

/**
 * An Indian mobile number, normalized to its ten significant digits.
 *
 * Accepts what people actually type and paste — `+91 98765 43210`,
 * `098765-43210`, `91 9876543210` — and reduces it to `9876543210`, because a
 * number stored three ways cannot be matched, deduplicated, or handed to the
 * WhatsApp gateway.
 *
 * The country code and a single leading zero are stripped **only** when what
 * remains is a plausible ten-digit mobile. Stripping unconditionally would turn
 * a mistyped nine-digit number into a different valid-looking one, which is
 * worse than rejecting it: the schema can report a bad number, but it cannot
 * report a number we silently rewrote.
 */
export function toPhoneOrNull(raw: unknown): string | null {
  const s = toTextOrNull(raw);
  if (s === null) return null;

  const digits = s.replace(/\D/g, '');
  if (digits === '') return null;

  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);

  return digits;
}

/**
 * A money amount in rupees, normalized to at most two decimal places.
 *
 * Rounds half away from zero at the paise, via a scaled integer rather than
 * `toFixed`, because binary floating point does not hold decimal fractions
 * exactly and the error shows up in exactly the place money is read:
 *
 *     (1.005).toFixed(2)            === '1.00'   // not 1.01
 *     Math.round(1.005 * 100) / 100 === 1.01
 *
 * `Number.EPSILON` nudges values that landed a hair under the halfway point
 * through no fault of the user's arithmetic (0.615 stored as 0.6149999…).
 *
 * This does not decide whether the amount is allowed to be negative or zero —
 * that is the schema's call and it differs per field (a refund may be negative,
 * a package price may not).
 */
export function toMoneyOrNull(raw: unknown): number | null | typeof NaN {
  const n = toNumberOrNull(raw);
  if (n === null || Number.isNaN(n)) return n;
  const scaled = Math.round((n + Number.EPSILON * Math.sign(n)) * 100);
  // Guard the round-trip: a value large enough to lose integer precision when
  // scaled is not a money amount anyone typed on purpose.
  if (!Number.isSafeInteger(scaled)) return NaN;
  return scaled / 100;
}

/**
 * A date control's value, normalized to `YYYY-MM-DD` or `null`.
 *
 * `<input type="date">` already yields `YYYY-MM-DD`, so this mostly guards the
 * paths that do not: a cleared field (`''`), a `Date` handed in by a picker,
 * and an ISO timestamp coming back from the API to seed an edit form.
 *
 * The `Date` branch reads **local** calendar parts, not `toISOString()`. The
 * latter converts to UTC first, so a date picked on 1 March in IST (UTC+5:30)
 * serializes as 28 February — an off-by-one that only appears for users east of
 * Greenwich, which is every user of this product.
 */
export function toDateOrNull(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = toTextOrNull(raw);
  if (s === null) return null;

  // An ISO timestamp from the API: keep the date half as written. Slicing
  // rather than parsing avoids re-introducing the timezone shift above.
  const isoMatch = /^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/.exec(s);
  return isoMatch ? isoMatch[1]! : s;
}

/**
 * A discount/commission percentage, normalized.
 *
 * Two decimal places, because a commission of 12.5% is real and 12.505% is a
 * typo. Same scaled-integer rounding as money, for the same reason.
 */
export function toPercentOrNull(raw: unknown): number | null | typeof NaN {
  const n = toNumberOrNull(raw);
  if (n === null || Number.isNaN(n)) return n;
  const scaled = Math.round((n + Number.EPSILON * Math.sign(n)) * 100);
  if (!Number.isSafeInteger(scaled)) return NaN;
  return scaled / 100;
}

/**
 * An integer count (sessions, days, usage limits), normalized.
 *
 * A fractional count is not rounded into something plausible — it is returned
 * as `NaN` so the schema can say "Enter a whole number". Rounding 2.5 sessions
 * to 3 invents a session nobody bought.
 */
export function toIntegerOrNull(raw: unknown): number | null | typeof NaN {
  const n = toNumberOrNull(raw);
  if (n === null || Number.isNaN(n)) return n;
  return Number.isInteger(n) ? n : NaN;
}

/**
 * An uppercase code (coupon, offer, referral), normalized.
 *
 * Uppercased with interior whitespace removed, because a coupon is matched
 * exactly and `summer 30` will never equal `SUMMER30`. Unlike the text
 * normalizer this *does* touch interior whitespace: a code with a space in it
 * is not content, it is a paste artefact.
 */
export function toCodeOrNull(raw: unknown): string | null {
  const s = toTextOrNull(raw);
  if (s === null) return null;
  const compact = s.replace(/\s+/g, '').toUpperCase();
  return compact === '' ? null : compact;
}

/**
 * A measurement's value, normalized to a number or nothing.
 *
 * The assessment family — fitness testing, goal, mobility, lifestyle and
 * nutrition — each carried its own copy of this:
 *
 *     const n = (v: string) => {
 *       const t = v.trim();
 *       if (!t) return null;
 *       const f = parseFloat(t);
 *       return Number.isFinite(f) ? f : null;
 *     };
 *
 * Five identical copies, and the same defect in all five. `parseFloat` reads a
 * PREFIX and stops, which is the wrong shape for a measurement: '12abc' is 12,
 * '7 0' is 7, and nothing downstream can tell that anything was dropped. These
 * values do not merely get stored — BMI, the Rockport VO2 max estimate and the
 * 1RM formulas all compute from them and store a SCORE, so a plausible wrong
 * number is worse than a refusal.
 *
 * Built on toNumberOrNull so the assessments speak the platform's numeric
 * contract rather than a fifth dialect of it: currency and separator noise are
 * stripped the same way, non-numeric shapes are rejected the same way. The one
 * difference is the return type — callers here send `undefined` for a field
 * nobody filled in, and have no way to express "filled in wrongly", so NaN
 * collapses to null rather than travelling on to become a JSON `null` that
 * looks exactly like an empty field.
 */
export function toMeasurementOrNull(raw: string): number | null {
  const parsed = toNumberOrNull(raw);
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}
