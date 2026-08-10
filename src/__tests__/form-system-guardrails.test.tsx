// Stops the form landscape drifting back to what the audit found.
//
// FORM-SYSTEM.md counted eighteen components that render a control, seventeen
// of which skipped the label wiring, and FloatInput implemented three times.
// The system only helps if the next form uses it, so these are the rules that
// make not using it visible.

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ts from 'typescript';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Slider } from '@/components/ui/Slider';
import { auditAccessibleNames } from '@/__tests__/helpers/accessible-name';

const SRC = join(process.cwd(), 'src');

function sources(dir = SRC, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '__tests__'].includes(e.name)) sources(p, out); continue; }
    if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

const rel = (f: string) => relative(process.cwd(), f).replace(/\\/g, '/');

describe('one form system, not eighteen', () => {
  it('exports FormField and its controls from the design system barrel', () => {
    const barrel = readFileSync(join(SRC, 'components/ui/index.ts'), 'utf8');
    for (const name of ['FormField', 'TextInput', 'TextArea', 'SelectInput', 'SearchField']) {
      expect(barrel, `${name} not exported from @/components/ui`).toContain(name);
    }
  });

  it('has exactly one FormField implementation', () => {
    // The failure mode this replaces: FloatInput existed in components/ui AND
    // again, differently, in settings/page.tsx and settings/profile/page.tsx.
    const defs: string[] = [];
    for (const f of sources()) {
      const src = readFileSync(f, 'utf8');
      if (/(export\s+)?function\s+FormField\b|const\s+FormField\s*[:=]/.test(src)) defs.push(rel(f));
    }
    expect(defs).toEqual(['src/components/ui/form/FormField.tsx']);
  });

  it('has no second search-input component', () => {
    // components/ui/SearchInput.tsx was a second search implementation with
    // zero call sites and an unlabelled clear button. It is gone; SearchField
    // is the one.
    expect(existsSync(join(SRC, 'components/ui/SearchInput.tsx'))).toBe(false);
  });
});

describe('a control next to a label must be joined to it', () => {
  // The single most common defect in the audit: a caption rendered as a
  // SIBLING of the control it names, which associates with nothing. This
  // catches the shape at its source — a component that renders both a <label>
  // with no htmlFor and a native control.
  it('has no field wrapper rendering an unassociated label', () => {
    const offenders: string[] = [];
    for (const f of sources()) {
      const src = readFileSync(f, 'utf8');
      const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const walk = (n: ts.Node) => {
        const open = ts.isJsxElement(n) ? n.openingElement
          : ts.isJsxSelfClosingElement(n) ? n : null;
        if (open && open.tagName.getText() === 'label') {
          const attrs = open.attributes.properties.filter(ts.isJsxAttribute).map((a) => a.name.getText());
          // A label with no htmlFor is fine when it WRAPS its control.
          const wraps = ts.isJsxElement(n) && /<(input|select|textarea)\b/.test(n.getText());
          if (!attrs.includes('htmlFor') && !wraps) {
            offenders.push(`${rel(f)}:${sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1}`);
          }
        }
        n.forEachChild(walk);
      };
      walk(sf);
    }
    // A ratchet at the measured count, not a round number with slack in it.
    // These are pre-existing and each needs a per-site decision about which
    // control it names. It may fall, never rise.
    expect(offenders.length, `unassociated <label>s:\n${offenders.join('\n')}`)
      .toBeLessThanOrEqual(29);
  });
});

describe('placeholder-as-label only ever decreases', () => {
  const audit = auditAccessibleNames();

  it('is at or below the count recorded when the system landed', () => {
    // 105 when this phase started, 88 after the five representative forms,
    // 45 once the search inputs took real names. Lower it as fields migrate,
    // never raise it.
    expect(audit.placeholderOnly.length).toBeLessThanOrEqual(45);
  });

  it('still has nothing without a name at all', () => {
    expect(audit.nameless).toEqual([]);
  });
});

describe('search and command inputs', () => {
  const audit = auditAccessibleNames();

  it('none of them is named only by its placeholder', () => {
    // 43 search inputs took a name that survives typing. They kept their own
    // magnifier, container, focus styling and — for the palettes — their
    // combobox semantics and key handling, because dropping SearchField in
    // would have added a second icon and replaced chrome that had to be
    // preserved. So the treatment was applied as an attribute, not a
    // component: aria-label, which is the case the accname spec reserves for a
    // control with no visible text label.
    const stragglers = audit.placeholderOnly.filter((at) => {
      const [file, line] = [at.slice(0, at.lastIndexOf(':')), +at.slice(at.lastIndexOf(':') + 1)];
      const src = readFileSync(join(process.cwd(), file), 'utf8').split('\n');
      const blob = src.slice(line - 1, line + 12).join('\n');
      return /placeholder=(["'`{])\s*(Search|Filter|Find)/i.test(blob);
    });
    expect(stragglers, `search input named only by placeholder:\n${stragglers.join('\n')}`)
      .toEqual([]);
  });

  it('has no JSX attribute containing a literal unicode escape', () => {
    // finance/invoices had placeholder="Search invoices…". A JSX
    // attribute string is literal — there is no escape processing — so that
    // rendered the seven characters on screen. It had been there since the
    // field was written and only became visible when a codemod copied the
    // placeholder into a name. String and template literals in JS are a
    // different matter and are left alone.
    const offenders: string[] = [];
    for (const f of sources()) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/(?:placeholder|aria-label|title|alt)="[^"]*\\u[0-9a-fA-F]{4}/.test(line)) {
          offenders.push(`${rel(f)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe('the five representative migrations', () => {
  // One form per area, migrated before the remaining fields, so the system is
  // proved on real forms rather than on a demo. Each entry: the route, and the
  // captions that used to live in a placeholder and now live in a label.
  const migrated: [string, string[]][] = [
    ['app/(chrome)/pt-os/weekly-checkin/page.tsx',
      ['Client', 'Week starting', 'Weight', 'Sleep', 'Water', 'Workouts', 'Adherence', 'Trainer notes']],
    ['app/(chrome)/subscription/packages/page.tsx',
      ['Package name', 'Sessions', 'Duration', 'Price', 'Goal type', 'Description']],
    ['app/(chrome)/pt-os/session-balance/page.tsx',
      ['Client', 'Total sessions', 'Package name', 'Valid until']],
    ['app/(chrome)/settings/branches/page.tsx', ['Branch Name', 'Location']],
    ['app/(chrome)/attendance/page.tsx', ['Search member']],
  ];

  it.each(migrated)('%s uses the system', (file) => {
    const src = readFileSync(join(SRC, ...file.split('/')), 'utf8');
    expect(src).toMatch(/from '@\/components\/ui'/);
    expect(src).toMatch(/<(FormField|SearchField)\b/);
  });

  it.each(migrated)('%s gives every migrated field a persistent label', (file, labels) => {
    const src = readFileSync(join(SRC, ...file.split('/')), 'utf8');
    for (const label of labels) {
      expect(src, `no label "${label}"`).toMatch(new RegExp(`label="${label}"`));
    }
  });

  it('kept the business logic on every one of them', () => {
    // The migration moves markup only. If a value binding or a submit handler
    // went missing the form would still render, and still look right.
    const checks: [string, RegExp[]][] = [
      ['app/(chrome)/pt-os/weekly-checkin/page.tsx', [
        /onSubmit=\{handleSubmit\}/, /value=\{weight\}/, /setWeight\(e\.target\.value\)/,
        /value=\{adherencePct\}/, /value=\{trainerNotes\}/, /step="0\.5"/,
      ]],
      ['app/(chrome)/subscription/packages/page.tsx', [
        /value=\{form\.session_count\}/, /value=\{form\.price\}/, /min=\{0\}/, /GOAL_TYPES\.map/,
      ]],
      ['app/(chrome)/pt-os/session-balance/page.tsx', [
        /onSubmit=\{handleCreate\}/, /value=\{totalSessions\}/, /value=\{endDate\}/,
      ]],
      ['app/(chrome)/settings/branches/page.tsx', [
        /onSubmit=\{addBranch\}/, /value=\{form\.name\}/, /value=\{form\.location\}/,
      ]],
      ['app/(chrome)/attendance/page.tsx', [/value=\{query\}/, /setQuery\(e\.target\.value\)/]],
    ];
    for (const [file, patterns] of checks) {
      const src = readFileSync(join(SRC, ...file.split('/')), 'utf8');
      for (const p of patterns) expect(src, `${file} lost ${p}`).toMatch(p);
    }
  });

  it('gives the numeric fields the right mobile keyboard', () => {
    // type="number" gets a numeric keypad; inputMode decides whether it has a
    // decimal point. Weight and sleep take halves, glasses and workouts do not.
    const src = readFileSync(join(SRC, 'app/(chrome)/pt-os/weekly-checkin/page.tsx'), 'utf8');
    expect((src.match(/inputMode="decimal"/g) ?? []).length).toBe(2);
    expect((src.match(/inputMode="numeric"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('Slider', () => {
  it('associates its visible caption with the track', () => {
    render(<Slider label="Pain Scale" value={5} min={1} max={10} onChange={() => {}} />);
    const input = screen.getByLabelText('Pain Scale');
    expect(input).toHaveAttribute('type', 'range');
    // Named by a <label>, not by an aria-label bolted alongside it.
    expect(input.getAttribute('aria-label')).toBeNull();
  });

  it('takes an explicit name when the caption is drawn by the caller', () => {
    // Three assessment steps draw their own caption row so they can put a
    // face, an emoji or a status dot beside it, and passed label="". That made
    // aria-label="" — an empty string, which is no accessible name at all.
    render(<Slider label="" ariaLabel="Stress Level" value={5} min={1} max={10} onChange={() => {}} />);
    expect(screen.getByLabelText('Stress Level')).toHaveAttribute('type', 'range');
  });

  it('never renders an empty aria-label', () => {
    // An aria-label="" is not "no aria-label" — it is a name of zero
    // characters, which wins over every other route and leaves the control
    // anonymous. Comments are stripped first: the comment in Slider.tsx
    // explaining this failure contains the string it is looking for.
    const offenders: string[] = [];
    for (const f of sources()) {
      const src = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      if (/aria-label=""|aria-label=\{''\}|aria-label=\{""\}/.test(src)) offenders.push(rel(f));
    }
    expect(offenders).toEqual([]);
  });

  it('gives every call site a name one way or the other', () => {
    const bad: string[] = [];
    for (const f of sources()) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/<Slider\b/.test(line) && /label=""/.test(line) && !/ariaLabel=/.test(line)) {
          bad.push(`${rel(f)}:${i + 1}`);
        }
      });
    }
    expect(bad, `Slider with label="" and no ariaLabel:\n${bad.join('\n')}`).toEqual([]);
  });
});
