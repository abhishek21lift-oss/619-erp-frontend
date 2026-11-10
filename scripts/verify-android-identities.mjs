#!/usr/bin/env node
// Verify Android application identities across two folders that no CI can see.
//
// ── Why this exists ─────────────────────────────────────────────────────────
//
// `android-twa/` and `android-webview/` are not Git repositories, so they are
// not present in any CI checkout. Nothing else in the workspace compares them,
// and on 2026-11-10 they disagreed in the worst available way: both shipped an
// app called `com.myptstudio.member`, signed with different keys. Android
// treats a package ID as the app's identity, so the two can never be installed
// side by side and neither can update the other — one silently replaces the
// other or the install fails with a signature mismatch. Digital Asset Links
// (`public/.well-known/assetlinks.json`) makes it worse: that file names one
// fingerprint per package, so at most one of the two can pass TWA verification.
//
// This script is the comparison that was missing. It is read-only, has no
// dependencies, and is meant to be run before building or publishing:
//
//   npm run verify:android
//
// It exits 0 when every identity is unambiguous, and 1 with one line per
// problem otherwise. Also checks built APKs when aapt2/apksigner are installed,
// because a release signed with the wrong key fails at install time with a
// message no user can act on.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(here, '..', '..');
const frontend = path.resolve(here, '..');

const TWA_DIR = path.join(workspace, 'android-twa');
const WEBVIEW_DIR = path.join(workspace, 'android-webview');
const ASSETLINKS = path.join(frontend, 'public', '.well-known', 'assetlinks.json');

/** Uppercase, no colons — so `AA:BB` and `aabb` compare equal. */
export const normalizeFingerprint = (value) =>
  String(value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Every app identity declared by a manifest or Capacitor config. */
export function readApps(twaDir = TWA_DIR, webviewDir = WEBVIEW_DIR) {
  const apps = [];
  if (fs.existsSync(twaDir)) {
    for (const entry of fs.readdirSync(twaDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(twaDir, entry.name, 'twa-manifest.json');
      if (!fs.existsSync(file)) continue;
      const manifest = readJson(file);
      apps.push({
        kind: 'twa',
        source: path.relative(workspace, file),
        packageId: manifest.packageId,
        fingerprints: (manifest.fingerprints || []).map((f) => normalizeFingerprint(f.value)),
      });
    }
  }
  if (fs.existsSync(webviewDir)) {
    for (const name of fs.readdirSync(webviewDir)) {
      if (!/^capacitor.*\.config\.json$/.test(name)) continue;
      const file = path.join(webviewDir, name);
      const config = readJson(file);
      apps.push({
        kind: 'webview',
        source: path.relative(workspace, file),
        packageId: config.appId,
        fingerprints: [],
      });
    }
  }
  return apps;
}

/**
 * The rules, as a pure function so they can be tested without these folders.
 *
 * `apps`: [{kind, source, packageId, fingerprints}]
 * `links`: parsed assetlinks.json entries (only android_app targets matter).
 */
export function lintIdentities(apps, links) {
  const errors = [];
  const byPackage = new Map();

  for (const app of apps) {
    if (!app.packageId) {
      errors.push(`${app.source}: has no package id`);
      continue;
    }
    if (!byPackage.has(app.packageId)) byPackage.set(app.packageId, []);
    byPackage.get(app.packageId).push(app);
  }

  for (const [packageId, owners] of byPackage) {
    if (owners.length > 1) {
      const kinds = new Set(owners.map((o) => o.kind));
      errors.push(
        `${packageId} is declared by ${owners.map((o) => o.source).join(' and ')} — ` +
          (kinds.size > 1
            ? 'a TWA and a WebView shell cannot share one package id (different signing keys: installs conflict and updates fail). Give the WebView shell its own id, e.g. ' +
              `${packageId}.webview, or retire one app. This is an identity decision, not a build fix.`
            : 'two apps cannot share one package id.'),
      );
    }
  }

  const linkTargets = new Map(
    (links || [])
      .filter((entry) => entry.target && entry.target.namespace === 'android_app')
      .map((entry) => [
        entry.target.package_name,
        (entry.target.sha256_cert_fingerprints || []).map(normalizeFingerprint),
      ]),
  );

  for (const app of apps) {
    if (app.kind !== 'twa') continue; // Only TWA verifies the domain via assetlinks.
    if (!linkTargets.has(app.packageId)) {
      errors.push(
        `${app.source}: ${app.packageId} has no entry in public/.well-known/assetlinks.json — ` +
          'the TWA would open with a browser bar instead of full screen.',
      );
      continue;
    }
    const allowed = linkTargets.get(app.packageId);
    for (const fingerprint of app.fingerprints.map(normalizeFingerprint)) {
      if (!allowed.includes(fingerprint)) {
        errors.push(
          `${app.source}: fingerprint ${fingerprint} is not listed for ${app.packageId} ` +
            'in assetlinks.json — the installed app will fail domain verification.',
        );
      }
    }
  }

  for (const packageId of linkTargets.keys()) {
    if (!byPackage.has(packageId)) {
      errors.push(
        `assetlinks.json lists ${packageId} but no Android project declares it — stale ` +
          'entry, or the app was renamed without updating the published file.',
      );
    }
  }

  return errors;
}

/** First apksigner/aapt2 under ANDROID_HOME, ~/Android/Sdk, or PATH. */
export function findBuildTool(name) {
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.HOME || '', 'Android', 'Sdk'),
  ].filter(Boolean);
  for (const root of roots) {
    const dir = path.join(root, 'build-tools');
    if (!fs.existsSync(dir)) continue;
    const versions = fs.readdirSync(dir).sort().reverse();
    for (const version of versions) {
      const tool = path.join(dir, version, name);
      if (fs.existsSync(tool)) return tool;
    }
  }
  try {
    return execFileSync('sh', ['-c', `command -v ${name}`], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function apkIdentity(file, aapt2, apksigner) {
  const packageId = execFileSync(aapt2, ['dump', 'packagename', file], { encoding: 'utf8' })
    .split('\n')[0]
    .trim();
  const output = execFileSync(apksigner, ['verify', '--print-certs', file], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const match = output.match(/certificate SHA-256 digest:\s*([0-9a-f]+)/i);
  return { file, packageId, fingerprint: match ? normalizeFingerprint(match[1]) : null };
}

/** APKs sitting in the folders this script already knows about. */
function findApks() {
  const found = [];
  const dist = path.join(TWA_DIR, 'dist');
  if (fs.existsSync(dist)) {
    for (const name of fs.readdirSync(dist)) {
      if (name.endsWith('.apk')) found.push(path.join(dist, name));
    }
  }
  if (fs.existsSync(WEBVIEW_DIR)) {
    for (const name of fs.readdirSync(WEBVIEW_DIR)) {
      if (name.endsWith('.apk')) found.push(path.join(WEBVIEW_DIR, name));
    }
  }
  return found;
}

function main() {
  const apps = readApps();
  if (apps.length === 0) {
    console.error('verify:android — neither android-twa/ nor android-webview/ is present.');
    return 1;
  }

  const links = fs.existsSync(ASSETLINKS) ? readJson(ASSETLINKS) : [];
  const errors = lintIdentities(apps, links);

  const aapt2 = findBuildTool('aapt2');
  const apksigner = findBuildTool('apksigner');
  const apks = findApks();

  if (apks.length === 0) {
    console.log('verify:android — no built APKs to check; manifest/config identities only.');
  } else if (!aapt2 || !apksigner) {
    console.log('verify:android — SKIPPED APK signature check (aapt2/apksigner not found).');
  } else {
    const seen = new Map();
    for (const file of apks) {
      const identity = apkIdentity(file, aapt2, apksigner);
      const label = path.relative(workspace, file);
      const previous = seen.get(identity.packageId);
      if (previous && previous.fingerprint !== identity.fingerprint) {
        errors.push(
          `${label} and ${previous.file} are both ${identity.packageId} but signed with ` +
            'different keys — one cannot update the other on any device.',
        );
      }
      seen.set(identity.packageId, { file: label, fingerprint: identity.fingerprint });
      console.log(`verify:android — ${label}: ${identity.packageId} ${identity.fingerprint || '(no cert)'}`);
    }
  }

  if (errors.length) {
    console.error(`\nverify:android — ${errors.length} problem(s):`);
    for (const error of errors) console.error(`  ✗ ${error}`);
    return 1;
  }

  console.log('verify:android — package ids and signing fingerprints agree.');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
