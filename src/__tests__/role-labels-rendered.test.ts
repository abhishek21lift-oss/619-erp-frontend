// No screen may print a role identifier.
//
// ── Why this exists as a source scan ──────────────────────────────────────
//
// roles.test.ts proves ROLE_LABELS is complete and correct. That is necessary
// and not sufficient: a perfect label map does nothing for a component that
// renders `{user.role}` and never calls roleLabel. When super_admin was
// renamed to "Admin" the first pass found the label maps by grepping for the
// strings 'Admin' and 'Super Admin' — and missed SEVEN render sites, because
// a component printing the identifier contains neither string. The AppShell
// badge had been reading "super_admin" on every page of the app.
//
// So this scans for the shape of the bug rather than for its symptom: a role
// value interpolated into JSX without being labelled first.
//
// It is a source scan, which is a blunt instrument. It is kept narrow — only
// `.role` reads, only in JSX interpolation — and every allowed exception is
// listed with a reason below, so the file doubles as the record of where role
// identifiers legitimately reach the markup.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * A role value interpolated into TEXT: `{u.role}`, `{user?.role || 'x'}`, or
 * `${user?.role}` inside a template literal — which is how the sidebar's
 * tooltip printed one.
 *
 * The negative lookbehind for `=` is what keeps this usable. Without it the
 * scan also flagged every JSX ATTRIBUTE carrying a role — `<Guard
 * role={config.role}>`, `<RoleBadge role={account.role} />`, `value={form.role}`
 * — none of which is text on a screen. Attributes hand the identifier to a
 * component whose job is to interpret it; that is the correct thing to do.
 */
const RENDERS_ROLE = /(?<!=)\{\s*[A-Za-z_$][\w$]*\??\.role\b\s*(\}|\|\|)/;

/**
 * Lines that read a role but are not printing it to a person.
 * Each needs a reason; "it's fine" is not one.
 */
const ALLOWED: Array<[RegExp, string]> = [
  // Comparisons drive layout and permissions, not text.
  [/\.role\s*[=!]==/, 'comparison, not display'],
  // Already labelled.
  [/roleLabel\(/, 'passes through roleLabel'],
  // Comments — including the one in AppShell recording what this used to be.
  [/^\s*(\/\/|\*|\/\*|\{\/\*)/, 'comment'],
  // `trainers.role` and `gym.role` are FREE TEXT job titles — "Personal
  // Trainer", "Head Coach" — on the trainers table and the profile's work
  // history. Different column, different concept, already human-readable.
  [/label="Role \/ Title"/, 'trainers.role is a job title, not a login role'],
  [/gym\.role/, 'profile work history job title, not a login role'],
];

describe('role identifiers never reach the screen', () => {
  const files = walk(SRC);

  it('scans a realistic number of components, so it cannot pass vacuously', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('finds no component printing a raw role', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!RENDERS_ROLE.test(line)) return;
        if (ALLOWED.some(([re]) => re.test(line))) return;
        offenders.push(
          `${path.relative(process.cwd(), file)}:${i + 1}  ${line.trim().slice(0, 100)}`,
        );
      });
    }

    expect(
      offenders,
      'These render a role identifier into the UI. Wrap them in roleLabel() '
      + 'from @/lib/roles:\n' + offenders.join('\n'),
    ).toEqual([]);
  });
});
