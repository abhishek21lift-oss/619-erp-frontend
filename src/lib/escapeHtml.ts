// HTML escaping for the `window.open('') + document.write()` print popups.
//
// ── Why these need it at all ────────────────────────────────────────────────
//
// The three print surfaces (invoices, the check-in QR card, the fitness
// assessment report) build an HTML string by concatenation and write it into a
// same-origin popup. Two properties of that mechanism make it dangerous:
//
//   1. `window.open('')` gives the popup the opener's origin, so anything that
//      executes in it executes as THIS APP — with the session cookie readable
//      and every same-origin API call it can make.
//   2. `about:blank` inherits the opener's CSP policy container, and the
//      enforced policy still ships `script-src 'self' 'unsafe-inline'`
//      (lib/security-headers.js). So an inline <script> written into the popup
//      is authorised. A nonce-based policy exists but is only applied to the
//      Report-Only header, which does not block anything.
//
// Nothing about this is exotic. A client called `<img src=x onerror=...>` is
// one form field away, and the assessment report additionally renders **LLM
// output** (aiAnalysis.summary, .risk_flags[].action, …) unescaped — so an
// injected instruction in the assessment text that the model was built from
// can come back out as markup and run in a trainer's session.
//
// ── Why escaping data rather than the whole template ────────────────────────
//
// These templates legitimately contain real markup: `<strong>`, `<li>`,
// `<em>`, and entities like `&amp;` in a section title. Escaping the finished
// string would print those tags literally and break every report. So the rule
// is: markup WE author stays as markup, and every value that came from a user,
// a database row, or a model is escaped at the point it enters the template.
//
// ── Why not a library ───────────────────────────────────────────────────────
//
// DOMPurify would be the right tool for sanitising arbitrary HTML. It is the
// wrong tool here: there is no arbitrary HTML to sanitise, only text values
// that must not be markup, and every one of these templates is assembled by
// hand with a fixed set of tags. Escaping is a complete solution for that;
// a sanitiser would be a large dependency solving a problem this code does not
// have. If a template ever needs to accept real HTML, that is the moment to
// add one — deliberately, not by loosening `escapeHtml`.

/**
 * Escapes text for interpolation into HTML element content OR into a
 * double- or single-quoted attribute value.
 *
 * Covers the five characters that can change parsing context. `&` is replaced
 * first so the ampersands introduced by the later replacements are not
 * double-escaped.
 *
 * Non-strings are coerced, because these values arrive from JSON rows where a
 * number, boolean, null or undefined is as likely as a string — and `null`
 * must render as nothing rather than as the text "null".
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes a value destined for an `src`/`href` attribute, additionally
 * requiring it to be an image data URL.
 *
 * Quoting alone would stop an attribute breakout, but a URL attribute is a
 * better place to be strict: the only legitimate value here is an image the
 * server just generated, so anything else is either a bug or an attempt, and
 * an empty `src` is harmless where a foreign URL is not.
 *
 * Returns `fallback` when the value is not an acceptable image data URL.
 */
export function escapeImageDataUrl(value: unknown, fallback = ''): string {
  const s = typeof value === 'string' ? value.trim() : '';
  // base64 only, and not svg+xml: an SVG data URL is a document that can carry
  // script, which would put the hole straight back through the img attribute.
  if (!/^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) return fallback;
  return s;
}