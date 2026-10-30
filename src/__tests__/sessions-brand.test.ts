// The scheduling and check-in routes have been repainted onto the indigo
// action colour. The logo blue is the mark's, not the UI's, and the easiest
// way for it to come back is a hex pasted into one of these screens.
//
// This scans only the routes Aurora has already repainted. Slate neutrals and
// the status greens/reds are not part of this rule; other modules still carry
// the old blue inline and get their own per-phase pass.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROUTES = [
  join('src', 'app', '(chrome)', 'checkin'),
  join('src', 'app', '(chrome)', 'pt-os', 'my-schedule'),
  join('src', 'app', '(chrome)', 'pt-os', 'sessions'),
  join('src', 'app', '(chrome)', 'pt-os', 'schedule-session'),
  join('src', 'app', '(chrome)', 'pt-os', 'clients', '[id]', 'workout-log'),
];

const LOGO_BLUE = /#0067e0|#0059ce|#0271eb|rgba\(0,\s*103,\s*224|rgba\(2,\s*113,\s*235/i;

function sourceFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...sourceFilesUnder(p));
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

describe('scheduling and check-in do not reach for the logo blue', () => {
  it('has no raw logo blue in the repainted routes', () => {
    const offenders = ROUTES
      .flatMap((dir) => sourceFilesUnder(join(process.cwd(), dir)))
      .filter((p) => LOGO_BLUE.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
