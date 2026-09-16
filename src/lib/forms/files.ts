/**
 * File validation — §9.
 *
 * The brief's opening line on this is the whole point: `accept="image/*"` is
 * NOT security. Nor is `file.type`, and that is the part the audit found in
 * every one of the app's eleven upload sites.
 *
 * ── Why `file.type` proves nothing ──────────────────────────────────────────
 *
 * `File.type` is derived by the browser from the **file extension**, not from
 * the bytes. Rename `payload.html` to `photo.png` and every one of these passes:
 *
 *     accept="image/*"                     ← filters the picker, not the drop,
 *                                            not a paste, not a scripted submit
 *     file.type.startsWith('image/')       ← reports "image/png". It is not one.
 *     /^image\/(png|jpe?g|webp)$/.test(…)  ← same string, same lie
 *
 * All three shapes are in the codebase today. So this module reads the actual
 * leading bytes and compares them against the format's signature, which is the
 * one check the file cannot talk its way out of.
 *
 * ── What this is and is not ─────────────────────────────────────────────────
 *
 * This is a client-side gate. It exists to give the user an immediate, specific
 * answer and to stop obvious junk before an upload burns their data allowance —
 * not to secure the server. Anything here can be bypassed by not using the
 * browser at all, so §14 still holds: **the server must repeat every one of
 * these checks**, and a signature check server-side is the only one that counts.
 *
 * SVG is refused everywhere, deliberately. It is a valid image that is also a
 * script host: `<svg onload="…">` executes if the file is ever served inline
 * from the app's own origin. No feature here needs it.
 */

/** The formats the product accepts, with the bytes that identify each. */
export interface FileSignature {
  mime: string;
  extensions: readonly string[];
  /** Byte sequences at `offset`; any one matching identifies the format. */
  magic: ReadonlyArray<{ offset: number; bytes: readonly number[] }>;
  /** Extra bytes to check further in — WebP's "WEBP" after its RIFF header. */
  trailer?: { offset: number; bytes: readonly number[] };
  label: string;
}

const PNG: FileSignature = {
  mime: 'image/png',
  extensions: ['png'],
  magic: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  label: 'PNG image',
};

const JPEG: FileSignature = {
  mime: 'image/jpeg',
  extensions: ['jpg', 'jpeg'],
  // Only the SOI marker and the first byte of the following segment are fixed;
  // the fourth byte varies by encoder (JFIF, Exif, raw), so it is not checked.
  magic: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  label: 'JPEG image',
};

const WEBP: FileSignature = {
  mime: 'image/webp',
  extensions: ['webp'],
  magic: [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }], // "RIFF"
  // RIFF is a container used by WAV and AVI too, so the format word matters:
  // without it, a .wav renamed to .webp would pass.
  trailer: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP"
  label: 'WebP image',
};

const GIF: FileSignature = {
  mime: 'image/gif',
  extensions: ['gif'],
  magic: [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  label: 'GIF image',
};

const PDF: FileSignature = {
  mime: 'application/pdf',
  extensions: ['pdf'],
  magic: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }], // "%PDF-"
  label: 'PDF document',
};

/**
 * Plain text.
 *
 * Has no signature — that is what makes it plain text — so it is verified by
 * decoding instead. Kept in the same table so callers express every accepted
 * format one way.
 */
const TEXT: FileSignature = {
  mime: 'text/plain',
  extensions: ['txt'],
  magic: [],
  label: 'text file',
};

export const SIGNATURES = { PNG, JPEG, WEBP, GIF, PDF, TEXT } as const;

/** Photos: what an avatar, logo or progress picture may be. */
export const IMAGE_FORMATS = [PNG, JPEG, WEBP] as const;

/** Photos plus GIF, for galleries where an animation is legitimate. */
export const IMAGE_FORMATS_WITH_GIF = [PNG, JPEG, WEBP, GIF] as const;

/** Documents a member or trainer may attach. */
export const DOCUMENT_FORMATS = [PDF, PNG, JPEG] as const;

/** What the AI knowledge base ingests. */
export const KNOWLEDGE_FORMATS = [PDF, TEXT] as const;

export const MB = 1024 * 1024;

export interface FileRules {
  /** Accepted formats. An empty list accepts nothing, which is never useful. */
  formats: ReadonlyArray<FileSignature>;
  maxBytes: number;
  /** Rejects images larger than this in either dimension. */
  maxDimension?: number;
  /** Rejects images smaller than this — a logo scaled up looks broken. */
  minDimension?: number;
}

export type FileRejectionCode =
  | 'empty'
  | 'tooLarge'
  | 'extension'
  | 'signature'
  | 'corrupt'
  | 'dimensions';

export interface FileRejection {
  ok: false;
  code: FileRejectionCode;
  message: string;
}

export interface FileAcceptance {
  ok: true;
  /** The format the BYTES say it is, which may differ from `file.type`. */
  format: FileSignature;
  width?: number;
  height?: number;
}

export type FileCheck = FileAcceptance | FileRejection;

function reject(code: FileRejectionCode, message: string): FileRejection {
  return { ok: false, code, message };
}

/** Human-readable size, so a message says "4.2 MB" rather than "4404019". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1).replace(/\.0$/, '')} MB`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

function matches(head: Uint8Array, sig: FileSignature): boolean {
  if (sig.magic.length === 0) return false;

  const hit = sig.magic.some(({ offset, bytes }) =>
    bytes.every((b, i) => head[offset + i] === b),
  );
  if (!hit) return false;

  if (sig.trailer) {
    const { offset, bytes } = sig.trailer;
    if (!bytes.every((b, i) => head[offset + i] === b)) return false;
  }
  return true;
}

/** Enough for every signature above, including WebP's trailer at byte 8. */
const HEAD_BYTES = 32;

/**
 * Decode an image far enough to learn whether it decodes at all.
 *
 * A file can carry a perfect PNG signature and still be truncated or corrupt —
 * a half-finished upload, a bad SD card. `createImageBitmap` is the cheapest
 * way to make the browser actually parse it, and it rejects on anything it
 * cannot render. Falls back to an `<img>` load where it is unavailable.
 *
 * The object URL is revoked on every path, including the throwing one, which is
 * the leak §9 asks about.
 */
async function probeImage(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      return { width: bitmap.width, height: bitmap.height };
    } catch {
      return null;
    } finally {
      bitmap?.close();
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Check a file against the rules, reading its bytes.
 *
 * Async because reading bytes is. Ordered cheapest-first so a 400 MB video is
 * rejected on its size without ever being read.
 */
export async function checkFile(file: File, rules: FileRules): Promise<FileCheck> {
  const names = rules.formats.map((f) => f.label).join(', ');

  if (file.size === 0) {
    // A 0-byte file usually means a failed copy or a file still syncing. It
    // would pass a signature check vacuously, so it is caught first.
    return reject('empty', 'That file is empty. It may not have finished copying.');
  }

  if (file.size > rules.maxBytes) {
    return reject(
      'tooLarge',
      `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(rules.maxBytes)}.`,
    );
  }

  const ext = extensionOf(file.name);
  const extensionAllowed = rules.formats.some((f) => f.extensions.includes(ext));
  if (!extensionAllowed) {
    return reject('extension', `That file type is not accepted. Use ${names}.`);
  }

  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());

  const declared = rules.formats.find((f) => f.extensions.includes(ext))!;

  // Text has no signature; verify by decoding instead. A UTF-8 decode with
  // fatal:true rejects arbitrary binary, which is the useful distinction —
  // "is this actually text" rather than "does it start with the right bytes".
  if (declared.mime === 'text/plain' && declared.magic.length === 0) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(head);
      return { ok: true, format: declared };
    } catch {
      return reject('signature', 'That file is not readable text.');
    }
  }

  const actual = rules.formats.find((f) => matches(head, f));

  if (!actual) {
    // The specific case worth naming: the extension says one thing and the
    // bytes say nothing we recognise. Telling the user their file "is not
    // really a PNG" is more useful than "invalid file".
    return reject(
      'signature',
      `That file is named .${ext} but its contents are not a ${declared.label}. Use ${names}.`,
    );
  }

  if (actual.mime.startsWith('image/')) {
    const size = await probeImage(file);
    if (!size) {
      return reject('corrupt', 'That image could not be opened. It may be damaged.');
    }

    const longest = Math.max(size.width, size.height);
    const shortest = Math.min(size.width, size.height);

    if (rules.maxDimension && longest > rules.maxDimension) {
      return reject(
        'dimensions',
        `That image is ${size.width}×${size.height}. The limit is ${rules.maxDimension}px on the longest side.`,
      );
    }
    if (rules.minDimension && shortest < rules.minDimension) {
      return reject(
        'dimensions',
        `That image is ${size.width}×${size.height}. It needs to be at least ${rules.minDimension}px on each side.`,
      );
    }

    return { ok: true, format: actual, width: size.width, height: size.height };
  }

  return { ok: true, format: actual };
}

/**
 * The `accept` attribute for a rule set.
 *
 * Generated from the same source as the validation, so the picker's filter and
 * the check can never disagree. It remains a convenience for the user and not a
 * control — everything above still runs on whatever arrives.
 */
export function acceptAttribute(rules: Pick<FileRules, 'formats'>): string {
  const parts: string[] = [];
  for (const f of rules.formats) {
    parts.push(f.mime);
    for (const e of f.extensions) parts.push(`.${e}`);
  }
  return Array.from(new Set(parts)).join(',');
}

/* ──────────────────────────────────────────────────────────────────────────
 * The rule sets the app uses
 *
 * Named rather than written at each call site, because eleven upload sites
 * currently carry eight different `accept` strings and four different size
 * limits, and no two of them agree on what a photo is.
 * ────────────────────────────────────────────────────────────────────────── */

/** Avatars and client photos. Square-ish, small, no animation. */
export const AVATAR_RULES: FileRules = {
  formats: IMAGE_FORMATS,
  maxBytes: 5 * MB,
  maxDimension: 8000,
  minDimension: 64,
};

/** Studio logos. Same formats; a lower floor would render blurred. */
export const LOGO_RULES: FileRules = {
  formats: IMAGE_FORMATS,
  maxBytes: 2 * MB,
  maxDimension: 4000,
  minDimension: 64,
};

/** Portfolio and progress photos, where a GIF is legitimate. */
export const GALLERY_RULES: FileRules = {
  formats: IMAGE_FORMATS_WITH_GIF,
  maxBytes: 8 * MB,
  maxDimension: 10000,
  minDimension: 200,
};

/**
 * Payment proof: a screenshot or a bank PDF.
 *
 * 5 MB, matching `MAX_UPLOAD_BYTES` in `routes/upi-payments.js`. This was 10
 * when the rule sets were first written, which is the wrong direction to be
 * wrong in: a client limit ABOVE the server's lets a 7 MB screenshot through
 * the friendly, specific check and into a multer rejection whose message the
 * member cannot act on. The tighter of the two belongs here.
 */
export const PAYMENT_PROOF_RULES: FileRules = {
  formats: DOCUMENT_FORMATS,
  maxBytes: 5 * MB,
  maxDimension: 12000,
};

/** Medical clearance and certificates. */
export const DOCUMENT_RULES: FileRules = {
  formats: DOCUMENT_FORMATS,
  maxBytes: 10 * MB,
};

/** AI knowledge-base ingestion. */
export const KNOWLEDGE_RULES: FileRules = {
  formats: KNOWLEDGE_FORMATS,
  maxBytes: 20 * MB,
};

/**
 * Validate a picked file and read it as a data URL, in one step.
 *
 * The three photo pickers in the app each did this by hand:
 *
 *     if (!file.type.startsWith('image/')) { toast.error(…); return; }
 *     const reader = new FileReader();
 *     reader.onload = () => setSrc(String(reader.result));
 *     reader.readAsDataURL(file);
 *
 * — which trusts `file.type` and, more immediately, has **no size limit at
 * all**. `readAsDataURL` base64-encodes the whole file into a string, so it
 * costs about 1.37× the file's size in memory on top of the file itself. Pick a
 * few hundred megabytes and the tab stops responding before anything is
 * uploaded, with no message, because nothing failed — it is still working.
 *
 * So the size and signature checks run first and the read only happens for a
 * file that passed them.
 *
 * Returns a message rather than throwing: every call site shows it in a toast,
 * and an exception for "that is the wrong kind of file" is not an exception.
 */
export async function readImageAsDataUrl(
  file: File,
  rules: FileRules,
): Promise<{ ok: true; dataUrl: string } | { ok: false; message: string }> {
  const check = await checkFile(file, rules);
  if (!check.ok) return { ok: false, message: check.message };

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        resolve({ ok: false, message: 'That image could not be read.' });
        return;
      }
      resolve({ ok: true, dataUrl: result });
    };
    reader.onerror = () => resolve({ ok: false, message: 'That image could not be read.' });
    reader.readAsDataURL(file);
  });
}
