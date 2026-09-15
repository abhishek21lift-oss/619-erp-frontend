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
 * exemption. The audit also reports an entry whose file no longer has native
 * business controls, because a stale exemption is a slot a regression can
 * occupy unnoticed.
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
    allow: 8,
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
};

export function justificationFor(rel) {
  return JUSTIFIED[rel] ?? null;
}
