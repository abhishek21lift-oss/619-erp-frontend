// One dropdown at a time, in the top bar and in the sidebar.
//
// The 2026-10-19 UI pass fixed a shell in which every menu could stand open
// together: three independent booleans in the top bar and a Record of open
// groups in the sidebar, both of which only ever grew. The fix is structural —
// a single id for the open menu, a single id for the open group — and that is
// what these read for. Rendering AppShell would need an auth context, a
// feature set and a router; the invariant itself is one line of state, so the
// test reads the two files and pins the shape a regression would have to undo.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { srcPath } from '@/__tests__/helpers/app-routes';

const read = (...p: string[]) => readFileSync(srcPath(...p), 'utf8');

describe('the shell keeps one menu open at a time', () => {
  const shell = read('components', 'AppShell.tsx');

  it('drives settings, notifications and the profile from one open id', () => {
    expect(shell).toMatch(/useState<'settings' \| 'notifications' \| 'profile' \| null>/);
    for (const m of ['settings', 'notifications', 'profile']) {
      expect(shell).toContain(`openMenu === '${m}'`);
    }
    // A toggle that closes what it opened: click-again closes.
    expect(shell.match(/setOpenMenu\(m => \(m === '/g)).toHaveLength(3);
    // No per-menu boolean survives to be opened independently.
    expect(shell).not.toMatch(/\[(settingsOpen|notifOpen|profileOpen), set/);
  });

  it('closes on an outside click and on Escape', () => {
    expect(shell).toMatch(/addEventListener\('mousedown'/);
    expect(shell).toMatch(/addEventListener\('keydown'/);
    expect(shell).toMatch(/e\.key === 'Escape'\) setOpenMenu\(null\)/);
    // Both listeners come off on unmount.
    expect(shell).toContain("removeEventListener('mousedown'");
    expect(shell).toContain("removeEventListener('keydown'");
  });
});

describe('the sidebar keeps one group open at a time', () => {
  const sidebar = read('components', 'sidebar', 'Sidebar.tsx');

  it('holds one open group id, and follows the route into it', () => {
    expect(sidebar).toMatch(/useState<string \| null>\(null\)/);
    expect(sidebar).toMatch(/setOpenGroupId\(p => \(p === id \? null : id\)\)/);
    expect(sidebar).toMatch(/const open = openGroupId === group\.id;/);
    // Landing on a page opens its own group, so the group is never closed
    // while the trainer is inside it.
    expect(sidebar).toMatch(/const active = navItems\.find\(g => anyChildActive\(g\.items\)\)/);
  });
});

describe('the AI pages share one opaque client dropdown', () => {
  // An opaque surface is a readability requirement, not a preference: the
  // card token is translucent, and a menu the form shows through stops
  // reading as a menu.
  it('renders its list over --bg-elevated, not the translucent card', () => {
    const picker = read('components', 'ai', 'AiClientPicker.tsx');
    expect(picker).toContain("background: 'var(--bg-elevated)'");
    expect(picker).toContain('overscrollBehavior');
  });

  it('is the picker all three generator pages use — none keeps its own', () => {
    for (const folder of ['workout-generator', 'diet-generator', 'progress-analysis']) {
      const page = read('app', '(chrome)', 'ai', folder, 'page.tsx');
      expect(page).toContain("from '@/components/ai/AiClientPicker'");
      expect(page).not.toContain('role="listbox"');
    }
  });
});
