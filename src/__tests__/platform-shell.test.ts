// The Command Center's layout contract.
//
// The console looked like content dumped on a canvas because (platform)/layout
// rendered `<div id="main-content">{children}</div>` — no container — so the
// page declared its own, and that one had `pt-6 pb-[…] sm:pt-8 lg:pb-10`:
// vertical padding and NO horizontal padding at all. Below 1024px every card
// sat flush against both viewport edges.
//
// These pin the numbers rather than the appearance. The visual result is
// verified by measuring a real browser at seven widths (see the PR); what a
// unit test can usefully hold is that the container still declares the gutters
// and that the page has not grown a second, competing one.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLATFORM_CONTAINER, MOBILE_PRIMARY } from '@/components/platform/PlatformShell';
import { MODULES } from '@/app/(platform)/platform/_shared/types';

const src = (...p: string[]) => readFileSync(join(process.cwd(), 'src', ...p), 'utf8');

describe('the content container', () => {
  it('declares a gutter at every breakpoint', () => {
    // The omission that caused the bug: no px-* at all.
    expect(PLATFORM_CONTAINER).toMatch(/px-\[16px\]/);
    expect(PLATFORM_CONTAINER).toMatch(/sm:px-\[24px\]/);
    expect(PLATFORM_CONTAINER).toMatch(/lg:px-\[32px\]/);
  });

  it('states the gutters in pixels, not rem', () => {
    // This app sets a 14px root font size, so Tailwind's px-4/6/8 measured
    // 14/21/28px — every gutter 12.5% short of the intended 16/24/32, which
    // reads as "slightly wrong" without looking broken. Verified by measuring
    // the built page; pinned here so a tidy-up back to px-4 does not undo it.
    expect(PLATFORM_CONTAINER).not.toMatch(/px-\d+(\s|$)/);
  });

  it('centres and caps the width', () => {
    expect(PLATFORM_CONTAINER).toMatch(/mx-auto/);
    expect(PLATFORM_CONTAINER).toMatch(/w-full/);
    expect(PLATFORM_CONTAINER).toMatch(/max-w-\[1440px\]/);
  });
});

describe('the shell owns the layout, and owns it once', () => {
  it('is mounted by the route group layout', () => {
    const layout = src('app', '(platform)', 'layout.tsx');
    expect(layout).toMatch(/<PlatformShell>/);
  });

  it('applies the container to the top bar and the page alike', () => {
    // Both use CONTAINER, which is what makes the logo, the page heading and
    // the first card share one left edge.
    const shell = src('components', 'platform', 'PlatformShell.tsx');
    expect(shell.match(/\{CONTAINER\}/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('leaves no competing container on the page', () => {
    // The page's own `mx-auto w-full max-w-5xl` is gone. Left in place it
    // would double the padding and make this page narrower than every other.
    const page = src('app', '(platform)', 'platform', 'page.tsx');
    expect(page).not.toMatch(/max-w-5xl/);
    expect(page).not.toMatch(/mx-auto w-full max-w/);
  });

  it('does not re-pad for the studio app’s bottom nav', () => {
    // pb-[calc(5rem+…)] cleared the TENANT app's MobileBottomNav, which this
    // portal does not render — left over from when /platform lived in
    // (chrome), and visible as dead space at the foot of every console page.
    const page = src('app', '(platform)', 'platform', 'page.tsx');
    expect(page).not.toMatch(/5rem\+env\(safe-area-inset-bottom/);
  });
});

describe('safe areas are handled where the edges are', () => {
  const shell = src('components', 'platform', 'PlatformShell.tsx');

  it('pads the top bar into the notch', () => {
    expect(shell).toMatch(/paddingTop: 'env\(safe-area-inset-top/);
  });

  it('pads the bottom bar and the sheet past the home indicator', () => {
    expect(shell.match(/safe-area-inset-bottom/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});

describe('navigation', () => {
  it('reaches every module on desktop', () => {
    const shell = src('components', 'platform', 'PlatformShell.tsx');
    expect(shell).toMatch(/MODULES\.map\(\(m\) => <SidebarLink/);
  });

  it('reaches every module on mobile, between the bar and the More sheet', () => {
    // The property that matters: nothing becomes unreachable by being pushed
    // out of the five primary slots.
    const overflow = MODULES.filter((m) => !MOBILE_PRIMARY.includes(m.id)).map((m) => m.id);
    const covered = new Set([...MOBILE_PRIMARY, ...overflow]);
    expect(MODULES.every((m) => covered.has(m.id))).toBe(true);
  });

  it('keeps the bottom bar to five plus More', () => {
    // Six labelled targets on a 390px screen become initials.
    expect(MOBILE_PRIMARY.length).toBe(5);
  });

  it('names only modules that exist', () => {
    const known = new Set(MODULES.map((m) => m.id));
    expect(MOBILE_PRIMARY.filter((id) => !known.has(id))).toEqual([]);
  });

  it('is URL-driven, so a console view is linkable', () => {
    // It used to be useState synced FROM ?tab= but never TO it: clicking a tab
    // changed the screen and not the address, and the back button did nothing.
    const page = src('app', '(platform)', 'platform', 'page.tsx');
    expect(page).toMatch(/const tab = normalizeTab\(paramTab\)/);
    expect(page).toMatch(/router\.push\(/);
  });
});

describe('a chart with one data point is still a chart', () => {
  // A new platform has one month of revenue. Each bar is flex-1, so a single
  // point took the full width — and its height is value/max, which for one
  // point is always 100%. The plot area rendered as a solid filled rectangle:
  // it read as broken rather than as "one month of data so far".
  const charts = readFileSync(
    join(process.cwd(), 'src', 'components', 'platform', 'charts.tsx'), 'utf8',
  );

  it('caps how wide a single bar can stretch', () => {
    expect(charts).toMatch(/maxWidth: 40/);
  });

  it('still lets a bar shrink for a full series', () => {
    // The cap must not become a floor: twelve bars in this container are
    // ~25px, well under it, so a full year is unchanged.
    expect(charts).toMatch(/minWidth: 4, maxWidth: 40/);
  });
});
