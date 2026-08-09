// A caption is not a label unless it is attached to something.
//
// `<div><p>Amount</p><input/></div>` looks labelled and is not: a screen reader
// announces that field with no name at all. WCAG 4.1.2, Level A — the same
// severity as the keyboard failures fixed alongside this.
//
// Six wrapper components were the bulk of it. Each rendered its caption as a
// SIBLING of the control it named, and each is used across whole screens, so
// fixing the six moved 36 controls from nameless to properly named without
// touching a single call site:
//
//   platform/_shared/ui.tsx    Field       — a <p>, not even a <label>; this one
//                                            covered the platform payment and
//                                            org-admin forms
//   ai/diet-generator          Field
//   ai/workout-generator       Field
//   fitness/AiCoachPanel       Field
//   trainers/add               FloatLabel  — a floating caption painted over
//   trainers/[id]/edit         FloatLabel    the input
//
// The measurement matters as much as the fix, and it took three attempts to
// get honest: a scan that cannot follow a component boundary calls
// `<Field label="Plan"><select/></Field>` nameless. Counting only same-file
// wrappers said 97 remained; resolving imports too says 61. See
// helpers/accessible-name.ts.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { auditAccessibleNames } from '@/__tests__/helpers/accessible-name';
import { srcPath } from '@/__tests__/helpers/app-routes';

const audit = auditAccessibleNames();

describe('the accessible-name audit itself', () => {
  it('scanned the app', () => {
    expect(audit.filesScanned).toBeGreaterThan(200);
    expect(audit.total).toBeGreaterThan(300);
  });

  it('counts a wrapped control as named, across a component boundary', () => {
    // The property the whole number depends on. Without it the audit reports
    // every <Field>-wrapped input in the app as a failure.
    expect(audit.wrapped).toBeGreaterThan(150);
  });
});

describe('the label wrappers wrap', () => {
  const wrappers: [string, string[]][] = [
    ['app/(chrome)/platform/_shared/ui.tsx', ['export function Field']],
    ['app/(chrome)/ai/diet-generator/page.tsx', ['function Field']],
    ['app/(chrome)/ai/workout-generator/page.tsx', ['function Field']],
    ['components/fitness/AiCoachPanel.tsx', ['function Field']],
    ['app/(chrome)/trainers/add/page.tsx', ['function FloatLabel']],
    ['app/(chrome)/trainers/[id]/edit/page.tsx', ['function FloatLabel']],
  ];

  it.each(wrappers)('%s renders a <label> around its children', (file, [marker]) => {
    const src = readFileSync(srcPath(...file.split('/')), 'utf8');
    const at = src.indexOf(marker);
    expect(at, `${marker} not found — did it move?`).toBeGreaterThan(-1);
    // The component BODY. Naively brace-matching from `at` finds the
    // destructured parameter list — `({ label, children })` — and closes on
    // its brace, leaving a body of one line. So: walk the parameter parens
    // first, then brace-match from the `{` that follows them.
    let i = src.indexOf('(', at);
    let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')' && --depth === 0) break;
    }
    let end = src.length;
    depth = 0;
    for (i = src.indexOf('{', i); i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) { end = i; break; }
    }
    const body = src.slice(at, end);
    expect(body.split('\n').length, 'body looks truncated').toBeGreaterThan(3);
    expect(body).toMatch(/<label\b/);
    // …and {children} must be inside it, not after it.
    const labelOpen = body.indexOf('<label');
    const labelClose = body.lastIndexOf('</label>');
    const children = body.indexOf('{children}');
    expect(children).toBeGreaterThan(labelOpen);
    expect(children).toBeLessThan(labelClose);
  });
});

describe('controls with no accessible name', () => {
  // A ratchet, deliberately. 61 controls still have no name by any route, and
  // each needs a human decision about what to call it — there is no mechanical
  // answer to "what is this number input for". Pinning the count stops the
  // number growing while it is worked down, and the test fails either way: add
  // one and it breaks, fix one and it breaks asking you to lower the bar.
  //
  // Not a licence to leave them. Every one of these is a Level A failure for
  // somebody using a screen reader.
  const KNOWN = 61;

  it(`is ${KNOWN} — and not one more`, () => {
    expect(
      audit.nameless.length,
      audit.nameless.length > KNOWN
        ? `new unnamed control(s):\n${audit.nameless.slice(KNOWN).join('\n')}`
        : 'fixed some — lower KNOWN to match',
    ).toBe(KNOWN);
  });

  it('reports where they are, so the list is actionable', () => {
    // Guards against the count being right for the wrong reason.
    expect(audit.nameless.every((x) => /^src\/.+:\d+$/.test(x))).toBe(true);
  });
});

describe('placeholder-as-label', () => {
  // The accname spec does accept a placeholder as a last-resort name, so these
  // are not 4.1.2 failures. They are still poor: the name disappears the moment
  // the field has content, which is exactly when someone re-reading the form
  // needs it. Tracked, not enforced — giving 109 fields visible labels is a
  // design change, not a bug fix.
  it('is tracked, and has not spread', () => {
    expect(audit.placeholderOnly.length).toBeLessThanOrEqual(109);
  });
});
