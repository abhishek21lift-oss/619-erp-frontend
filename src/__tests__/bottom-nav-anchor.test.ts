// The bottom nav is anchored to the viewport, and only one thing may move it.
//
// Reported as "the nav appears at a different height on every page, with
// content visible underneath it". The architecture was NOT the cause — the nav
// is `position: fixed` and no ancestor creates a containing block for it. The
// cause was the value of `--vv-bottom-inset`: useVisualViewportAnchor clamped
// its measurement symmetrically, so it LIFTED the bar whenever the visible
// area ended above `bottom: 0`.
//
// That reading is the normal state of mobile Safari — the bottom toolbar
// overlays the layout viewport, so visualViewport.height is 40-90px shorter
// than window.innerHeight for as long as the toolbar is showing. So the lift
// fired constantly, and because the toolbar collapses as you scroll, it landed
// the bar at a different height on every page and every scroll position.
//
// The sign logic itself is pinned in visual-viewport-anchor.test.ts. This file
// pins the structure around it: that the nav is viewport-fixed, that there is
// exactly one of it, that it is mounted by the shell rather than by a page,
// that nothing above it can capture a fixed descendant, and that anything
// positioned "above the nav" moves with it.

import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { srcPath } from '@/__tests__/helpers/app-routes';

const css = readFileSync(srcPath('app', 'globals.css'), 'utf8');
const shell = readFileSync(srcPath('components', 'AppShell.tsx'), 'utf8');
const nav = readFileSync(srcPath('components', 'MobileBottomNav.tsx'), 'utf8');

/** The declarations of a CSS rule, by exact selector. */
function rule(selector: string): string {
  const re = new RegExp(`(^|\\})\\s*${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'm');
  const m = re.exec(css);
  expect(m, `rule ${selector} not found`).not.toBeNull();
  return m![2];
}

describe('the nav is anchored to the viewport', () => {
  it('is fixed and spans the full width', () => {
    expect(nav).toMatch(/className="mobile-bottom-nav fixed left-0 right-0/);
  });

  it('takes its bottom offset from nothing but the anchor inset', () => {
    // A hardcoded offset here, or a second term, is how a page-specific fudge
    // gets in. The only permitted value is the inset, which is 0 unless the
    // viewport is genuinely displaced.
    expect(rule('.mobile-bottom-nav').trim()).toBe('bottom: var(--vv-bottom-inset, 0px);');
  });

  it('never lifts: the inset can only be zero or negative', () => {
    const hook = readFileSync(srcPath('hooks', 'useVisualViewportAnchor.ts'), 'utf8');
    // The bug was a symmetric clamp. Math.min against a positive bound is what
    // allowed a positive inset, and a positive inset is what lifts the bar.
    expect(hook).toMatch(/shift < 0/);
    expect(hook).not.toMatch(/Math\.min\(MAX_SHIFT_PX/);
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
  it('.above-bottom-nav carries the same inset', () => {
    // Without this the FAB stays put while the nav moves, and the two appear
    // at unrelated heights — which is what the report described.
    expect(rule('.above-bottom-nav')).toMatch(/var\(--vv-bottom-inset, 0px\)/);
  });

  it('so does the AI launcher, which sets its own offset inline', () => {
    const launcher = readFileSync(srcPath('components', 'ai', 'AiLauncher.tsx'), 'utf8');
    expect(launcher).toMatch(/bottom: 'calc\([^']*--vv-bottom-inset[^']*\)'/);
  });

  it('desktop still opts out, deliberately', () => {
    // Page zoom legitimately shrinks the visual viewport on desktop; feeding
    // that in would drag the action bar around for a bug desktop never had.
    expect(css).toMatch(/\.page-action-bar \{ bottom: 0; \}/);
  });
});
