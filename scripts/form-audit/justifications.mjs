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

  'src/app/(chrome)/engagement/whatsapp/page.tsx': {
    allow: 1,
    reason:
      'The one native control is the per-member selection checkbox inside a ' +
      'row that is itself role="button" with aria-pressed and an accessible ' +
      'name. CheckboxField renders control-then-caption, which would repeat ' +
      'the member name inside the row and break the row-click affordance; the ' +
      'checkbox already carries aria-label and the row handles click, Enter ' +
      'and Space.',
  },

  'src/app/(chrome)/finance/verify-payments/page.tsx': {
    allow: 2,
    reason:
      'The two native controls left are the reject/correct dialog: a radio ' +
      'group that uses fieldset+legend (what RadioField provides) and a ' +
      'textarea with htmlFor and maxLength. That dialog resets per opening, ' +
      'guards submit with an in-flight ref, traps focus via useDialogA11y, and ' +
      'treats a 409 as information rather than failure. The new-payment-request ' +
      'dialog now runs on the platform (schema, useAppForm, FormField); the ' +
      'queue search box is a filter, not a business control.',
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
    allowStateCoercions: 5,
    reason:
      'Five `Number(form.x)` reads, every one of them on a value that cannot be ' +
      'blank or unparseable by the time it is read. `duration` is a <select> ' +
      'typed `\'1\'..\'12\'`, `sessionsPerWeek` a <select> the schema also ' +
      'bounds to 1–7, and `fieldErrors` runs on every submit and blocks it — ' +
      'the save path is handleSubmit → fieldErrors → agreement sheet → ' +
      'confirmAndSave, and nothing else calls attemptSave. The two MONEY reads ' +
      'are not in that six: they were `Number(form.finalAmount)`, they are ' +
      'toMoneyOrNull now, and that is a fix rather than an exemption — ' +
      '`Number(\'8,000\')` is NaN, so a price written the way a studio owner ' +
      'writes one was refused as invalid while parseFloat in the balance ' +
      'preview beside it quietly showed ₹8. The one remaining native control is ' +
      'a search box in the trainer picker.',
  },

  'src/app/(chrome)/attendance/page.tsx': {
    allow: 1,
    reason:
      'The manual-entry modal — the only thing on this page that WRITES a ' +
      'record by hand — is on the platform: attendanceEntrySchema, useAppForm, ' +
      'and a refusal to file a correction for a day that has not happened. ' +
      'The one native control that remains is the hero date input, a FILTER: ' +
      "it re-reads the day's rows and posts nothing, and is clamped to today. " +
      'The member search and the table bulk-select that also had allowances ' +
      'went with the redesign.',
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
  'src/components/pt-os/ChurnRow.tsx': {
    allow: 1,
    reason:
      'The one native control is the snooze date that opens inside a single ' +
      'row of the at-risk list. The list can hold the whole roster, so a form ' +
      'instance per row (what DateFieldControl would need) is worse than the ' +
      'table it replaces — the inline-editor case this file names. The input ' +
      'sits in its own <label>, its min/max mirror the server\'s 1-90 day ' +
      'window, and its value is sent as snooze_until only after Save.',
  },

  'src/app/(chrome)/pt-os/new-client/page.tsx': {
    allow: 1,
    reason:
      'The "Same as Mobile" checkbox, and only that. It is a boolean that ' +
      'mirrors the mobile number into the WhatsApp field and is never posted: ' +
      'the request sends the resolved number, not the flag. It sits inside ' +
      'its own <label> with visible text, so its accessible name is the ' +
      'sentence beside it, and both number fields are FloatInput on the ' +
      'platform. A checkbox is the right shape for a two-state choice; a ' +
      'label-above text field would misdescribe it.',
  },

  'src/components/member/GuidedWorkout.tsx': {
    allow: 1,
    reason:
      'One inline STEPPER — minus, centred input, plus — not a labelled text ' +
      'field. The input carries its own aria-label (the exercise metric) and ' +
      'inputMode for the numeric keypad; the column already names the metric, ' +
      'so a FormField label would add a second name and break the 44px row ' +
      'the three pieces share. The value is written by the logger through ' +
      'its existing onField path, not by a form submit, so a schema-bound ' +
      'field would attach to nothing.',
  },

  'src/components/pt-os/TrainerStatedFields.tsx': {
    allow: 1,
    reason:
      'A dense, table-like row of five trainer statements. The caption and ' +
      'the input share one line inside a wrapping <label>, so each control is ' +
      'named by its visible caption without an id; FormField stacks the label ' +
      'above the control and would turn a one-line statement list into a ' +
      'five-row form inside an already collapsible panel. These are ' +
      'statements for one generation, not a submitted record, so no schema ' +
      'or submit exists to attach. The numeric field renders type="text" with ' +
      'inputMode="numeric" — a scroll wheel over it cannot change the value.',
  },

  'src/components/pt-os/analytics/LandmarkEditor.tsx': {
    allow: 1,
    reason:
      'A table inline editor: one 54px numeric cell per row, committed on ' +
      'blur and on Enter, named by its aria-label. A FormField per cell would ' +
      'add a visible label above every cell in a grid already named by the ' +
      'column heading, and a form per row is worse than the table it ' +
      'replaces. The control is type="text" with inputMode="numeric"; commit ' +
      'refuses a non-finite value rather than writing it, and skips an ' +
      'unchanged pair.',
  },

  'src/components/pt-os/exercise-library/ExerciseFilterRail.tsx': {
    allow: 1,
    reason:
      'A real checkbox drawn as an iOS switch. It sits inside a <label> with ' +
      'the visible label and hint text, keeps the native keyboard and ' +
      'screen-reader behaviour, and role="switch" announces on/off rather ' +
      'than ticked. It narrows the rendered exercise list and posts nothing; ' +
      'FormField\'s label-above shape exists for data entry, which is what ' +
      'the same header says it deliberately does not force on a switch.',
  },

  'src/components/pt-os/posture-assessment/StepPostureObservations.tsx': {
    allow: 1,
    reason:
      'The "No posture issues noted" checkbox, inside its own <label> with ' +
      'visible text. A checkbox is the control the question calls for, and ' +
      'the label-above shape would separate the sentence from the box that ' +
      'answers it. It is disabled while findings exist, so the two states ' +
      'cannot contradict each other, and the surrounding observations are ' +
      'FloatInput on the platform.',
  },

  'src/components/platform/feature-manager.tsx': {
    allow: 2,
    reason:
      'The two per-feature switches — "Restrict to plans" and "On by default" ' +
      '— each a checkbox inside its own <label> with visible text, patched ' +
      'immediately on change. They are boolean state toggles, not payload ' +
      'fields of a submitted form, so there is no schema, submit or reset to ' +
      'attach; the label-above shape would separate each switch from the ' +
      'words that name it. The third input in the file is the feature search ' +
      'box, which is native by kind.',
  },

  'src/components/platform/live-logs.tsx': {
    allow: 1,
    reason:
      'A live query filter: every keystroke becomes q on the logs request and ' +
      'resets the cursor; nothing is posted. It carries aria-label="Filter by ' +
      'message" and is one of the row of filters beside the level buttons and ' +
      'the export window, so a label above it would repeat the placeholder ' +
      'and push the filter row taller. §1 names filters explicitly.',
  },

  'src/components/chat/ChatComposer.tsx': {
    allow: 1,
    reason:
      'A chat composer, not a form field: one autosizing textarea plus Send, ' +
      'named with aria-label="Message", capped at the same 2000 characters ' +
      'the API enforces. Enter sends on a keyboard and starts a new line on a ' +
      'touch screen, which is a keyboard contract a label-above wrapper does ' +
      'not model. There is no submit payload to validate and no reset beyond ' +
      'clearing the box after a successful send.',
  },

  'src/lib/insights/date-range.tsx': {
    allow: 1,
    reason:
      'The ONE canonical Insights date control, used as a filter on every ' +
      'insights page: it sets the from/to query keys and posts nothing. Each ' +
      'input is type="date" inside its own <label> with a visible caption, ' +
      'clamped by min/max, and keeps the platform date picker and keyboard ' +
      'editing. Rewriting it as a FormField would either duplicate the ' +
      'canonical component or lose the native date semantics.',
  },
};

export function justificationFor(rel) {
  return JUSTIFIED[rel] ?? null;
}
