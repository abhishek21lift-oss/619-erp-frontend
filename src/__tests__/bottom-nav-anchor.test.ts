// The bottom nav sits on the physical bottom edge, and nothing may move it.
//
// Two attempts were made at being cleverer than `bottom: 0`, and both shipped
// a bug. Both lived in useVisualViewportAnchor, which measured
// window.innerHeight against visualViewport and offset the bar by the
// difference:
//
//   1. The symmetric clamp LIFTED the bar whenever the visible area ended
//      above bottom: 0 — which is the normal state of mobile Safari, because
//      the bottom toolbar overlays the layout viewport. The nav floated
//      mid-page, at a different height per route and per scroll position.
//
//   2. Fixing the sign left the other half: a NEGATIVE reading pushed the bar
//      DOWN. visualViewport.offsetTop goes positive during rubber-band
//      overscroll and the toolbar transition, so at the absolute bottom of a
//      document the nav slid below the viewport and half-vanished. Confirmed
//      on a physical iPhone, which is the only place either bug was visible.
//
// The premise was wrong, not the arithmetic. visualViewport's geometry moves
// for toolbar collapse, rubber-band and pinch — none of which should move
// application chrome. The hook is gone. `bottom: 0` is the whole mechanism,
// and useViewportDesyncFix still handles the iOS desync the honest way, by
// re-asserting the DOCUMENT's scroll position rather than repositioning an
// element.
//
// See BOTTOM-NAV.md.

import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { srcPath } from '@/__tests__/helpers/app-routes';

const css = readFileSync(srcPath('app', 'globals.css'), 'utf8');
const shell = readFileSync(srcPath('components', 'AppShell.tsx'), 'utf8');
const nav = readFileSync(srcPath('components', 'MobileBottomNav.tsx'), 'utf8');

/** The declarations of a CSS rule, by exact selector, comments stripped. */
function rule(selector: string): string {
  const re = new RegExp(`(^|\\})\\s*${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'm');
  const m = re.exec(css);
  expect(m, `rule ${selector} not found`).not.toBeNull();
  return m![2].replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('the nav is anchored to the viewport', () => {
  it('is fixed and spans the full width', () => {
    expect(nav).toMatch(/className="mobile-bottom-nav fixed left-0 right-0/);
  });

  it('sits on the bottom edge, with no offset term at all', () => {
    // A second term here — an inset, a variable, a magic number — is how both
    // previous bugs got in. There is one permitted value.
    expect(rule('.mobile-bottom-nav').trim()).toBe('bottom: 0;');
  });

  it('has no runtime writer of its position anywhere in the app', () => {
    // The nav moved because a hook wrote a CSS variable it read. Nothing may
    // write one again: --bottom-nav-h is a static 52px, and no code sets a
    // bottom offset on the nav.
    const writers: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== '__tests__') walk(p); continue; }
        if (!/\.tsx?$/.test(e.name)) continue;
        const src = readFileSync(p, 'utf8');
        if (/setProperty\(\s*'--(vv-bottom-inset|bottom-nav-h)'/.test(src)) {
          writers.push(relative(process.cwd(), p).replace(/\\/g, '/'));
        }
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(writers).toEqual([]);
  });

  it('kept the desync fix, which corrects scroll rather than position', () => {
    // The legitimate half of the iOS problem. It re-asserts the document's own
    // scroll position so Safari recomputes; it never moves an element.
    const desync = readFileSync(srcPath('hooks', 'useViewportDesyncFix.ts'), 'utf8');
    expect(desync).toMatch(/window\.scrollTo/);
    expect(desync).not.toMatch(/setProperty/);
  });
});

describe('there is exactly one, and the shell owns it', () => {
  function sources(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '__tests__') sources(p, out); continue; }
      if (/\.tsx$/.test(e.name)) out.push(p);
    }
    return out;
  }

  const renderers = sources(join(process.cwd(), 'src'))
    .filter((f) => /<MobileBottomNav\b/.test(readFileSync(f, 'utf8')))
    .map((f) => relative(process.cwd(), f).replace(/\\/g, '/'));

  it('is rendered by AppShell and by nothing else', () => {
    // A page that mounts its own would give that route two navs, and the
    // second would be positioned by whatever the page's layout does.
    expect(renderers).toEqual(['src/components/AppShell.tsx']);
  });

  it('is rendered once within the shell', () => {
    expect(shell.match(/<MobileBottomNav\b/g) ?? []).toHaveLength(1);
  });
});

describe('nothing above it can capture a fixed descendant', () => {
  // transform, filter, perspective, backdrop-filter, contain and
  // will-change on those properties all make an element the containing block
  // for `position: fixed` descendants — the classic cause of exactly this
  // symptom. AppShell has none on the nav's ancestors today (only
  // `isolation`, which creates a stacking context but NOT a containing
  // block). This keeps it that way.
  const CAPTURING = /\b(transform|filter|backdropFilter|WebkitBackdropFilter|perspective|contain)\b\s*:/;

  it('has no capturing property on any ancestor of the nav', () => {
    const sf = ts.createSourceFile('AppShell.tsx', shell, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    let navNode: ts.Node | null = null;
    const find = (n: ts.Node) => {
      const open = ts.isJsxElement(n) ? n.openingElement
        : ts.isJsxSelfClosingElement(n) ? n : null;
      if (open && open.tagName.getText() === 'MobileBottomNav') navNode = n;
      n.forEachChild(find);
    };
    find(sf);
    expect(navNode, 'MobileBottomNav not found in AppShell').not.toBeNull();

    const offenders: string[] = [];
    for (let p = navNode!.parent; p; p = p.parent) {
      const open = ts.isJsxElement(p) ? p.openingElement
        : ts.isJsxSelfClosingElement(p) ? p : null;
      if (!open) continue;
      for (const attr of open.attributes.properties) {
        if (!ts.isJsxAttribute(attr)) continue;
        const name = attr.name.getText();
        if (name !== 'style' && name !== 'className') continue;
        const text = attr.initializer?.getText() ?? '';
        // `transition: '… backdrop-filter …'` names the property without
        // applying it, and a transition creates no containing block.
        const applied = text.replace(/transition\s*:\s*'[^']*'/g, '');
        if (CAPTURING.test(applied) || /\bbackdrop-blur\b|\btransform\b/.test(applied)) {
          offenders.push(`${open.tagName.getText()}: ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('things positioned above the nav move with it', () => {
  it('.above-bottom-nav measures from the same edge', () => {
    // The nav is on the bottom edge, so anything above it measures from there.
    // While the nav was being offset these needed the same offset or the two
    // came apart, which is why the AI button and the nav appeared at unrelated
    // heights.
    expect(rule('.above-bottom-nav')).not.toMatch(/vv-bottom-inset/);
    expect(rule('.above-bottom-nav')).toMatch(/var\(--bottom-nav-h\)/);
  });

  it('so does the AI launcher, which sets its own offset inline', () => {
    const launcher = readFileSync(srcPath('components', 'ai', 'AiLauncher.tsx'), 'utf8');
    expect(launcher).toMatch(/bottom: 'calc\(var\(--bottom-nav-h[^']*\)'/);
    expect(launcher).not.toMatch(/vv-bottom-inset/);
  });

  it('desktop still opts out, deliberately', () => {
    // Page zoom legitimately shrinks the visual viewport on desktop; feeding
    // that in would drag the action bar around for a bug desktop never had.
    expect(css).toMatch(/\.page-action-bar \{ bottom: 0; \}/);
  });
});
