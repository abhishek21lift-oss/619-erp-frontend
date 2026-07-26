// Copy Excalidraw's runtime assets (fonts) into public/ so they are served
// from our own origin.
//
// Why this exists: by default Excalidraw resolves its fonts from
// https://esm.sh/@excalidraw/excalidraw@<version>/dist/prod/fonts/... at
// runtime. That is a third-party CDN request from an authenticated medical/
// training app, and our CSP (see src/proxy.ts) correctly refuses it — the
// fonts silently fail to load and hand-drawn text falls back to a system font.
// Self-hosting fixes the CSP violation, removes a third-party dependency from
// the render path, and keeps boards working if esm.sh is down.
//
// Run on postinstall rather than committing the fonts, so they always match
// the installed package version instead of drifting after an upgrade.
//
// Xiaolai (CJK) is deliberately skipped: it is 13 MB of the 14 MB total. If
// CJK text support on canvas is ever needed, drop it from SKIP below.

import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'node_modules', '@excalidraw', 'excalidraw', 'dist', 'prod', 'fonts');
const DEST = path.join(root, 'public', 'excalidraw-assets', 'fonts');

const SKIP = new Set(['Xiaolai']);

if (!existsSync(SRC)) {
  // Not an error: this runs on every install, including ones where the
  // optional canvas dependency is absent (e.g. a CI job that only lints).
  console.log('[excalidraw-assets] package not installed, skipping');
  process.exit(0);
}

await rm(DEST, { recursive: true, force: true });
await mkdir(DEST, { recursive: true });

const families = await readdir(SRC, { withFileTypes: true });
let copied = 0;
for (const entry of families) {
  if (!entry.isDirectory() || SKIP.has(entry.name)) continue;
  await cp(path.join(SRC, entry.name), path.join(DEST, entry.name), { recursive: true });
  copied += 1;
}

console.log(`[excalidraw-assets] copied ${copied} font families to public/excalidraw-assets/fonts`);
