// Keyboard focus has to be visible. WCAG 2.4.7, Level AA.
//
// globals.css already had the right rule — a 2px brand outline plus a soft
// ring, on :focus-visible only, so a mouse click on a button stays clean. It
// was being defeated in one specific way, and only that way.
//
// The cascade is the whole story:
//
//   .outline-none (Tailwind, 223 uses)   class selector, specificity (0,1,0),
//                                        emitted by @tailwind utilities near
//                                        the top of globals.css. The
//                                        :focus-visible rule is (0,1,0) too
//                                        and comes LATER in the file, so it
//                                        wins on source order. These were
//                                        always fine.
//
//   style={{ outline: 'none' }} (56)     an inline declaration, which beats
//                                        every stylesheet rule that is not
//                                        !important. Nothing in globals.css
//                                        is !important, so on these controls
//                                        the ring never rendered at all.
//
// So the fix is a deletion, not a new rule: remove the inline declaration and
// the rule that was always there starts applying. 55 of the 56 had no focus
// indicator of any kind — 37 inputs, 6 selects, 4 textareas and 8 shared style
// objects — so tabbing through those pages moved nothing on screen.
//
// One consequence worth stating plainly: :focus-visible matches a text input
// on ANY focus, mouse included, because that is what the spec says for
// elements that expect keyboard input. So the 41 inputs and textareas now show
// the ring when clicked as well as when tabbed to. There is no way to give a
// keyboard user a ring on a text input without that; the alternative is the
// AA failure. Selects and buttons are unchanged on click.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { srcPath } from '@/__tests__/helpers/app-routes';
import { stripComments } from '@/__tests__/helpers/strip-comments';

const css = readFileSync(srcPath('app', 'globals.css'), 'utf8');

function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (!['node_modules', '__tests__'].includes(e.name)) walk(p); continue; }
      if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  };
  walk(join(process.cwd(), 'src'));
  return out;
}

describe('the ring exists', () => {
  it('is defined on :focus-visible, not on :focus', () => {
    // On :focus it would fire for mouse clicks on buttons too, which is the
    // reason everyone reaches for outline:none in the first place.
    const rule = /:focus-visible\s*\{([^}]*)\}/.exec(css);
    expect(rule, ':focus-visible rule missing').not.toBeNull();
    expect(rule![1]).toMatch(/outline:\s*2px solid/);
  });

  it('comes after @tailwind utilities, so outline-none does not beat it', () => {
    // Both are specificity (0,1,0). At equal specificity the later rule wins,
    // and that is the only thing keeping 223 Tailwind outline-none classes
    // from suppressing the ring.
    expect(css.indexOf('@tailwind utilities')).toBeGreaterThan(-1);
    expect(css.indexOf(':focus-visible')).toBeGreaterThan(css.indexOf('@tailwind utilities'));
  });

  it('does not rely on !important', () => {
    // If it ever needs !important to work, something is overriding it inline
    // again and the test below has stopped doing its job.
    const rule = /:focus-visible\s*\{([^}]*)\}/.exec(css)!;
    expect(rule[1]).not.toMatch(/!important/);
  });
});

describe('nothing defeats it inline', () => {
  it('has no inline outline:none anywhere', () => {
    // An inline declaration beats a stylesheet rule, so this is the one form
    // of outline suppression that actually removes the focus ring.
    const offenders: string[] = [];
    for (const f of sources()) {
      stripComments(readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
        if (/outline:\s*['"`]none['"`]/.test(line)) {
          offenders.push(`${relative(process.cwd(), f).replace(/\\/g, '/')}:${i + 1}`);
        }
      });
    }
    expect(
      offenders,
      'inline outline:none beats the :focus-visible rule — drop it and the ring returns',
    ).toEqual([]);
  });

  it('still allows the Tailwind class, which is harmless', () => {
    // Guards against someone "fixing" this by banning outline-none too. It
    // loses to the later :focus-visible rule and is used 200+ times.
    const uses = sources().reduce(
      (n, f) => n + (readFileSync(f, 'utf8').match(/\boutline-none\b/g) ?? []).length, 0);
    expect(uses).toBeGreaterThan(100);
  });
});
