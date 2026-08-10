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
  // This was a ratchet pinned at 61 while the list was worked down. It is now
  // zero, so it is an invariant instead: every input, select and textarea in
  // the app has a name by one of the four routes the audit recognises.
  //
  // The 61 were fixed three ways, chosen per site rather than uniformly:
  //   · 30 already had a visible caption and only needed associating —
  //     htmlFor + id, which also makes clicking the caption focus the control
  //     (that matters most for the date and time pickers on a phone). Where
  //     the control is rendered per row, the id carries the row key.
  //   · 3 of those captions were a <p> or a <span>, which label nothing until
  //     they are a <label>; see the block test below.
  //   · 31 had no caption anywhere — filter selects, hidden file inputs,
  //     rename fields — and took an aria-label. Where the caption is already a
  //     prop (Slider, SelectRow, SelectInput, PortfolioSection) the name is
  //     that same prop, so WCAG 2.5.3 holds by construction rather than by two
  //     strings being kept in step by hand.
  it('is empty', () => {
    expect(audit.nameless, `unnamed control(s):\n${audit.nameless.join('\n')}`).toEqual([]);
  });

  it('is empty for the right reason', () => {
    // An audit that silently stopped finding controls would also report zero.
    // Every control must land in exactly one bin, and the bins must still add
    // up to the whole app.
    //
    // The floor is deliberately well below today's count and falls over time
    // BY DESIGN: a field migrated to FormField stops being a raw <input> in a
    // page and becomes a <TextInput>, counted once inside controls.tsx instead
    // of once per call site. Migration therefore shrinks `total`, and a tight
    // floor here would fail on every successful migration.
    expect(audit.total).toBeGreaterThan(250);
    expect(audit.aria + audit.wrapped + audit.htmlFor + audit.wired
      + audit.placeholderOnly.length + audit.nameless.length).toBe(audit.total);
  });

  it('recognises the form system rather than reporting it as broken', () => {
    // The controls inside TextInput/TextArea/SelectInput take their id and
    // aria-describedby from the enclosing FormField at runtime, so none of it
    // appears in the JSX and every other route here called them nameless.
    // form-field.test.tsx proves the association actually renders; this only
    // records that the static audit now understands the pattern.
    expect(audit.wired).toBeGreaterThan(0);
    expect(audit.nameless.filter((x) => x.includes('ui/form/'))).toEqual([]);
  });
});

describe('captions that had to become labels', () => {
  // A <p> is block, a <label> is inline. Swapping one for the other without
  // restoring the display would reflow the caption onto the control's line —
  // a visual change, which this work was explicitly not allowed to make.
  // globals.css resets every margin to 0, so `block` is the only thing that
  // has to be put back.
  const converted: [string, string][] = [
    ['app/(chrome)/pt-os/schedule-session/page.tsx', 'sess-date'],
    ['app/(chrome)/pt-os/schedule-session/page.tsx', 'sess-time'],
    ['app/(chrome)/pt-os/schedule-session/page.tsx', 'sess-duration'],
    ['app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page.tsx', 'wl-day'],
    ['app/(chrome)/settings/profile/page.tsx', 'coaching-since'],
  ];

  it.each(converted)('%s: the label for %s is still block-level', (file, id) => {
    const src = readFileSync(srcPath(...file.split('/')), 'utf8');
    const line = src.split('\n').find((l) => l.includes(`htmlFor="${id}"`));
    expect(line, `no label for ${id}`).toBeDefined();
    expect(line).toMatch(/className="[^"]*\bblock\b/);
  });
});

describe('labelling across a component boundary', () => {
  it('counts <Field id="x"><input id="x"/></Field> as named', () => {
    // payment-settings' Field renders <label htmlFor={id}> and its call sites
    // pass a matching id. The audit could not see through that, and reported
    // the two best-labelled inputs in the app as nameless — the same
    // one-boundary blind spot that made its first version report 242. Two of
    // the "61" were this, not a real failure.
    const src = readFileSync(srcPath('app', '(chrome)', 'finance', 'payment-settings', 'page.tsx'), 'utf8');
    expect(src).toMatch(/<label htmlFor=\{id\}/);
    expect(src).toMatch(/<Field id="gst-percent"/);
    expect(audit.nameless.filter((x) => x.includes('payment-settings'))).toEqual([]);
  });

  it('does not treat a page that labels a mapped row as such a wrapper', () => {
    // commissions labels its per-trainer inputs with htmlFor={`comm-pct-
    // ${t.id}`}. That is a local, not a prop, so the page must not register as
    // a label-by-id component — otherwise an `id` prop on anything anywhere
    // would start counting as a label and the audit would go quietly blind.
    const src = readFileSync(srcPath('app', '(chrome)', 'pt-os', 'commissions', 'page.tsx'), 'utf8');
    expect(src).toMatch(/htmlFor=\{`comm-pct-\$\{t\.id\}`\}/);
    expect(audit.total).toBeGreaterThan(250);
  });
});

describe('placeholder-as-label', () => {
  // The accname spec does accept a placeholder as a last-resort name, so these
  // are not 4.1.2 failures. They are still poor: the name disappears the moment
  // the field has content, which is exactly when someone re-reading the form
  // needs it. Tracked, not enforced — giving every one of them a visible label is a
  // design change, not a bug fix. 105 -> 88 -> 45 as forms and search
  // inputs migrated.
  it('is tracked, and has not spread', () => {
    expect(audit.placeholderOnly.length).toBeLessThanOrEqual(45);
  });
});
