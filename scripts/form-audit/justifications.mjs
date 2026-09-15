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
};

export function justificationFor(rel) {
  return JUSTIFIED[rel] ?? null;
}
