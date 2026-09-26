/**
 * Which critical forms a real browser journey actually covers.
 *
 * ── Why the audit needs this dimension ──────────────────────────────────────
 *
 * Every other number this audit produces is read out of the SOURCE: how many
 * native controls a file has, whether it binds a schema, whether it maps its
 * errors. All of them can be satisfied by code that looks right and does not
 * work. A form can bind a canonical schema, map every error and reset cleanly,
 * and still post the wrong field name to an endpoint that quietly ignores it —
 * the audit would score it perfect.
 *
 * The only evidence that closes that gap is a journey that types into the real
 * form, submits to the real API, and reads the row back out of the real
 * database. So "has a journey" is measured here alongside the rest, and a
 * critical form without one is reported as a gap rather than passing silently.
 *
 * ── Why a declared map rather than inference ────────────────────────────────
 *
 * Inferring coverage from spec text (grep the spec for a route, guess the
 * page) would be exactly the kind of metric this brief forbids: it would go
 * green for a spec that merely MENTIONS a URL. Declaring the pairing makes
 * somebody state what a journey is for, and the audit verifies both halves
 * exist — so a page that is renamed or a spec that is deleted breaks the
 * audit loudly instead of quietly reducing coverage to a smaller denominator.
 *
 * A file listed here is claimed to be covered END TO END: input → validation →
 * submit → API → backend → persistence → the UI's own success state. Listing a
 * file whose journey only renders the page and clicks nothing is the one way
 * to make this number a lie, so don't.
 */

/** spec file → the form files it drives end to end. */
export const JOURNEYS = {
  'e2e/record-payment.ui.spec.ts': [
    'src/app/(chrome)/pt-os/clients/[id]/payments/page.tsx',
  ],
  'e2e/client-create.ui.spec.ts': [
    'src/app/(chrome)/pt-os/new-client/page.tsx',
  ],
  'e2e/client-edit.ui.spec.ts': [
    'src/app/(chrome)/pt-os/clients/[id]/edit/page.tsx',
  ],
  'e2e/enrollment.ui.spec.ts': [
    'src/app/(chrome)/pt-os/clients/[id]/enroll/page.tsx',
  ],
  'e2e/invoice-create.ui.spec.ts': [
    'src/app/(chrome)/finance/invoices/page.tsx',
  ],
  'e2e/renew-pt.ui.spec.ts': [
    'src/app/(chrome)/pt-os/clients/[id]/renew/page.tsx',
  ],
  'e2e/pt-package.ui.spec.ts': [
    'src/app/(chrome)/subscription/packages/page.tsx',
  ],
  'e2e/diet-meal.ui.spec.ts': [
    'src/app/(chrome)/pt-os/diet-plans/page.tsx',
  ],
  'e2e/automation-rule.ui.spec.ts': [
    'src/app/(chrome)/engagement/automation/page.tsx',
  ],
  'e2e/session.ui.spec.ts': [
    'src/components/auth/SignInScreen.tsx',
  ],
  'e2e/member-goals.ui.spec.ts': [
    'src/app/(bare)/member/goals/page.tsx',
  ],
  'e2e/renewal-offer.ui.spec.ts': [
    'src/components/pt-os/RenewalOfferSheet.tsx',
  ],
};

/** Every form file some journey claims to cover. */
export function coveredFiles() {
  return new Set(Object.values(JOURNEYS).flat());
}
