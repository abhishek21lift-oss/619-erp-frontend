// The five assessment wizards and the routes that host them have been
// repainted onto the indigo action colour. The logo blue is the mark's, not
// the UI's, and the easiest way for it to come back is a hex pasted into a
// form step.
//
// This scans only the surfaces Aurora has already repainted. Status colours
// (red/amber/green) and slate neutrals are not part of this rule; other
// modules still carry the old blue inline and get their own per-phase pass.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MODULES = ['goal-assessment', 'nutrition-assessment', 'exercise-library', 'parq', 'lifestyle-assessment'];
const ROUTES = ['goals', 'assessment', 'exercise-library', 'parq', 'nutrition-assessment',
  'lifestyle-assessment', 'mobility-assessment', 'posture-assessment', 'informed-consent'];

const LOGO_BLUE = /#0067e0|#0059ce|#0271eb|#7fb4ff|rgba\(0,\s*103,\s*224|rgba\(2,\s*113,\s*235|rgb\(0,\s*103,\s*224/i;

function sourceFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...sourceFilesUnder(p));
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

describe('the assessment wizards do not reach for the logo blue', () => {
  it('has no raw logo blue in the repainted modules and routes', () => {
    const dirs = MODULES.map((d) => join('src', 'components', 'pt-os', d))
      .concat(ROUTES.map((d) => join('src', 'app', '(chrome)', 'pt-os', d)));
    const offenders = dirs
      .flatMap((dir) => sourceFilesUnder(join(process.cwd(), dir)))
      .filter((p) => LOGO_BLUE.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
