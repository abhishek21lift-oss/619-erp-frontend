// Page zoom has to stay available (WCAG 1.4.4).
//
// The app used to pin `maximumScale: 1`, set `userScalable: false`, cancel
// iOS gesture events from /public/no-zoom.js, and set `touch-action: pan-x
// pan-y`. That is easy to reintroduce one layer at a time, so this pins the
// opposite: no viewport lock, no gesture blocker, and `manipulation`, which
// permits pinch-zoom while still suppressing the double-tap zoom.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8');

describe('page zoom', () => {
  const layout = read('src', 'app', 'layout.tsx');

  it('does not pin the maximum scale or disable user scaling', () => {
    expect(layout).not.toMatch(/maximumScale:\s*1/);
    expect(layout).not.toMatch(/userScalable:\s*false/);
  });

  it('still starts at 1:1 on device width', () => {
    expect(layout).toMatch(/initialScale:\s*1/);
    expect(layout).toMatch(/width:\s*'device-width'/);
  });

  it('does not load the gesture blocker', () => {
    expect(layout).not.toMatch(/src=["']\/no-zoom\.js["']/);
  });

  it('uses touch-action manipulation, which permits pinch-zoom', () => {
    const css = read('src', 'app', 'globals.css');
    expect(css).toMatch(/touch-action:\s*manipulation/);
    expect(css).not.toMatch(/touch-action:\s*pan-x pan-y/);
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
    const hook = read('src', 'components', 'common', 'PullToRefresh', 'usePullToRefresh.ts');
    expect(hook).toContain("addEventListener('touchmove'");
    expect(hook).toMatch(/passive:\s*false/);
  });
});
