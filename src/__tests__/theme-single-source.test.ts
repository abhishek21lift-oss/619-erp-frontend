// There is exactly one theme system, writing exactly one key.
//
// Audit finding H-7. There used to be two, and they never spoke:
//
//   ThemeProvider + public/theme-init.js  ->  localStorage['theme']
//   AppShell's toggle + settings/profile  ->  localStorage['619-theme']
//
// So pressing the visible header toggle changed the page but left every
// useTheme() consumer on a stale value — the diet-plan charts kept their light
// palette in dark mode — and on the next load the pre-paint script read
// 'theme', found nothing, and fell back to the SYSTEM preference, discarding
// the choice the user had just made. The flash-of-wrong-theme that script
// exists to prevent, reintroduced by a key mismatch.
//
// This is a source-level test on purpose. The bug was never visible in any one
// component — each half was individually reasonable — it existed only in the
// relationship between four files. A render test of AppShell would have passed
// throughout. What has to stay true is a whole-codebase property: one writer,
// one key.

import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const THEME_INIT = path.join(ROOT, 'public', 'theme-init.js');

/** Every .ts/.tsx file under src. */
function sourceFiles(): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === '__tests__' || e.name === 'node_modules') continue;
        walk(p);
      } else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  })(SRC);
  return out;
}

const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');

describe('the legacy 619-theme key', () => {
  it('is never WRITTEN by application code', () => {
    // Reading it is fine — theme-init.js promotes it once. Writing it is what
    // recreated the split.
    const writers = sourceFiles()
      .filter((f) => /localStorage\.setItem\(\s*['"]619-theme['"]/.test(fs.readFileSync(f, 'utf8')))
      .map(rel);

    expect(writers).toEqual([]);
  });

  it('is promoted once by the pre-paint script, then removed', () => {
    // Without this, everyone who had already chosen a theme under the old key
    // silently reverts to their system preference on the release that fixes
    // the bug — the same symptom, one last time.
    const init = fs.readFileSync(THEME_INIT, 'utf8');
    expect(init).toMatch(/getItem\(\s*['"]619-theme['"]\s*\)/);
    expect(init).toMatch(/setItem\(\s*['"]theme['"]/);
    expect(init).toMatch(/removeItem\(\s*['"]619-theme['"]\s*\)/);
  });
});

describe('ThemeProvider is the only writer of the theme key', () => {
  it('no other source file writes localStorage["theme"]', () => {
    const writers = sourceFiles()
      .filter((f) => /localStorage\.setItem\(\s*['"]theme['"]/.test(fs.readFileSync(f, 'utf8')))
      .map(rel);

    expect(writers).toEqual(['src/components/ThemeProvider.tsx']);
  });

  it('applies BOTH the class and the data-theme attribute', () => {
    // globals.css targets `[data-theme="dark"], .dark`. AppShell used to set
    // the attribute while ThemeProvider set only the class, so consolidating
    // onto the provider would have silently dropped every attribute-based rule
    // if it did not write both.
    const src = fs.readFileSync(path.join(SRC, 'components', 'ThemeProvider.tsx'), 'utf8');
    expect(src).toMatch(/classList\.toggle\('dark'/);
    expect(src).toMatch(/setAttribute\('data-theme'/);
  });

  it('the pre-paint script sets both too, so the first frame matches', () => {
    const init = fs.readFileSync(THEME_INIT, 'utf8');
    expect(init).toMatch(/classList\.toggle\('dark'/);
    expect(init).toMatch(/setAttribute\('data-theme'/);
  });
});

describe('AppShell delegates to the context', () => {
  const src = () => fs.readFileSync(path.join(SRC, 'components', 'AppShell.tsx'), 'utf8');

  it('uses useTheme rather than its own state', () => {
    expect(src()).toMatch(/useTheme\(\)/);
  });

  it('keeps no parallel darkMode state', () => {
    // The specific regression: a second source of truth for the same value.
    expect(src()).not.toMatch(/useState.*darkMode|setDarkMode/);
  });

  it('does not touch the DOM or localStorage for theming itself', () => {
    const s = src();
    expect(s).not.toMatch(/setAttribute\('data-theme'/);
    expect(s).not.toMatch(/localStorage\.setItem\(\s*['"]/);
  });
});
