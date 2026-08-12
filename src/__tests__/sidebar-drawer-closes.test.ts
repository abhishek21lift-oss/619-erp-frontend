// Every navigation path out of the mobile drawer closes the drawer.
//
// Tapping the brand header — the studio logo, studio name and owner name at
// the top of the sidebar — navigated to the dashboard and left the drawer
// sitting open on top of it. The reader ends up on the right screen with the
// sidebar covering it, and has to close it by hand, which reads as the tap
// having half-worked.
//
// It was the only navigation path in the drawer that did not close itself, and
// the reason is structural rather than careless. The sidebar threads its close
// callback down two routes:
//
//   <SidebarNav     onLinkClick={isMobile ? onMobileClose : undefined} />
//   <SidebarProfile onClose={isMobile ? onMobileClose : undefined} />
//
// The brand header is neither — it is a bare <Link> in the header block, so
// neither prop ever reached it. Adding a third link to that block would miss
// it again for the same reason, which is why this guards the shape rather than
// the one line.
//
// ── Why this reads the source ───────────────────────────────────────────
//
// Rendering Sidebar means standing up the auth context, framer-motion's
// AnimatePresence, the router and StudioMark, and then asserting a callback
// fired — a lot of machinery to prove a prop is present. The neighbouring
// sidebar tests (sidebar-contrast, sidebar-footer-contrast) read the module
// for the same reason. What actually broke here is visible in the source: a
// <Link> in the drawer with no onClick.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SIDEBAR = path.join(process.cwd(), 'src/components/sidebar/Sidebar.tsx');
const src = fs.readFileSync(SIDEBAR, 'utf8');

/** Strip comments, so prose describing a <Link> is not mistaken for one. */
function code(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, ' ');
}

/** Every <Link …> opening tag in the file, with its attributes. */
function linkTags(s: string): string[] {
  return [...code(s).matchAll(/<Link\b[\s\S]*?>/g)].map((m) => m[0]);
}

describe('the mobile drawer closes on every way out of it', () => {
  it('can see the Links it is guarding', () => {
    // Without this, a refactor to a different link component would make every
    // assertion below pass by finding nothing at all.
    expect(linkTags(src).length).toBeGreaterThan(0);
  });

  it('the brand header closes the drawer when it navigates', () => {
    const brand = linkTags(src).find((t) => /href=["']\/["']/.test(t));
    expect(brand).toBeDefined();
    expect(brand).toMatch(/onClick=\{isMobile \? onMobileClose : undefined\}/);
  });

  it('no Link in the drawer navigates without closing it', () => {
    // The general form. A fourth link added to the header block tomorrow is
    // caught here rather than shipping with the same defect.
    const naked = linkTags(src).filter((t) => !/onClick=/.test(t));
    expect(naked).toEqual([]);
  });

  it('leaves the desktop sidebar alone, where there is no drawer to close', () => {
    // Three sanctioned handlers, not one. The gating is done ONCE at the call
    // site — <SidebarNav onLinkClick={isMobile ? … } />, <SidebarProfile
    // onClose={isMobile ? … } /> — so the links inside those components
    // correctly receive an already-gated callback and must not repeat the
    // ternary. Only the brand header, which lives in the parent, gates inline.
    //
    // A first draft of this demanded the ternary on every link and failed
    // against correct code. Whichever form is used, on desktop the callback is
    // undefined and nothing fires: firing a close on a persistent sidebar
    // would be a different bug in the opposite direction.
    const GATED = /onClick=\{(onLinkClick|onClose|isMobile \? onMobileClose : undefined)\}/;
    for (const tag of linkTags(src)) {
      expect(tag).toMatch(GATED);
    }
  });

  it('still threads the callback to the nav and the profile', () => {
    // The two routes that were already correct. If either regresses, the
    // brand-header fix alone would not be enough and this says so.
    expect(code(src)).toMatch(/onLinkClick=\{isMobile \? onMobileClose : undefined\}/);
    expect(code(src)).toMatch(/onClose=\{isMobile \? onMobileClose : undefined\}/);
  });
});
