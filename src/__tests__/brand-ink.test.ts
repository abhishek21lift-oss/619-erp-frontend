// The wordmark blue used to be the app's accent. Aurora moved actions, links
// and selected states onto the indigo ramp, and the Rosé pass then moved the
// ramp itself to the warm values — the mark was recoloured to match, so the
// old blue no longer belongs anywhere.
//
// This is the ratchet for the surfaces already repainted: every PT-OS surface
// and the check-in kiosk. It catches the three ways the old blue comes back —
// the palette module, the destructured ramp, and a hex pasted straight into a
// style. Status colours (red/amber/green) and slate neutrals are not part of
// this rule and are used freely.
//
// Other areas of the app (platform console, member-side components) still
// carry the old blue inline and get their own pass.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TREES = [
  join('src', 'components', 'pt-os'),
  join('src', 'app', '(chrome)', 'pt-os'),
  join('src', 'app', '(chrome)', 'checkin'),
];

// The blue ramp's hexes and rgb() forms (300..800), plus the wordmark blue it
// was named after. `blue[` is the destructured palette import; the leading
// guard keeps Tailwind's `text-blue-500` out of the match.
const OLD_BLUE = new RegExp([
  'palette\\.blue',
  '(^|[^a-zA-Z0-9_.])blue\\[',
  '#0067e0', '#0059ce', '#0271eb', '#3b8df5', '#7fb4ff', '#0050ad', '#003f87',
  'rgba\\(0,\\s*103,\\s*224', 'rgba\\(0,\\s*89,\\s*206', 'rgba\\(2,\\s*113,\\s*235',
  'rgba\\(127,\\s*180,\\s*255', 'rgb\\(0,\\s*103,\\s*224', 'rgb\\(2,\\s*113,\\s*235',
].join('|'), 'im');

function sourceFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...sourceFilesUnder(p));
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

describe('the logo blue stays on the mark', () => {
  it('is not used as an accent anywhere in the repainted surfaces', () => {
    const offenders = TREES
      .flatMap((dir) => sourceFilesUnder(join(process.cwd(), dir)))
      .filter((p) => OLD_BLUE.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
