# TWA Android APKs (studio + member) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two signed Trusted Web Activity Android apps from the existing PWA — studio (`com.myptstudio.studio`) and member (`com.myptstudio.member`) — and make Digital Asset Links verification possible.

**Architecture:** Bubblewrap generates a native Android shell per app that opens `https://myptstudio.com` in Chrome's TWA engine. The only Next.js change is publishing `/.well-known/assetlinks.json` without auth. Signing keys and generated Android projects live outside the repo.

**Tech Stack:** Bubblewrap CLI 1.27, JDK 17, Android SDK 35, Next.js 16 proxy, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-twa-android-apks-design.md`

## Global Constraints

- Do not commit or push. Leave changes in the working tree.
- Do not modify unrelated user changes in `619-erp-frontend` (the tree is dirty).
- Package IDs are exact: `com.myptstudio.studio`, `com.myptstudio.member`.
- Start URLs are exact: `/`, `/member/dashboard`.
- Keys live in `~/.myptstudio/keys/`, mode `600`, never in the repo.
- Bubblewrap projects live in `/home/oem/Desktop/myptstudio/android-twa/`.
- Production deploy of `assetlinks.json` requires a separate explicit approval.
- Existing `.github/workflows/android-apk.yml` is out of scope; leave it untouched.

## Review Focus

- `/.well-known/assetlinks.json` must return `200` without a session, not `307`.
- Each package's fingerprint must match its own keystore; a wrong one leaves that app with a URL bar.
- The member APK must start at `/member/dashboard`, never `/`.
- No keystore, password, or generated APK/AAB may enter git.
- Both package IDs in the APK must match the assetlinks entries.

---

### Task 1: Generate the two signing keys

**Files:**
- Create: `~/.myptstudio/keys/studio.jks`
- Create: `~/.myptstudio/keys/member.jks`
- Create: `~/.myptstudio/keys/credentials.txt` (mode 600)

**Interfaces:**
- Produces: aliases `studio` and `member`; SHA-256 fingerprints used by Task 2.

- [ ] **Step 1: Create the key directory with restrictive permissions**

```bash
install -d -m 700 ~/.myptstudio/keys
```

- [ ] **Step 2: Generate two RSA 2048 keys, 10000 days, distinct random passwords**

Use `openssl rand -base64 24` per keystore. Write `keystore=`, `alias=`, `storepass=`, `keypass=` lines to `credentials.txt` with mode 600. Do not print the passwords to the chat.

- [ ] **Step 3: Extract both SHA-256 fingerprints**

```bash
keytool -list -v -keystore ~/.myptstudio/keys/studio.jks -alias studio -storepass "$STUDIO_PASS" | awk '/SHA256:/{print $2}'
```

Expected: 32 colon-separated byte pairs per key.

---

### Task 2: Publish assetlinks and allow it through the proxy

**Files:**
- Create: `public/.well-known/assetlinks.json`
- Modify: `src/proxy.ts` (add `/.well-known` to `PUBLIC_ASSET_PREFIXES`)
- Test: `src/__tests__/twa-assetlinks.test.ts`

**Interfaces:**
- Consumes: fingerprints from Task 1.
- Produces: public URL `https://myptstudio.com/.well-known/assetlinks.json`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPublicProxyPath } from '@/proxy';

const links = JSON.parse(readFileSync(join(process.cwd(), 'public/.well-known/assetlinks.json'), 'utf8'));

describe('TWA Digital Asset Links', () => {
  it('lists both Android apps with a SHA-256 fingerprint each', () => {
    expect(links.map((l: any) => l.target.package_name).sort()).toEqual([
      'com.myptstudio.member',
      'com.myptstudio.studio',
    ]);
    for (const l of links) {
      expect(l.target.sha256_cert_fingerprints).toHaveLength(1);
      expect(l.target.sha256_cert_fingerprints[0]).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    }
  });

  it('is served without a session', () => {
    expect(isPublicProxyPath('/.well-known/assetlinks.json')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/__tests__/twa-assetlinks.test.ts`
Expected: FAIL — file missing and path not public.

- [ ] **Step 3: Write `assetlinks.json` with both fingerprints and add `/.well-known` to `PUBLIC_ASSET_PREFIXES`**

- [ ] **Step 4: Run the test and the neighbouring PWA tests**

Run: `npx vitest run src/__tests__/twa-assetlinks.test.ts src/__tests__/member-pwa.test.ts src/__tests__/command-center-separation.test.ts`
Expected: PASS.

---

### Task 3: Create and build both Bubblewrap projects

**Files:**
- Create: `/home/oem/Desktop/myptstudio/android-twa/studio/`
- Create: `/home/oem/Desktop/myptstudio/android-twa/member/`
- Create: `/home/oem/Desktop/myptstudio/android-twa/dist/`

**Interfaces:**
- Consumes: keys from Task 1.
- Produces: two `app-release-signed.apk` and two `app-release-bundle.aab` files.

- [ ] **Step 1: Install the Android SDK command-line tools and packages**

Install to `~/.android-sdk` (command-line tools, platform-tools, `platforms;android-35`, `build-tools;35.0.0`). Accept licenses non-interactively.

- [ ] **Step 2: Point Bubblewrap at JDK 17 and the SDK**

Write `~/.bubblewrap/config.json`:

```json
{ "jdkPath": "/usr/lib/jvm/java-17-openjdk-amd64", "androidSdkPath": "/home/oem/.android-sdk" }
```

- [ ] **Step 3: Create each project**

Run `npx @bubblewrap/cli@1.27.0 init --manifest https://myptstudio.com/manifest.json --directory android-twa/studio` and the member equivalent with `member-manifest.json`. Set package ID, names, start URL, icons, and signing key path/alias. Use `twa-manifest.json` values from the design.

- [ ] **Step 4: Build both**

```bash
BUBBLEWRAP_KEYSTORE_PASSWORD=... BUBBLEWRAP_KEY_PASSWORD=... npx @bubblewrap/cli@1.27.0 build --manifest android-twa/studio/twa-manifest.json
```

Repeat for member. Expected: signed APK and AAB in each project directory.

- [ ] **Step 5: Copy artifacts to `android-twa/dist/`**

Expected filenames: `mypt-studio-release.apk`, `mypt-studio-release.aab`, `mypt-member-release.apk`, `mypt-member-release.aab`.

---

### Task 4: Verify

- [ ] **Step 1: Verify signatures and package IDs**

Run `apksigner verify --print-certs` and `aapt dump badging` on both APKs. Expected: `com.myptstudio.studio` / `com.myptstudio.member`, version `1.0.0`, matching SHA-256.

- [ ] **Step 2: Run the frontend checks that the change can reach**

Run: `npx vitest run src/__tests__/twa-assetlinks.test.ts src/__tests__/member-pwa.test.ts src/__tests__/command-center-separation.test.ts`
Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Confirm no secrets or build output entered git**

Run: `git status --short` and `git diff --check`.
Expected: only the three intended files plus pre-existing user changes.

- [ ] **Step 4: After approved deploy, verify assetlinks**

Run: `curl -sSI https://myptstudio.com/.well-known/assetlinks.json`
Expected: `200`, `application/json`, no redirect.

- [ ] **Step 5: Device smoke test (owner's phone)**

Install each APK, confirm distinct app names/icons, no URL bar, studio opens `/`, member opens `/member/dashboard` (or member login).
