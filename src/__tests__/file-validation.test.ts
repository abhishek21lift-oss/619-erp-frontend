/**
 * File validation — §9.
 *
 * The test that matters is the renamed file: every check in the codebase today
 * reads `file.type`, which the browser derives from the extension, so a file
 * that is not an image but is named `.png` passes all of them. These assert
 * that reading the bytes catches it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkFile,
  acceptAttribute,
  formatBytes,
  AVATAR_RULES,
  LOGO_RULES,
  DOCUMENT_RULES,
  KNOWLEDGE_RULES,
  IMAGE_FORMATS,
  MB,
  type FileRules,
} from '../lib/forms/files';

/* ── Builders ─────────────────────────────────────────────────────────────── */

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0];
const GIF_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];

/** "RIFF" + 4 size bytes + "WEBP". */
const WEBP_MAGIC = [
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];

/** RIFF header with a WAVE format word — a .wav pretending to be .webp. */
const WAVE_MAGIC = [
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
];

function makeFile(
  name: string,
  magic: number[],
  { size = 1024, type = '' }: { size?: number; type?: string } = {},
): File {
  const body = new Uint8Array(Math.max(size, magic.length));
  body.set(magic, 0);
  return new File([body], name, { type });
}

/* ── Image probe ──────────────────────────────────────────────────────────
 *
 * jsdom cannot decode an image, so `createImageBitmap` is stubbed. The stub
 * returns a size for well-formed fixtures and throws for the ones marked
 * corrupt, which is exactly what a real browser does — so the code under test
 * takes the same branches it takes in production.
 */
let bitmapSize = { width: 800, height: 600 };
let bitmapThrows = false;

beforeEach(() => {
  bitmapSize = { width: 800, height: 600 };
  bitmapThrows = false;
  vi.stubGlobal('createImageBitmap', async () => {
    if (bitmapThrows) throw new Error('decode failed');
    return { width: bitmapSize.width, height: bitmapSize.height, close() {} };
  });
});

afterEach(() => vi.unstubAllGlobals());

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('the renamed file — what accept= and file.type cannot catch', () => {
  it('rejects an executable renamed to .png, even when the browser says image/png', async () => {
    // This is the whole point. `accept="image/*"` lets it through the picker
    // when dropped, and `file.type` reports "image/png" because the browser
    // derived it from the extension. Only the bytes disagree.
    const evil = makeFile('photo.png', [0x4d, 0x5a, 0x90, 0x00], { type: 'image/png' });
    const r = await checkFile(evil, AVATAR_RULES);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('signature');
    expect(r.message).toContain('not a PNG image');
  });

  it('rejects an HTML file renamed to .jpg', async () => {
    const html = makeFile('pic.jpg', [0x3c, 0x21, 0x44, 0x4f], { type: 'image/jpeg' });
    const r = await checkFile(html, AVATAR_RULES);
    expect(r.ok).toBe(false);
  });

  it('rejects a WAV renamed to .webp, despite the shared RIFF header', async () => {
    // RIFF is a container used by WAV and AVI too, so the magic alone is not
    // enough — the format word at byte 8 is what separates them.
    const wav = makeFile('clip.webp', WAVE_MAGIC, { type: 'image/webp' });
    const r = await checkFile(wav, AVATAR_RULES);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('signature');

    const webp = makeFile('real.webp', WEBP_MAGIC, { type: 'image/webp' });
    expect((await checkFile(webp, AVATAR_RULES)).ok).toBe(true);
  });

  it('accepts a genuine file whose browser MIME is missing entirely', async () => {
    // Drag-and-drop and some mobile pickers supply no type at all. Trusting
    // file.type would reject a perfectly good photo here.
    const png = makeFile('photo.png', PNG_MAGIC, { type: '' });
    expect((await checkFile(png, AVATAR_RULES)).ok).toBe(true);
  });
});

describe('formats', () => {
  it('accepts each declared image format by its bytes', async () => {
    for (const [name, magic] of [
      ['a.png', PNG_MAGIC],
      ['a.jpg', JPEG_MAGIC],
      ['a.jpeg', JPEG_MAGIC],
      ['a.webp', WEBP_MAGIC],
    ] as const) {
      const r = await checkFile(makeFile(name, magic as number[]), AVATAR_RULES);
      expect(r.ok, `${name} should be accepted`).toBe(true);
    }
  });

  it('refuses a format not in the rule set even when it is a real image', async () => {
    // A real GIF, but avatars do not take animation.
    const gif = makeFile('a.gif', GIF_MAGIC, { type: 'image/gif' });
    const r = await checkFile(gif, AVATAR_RULES);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('extension');
  });

  it('refuses SVG everywhere', async () => {
    // A valid image that is also a script host: <svg onload="…"> runs if the
    // file is ever served inline from the app's own origin.
    const svg = makeFile('logo.svg', [0x3c, 0x73, 0x76, 0x67], { type: 'image/svg+xml' });
    for (const rules of [AVATAR_RULES, LOGO_RULES, DOCUMENT_RULES]) {
      const r = await checkFile(svg, rules);
      expect(r.ok).toBe(false);
    }
  });

  it('accepts a PDF for documents and rejects it for avatars', async () => {
    const pdf = makeFile('scan.pdf', PDF_MAGIC, { type: 'application/pdf' });
    expect((await checkFile(pdf, DOCUMENT_RULES)).ok).toBe(true);
    expect((await checkFile(pdf, AVATAR_RULES)).ok).toBe(false);
  });

  it('verifies text by decoding it, since text has no signature', async () => {
    const text = new File([new TextEncoder().encode('hello notes')], 'notes.txt', {
      type: 'text/plain',
    });
    expect((await checkFile(text, KNOWLEDGE_RULES)).ok).toBe(true);

    // Arbitrary binary named .txt: a UTF-8 decode with fatal:true refuses it.
    const binary = makeFile('notes.txt', [0xff, 0xfe, 0x00, 0x80, 0x81, 0x82]);
    const r = await checkFile(binary, KNOWLEDGE_RULES);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('signature');
  });
});

describe('size', () => {
  it('rejects an empty file before reading anything', async () => {
    // A 0-byte file would pass a signature check vacuously.
    const r = await checkFile(new File([], 'photo.png'), AVATAR_RULES);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('empty');
      expect(r.message).toContain('finished copying');
    }
  });

  it('rejects an oversized file and names both numbers', async () => {
    const big = makeFile('photo.png', PNG_MAGIC, { size: 6 * MB });
    const r = await checkFile(big, AVATAR_RULES);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('tooLarge');
      expect(r.message).toContain('6 MB');
      expect(r.message).toContain('5 MB');
    }
  });

  it('accepts a file exactly at the limit', async () => {
    const exact = makeFile('photo.png', PNG_MAGIC, { size: 5 * MB });
    expect((await checkFile(exact, AVATAR_RULES)).ok).toBe(true);
  });

  it('formats sizes the way a person reads them', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * MB)).toBe('5 MB');
    expect(formatBytes(1.5 * MB)).toBe('1.5 MB');
  });
});

describe('images', () => {
  it('rejects one that cannot be decoded', async () => {
    // Correct signature, damaged body — a truncated upload or a bad card.
    bitmapThrows = true;
    const r = await checkFile(makeFile('photo.png', PNG_MAGIC), AVATAR_RULES);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('corrupt');
      expect(r.message).toContain('damaged');
    }
  });

  it('enforces a maximum dimension', async () => {
    bitmapSize = { width: 20000, height: 100 };
    const r = await checkFile(makeFile('wide.png', PNG_MAGIC), AVATAR_RULES);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('dimensions');
      expect(r.message).toContain('20000×100');
    }
  });

  it('enforces a minimum dimension on the SHORTEST side', async () => {
    // A 4000×10 strip has a huge longest side and is still unusable as a logo.
    bitmapSize = { width: 4000, height: 10 };
    const r = await checkFile(makeFile('strip.png', PNG_MAGIC), LOGO_RULES);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('dimensions');
  });

  it('returns the real dimensions on success', async () => {
    bitmapSize = { width: 1200, height: 900 };
    const r = await checkFile(makeFile('photo.png', PNG_MAGIC), AVATAR_RULES);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.width).toBe(1200);
      expect(r.height).toBe(900);
      expect(r.format.mime).toBe('image/png');
    }
  });

  it('does not probe a non-image', async () => {
    // A PDF must not be run through an image decoder; it would fail and be
    // reported as corrupt rather than accepted.
    bitmapThrows = true;
    const pdf = makeFile('scan.pdf', PDF_MAGIC);
    expect((await checkFile(pdf, DOCUMENT_RULES)).ok).toBe(true);
  });
});

describe('the accept attribute is generated from the rules', () => {
  it('lists every mime and extension for the rule set', () => {
    const accept = acceptAttribute({ formats: IMAGE_FORMATS });
    for (const part of ['image/png', '.png', 'image/jpeg', '.jpg', '.jpeg', 'image/webp', '.webp']) {
      expect(accept).toContain(part);
    }
  });

  it('never advertises a format the rules would reject', async () => {
    // The picker filter and the validation come from one source, so they
    // cannot drift into offering something that is then refused.
    const rules: FileRules = { formats: IMAGE_FORMATS, maxBytes: MB };
    const accept = acceptAttribute(rules);
    expect(accept).not.toContain('gif');
    expect(accept).not.toContain('svg');
    expect(accept).not.toContain('pdf');

    const gif = makeFile('a.gif', GIF_MAGIC);
    expect((await checkFile(gif, rules)).ok).toBe(false);
  });
});
