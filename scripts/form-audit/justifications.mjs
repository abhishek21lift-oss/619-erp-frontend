/**
 * Native business controls that are staying native, and why.
 *
 * §1 is explicit that "zero raw inputs" is the wrong target: search boxes, file
 * pickers and table inline editors are legitimately native, and rewriting them
 * would be churn that makes the product worse. The target is zero UNJUSTIFIED
 * native business controls.
 *
 * `classify.mjs` already exempts whole KINDS that are native by nature —
 * search, file, range, color. This file is for the harder case: a control of a
 * business kind, in a business form, that should nonetheless stay as it is.
 *
 * ── The rules for adding an entry ───────────────────────────────────────────
 *
 * A justification is a technical claim about the code, checkable by reading it.
 * These are valid reasons:
 *
 *   · the screen already implements the contracts correctly by other means, and
 *     migrating it would be a rewrite with no defect fixed;
 *   · the control is a table inline editor, where one form instance per row is
 *     worse than the table it replaces;
 *   · the control is wrapped by a local field component that provides the same
 *     label/description/error wiring the design system would.
 *
 * These are NOT valid reasons, and an entry giving one should be deleted rather
 * than argued with:
 *
 *   · "it is a lot of work"
 *   · "it is low traffic"
 *   · "we will get to it"
 *   · anything that would be equally true of a file nobody has read
 *
 * `allowStateCoercions` is the same device for the OTHER thing the audit counts:
 * a `Number(form.x)` at submit time. Its valid reason is narrow and specific —
 * the value cannot be a blank or a typo by the time it is read, because
 * something in the file has already established that, and a reader can find
 * what. "It is probably fine" is not that.
 *
 * `allow` is a COUNT, not a blanket. A file justified for 6 controls that grows
 * a 7th fails the audit, so a new field cannot arrive under cover of an old
 * exemption.
 *
 * The audit reports an entry that has gone slack in EITHER direction: one whose
 * file no longer has native business controls, and — the shape that nearly got
 * past — one that allows more than the file actually has. This entry was
 * written at 8 and the file dropped to 6 when two of its boxes were correctly
 * reclassified as search, leaving two free slots nobody had reasoned about. An
 * allowance above the real count is a blanket by another name.
 */

export const JUSTIFIED = {

  'src/app/(chrome)/finance/verify-payments/page.tsx': {
    allow: 6,
    reason:
      'Already correct, verified line by line rather than assumed. The radio ' +
      'group uses fieldset+legend (what RadioField provides); the textarea has ' +
      'htmlFor and maxLength; the dialog resets per opening so a note typed for ' +
      'one payment cannot submit against the next; it has a busy guard, a focus ' +
      'trap via useDialogA11y, and treats a 409 as information rather than ' +
      'failure. Migrating it would change working code and fix nothing — the ' +
      'case §1 and the non-negotiable rule both forbid.',
  },

  'src/components/payments/UpiPayScreen.tsx': {
    allow: 2,
    reason:
      'The member payment screen, moved here from app/(chrome)/pay/[orderId] so ' +
      'the member app can mount it too; the controls did not change, but the ' +
      'new path ranks it P0, so they were re-verified line by line. The UTR box ' +
      'is labelled (htmlFor="utr"), holds the reference as a digit STRING via ' +
      'inputMode rather than type="number", validates it against the server\'s ' +
      '12-16 digit rule with aria-invalid and aria-describedby on the inline ' +
      'error, and submit is refused while busy or invalid. The note textarea is ' +
      'labelled and capped at the server\'s 500 characters. The proof upload is ' +
      'already the canonical checked uploader. Migrating a working money form ' +
      'as a side effect of moving it would change behaviour and fix nothing.',
  },

  'src/components/platform/subscription-requests.tsx': {
    allow: 2,
    reason:
      'The reject dialog, already correct and verified line by line. The reason ' +
      'group is a <fieldset> with a <legend> — which is exactly what RadioField ' +
      'renders and the only valid way to name a group of radios — and the note ' +
      'has htmlFor, maxLength and a character budget. The dialog mounts per ' +
      'action so a note typed against one payment cannot submit against the ' +
      'next, it has a focus trap via useDialogA11y, Escape is gated on the ' +
      'write being in flight, and a 409 is reported as information rather than ' +
      'as failure. The platform UPI dialog in the same file IS migrated, ' +
      'because it had real defects; this one has none, and rewriting it would ' +
      'be the churn §1 and the non-negotiable rule both forbid.',
  },

  'src/components/platform/invoices.tsx': {
    allow: 3,
    reason:
      'Three query filters on a read: the status <select> and the from/to ' +
      'dates. None of them is part of a payload — each sets a key on the ' +
      'InvoiceQuery memo and resets the page offset, and the only write in the ' +
      'file is the seller-identity form, which IS on the platform. A filter ' +
      'has nothing to validate, nothing to submit and nothing to reset, so ' +
      'useAppForm would add a schema, a submit guard and an error contract ' +
      'around a value that never leaves a GET query string. §1 names filters ' +
      'explicitly. Verify by reading the three onChange handlers: every one of ' +
      'them ends in setOffset(0).',
  },

  'src/components/auth/SignInScreen.tsx': {
    allow: 1,
    reason:
      'The "keep me signed in" checkbox, and only that: email, password and ' +
      'the MFA code are AuthInput (SoftField + SoftInput), so they carry the ' +
      'design-system wiring. The checkbox is a device preference persisted to ' +
      'localStorage, sits inside its own label, is never posted and has ' +
      'nothing to validate. The screen stays off useAppForm because it is not ' +
      'one form: a password submit, an MFA challenge that appears mid-attempt ' +
      'and re-submits the same credentials, and a passkey ceremony that never ' +
      'touches these controls. The canonical email rule comes from ' +
      'signInSchema, failures go through mapSignInError (which refuses to let ' +
      'a 401 distinguish "no such account" from "wrong password"), and the ' +
      'double-submit window is closed with an in-flight ref.',
  },

  'src/app/(bare)/subscription/page.tsx': {
    allow: 1,
    reason:
      'A coupon LOOKUP, not a payload field. Typing in it calls GET ' +
      'validate-coupon and renders a preview; the binding check happens ' +
      'server-side under a lock when the operator activates, so a code ' +
      'exhausted in between is still caught. There is no submit to guard, no ' +
      'reset to perform and no second field to cross-check — useAppForm models ' +
      'one submit of one schema and this control has none. It is normalised ' +
      'through the canonical toCodeOrNull (which closes an inner space that ' +
      'trim leaves, and would otherwise never match upper(trim(code)) ' +
      'server-side), it carries an aria-label, and its verdict is a role=status ' +
      'region the input points at with aria-describedby.',
  },

  'src/app/(chrome)/pt-os/clients/[id]/payments/page.tsx': {
    allow: 1,
    reason:
      'One query filter on a read: the status <select> beside the search box. ' +
      'It narrows the rendered payment list and resets the page index; it is ' +
      'not part of any payload. The write on this screen — Record Payment — IS ' +
      'on the platform, schema and all. §1 names filters explicitly. Verify by ' +
      'reading its onChange: it ends in setPage(0) and touches nothing else.',
  },

  'src/components/pt-os/exercise-library/ExerciseEditor.tsx': {
    allow: 2,
    reason:
      'Two COMPOSER boxes — the one that adds a coaching cue to a list, and ' +
      'the one that adds a tag. Neither holds a payload value: what you type ' +
      'is moved into the array on Enter and the box is cleared, so there is ' +
      'nothing for a schema to validate and nothing for a reset to restore. ' +
      'The arrays they build ARE on the platform, through form.Field, and the ' +
      'other nineteen controls in this file are design-system fields bound to ' +
      'exerciseSchema. Both boxes carry a real <label htmlFor> with a per-' +
      'instance useId, which they did not: their only accessible name was a ' +
      'placeholder, and a placeholder stops naming a control the moment ' +
      'anything is typed into it.',
  },

  'src/app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page.tsx': {
    allow: 9,
    reason:
      'Per-set inline editors that save on BLUR, one field at a time. There is ' +
      'no submit on this screen at all — each field is its own write — so ' +
      'useAppForm models none of what it does: no payload to validate, no ' +
      'submit to guard, no reset to perform. The controls are also layout-bound ' +
      'in a way a wrapper cannot reproduce: 17px centred numerals wedged ' +
      'between two 44px steppers in a two-column grid, with the height ' +
      'deliberately on the input rather than the label (there is a comment ' +
      'saying why — the border came out of the content box and left the real ' +
      'target at 42px). What they DID need is fixed in place: every one is ' +
      'type="text" with inputMode now, so a scroll wheel over a focused field ' +
      'cannot silently change a logged weight, and the blur handlers go through ' +
      'the canonical normalizer with a third outcome — save nothing when the ' +
      'box holds something unparseable, because NaN serialises to null and ' +
      'would have CLEARED a logged set for the sake of a typed unit.',
  },

  'src/app/(chrome)/pt-os/clients/[id]/enroll/page.tsx': {
    allow: 1,
    allowStateCoercions: 6,
    reason:
      'Six `Number(form.x)` reads, every one of them on a value that cannot be ' +
      'blank or unparseable by the time it is read. `duration` is a <select> ' +
      'typed `\'1\'..\'12\'`, `sessionsPerWeek` a <select> the validator also ' +
      'bounds to 1–7, and `validateAll` runs on every submit and blocks it — ' +
      'the save path is handleSubmit → validateAll → agreement sheet → ' +
      'confirmAndSave, and nothing else calls attemptSave. The two MONEY reads ' +
      'are not in that six: they were `Number(form.finalAmount)`, they are ' +
      'toMoneyOrNull now, and that is a fix rather than an exemption — ' +
      '`Number(\'8,000\')` is NaN, so a price written the way a studio owner ' +
      'writes one was refused as invalid while parseFloat in the balance ' +
      'preview beside it quietly showed ₹8. The one remaining native control is ' +
      'a search box in the trainer picker.',
  },

  'src/app/(chrome)/attendance/page.tsx': {
    allow: 3,
    reason:
      'The manual-entry modal — the only thing on this page that WRITES a ' +
      'record — is on the platform: attendanceEntrySchema, useAppForm, and a ' +
      'refusal to file a correction for a day that has not happened. The ' +
      'three that remain are the ones §1 names as acceptable and are ' +
      'checkable as such: the hero date input is a FILTER (it re-reads the ' +
      "day's rows and posts nothing), the member box is a search over the " +
      'loaded list, and the header checkbox is a table bulk-select whose ' +
      'per-row twin is rendered inside the <tbody>. None of the three is ' +
      'part of a payload.',
  },

  'src/components/revenue/MonthlyTargetHero.tsx': {
    allow: 1,
    allowStateCoercions: 1,
    reason:
      '`Number(draft.replace(/[^0-9.]/g, \'\'))` strips everything that is not ' +
      'a digit or a point BEFORE parsing, so the separator case that breaks ' +
      'parseFloat elsewhere is handled — and the result is gated by ' +
      '`Number.isFinite(amount) && amount > 0`, which the submit checks before ' +
      'it posts. A value like "1.2.3" survives the strip and fails the gate, ' +
      'which is the right order. One control, one number, one guard in front ' +
      'of it.',
  },

  'src/components/pt-os/shared/SignaturePad.tsx': {
    allow: 1,
    reason:
      'The typed-name accessible alternative to the canvas gesture (a deep-' +
      'audit fix — drawing a signature is a pointer gesture with no keyboard ' +
      'path, which used to be recorded in this file as a known gap). The ' +
      'input carries its own <label htmlFor>, is wired to the same disabled ' +
      'prop as the canvas, and its value is never itself the submitted data: ' +
      'pressing Sign renders the typed name onto the canvas and calls the ' +
      'component\'s existing onChange with a real PNG data URL — the exact ' +
      'same contract every consumer (enrolment, PAR-Q, informed consent) ' +
      'already handles for a drawn stroke. There is no form state to bind a ' +
      'schema to; the control produces an image, not a field value.',
  },
};

export function justificationFor(rel) {
  return JUSTIFIED[rel] ?? null;
}
