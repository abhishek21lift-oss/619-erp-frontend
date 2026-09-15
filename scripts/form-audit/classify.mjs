/**
 * What a control is, and what a form has.
 *
 * Split out from the reporter because the classification is the part with
 * judgement in it, and judgement deserves to be read on its own and tested.
 *
 * ── Why the previous metric was not good enough ─────────────────────────────
 *
 * The first audit counted `<input|textarea|select>` and called the number
 * "raw controls". That metric misled this migration twice:
 *
 *   · it rose when a field component was ADDED, because every wrapper contains
 *     a native element (fixed by excluding the design system, but the fix was
 *     a patch on a metric that was measuring the wrong thing);
 *   · it ranked `verify-payments` as an 8-control P0 target when that screen is
 *     already correct — fieldset/legend, htmlFor, reset-per-open, busy guard —
 *     so "migrating" it would have been churn.
 *
 * A count of elements cannot tell a search box from a payout field. §1 is
 * explicit that it should not try to: the goal is zero UNJUSTIFIED native
 * business controls, not zero native controls. So this classifies by KIND and
 * by CONTEXT, and anything still native in a business form has to be justified
 * by name in `justifications.mjs`.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Control kinds
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Kinds that are legitimately native, per §1.
 *
 * Not "acceptable for now" — these are controls where a wrapper would be worse:
 *
 *   search   a magnifier beside a box reading "Search clients…" is the correct
 *            presentation; FORM-SYSTEM.md already settled this and SearchField
 *            exists for the accessible-name half.
 *   file     the picker is a browser affordance; the app's own validation runs
 *            on what it returns (lib/forms/files.ts), which is the part that
 *            matters.
 *   range    a slider's native keyboard and touch behaviour is hard to match
 *            and easy to break.
 *   color    same.
 *   hidden   not a control at all.
 */
export const NATIVE_BY_KIND = new Set(['search', 'file', 'range', 'color', 'hidden']);

/** Kinds that carry a business value and belong on the platform. */
export const BUSINESS_KINDS = new Set([
  'text', 'number', 'email', 'tel', 'url', 'password', 'date', 'month',
  'time', 'datetime-local', 'select', 'textarea', 'checkbox', 'radio',
  'dynamic',
]);

/**
 * Identify one control from its opening tag.
 *
 * `type` may be a JSX expression (`type={show ? 'text' : 'password'}`), which
 * is the password-toggle pattern; those are text/password either way, so they
 * classify as business rather than as unknown.
 */
export function controlKind(tag, attrs) {
  if (tag === 'textarea') return 'textarea';
  if (tag === 'select') return 'select';

  const explicit = /type="([a-z-]+)"/.exec(attrs);
  // An explicit type wins, EXCEPT over the search heuristics below, and that
  // exception is load-bearing: a search box is almost always spelled
  // `type="text"` plus a placeholder or an accessible name that says Search.
  // Returning on the explicit type first meant the heuristics never ran for
  // the boxes that most needed them — the PT payments search declares
  // `aria-label="Search payments"` AND `placeholder="Search payments…"` and
  // was still counted as an unjustified business control.
  if (explicit && explicit[1] !== 'text' && explicit[1] !== 'search') return explicit[1];

  // A dynamic type — `type={show ? 'text' : 'password'}` on a reveal toggle,
  // or `type={type}` where a field spec is being mapped over. Reported as
  // exactly what it is rather than guessed at: it was 'password' at first,
  // which was right for the toggles and wrong for the Create Invoice modal,
  // where the same expression produces text, number and date. `dynamic` is a
  // business kind, so nothing hides behind the honest answer.
  if (/type=\{/.test(attrs)) return 'dynamic';

  // A box whose placeholder or accessible name says Search is a search control
  // whatever its type; 18 of the tree's inputs are exactly this.
  //
  // `aria-label` is checked as well as `placeholder`, and the omission was a
  // real misclassification rather than a missed nicety: the Billing Centre's
  // filter box reads `aria-label="Search invoices"` with a placeholder of
  // "Invoice no., studio, reference…", so the placeholder rule alone scored the
  // one box on that screen that is PROPERLY labelled as an unjustified business
  // control — punishing the accessible spelling.
  if (/placeholder="\s*Search|placeholder=\{[^}]*[Ss]earch/.test(attrs)) return 'search';
  if (/aria-label="[^"]*[Ss]earch|aria-label=\{[^}]*[Ss]earch/.test(attrs)) return 'search';

  return explicit ? explicit[1] : 'text';
}

/**
 * Every native control in a source, as `{ tag, attrs }`.
 *
 * Not a regex. The obvious one — `/<(input|textarea|select)\b([^>]*)>/g` — is
 * wrong in a way that is easy to miss and was wrong here for a while: `[^>]*`
 * stops at the FIRST `>`, and in JSX that is usually the arrow of an inline
 * handler:
 *
 *     <input
 *       value={q} onChange={(e) => setQ(e.target.value)}   ← capture ends here
 *       placeholder="Invoice no., studio, reference…"
 *       aria-label="Search invoices"
 *     />
 *
 * So `type`, `placeholder` and `aria-label` were invisible to the classifier
 * whenever a handler came first, and every such control fell through to the
 * default kind — `text`, a business kind. The Billing Centre's search box was
 * counted as an unjustified business control for exactly this reason.
 *
 * This scans forward instead, tracking brace depth and string/template state,
 * and takes the `>` that actually closes the tag. Slower than a regex and
 * bounded by the file, which is not a cost worth optimising for a script that
 * runs in under a second over 150 files.
 */
export function controlTags(source) {
  const out = [];
  const open = /<(input|textarea|select)\b/g;
  let m;

  while ((m = open.exec(source)) !== null) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote = null;

    while (i < source.length) {
      const ch = source[i];

      if (quote) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === quote) quote = null;
        i += 1;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === '`') { quote = ch; i += 1; continue; }
      if (ch === '{') { depth += 1; i += 1; continue; }
      if (ch === '}') { depth -= 1; i += 1; continue; }
      if (ch === '>' && depth === 0) break;
      i += 1;
    }

    out.push({ tag: m[1], attrs: source.slice(m.index + m[0].length, i) });
    open.lastIndex = i;
  }

  return out;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Form properties — §22
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * The contracts a business form is supposed to have.
 *
 * Detected from source rather than from a registry, so a form cannot claim a
 * property it does not have. Each is a pattern with a known false-negative
 * mode, documented, because a detector that silently overstates coverage is
 * worse than no detector.
 */
export const CONTRACTS = {
  /** §14 — the platform's submit state machine, or a hand-rolled equivalent. */
  submit: {
    platform: /useAppForm\s*\(/,
    // A `saving`/`busy`/`submitting` flag guarding the handler. Weaker than the
    // in-flight ref useAppForm uses — it cannot stop two clicks in one frame —
    // but it is a real guard and reporting it as absent would be false.
    manual: /\b(setSaving|setBusy|setSubmitting|setIsSubmitting)\s*\(\s*true/,
  },
  /** §16 — server errors translated, not rendered raw. */
  error: {
    // Three spellings of the same contract:
    //
    //   mapApiError    the mapper itself;
    //   errorMessage   the same thing collapsed to one string, for toasts and
    //                  banners with no field to hang an error on;
    //   mapSignInError the login-screen variant, which delegates to
    //                  mapApiError and then refuses to let a 401 or 403 say
    //                  anything specific;
    //   useAppForm     which calls mapApiError internally on every failed
    //                  submit and puts the result in `errors`.
    //
    // All four, because a detector that matched only the first would report a
    // screen as UNMAPPED the moment it moved to the tidier call — and one that
    // missed useAppForm would mark a form as LOSING its error contract at the
    // exact moment it gained the canonical one. Both happened here.
    platform: /mapApiError\s*\(|errorMessage\s*\(|mapSignInError\s*\(|useAppForm\s*\(/,
    // Reading `.message` off an ApiError is the pattern mapApiError replaces;
    // it counts as "handled" but not as "canonical".
    manual: /instanceof ApiError|catch\s*\([^)]*\)\s*\{[^}]*setError/,
  },
  /** §15 — state rebuilt from the record rather than cleared by hand. */
  reset: {
    platform: /\bresetTo\s*\(|ToFormValues\s*\(|\bkey=\{[^}]*\?\.id/,
    manual: /useEffect\([^)]*\)\s*=>\s*\{[^}]*set[A-Z]\w*\(/,
  },
  /**
   * §4 — a canonical schema.
   *
   * `platform` is a named schema module (lib/forms/schemas/*), which is what §4
   * asks for: one authoritative description of a business payload.
   *
   * `manual` is a form that reaches into the domain or primitive layer directly
   * — `gstRateField(...)`, `moneyField(...)` — without a named schema. That is
   * genuine canonical validation and reporting it as "none" would be false; it
   * is not a canonical SCHEMA, so it is not reported as platform either.
   */
  schema: {
    platform: /from '@?\/?.*forms\/schemas/,
    manual: /from '@?\/?.*forms\/(domain|primitives)'/,
  },
};

/**
 * Does this file submit a business value?
 *
 * Not just `<form>` or `onSubmit`. Most of this app's forms are modals and
 * inline editors that submit from an `onClick`, so keying on the form element
 * counted 24 files when 103 hold business controls — and every coverage
 * percentage computed against that denominator was flattering nonsense.
 *
 * The honest question is "does this file take a value from a control and send
 * it somewhere", so: it has a business control AND it calls the API with a
 * method that writes. A read-only screen with a filter box is not a form and
 * should not be scored as one.
 */
const WRITE_CALL = /api\.[A-Za-z0-9_.]*\.(create|update|save|add|post|put|patch|delete|remove|submit|record|mark|set|send|generate|approve|reject|assign|activate|deactivate|cancel|request)[A-Za-z0-9_]*\s*\(/;

export function looksLikeForm(source, hasBusinessControl) {
  if (/<form[\s>]|useAppForm\s*\(|handleSubmit\s*\(/.test(source)) return true;
  return Boolean(hasBusinessControl) && WRITE_CALL.test(source);
}

/**
 * Evaluate a file against the contracts.
 *
 * Returns 'platform' | 'manual' | 'none' per contract, so the report can
 * distinguish "on the canonical path", "does the right thing its own way" and
 * "does not do it". Collapsing the middle case to a failure would push toward
 * rewriting working code, which §1 forbids.
 */
export function contractCoverage(source) {
  const out = {};
  for (const [name, patterns] of Object.entries(CONTRACTS)) {
    if (patterns.platform.test(source)) out[name] = 'platform';
    else if (patterns.manual && patterns.manual.test(source)) out[name] = 'manual';
    else out[name] = 'none';
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Risk
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * P0 — a wrong value here costs money, grants access, or corrupts a record
 * other records are derived from.
 */
const P0_PATHS = [
  /finance\//, /payments?\//, /invoice/i, /billing/i, /commission/i,
  /coupon/i, /offers?\//, /subscription/i, /razorpay/i, /payout/i,
  /platform-login/, /\/login/, /auth/i, /password/i, /permissions?/,
];

/** P1 — the product's core records: clients, training, assessments, comms. */
const P1_PATHS = [
  /assessment/i, /parq/i, /consent/i, /pt-os\//, /clients?\//, /trainers?\//,
  /programme/i, /program/i, /workout/i, /diet/i, /nutrition/i, /attendance/i,
  /leave/i, /member/i, /enroll?ment/i, /ai\//, /whatsapp/i, /engagement\//,
  /automation/i, /campaign/i, /profile/i,
];

/**
 * Classify a file's risk.
 *
 * By path, deliberately, and the report says so: a path tells you what a screen
 * is ABOUT, not whether it is defective. Conflating those is the mistake that
 * put `verify-payments` at the top of a migration list it did not belong on.
 */
export function riskOf(rel) {
  for (const p of P0_PATHS) if (p.test(rel)) return 'P0';
  for (const p of P1_PATHS) if (p.test(rel)) return 'P1';
  return 'P2';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Numeric and upload hazards — §6, §12
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Coercions of a control's value, split by whether they can actually bite.
 *
 * `Number('')` is `0` — the defect this platform exists to remove. But the
 * expression is only dangerous when the control can PRODUCE an empty string:
 *
 *   risky    a text or number input. The user can clear it, and a cleared
 *            money field becoming ₹0 is the whole problem.
 *   bounded  a `type="range"` slider, or a `<select>` whose options are a
 *            fixed set. The browser guarantees a value, so the coercion has
 *            nothing to coerce wrongly.
 *
 * Reporting both together produced seven "defects" of which five were slider
 * and select reads that are correct as written. A measuring tool that cannot
 * tell those apart sends people to change working code, so it is worth the
 * extra line to separate them.
 *
 * The known limitation, stated rather than hidden: a `<select>` CAN carry an
 * `<option value="">`, and this counts it as bounded anyway. Detecting that
 * needs the option list, which is not on the same line. So `bounded` means
 * "probably safe, worth a glance" and not "proven safe" — which is why the
 * ratchet is set on `risky` only.
 *
 * The leading `\b` is load-bearing and was missing at first: without it,
 * `setGstNumber(e.target.value)` matches, because the setter's name ENDS in
 * "Number(". The audit reported a coercion on a screen that has none — the
 * worst failure mode for a measuring tool, because a false positive sends
 * someone to "fix" correct code.
 */
const COERCION_EXPR =
  /\b(?:Number|parseFloat|parseInt)\s*\(\s*(?:e|ev|event)\.(?:target|currentTarget)\.value|\.valueAsNumber/;

/** Count coercions in a source, split risky vs bounded, by looking at the line. */
export function coercionSites(source) {
  const lines = source.split('\n');
  let risky = 0;
  let bounded = 0;
  const riskyLines = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!COERCION_EXPR.test(line)) continue;

    // Which element does this handler belong to?
    //
    // Determined by walking BACK to the nearest unclosed opening tag, not by
    // searching a window: the first version tested the whole window for
    // `<select`, so an input three lines below an unrelated select was scored
    // as bounded and the audit reported ZERO risky coercions while a real one
    // sat in ModuleWorkspace. Nearest-tag-wins is the only reading that
    // answers the question actually being asked.
    let owner = null;
    for (let j = i; j >= Math.max(0, i - 12) && owner === null; j -= 1) {
      const tag = /<(input|select|textarea)\b/.exec(lines[j]);
      if (tag) {
        // The attributes of a multi-line JSX element are spread over the lines
        // BETWEEN the tag and the handler, so `type="range"` is rarely on the
        // same line as `<input`. Taking only that line missed every slider and
        // reported three correct reads as defects.
        owner = { tag: tag[1], attrs: lines.slice(j, i + 1).join(' ') };
      }
    }

    const isRange = owner?.tag === 'input' && /type="range"/.test(owner.attrs);
    const isSelect = owner?.tag === 'select';

    if (isRange || isSelect) bounded += 1;
    else {
      risky += 1;
      riskyLines.push(i + 1);
    }
  }

  return { risky, bounded, riskyLines };
}

/** A file input whose handler does not reach the canonical validator. */
export function uploadSites(source) {
  const inputs = (source.match(/<input[^>]*type="file"/g) ?? []).length;
  const canonical = /checkFile\s*\(|readImageAsDataUrl\s*\(|from '@?\/?.*forms\/files/.test(source);
  return { inputs, canonical };
}
