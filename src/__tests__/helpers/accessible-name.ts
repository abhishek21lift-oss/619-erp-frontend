// Does every form control have an accessible name?
//
// A <label> only labels something if it WRAPS it or its htmlFor matches the
// control's id. A caption rendered beside a control associates with nothing —
// a screen reader announces the field with no name at all, which is WCAG 4.1.2
// (Level A).
//
// The catch, and the reason this walks the AST instead of grepping: the
// wrapping almost always happens one component boundary away.
// `<Field label="Plan"><select …/></Field>` is correct if and only if Field
// renders `<label>{children}</label>`. A scan that cannot follow that boundary
// reports the entire app as nameless — the first version of this said 242, the
// version that resolved same-file wrappers said 97, and this one, which
// resolves imports too, says 61. Only the last number is worth acting on.

import ts from 'typescript';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve as resolvePath } from 'node:path';

const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', '__tests__'].includes(e.name)) sourceFiles(p, out);
      continue;
    }
    if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

const parse = (f: string) =>
  ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/**
 * Components that label their children by id through context.
 *
 * FormField renders `<label htmlFor={id}>` and `{children}` as siblings, and
 * hands the same id to whatever control is inside via a context provider. The
 * children are labelled, but neither of the two patterns above can see it: the
 * label does not wrap them, and the id is not a prop the call site passes.
 *
 * Detected structurally rather than by name — a component that renders a
 * `<label htmlFor>`, renders `{children}`, AND provides a context. All three
 * together are specific to this wiring; any two of them are not.
 */
function contextLabelWrappersIn(sf: ts.SourceFile): Set<string> {
  const out = new Set<string>();
  const find = (n: ts.Node) => {
    const fn = ts.isFunctionDeclaration(n) ? n
      : (ts.isVariableDeclaration(n) && n.initializer
        && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)))
        ? n.initializer : null;
    const name = ts.isFunctionDeclaration(n) ? n.name?.getText()
      : (fn && ts.isVariableDeclaration(n)) ? n.name.getText() : null;
    if (fn && name && /^[A-Z]/.test(name)) {
      let hasLabelFor = false, hasChildren = false, hasProvider = false;
      const scan = (x: ts.Node) => {
        if (ts.isJsxAttribute(x) && x.name.getText() === 'htmlFor') hasLabelFor = true;
        if (ts.isJsxExpression(x) && x.expression && x.expression.getText() === 'children') hasChildren = true;
        const o = ts.isJsxElement(x) ? x.openingElement : ts.isJsxSelfClosingElement(x) ? x : null;
        if (o && /\.Provider$/.test(o.tagName.getText())) hasProvider = true;
        x.forEachChild(scan);
      };
      scan(fn);
      if (hasLabelFor && hasChildren && hasProvider) out.add(name);
    }
    n.forEachChild(find);
  };
  find(sf);
  return out;
}

/** Components in a file whose JSX puts {children} inside a <label>. */
function wrappersIn(sf: ts.SourceFile): Set<string> {
  const out = new Set<string>();
  const find = (n: ts.Node) => {
    const fn = ts.isFunctionDeclaration(n) ? n
      : (ts.isVariableDeclaration(n) && n.initializer
        && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)))
        ? n.initializer : null;
    const name = ts.isFunctionDeclaration(n) ? n.name?.getText()
      : (fn && ts.isVariableDeclaration(n)) ? n.name.getText() : null;
    if (fn && name && /^[A-Z]/.test(name)) {
      let ok = false;
      const scan = (x: ts.Node, inLabel: boolean) => {
        const o = ts.isJsxElement(x) ? x.openingElement
          : ts.isJsxSelfClosingElement(x) ? x : null;
        const isLabel = !!o && o.tagName.getText() === 'label';
        if (inLabel && ts.isJsxExpression(x) && x.expression
          && /\bchildren\b/.test(x.expression.getText())) ok = true;
        x.forEachChild((c) => scan(c, inLabel || isLabel));
      };
      scan(fn, false);
      if (ok) out.add(name);
    }
    n.forEachChild(find);
  };
  find(sf);
  return out;
}

/**
 * Components that label by ID rather than by wrapping: they take an `id` prop
 * and render `<label htmlFor={id}>` beside {children}, so
 * `<Field id="gst-percent"><input id="gst-percent"/></Field>` is correctly
 * associated even though nothing here nests.
 *
 * Without this the audit called payment-settings' two inputs nameless when
 * they were the best-labelled controls in the app — the same
 * one-component-boundary blind spot that made the first version of this file
 * report 242.
 */
function idLabelWrappersIn(sf: ts.SourceFile): Set<string> {
  const out = new Set<string>();
  const find = (n: ts.Node) => {
    const fn = ts.isFunctionDeclaration(n) ? n
      : (ts.isVariableDeclaration(n) && n.initializer
        && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)))
        ? n.initializer : null;
    const name = ts.isFunctionDeclaration(n) ? n.name?.getText()
      : (fn && ts.isVariableDeclaration(n)) ? n.name.getText() : null;
    if (fn && name && /^[A-Z]/.test(name)) {
      // htmlFor={id} where `id` is one of this component's own props — not
      // htmlFor="literal" (names one fixed control, not whatever is passed
      // in) and not htmlFor={`x-${row.id}`} (a local, so the component is
      // labelling something it renders itself). Without the props check every
      // page that labels a mapped row registers as a wrapper, and then any
      // `id` prop anywhere would silently count as a label.
      const props = new Set<string>();
      for (const p of fn.parameters) {
        if (ts.isObjectBindingPattern(p.name)) {
          for (const el of p.name.elements) props.add(el.name.getText());
        }
      }
      let ok = false;
      const scan = (x: ts.Node) => {
        if (ts.isJsxAttribute(x) && x.name.getText() === 'htmlFor'
          && x.initializer && ts.isJsxExpression(x.initializer)
          && x.initializer.expression && ts.isIdentifier(x.initializer.expression)
          && props.has(x.initializer.expression.getText())) ok = true;
        x.forEachChild(scan);
      };
      scan(fn);
      if (ok) out.add(name);
    }
    n.forEachChild(find);
  };
  find(sf);
  return out;
}

/** '@/components/x' or './x' → the .tsx on disk. */
function resolveModule(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolvePath(dirname(fromFile), spec);
  else return null;
  for (const c of [`${base}.tsx`, join(base, 'index.tsx')]) if (existsSync(c)) return c;
  return null;
}

/**
 * Does this control take its id and ARIA from the enclosing FormField?
 *
 * `{...fieldControlProps(w)}` puts id, aria-describedby, aria-invalid,
 * required, disabled and readOnly on the element at runtime, so none of them
 * appear in this file's JSX and every other route here reports it as nameless.
 * The association is proved by rendering, in form-field.test.tsx; this only
 * has to stop the static scan calling it a failure.
 */
function wiredControl(open: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
  return open.attributes.properties.some(
    (p) => ts.isJsxSpreadAttribute(p) && /\bfieldControlProps\s*\(/.test(p.expression.getText()),
  );
}

const CONTROLS = new Set(['input', 'select', 'textarea']);
const NAMED = ['aria-label', 'aria-labelledby', 'title'];
/** Controls that take their name from their own value or need none. */
const SELF_NAMING = new Set(['hidden', 'submit', 'reset', 'button', 'image']);

export interface NameAudit {
  total: number;
  aria: number;
  wrapped: number;
  htmlFor: number;
  /**
   * Named by the enclosing FormField, which hands the control its id through
   * context. The control spreads fieldControlProps(useFieldWiring()), so the
   * id and aria-describedby arrive at runtime rather than appearing in this
   * file's JSX. FormField's own tests prove the association renders.
   */
  wired: number;
  /** A name per the accname spec, but one that vanishes the moment you type. */
  placeholderOnly: string[];
  /** No accessible name by any route. WCAG 4.1.2 failures. */
  nameless: string[];
  filesScanned: number;
}

export function auditAccessibleNames(): NameAudit {
  const files = sourceFiles(SRC);
  const asts = new Map(files.map((f) => [f, parse(f)] as const));
  const wrapperExports = new Map<string, Set<string>>();
  const idWrapperExports = new Map<string, Set<string>>();
  for (const [f, sf] of asts) {
    // A context-labelling wrapper labels its children, same as a wrapping one,
    // so it joins the same set.
    wrapperExports.set(f, new Set([...wrappersIn(sf), ...contextLabelWrappersIn(sf)]));
    idWrapperExports.set(f, idLabelWrappersIn(sf));
  }

  const audit: NameAudit = {
    total: 0, aria: 0, wrapped: 0, htmlFor: 0, wired: 0,
    placeholderOnly: [], nameless: [], filesScanned: files.length,
  };

  for (const [f, sf] of asts) {
    const rel = relative(process.cwd(), f).replace(/\\/g, '/');
    const wrappers = new Set(wrapperExports.get(f));
    const idWrappers = new Set(idWrapperExports.get(f));

    const imports = (n: ts.Node) => {
      if (ts.isImportDeclaration(n) && n.importClause?.namedBindings
        && ts.isNamedImports(n.importClause.namedBindings)
        && ts.isStringLiteral(n.moduleSpecifier)) {
        const mod = resolveModule(n.moduleSpecifier.text, f);
        for (const [exported, into] of [
          [mod ? wrapperExports.get(mod) : null, wrappers],
          [mod ? idWrapperExports.get(mod) : null, idWrappers],
        ] as const) {
          if (!exported) continue;
          for (const el of n.importClause.namedBindings.elements) {
            if (exported.has((el.propertyName ?? el.name).getText())) into.add(el.name.getText());
          }
        }
      }
      n.forEachChild(imports);
    };
    imports(sf);

    // Every id some <label htmlFor> in this file points at. File-wide rather
    // than scoped to the label's subtree, deliberately: htmlFor associates by
    // document id, not by nesting, so the label may live anywhere.
    const fors = new Set<string>();
    const collect = (n: ts.Node) => {
      if (ts.isJsxAttribute(n) && n.name.getText() === 'htmlFor' && n.initializer) {
        fors.add(n.initializer.getText());
      }
      // <Field id="gst-percent"> — the label is rendered inside Field, which
      // this file never sees, so the id prop stands in for the htmlFor.
      const open = ts.isJsxElement(n) ? n.openingElement
        : ts.isJsxSelfClosingElement(n) ? n : null;
      if (open && idWrappers.has(open.tagName.getText())) {
        for (const attr of open.attributes.properties) {
          if (ts.isJsxAttribute(attr) && attr.name.getText() === 'id' && attr.initializer) {
            fors.add(attr.initializer.getText());
          }
        }
      }
      n.forEachChild(collect);
    };
    collect(sf);

    const visit = (n: ts.Node, depth: number) => {
      const open = ts.isJsxElement(n) ? n.openingElement
        : ts.isJsxSelfClosingElement(n) ? n : null;
      let next = depth;
      if (open) {
        const tag = open.tagName.getText();
        const a = Object.fromEntries(open.attributes.properties
          .filter(ts.isJsxAttribute).map((x) => [x.name.getText(), x] as const));
        if (tag === 'label' || wrappers.has(tag)) next = depth + 1;
        if (CONTROLS.has(tag)) {
          const t = a.type?.initializer;
          const typeText = t && ts.isStringLiteral(t) ? t.text : '';
          if (!SELF_NAMING.has(typeText)) {
            audit.total++;
            const line = sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1;
            const at = `${rel}:${line}`;
            if (NAMED.some((k) => k in a)) audit.aria++;
            else if (depth > 0) audit.wrapped++;
            else if (wiredControl(open)) audit.wired++;
            else if (a.id?.initializer && fors.has(a.id.initializer.getText())) audit.htmlFor++;
            else if ('placeholder' in a) audit.placeholderOnly.push(at);
            else audit.nameless.push(at);
          }
        }
      }
      n.forEachChild((c) => visit(c, next));
    };
    visit(sf, 0);
  }

  return audit;
}
