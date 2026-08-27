import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Every modal surface must trap focus, or it is a keyboard trap in reverse.
//
// ── What this pins ─────────────────────────────────────────────────────────
//
// Seventeen components render a modal. One is built on Radix, which handles
// all of this itself. The other sixteen were hand-rolled and NONE of them
// trapped focus. Several declared `aria-modal="true"` — a statement to
// assistive technology that the rest of the page is inert — while Tab walked
// straight out of the dialog into that page, which was fully interactive
// behind the backdrop. Seven had no Escape handler at all, so a keyboard user
// who opened one could not leave it.
//
// Among them: payment verification, subscription approve/reject, the client
// payment sheet and the Command Centre's destructive-command confirmation.
//
// ── Why a source-reading test ──────────────────────────────────────────────
//
// The behaviour itself is covered by useDialogA11y.test.tsx, which drives real
// focus through a real dialog. This one exists for the OTHER failure: someone
// writes a seventeenth dialog and simply does not know the hook exists. No
// behavioural test can fail for code nobody wrote a test for. This one fails
// the moment `role="dialog"` appears without it.

const SRC = path.join(__dirname, '..');

/**
 * Dialogs exempt from the hook, each with the reason.
 *
 * An entry says "this surface's focus is managed by something else", never
 * "this one is inconvenient".
 */
const EXEMPT: Record<string, string> = {
  'components/ui/dialog.tsx':
    'Built on @radix-ui/react-dialog, which traps focus, handles Escape and restores focus itself. Re-implementing any of that on top of it would fight the primitive.',
  'components/profile/PortfolioSection.tsx':
    'Uses the Radix-backed ui/dialog above rather than a hand-rolled overlay, so it inherits the same focus management.',
};

/** Files that render something with role="dialog". */
function dialogFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === '__tests__') continue;
        walk(p);
      } else if (e.name.endsWith('.tsx')) {
        const src = fs.readFileSync(p, 'utf8');
        if (/role="dialog"|aria-modal/.test(src)) out.push(p.replace(`${SRC}/`, ''));
      }
    }
  };
  walk(SRC);
  return out.sort();
}

describe('every modal traps focus', () => {
  const files = dialogFiles();

  it('finds the dialogs', () => {
    // A path change that matched nothing would make the assertion below
    // vacuously true — the failure mode of every source-reading guard.
    expect(files.length).toBeGreaterThan(10);
  });

  it('every dialog either uses the hook or is a documented exemption', () => {
    const missing: string[] = [];
    for (const rel of files) {
      if (EXEMPT[rel]) continue;
      const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
      if (!src.includes('useDialogA11y')) missing.push(rel);
    }
    expect(missing).toEqual([]);
  });

  it('every exemption names a real file and gives a reason', () => {
    for (const [rel, reason] of Object.entries(EXEMPT)) {
      expect(fs.existsSync(path.join(SRC, rel))).toBe(true);
      expect(reason.length).toBeGreaterThan(60);
    }
  });

  it('the exempt files really do delegate to Radix', () => {
    // An exemption is a claim about the code. If ui/dialog.tsx stops being
    // Radix-backed, the claim is false and both entries need revisiting.
    const primitive = fs.readFileSync(path.join(SRC, 'components/ui/dialog.tsx'), 'utf8');
    expect(primitive).toMatch(/@radix-ui\/react-dialog/);
  });

  it('the hook is attached to a ref, not merely imported', () => {
    // Importing it and forgetting the ref leaves the dialog exactly as
    // unguarded as before, with a comment claiming otherwise.
    const unattached: string[] = [];
    for (const rel of files) {
      if (EXEMPT[rel]) continue;
      const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
      if (!src.includes('useDialogA11y')) continue;
      if (!/ref=\{[A-Za-z_$][\w$]*\}/.test(src)) unattached.push(rel);
    }
    expect(unattached).toEqual([]);
  });
});

describe('backdrops are hidden from assistive tech, not made focusable', () => {
  it('the click-outside divs carry aria-hidden', () => {
    // jsx-a11y flags `<div onClick={close}>` backdrops under
    // click-events-have-key-events. Satisfying it with an onKeyDown would add
    // a tab stop that does nothing and reads as an unlabelled control —
    // strictly worse than the warning. Escape is the keyboard equivalent of
    // click-outside, and the hook provides it; the backdrop is hidden instead.
    const checked = [
      'components/platform/subscription-requests.tsx',
      'app/(chrome)/finance/verify-payments/page.tsx',
    ];
    for (const rel of checked) {
      const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
      const backdrops = src.match(/<div[^>]*className="absolute inset-0"/g) ?? [];
      expect(backdrops.length).toBeGreaterThan(0);
      for (const b of backdrops) expect(b).toContain('aria-hidden');
    }
  });
});
