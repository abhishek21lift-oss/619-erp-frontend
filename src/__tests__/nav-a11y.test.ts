// Navigation audit regressions — 2026-10-21.
//
// These pin the fixes that matter to a keyboard or screen-reader user:
//   · the closed mobile drawer must not be reachable,
//   · the open drawer must behave like the modal it looks like,
//   · the bottom nav must show where focus is,
//   · the top-bar menus must expose their open state,
//   · the sidebar must say which page is current,
//   · a collapsed rail must still be usable,
//   · every nav icon must exist in the icon allowlist,
//   · the bottom nav's inactive labels must clear AA.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { srcPath } from '@/__tests__/helpers/app-routes';
import { BOTTOM_NAV_COLORS } from '@/components/MobileBottomNav';

const read = (...p: string[]) => readFileSync(srcPath(...p), 'utf8');
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const shell = strip(read('components', 'AppShell.tsx'));
const sidebar = strip(read('components', 'sidebar', 'Sidebar.tsx'));
const bottom = strip(read('components', 'MobileBottomNav.tsx'));
const search = strip(read('components', 'search', 'GlobalSearch.tsx'));
const css = read('app', 'globals.css');
const config = read('lib', 'nav-config.ts');

describe('the mobile drawer is hidden when closed and modal when open', () => {
  it('is inert unless it is open, on the mobile variant only', () => {
    expect(sidebar).toMatch(/inert=\{isMobile && !mobileOpen\}/);
  });

  it('describes itself as a labelled dialog', () => {
    expect(sidebar).toMatch(/role=\{isMobile \? 'dialog' : undefined\}/);
    expect(sidebar).toMatch(/aria-modal=\{isMobile && mobileOpen \? true : undefined\}/);
    expect(sidebar).toMatch(/aria-label=\{isMobile \? 'Navigation menu' : undefined\}/);
  });

  it('traps Tab inside the open drawer', () => {
    expect(sidebar).toContain('useDialogA11y');
    expect(sidebar).toMatch(/ref=\{setDrawerRef\}/);
  });

  it('closes on Escape and returns focus to the toggle', () => {
    expect(shell).toMatch(
      /if \(e\.key === 'Escape'\) \{[\s\S]{0,160}setMobileMenuOpen\(false\)[\s\S]{0,160}mobileMenuButtonRef\.current\?\.focus\(\)/,
    );
  });

  it('locks the page behind the open drawer', () => {
    expect(shell).toMatch(/document\.body\.style\.overflow = 'hidden'/);
  });

  it('takes the bottom nav out of reach while the drawer covers it', () => {
    expect(bottom).toMatch(/inert=\{sidebarOpen\}/);
  });
});

describe('the bottom nav shows keyboard focus', () => {
  it('puts the ring on the focusable link, not a child span', () => {
    expect(bottom).toMatch(/className="group relative flex flex-1/);
    expect(bottom).toMatch(/group-focus-visible:opacity-100/);
    expect(bottom).not.toMatch(/(?<!group-)focus-visible:opacity-100/);
  });

  it('keeps its inactive labels above AA against the bar', () => {
    const parse = (c: string) => {
      const n = c.match(/[\d.]+/g)!.map(Number);
      return { rgb: n.slice(0, 3) as [number, number, number], a: n[3] ?? 1 };
    };
    const flat = (fg: { rgb: [number, number, number]; a: number }, bg: [number, number, number]) =>
      fg.rgb.map((v, i) => Math.round(v * fg.a + bg[i] * (1 - fg.a))) as [number, number, number];
    const lin = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const lum = ([r, g, b]: [number, number, number]) =>
      0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (a: [number, number, number], b: [number, number, number]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    const bar = parse(BOTTOM_NAV_COLORS.background);
    for (const canvas of [[255, 255, 255], [15, 23, 42]] as [number, number, number][]) {
      const ground = flat(bar, canvas);
      expect(ratio(flat(parse(BOTTOM_NAV_COLORS.inactiveLabel), ground), ground)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(flat(parse(BOTTOM_NAV_COLORS.inactiveIcon), ground), ground)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the top bar exposes which menu is open', () => {
  it('marks each trigger expanded and points at its panel', () => {
    for (const [state, id] of [
      ['settingsOpen', 'topbar-settings-menu'],
      ['notifOpen', 'topbar-notifications-menu'],
      ['profileOpen', 'topbar-profile-menu'],
    ]) {
      expect(shell).toMatch(new RegExp(`aria-expanded=\\{${state}\\}`));
      expect(shell).toContain(`aria-controls="${id}"`);
      expect(shell).toContain(`id="${id}"`);
    }
  });

  it('returns focus to the trigger when Escape closes a menu', () => {
    expect(shell).toMatch(/menuTriggerRef\.current\?\.focus\(\)/);
  });
});

describe('the sidebar says where you are and stays usable collapsed', () => {
  it('marks the active page for assistive technology', () => {
    expect(sidebar).toMatch(/aria-current=\{active && !isDisabled \? 'page' : undefined\}/);
  });

  it('expands the rail and opens the clicked group when collapsed', () => {
    expect(sidebar).toMatch(/if \(collapsed\) \{[\s\S]{0,80}onExpand\?\.\(\)[\s\S]{0,80}setOpenGroupId\(group\.id\)/);
    expect(sidebar).toMatch(/<SidebarNav collapsed=\{collapsed\} onLinkClick=\{isMobile \? onMobileClose : undefined\} onExpand=\{onExpand\}/);
  });
});

describe('every icon in the studio navigation resolves', () => {
  it('finds all NAV_GROUPS icons in the sidebar allowlist', () => {
    const navGroups = config.split('export const NAV_GROUPS')[1].split('export const SETTINGS_GROUP')[0];
    const icons = [...new Set([...navGroups.matchAll(/icon:\s*'([^']+)'/g)].map((m) => m[1]))];
    const map = sidebar.split('const ICON_MAP')[1].split('};')[0];
    const missing = icons.filter((i) => !new RegExp(`\\b${i}\\b`).test(map));
    expect(missing).toEqual([]);
  });
});

describe('the phone search sheet is modal', () => {
  it('is a labelled dialog', () => {
    expect(search).toMatch(/role="dialog"/);
    expect(search).toMatch(/aria-modal="true"/);
    expect(search).toMatch(/aria-label="Search"/);
  });

  it('traps Tab and returns focus to its trigger when dismissed', () => {
    expect(search).toContain('useDialogA11y');
    expect(search).toMatch(/ref=\{setSheetRef\}/);
    expect(search).toMatch(/searchButtonRef\.current\?\.focus\(\)/);
  });
});

describe('the top-bar controls have a 44px touch target', () => {
  it('extends the hit area without growing the compact bar', () => {
    expect(css).toMatch(/\.topbar-hit::after\s*\{[^}]*inset:\s*-6px/);
    expect((shell.match(/topbar-hit/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(search).toContain('topbar-hit');
  });
});
