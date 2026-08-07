// Pinch-zoom stays off, in all three places it has to be turned off.
//
// This is unusually easy to half-undo. The viewport meta looks like the whole
// fix and is the ONE part that does nothing on iOS, so deleting the other two
// leaves a change that still reads as correct and fails only on the device the
// app is actually used on. And a previous commit removed the meta attributes
// deliberately (WCAG 1.4.4), so a future reader has a documented reason to
// take them back out without noticing the other two layers.
//
// Nothing here throws if a layer goes missing. The gesture just comes back.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8');

describe('layer 1 — the viewport meta (Android, desktop touch)', () => {
  const layout = read('src', 'app', 'layout.tsx');

  it('pins the maximum scale and disables user scaling', () => {
    expect(layout).toMatch(/maximumScale:\s*1/);
    expect(layout).toMatch(/userScalable:\s*false/);
  });

  it('still lets the page start at 1:1 on device width', () => {
    // Guarding against a "fix" that pins the scale by shrinking the layout.
    expect(layout).toMatch(/initialScale:\s*1/);
    expect(layout).toMatch(/width:\s*'device-width'/);
  });
});

describe('layer 2 — the gesture script (iOS, where the meta is ignored)', () => {
  const layout = read('src', 'app', 'layout.tsx');
  const script = read('public', 'no-zoom.js');

  it('is actually loaded by the document', () => {
    // The file existing is not the same as it running.
    expect(layout).toContain('/no-zoom.js');
  });

  it('is reachable without a session', () => {
    // The proxy matcher exempts image and font extensions but NOT .js, so an
    // unlisted script 307s to /login and simply never executes. Caught by
    // requesting the path against a built server, not by reading the code —
    // and the symptom is invisible, because the viewport meta still renders
    // and still looks like the whole fix while iOS ignores it.
    expect(read('src', 'proxy.ts')).toContain("'/no-zoom.js'");
  });

  it('cancels all three Safari gesture events, not just the first', () => {
    // gesturestart alone leaves Safari applying the zoom when the later
    // events go unhandled.
    for (const evt of ['gesturestart', 'gesturechange', 'gestureend']) {
      expect(script).toContain(evt);
    }
  });

  it('registers every listener as non-passive', () => {
    // A passive listener's preventDefault() is ignored — the browser warns in
    // the console and zooms anyway, so a passive listener here is the same as
    // no listener at all.
    //
    // Comments are stripped first. The file's own prose explains why
    // `passive: false` matters, and counting that sentence as a listener
    // option made this assertion pass for the wrong reason.
    const code = script.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const listeners = code.match(/addEventListener\(/g) ?? [];
    const nonPassive = code.match(/passive:\s*false/g) ?? [];
    expect(listeners.length).toBeGreaterThan(0);
    expect(nonPassive).toHaveLength(listeners.length);
  });

  it('only blocks touchmove once a second finger is down', () => {
    // Blocking every touchmove would kill one-finger scrolling across the
    // whole app — a far worse bug than the one being fixed.
    expect(script).toMatch(/touches\.length\s*>\s*1/);
  });
});

describe('layer 3 — touch-action (double-tap, which no listener sees)', () => {
  const css = read('src', 'app', 'globals.css');

  it('allows panning but not zooming on the root element', () => {
    expect(css).toMatch(/touch-action:\s*pan-x pan-y/);
  });

  it('does not use `manipulation`, which permits pinch-zoom', () => {
    // The common shorthand for killing the tap delay explicitly allows
    // continuous pinch-zoom, so it would leave the gesture in place while
    // looking like it had removed it.
    expect(css).not.toMatch(/touch-action:\s*manipulation/);
  });
});

describe('gestures that must survive', () => {
  it('the signature canvas keeps its own touch-action', () => {
    // touch-action on an ancestor constrains descendants. Without `none` here
    // a finger drawing on the canvas would be taken as a pan and scroll the
    // page instead of drawing a signature.
    expect(read('src', 'components', 'pt-os', 'shared', 'SignaturePad.tsx'))
      .toMatch(/touchAction:\s*'none'/);
  });

  it('pull-to-refresh still listens for its own drag', () => {
    // pan-y remains permitted, so the one-finger pull still reaches this hook.
    const hook = read('src', 'components', 'common', 'PullToRefresh', 'usePullToRefresh.ts');
    expect(hook).toContain("addEventListener('touchmove'");
    expect(hook).toMatch(/passive:\s*false/);
  });
});
