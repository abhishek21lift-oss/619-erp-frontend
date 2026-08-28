// The floating AI launcher is not mounted app-wide.
//
// It used to render from AppShell, which every authenticated screen goes
// through, so it sat on top of the content of all 97 of them — including the
// workout builder, where it covered the bottom of the exercise list on a
// phone. AI has a permanent home in the bottom nav's AI Coach tab, which is a
// full chat console rather than a corner button.
//
// This is a guard rather than a note, because the way it comes back is not
// someone deciding to bring it back: it is a merge, or a later feature adding
// "<AiAssistant />" to the shell because that is where it used to live. The
// components are deliberately still in the tree, so nothing else would notice.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = (...p: string[]) => readFileSync(join(process.cwd(), 'src', ...p), 'utf8');

/** Comments explain the removal by name; matching them would pass forever. */
const code = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

describe('the floating AI launcher', () => {
  it('is not rendered by the app shell', () => {
    expect(code(src('components', 'AppShell.tsx'))).not.toMatch(/<AiAssistant\b/);
  });

  it('is not imported by the app shell either', () => {
    expect(code(src('components', 'AppShell.tsx'))).not.toMatch(/from ['"]@?\/?.*ai\/AiAssistant['"]/);
  });

  it('is not mounted from anywhere else', () => {
    // A layout, a provider or a single page would each put it back on screen,
    // and AppShell is only the place it used to live.
    const mounts: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue;
          walk(full);
        } else if (/\.tsx$/.test(entry.name) && entry.name !== 'AiAssistant.tsx') {
          if (/<AiAssistant\b/.test(code(readFileSync(full, 'utf8')))) mounts.push(full);
        }
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(mounts).toEqual([]);
  });

  it('still exists as a component, so restoring it is one line', () => {
    // The counter-test. A guard that passed because the file was deleted
    // would also pass if someone rewrote the assistant from scratch, and
    // would say nothing about where it is mounted.
    expect(src('components', 'ai', 'AiAssistant.tsx')).toMatch(/AiLauncher/);
  });
});
