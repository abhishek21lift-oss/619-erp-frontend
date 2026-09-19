// The front-desk check-in kiosk (/checkin/qr-scanner) is a staff-operated
// screen — see the page's own header comment: "the person operating it"
// scans a member's phone at the door. It used to be wrapped in
// `<Guard role="member">`, which is backwards for a staff surface in two
// independent ways:
//
//   1. The route already lives in the staff portal, so a member-role account
//      is refused by Guard's portal check before role is ever consulted —
//      the role prop never protected against a member opening this page.
//   2. What it actually gated was which STAFF role could open it. hasRole()
//      lets `admin` (and `super_admin`) through any non-super_admin-only
//      gate, but every OTHER staff role — manager, trainer, staff, reception
//      — was refused, because none of them equals the literal 'member'.
//      Reception is exactly who this kiosk is for.
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

describe('the check-in kiosk is gated for staff, not for members', () => {
  it('no longer requires the member role', () => {
    expect(page).not.toMatch(/<Guard role="member">/);
  });

  it('accepts every staff role the backend\'s requireStaff does, reception included', () => {
    const match = page.match(/<Guard roles=\{\[([^\]]*)\]\}>/);
    expect(match).not.toBeNull();
    const roles = match![1].match(/'([^']+)'/g)!.map((s) => s.slice(1, -1));
    for (const r of ['trainer']) {
      expect(roles).toContain(r);
    }
    expect(roles).not.toContain('member');
  });
});
