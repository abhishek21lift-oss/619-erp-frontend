// Stops the form landscape drifting back to what the audit found.
//
// FORM-SYSTEM.md counted eighteen components that render a control, seventeen
// of which skipped the label wiring, and FloatInput implemented three times.
// The system only helps if the next form uses it, so these are the rules that
// make not using it visible.

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ts from 'typescript';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Slider } from '@/components/ui/Slider';
import { FloatInput } from '@/components/ui/FloatInput';
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

  it('has exactly one FloatInput implementation', () => {
    // It was three: components/ui plus a 49-line copy in settings/page and a
    // 56-line copy in settings/profile. Both copies were called with only
    // label, type, value, onChange and suffix — their required, disabled,
    // multiline and placeholder branches were dead — so the shared component
    // already supported every prop in use. What differed was the accent: gold
    // in the 39 PT-OS assessment files, brand blue in Settings. That is now a
    // `tone`, not a component.
    const defs: string[] = [];
    for (const f of sources()) {
      const src = readFileSync(f, 'utf8');
      if (/^function FloatInput\(|export function FloatInput\(/m.test(src)) defs.push(rel(f));
    }
    expect(defs).toEqual(['src/components/ui/FloatInput.tsx']);
  });

  it('keeps each Settings screen on the tone it already had', () => {
    // Deduplication, not a redesign. Both screens focus to brand blue, and
    // profile small-caps its lifted caption while the account screen does not
    // — preserved rather than reconciled, because reconciling them is a design
    // decision and this was not one.
    const account = readFileSync(join(SRC, 'app/(chrome)/settings/page.tsx'), 'utf8');
    const profile = readFileSync(join(SRC, 'app/(chrome)/settings/profile/page.tsx'), 'utf8');
    expect(account.match(/<FloatInput tone="brand"/g) ?? []).toHaveLength(6);
    expect(account).not.toMatch(/upperLifted/);
    expect(profile.match(/<FloatInput tone="brand" upperLifted/g) ?? []).toHaveLength(10);
  });

  it('leaves the assessment screens on gold, which is the default', () => {
    // 39 files import the shared FloatInput and pass no tone. If the default
    // ever flipped, every PT-OS assessment would change accent at once.
    const src = readFileSync(join(SRC, 'components/ui/FloatInput.tsx'), 'utf8');
    expect(src).toMatch(/tone = 'gold'/);
    const enroll = readFileSync(join(SRC, 'app/(chrome)/pt-os/clients/[id]/enroll/page.tsx'), 'utf8');
    expect(enroll).toMatch(/<FloatInput/);
    expect(enroll).not.toMatch(/tone=/);
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
          // A label with no htmlFor is fine when it WRAPS its control — either
          // literally, or as {children} in a Field-style wrapper, which is the
          // pattern nine components in this app already use. Counting the
          // second kind as a failure was the scanner's own bug: it reported
          // the wrappers that had been fixed precisely to wrap.
          const inner = ts.isJsxElement(n) ? n.getText() : '';
          const wraps = /<(input|select|textarea)\b/.test(inner) || /\{\s*children\s*\}/.test(inner);
          if (!attrs.includes('htmlFor') && !wraps) {
            offenders.push(`${rel(f)}:${sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1}`);
          }
        }
        n.forEachChild(walk);
      };
      walk(sf);
    }
    // Zero, and an invariant rather than a ratchet. Every remaining site was
    // audited individually and resolved one of three ways — associated with
    // htmlFor, turned into a group caption with role="group", or turned into a
    // plain caption where it never named a control at all.
    expect(offenders, `unassociated <label>s:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('the label audit, resolved case by case', () => {
  const audit = auditAccessibleNames();

  // 24 sites, each looked at individually rather than swept. Nine were the
  // scanner's own fault — Field-style wrappers that put {children} inside the
  // <label>, which IS an association; the scanner only recognised a literal
  // control tag. That was fixed above rather than in those nine files.
  //
  // The other fifteen split three ways by what the caption actually names.

  it('associates the captions that sit beside a real control', () => {
    // This list shrinks as screens move onto the universal form platform, and
    // that is the list working rather than the property lapsing. A migrated
    // field renders through FormField (or its soft-surface twin), which
    // GENERATES the id and points its own <label htmlFor> at it — so the
    // association holds by construction instead of by two hand-written strings
    // continuing to agree. Re-adding a hand-written id after a migration would
    // assert a property the component no longer has.
    //
    // Already retired this way: `fp-email` (forgot-password), `rp-password`
    // and `rp-confirm` (reset-password), `pay-ref` (Record Payment),
    // `leave-reason` (the leave request form, now a TextAreaField — the
    // reject-note textarea beside it is still raw, so it stays below).
    //
    // The property itself is still covered, and more strictly:
    // label-association.test.ts asserts that NO control in the app is
    // nameless, with no per-file list to fall out of date.
    const associated: [string, string][] = [
      ['app/(chrome)/ai-coach/knowledge/page.tsx', 'kb-title'],
      ['app/(chrome)/pt-os/clients/[id]/edit/page.tsx', 'delete-confirm'],
      ['app/(chrome)/trainers/leave/page.tsx', 'leave-reject-note'],
    ];
    for (const [file, id] of associated) {
      const src = readFileSync(join(SRC, ...file.split('/')), 'utf8');
      expect(src, `${file}: no label for ${id}`).toMatch(new RegExp(`htmlFor="${id}"`));
      expect(src, `${file}: no control with id ${id}`).toMatch(new RegExp(`id="${id}"`));
    }
  });

  it('no longer needs a per-row id for the invoice fields', () => {
    // The Create Invoice modal used to render its four fields from a map, so a
    // fixed id would have put the same id on four inputs and pointed every
    // label at the first. The per-row `inv-${key}` id solved that.
    //
    // The map is gone: each field is now its own <TextField>/<NumberField>/
    // <DateFieldControl>, and FormField calls useId() per instance — so the
    // collision this guarded against is not merely avoided, it is no longer
    // expressible. Asserting the old template string would be asserting a
    // property the component deliberately no longer has.
    const src = readFileSync(join(SRC, 'app/(chrome)/finance/invoices/page.tsx'), 'utf8');
    expect(src).not.toMatch(/htmlFor=\{`inv-\$\{key\}`\}/);
    expect(src).toMatch(/<form\.Field name="memberName">/);
    // And the real invariant still holds for this screen.
    expect(audit.nameless.filter((x) => x.includes('finance/invoices'))).toEqual([]);
  });

  it('turns the four button-group captions into groups, not labels', () => {
    // "Analysis Period", "Category", "Status" and the member picker caption a
    // ROW OF BUTTONS or a composite. A <label> cannot name those — label only
    // associates with a form control — so each becomes a <span> with an id and
    // the container carries role="group" aria-labelledby. Both elements are
    // inline with the same classes, so nothing moves.
    const groups: [string, string][] = [
      ['app/(chrome)/ai/business-insights/page.tsx', 'analysis-period-label'],
      ['app/(chrome)/ai-coach/knowledge/page.tsx', 'kb-category-label'],
      ['app/(chrome)/attendance/page.tsx', 'atd-member-label'],
      ['app/(chrome)/attendance/page.tsx', 'atd-status-label'],
    ];
    for (const [file, id] of groups) {
      const src = readFileSync(join(SRC, ...file.split('/')), 'utf8');
      expect(src, `${file}: no caption ${id}`).toMatch(new RegExp(`<span id="${id}"`));
      expect(src, `${file}: nothing labelled by ${id}`)
        .toMatch(new RegExp(`role="group" aria-labelledby="${id}"`));
      expect(src, `${file}: ${id} is still a label`).not.toMatch(new RegExp(`<label[^>]*>${id}`));
    }
  });

  it('demotes the one caption with no container to a plain span', () => {
    // verify-payments' "Member" caption sits directly above a conditional —
    // a chip once a member is picked, a search box before that — with no
    // single element to hang a role on. The search box already carries its own
    // name, so this is a caption and nothing more.
    const src = readFileSync(join(SRC, 'app/(chrome)/finance/verify-payments/page.tsx'), 'utf8');
    expect(src).toMatch(/<span className="mt-4 block text-\[12px\] font-\[650\]"/);
    expect(src).not.toMatch(/<label className="mt-4 block text-\[12px\] font-\[650\]"/);
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
    // Either layer of the same system. `@/components/ui` + FormField is the
    // first migration — markup only, state untouched. `@/components/ui/form` +
    // a bound field is the second — the same FormField underneath, with the
    // value coming from a schema-typed field instead of a useState string.
    // A form that has taken the second step must not fail a test written for
    // the first.
    expect(src).toMatch(/from '@\/components\/ui(\/form)?'/);
    expect(src).toMatch(/<(FormField|SearchField|TextField|NumberField|SelectField|TextAreaField)\b/);
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
      // Now on the second layer: the value comes from the field render prop
      // rather than from `form.session_count`, and the option list and the
      // `min` are the schema's. The property is the same one — the bindings
      // and the business rules survived the move — so the patterns describe
      // where they live now rather than where they used to.
      ['app/(chrome)/subscription/packages/page.tsx', [
        /<form\.Field name="session_count">/, /<form\.Field name="price">/,
        /<form\.Field name="duration_days">/, /ptPackageSchema/,
        /PACKAGE_GOAL_OPTIONS/, /toPtPackagePayload/,
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

describe('FloatInput tones', () => {
  it('labels its control in both tones', () => {
    const { unmount } = render(<FloatInput label="Full Name" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Full Name')).toBeInstanceOf(HTMLInputElement);
    unmount();
    render(<FloatInput label="Display Name" tone="brand" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Display Name')).toBeInstanceOf(HTMLInputElement);
  });

  it('keeps the caption visible once the field has a value', () => {
    // The reason this pattern is allowed to stay: the caption lifts, it does
    // not disappear. That is the rule the whole phase is about.
    render(<FloatInput label="Job title" value="Head Coach" onChange={() => {}} />);
    expect(screen.getByLabelText('Job title')).toHaveValue('Head Coach');
    expect(screen.getByText('Job title')).toBeVisible();
  });

  it('small-caps the lifted caption only when asked', () => {
    const { unmount } = render(<FloatInput label="Plain" value="x" onChange={() => {}} />);
    expect(screen.getByText('Plain').className).not.toMatch(/uppercase/);
    unmount();
    render(<FloatInput label="Capped" upperLifted value="x" onChange={() => {}} />);
    expect(screen.getByText('Capped').className).toMatch(/uppercase/);
  });

  it('still passes the caller onChange through', () => {
    let seen = '';
    render(<FloatInput label="Email" tone="brand" value="" onChange={(v) => { seen = v; }} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    expect(seen).toBe('a@b.com');
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

describe('FloatInput — the same contract, on the component 43 files use', () => {
  it('names the control from `label` when there is one', () => {
    render(<FloatInput label="Amount Paid" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Amount Paid')).toBeInTheDocument();
  });

  it('takes an explicit name when the caption is drawn by the caller', () => {
    // The enrolment screen draws its own caption row above four fields — the
    // money ones — so it can put the required asterisk in its own colour, and
    // passed label="". The <label> element still rendered, empty, so the field
    // had no accessible name: "Final / Selling Price" was on screen and the
    // control announced itself as blank. On the two inputs that decide what a
    // member is charged and what they have paid.
    render(<FloatInput label="" ariaLabel="Final / Selling Price" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Final / Selling Price')).toBeInTheDocument();
  });

  it('never carries two competing names', () => {
    // A visible label wins; ariaLabel is ignored rather than overriding what
    // the person can see. A control whose spoken name differs from its printed
    // one is worse than one with no name.
    render(<FloatInput label="Amount Paid" ariaLabel="Something else" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Amount Paid')).toBeInTheDocument();
    expect(screen.queryByLabelText('Something else')).toBeNull();
  });

  it('gives every call site a name one way or the other', () => {
    const bad: string[] = [];
    for (const f of sources()) {
      const src = readFileSync(f, 'utf8');
      // The prop can sit on its own line, so match the whole element rather
      // than a single line: `<FloatInput\n  label=""\n  numeric="decimal"`.
      for (const m of src.matchAll(/<FloatInput\b[\s\S]*?\/?>/g)) {
        const el = m[0];
        if (/label=""/.test(el) && !/ariaLabel=/.test(el)) {
          const line = src.slice(0, m.index).split('\n').length;
          bad.push(`${rel(f)}:${line}`);
        }
      }
    }
    expect(bad, `FloatInput with label="" and no ariaLabel:\n${bad.join('\n')}`).toEqual([]);
  });
});
