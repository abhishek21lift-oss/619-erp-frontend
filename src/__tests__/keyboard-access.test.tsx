// Everything you can click, you can reach from a keyboard.
//
// WCAG 2.1.1 is Level A — the lowest bar in the standard — and a
// `<div onClick>` fails it completely: no tab stop, no Enter, no Space. This
// app had seven, and two of them were the file drop zones on "add a coach" and
// the progress-photo uploader. A keyboard-only user could not attach a photo
// at all.
//
// The sweep at the bottom is the part that lasts. The two exclusions in it are
// the whole design, so they are argued rather than assumed:
//
//   · A dismissal scrim is not a control. Clicking the backdrop is a shortcut
//     for the Close button beside it; 2.1.1 asks that the FUNCTION be
//     keyboard-operable, not that every element be focusable. Giving a
//     viewport-sized div a tab stop would add a large unnamed stop to the tab
//     order — worse than leaving it alone.
//   · A card that only duplicates a control it contains is exempt for the same
//     reason, and has to say so in an `a11y-exempt:` comment. PtOsDashboard's
//     card is the one instance: it cannot take a button role because it
//     contains its own buttons, and button-inside-button is invalid.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { activatable } from '@/lib/a11y';

describe('activatable', () => {
  it('gives the element the contract of a button', () => {
    render(<div {...activatable(() => {})} data-testid="t">x</div>);
    const el = screen.getByTestId('t');
    expect(el).toHaveAttribute('role', 'button');
    expect(el).toHaveAttribute('tabindex', '0');
  });

  it('fires on Enter and on Space', () => {
    const onActivate = vi.fn();
    render(<div {...activatable(onActivate)} data-testid="t">x</div>);
    fireEvent.keyDown(screen.getByTestId('t'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('t'), { key: ' ' });
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it('stops Space scrolling the page', () => {
    // Without preventDefault the user gets the action AND a jump down the
    // document, which on a long client list means losing their place.
    render(<div {...activatable(() => {})} data-testid="t">x</div>);
    const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    screen.getByTestId('t').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('ignores keys that belong to a control inside it', () => {
    // Enter in a nested text field must not also trigger the surrounding card.
    const onActivate = vi.fn();
    render(
      <div {...activatable(onActivate)} data-testid="t">
        <input data-testid="i" />
      </div>,
    );
    fireEvent.keyDown(screen.getByTestId('i'), { key: 'Enter' });
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('does nothing for other keys', () => {
    const onActivate = vi.fn();
    render(<div {...activatable(onActivate)} data-testid="t">x</div>);
    fireEvent.keyDown(screen.getByTestId('t'), { key: 'a' });
    fireEvent.keyDown(screen.getByTestId('t'), { key: 'Tab' });
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('takes an accessible name when the content is not one', () => {
    render(<div {...activatable(() => {}, { label: 'View front photo' })}>x</div>);
    expect(screen.getByRole('button', { name: 'View front photo' })).toBeInTheDocument();
  });

  it('adds nothing when disabled, so no empty tab stop appears', () => {
    expect(activatable(() => {}, { disabled: true })).toEqual({});
  });
});

describe('no click handler is mouse-only', () => {
  const CLICKABLE = /<(div|span|li)\b/;

  function sources(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '__tests__') sources(p, out); continue; }
      if (/\.tsx$/.test(e.name)) out.push(p);
    }
    return out;
  }

  /**
   * A crude but honest element scan: from `<div` to the `>` that ends the
   * opening tag, tracking brace depth so a `style={{ … }}` does not end it
   * early. Good enough to answer "does this tag carry onClick, and does it
   * also carry a role".
   */
  function openingTags(src: string): { tag: string; start: number }[] {
    const out: { tag: string; start: number }[] = [];
    for (const m of src.matchAll(/<(div|span|li)\b/g)) {
      let depth = 0;
      let i = m.index! + m[0].length;
      for (; i < src.length; i++) {
        const c = src[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0) break;
      }
      out.push({ tag: src.slice(m.index!, i + 1), start: m.index! });
    }
    return out;
  }

  const offenders: string[] = [];
  const files = sources(join(process.cwd(), 'src'));

  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if (!CLICKABLE.test(src)) continue;
    const rel = relative(process.cwd(), f).replace(/\\/g, '/');
    const exempt = src.includes('a11y-exempt:');

    for (const { tag, start } of openingTags(src)) {
      if (!/\bonClick\b/.test(tag)) continue;
      if (/\brole=/.test(tag) || /\bonKeyDown\b/.test(tag) || /activatable\(/.test(tag)) continue;
      if (/aria-hidden/.test(tag)) continue;
      // A dismissal scrim, written either as Tailwind classes or an inline
      // style object.
      if (/inset-0|fixed inset|absolute inset/.test(tag)) continue;
      if (/position:\s*'fixed'/.test(tag) && /inset:\s*0/.test(tag)) continue;
      // A panel stopping the scrim behind it from seeing the click.
      if (/stopPropagation/.test(tag)) continue;
      if (exempt) continue;
      const line = src.slice(0, start).split('\n').length;
      offenders.push(`${rel}:${line}`);
    }
  }

  it('has no div, span or li that only responds to a mouse', () => {
    expect(offenders).toEqual([]);
  });

  it('scanned the app, so this cannot pass vacuously', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('would flag a bare clickable div', () => {
    // Pins the scanner itself: the exclusions above are broad enough that a
    // silently-matching-nothing version would look identical from here.
    const bare = openingTags('<div onClick={() => go()} className="card">');
    expect(bare).toHaveLength(1);
    expect(/\brole=/.test(bare[0].tag)).toBe(false);
    expect(/\bonClick\b/.test(bare[0].tag)).toBe(true);
  });

  it('does not flag a scrim or an activatable element', () => {
    const scrim = openingTags('<div className="fixed inset-0" onClick={onClose} />')[0];
    expect(/inset-0/.test(scrim.tag)).toBe(true);
    const ok = openingTags('<div {...activatable(go, { label: "Open" })} className="card">')[0];
    expect(/activatable\(/.test(ok.tag)).toBe(true);
  });
});
