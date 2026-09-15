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
  'src/app/(chrome)/pt-os/commissions/page.tsx': {
    allow: 6,
    reason:
      'Table inline editor — §1 names these explicitly. Each row edits in place; ' +
      'putting them on useAppForm means one form instance per trainer and a ' +
      'rewrite of a working table. The DATA layer is already on the platform: ' +
      'drafts hold raw strings, commissionRowSchema and payoutRowSchema parse ' +
      'them at save, errors render per row, and month changes abandon drafts. ' +
      'The controls are the only native part and they carry no unvalidated value.',
  },

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
    allow: 4,
    reason:
      'Already correct, and read line by line rather than assumed. Email and ' +
      'password each carry htmlFor, aria-invalid and an aria-describedby ' +
      'pointing at their own error paragraph, with a touched rule so nothing ' +
      'turns red before it has been left; the MFA box is labelled and now ' +
      'describes its own hint; the remember checkbox is inside its label. The ' +
      'canonical email rule comes from signInSchema, and failures go through ' +
      'mapSignInError, which refuses to let a 401 distinguish "no such account" ' +
      'from "wrong password". The reason it stays native is that it is not one ' +
      'form: it is a password submit, an MFA challenge that appears mid-attempt ' +
      'and re-submits the same credentials, a passkey ceremony and a Google ' +
      'credential callback, three of which never touch these controls. ' +
      'useAppForm models one submit of one schema; forcing four entry paths ' +
      'through it would be a rewrite of the most important screen in the ' +
      'product to fix nothing. The double-submit window it DID have is fixed ' +
      'in place, with an in-flight ref.',
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
};

export function justificationFor(rel) {
  return JUSTIFIED[rel] ?? null;
}
