// The front-desk check-in kiosk (/checkin/qr-scanner) is a staff-operated
// screen — see the page's own header comment: "the person operating it"
// scans a member's phone at the door. It used to be wrapped in
// `<Guard role="member">`, which is backwards for a staff surface in two
// independent ways:
//
//   1. The route already lives in the studio portal, so a member-role account
//      is refused by Guard's portal check before role is ever consulted —
//      the role prop never protected against a member opening this page.
//   2. What it actually gated was which STUDIO role could open it. Back when
//      there were several, `hasRole` let `admin` through any
//      non-super_admin-only gate and refused every other one — so the studio
//      roles this kiosk exists for could not open it.
//
// Deep-audit finding. Pinned as a source-text check because mounting the
// full kiosk page (camera access, jsQR, polling) is out of proportion to
// what broke: which literal string sits inside <Guard ...>.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Comments explaining this fix quote the old `<Guard role="member">` string
// verbatim — a raw match against the source would find the sentence
// describing the removal, not the removal. Strip comments first.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const page = stripComments(fs.readFileSync(
  path.join(process.cwd(), 'src/app/(chrome)/checkin/qr-scanner/page.tsx'),
  'utf8',
));

describe('the check-in kiosk belongs to the trainer, not the member', () => {
  it('no longer requires the member role', () => {
    expect(page).not.toMatch(/<Guard role="member">/);
  });

  it('is gated to the trainer, matching the backend route it calls', () => {
    // POST /api/qr/scan is requireTrainer: a signed QR marks whoever it names
    // present, so the scanner is the person doing the scanning — never the
    // member being scanned. The guard used to list five staff roles, of which
    // only 'trainer' still exists.
    expect(page).toMatch(/<Guard role="trainer">/);
    expect(page).not.toMatch(/<Guard roles=/);
  });
});
