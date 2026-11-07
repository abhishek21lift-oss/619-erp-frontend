# Android APKs — TWA + Bubblewrap (studio and member)

Date: 2026-11-07
Status: proposed, awaiting approval

## Intent

Ship two installable Android apps from the existing PWA: one for the studio
(owner/trainer) and one for the member portal. Both open the live site; the
Next.js app stays the single source of truth.

## Goals

- Two signed APKs and two signed AABs, one per app.
- Full-screen Trusted Web Activity (no browser URL bar) after Digital Asset
  Links verification.
- No rewrite of the Next.js app, no duplicated screens.
- Signing keys stay outside the repository and are recoverable.

## Non-goals

- Offline data access. The APK needs a connection; offline shows `/offline.html`.
- iOS. An APK is Android-only.
- Google Play submission and store listing.
- Push notifications.
- Replacing the existing Capacitor CI workflow (follow-up decision).
- Distinct studio/member launcher icons (follow-up; both manifests currently
  use the same mark).

## Constraints

- The app is server-rendered (`export const dynamic = 'force-dynamic'`) with
  API routes and cookie auth. A bundled/static APK is not viable; the shell must
  load `https://myptstudio.com`.
- `/.well-known/assetlinks.json` is currently intercepted by `src/proxy.ts` and
  answers `307` to `/login`. It must be public or TWA verification fails.
- nginx proxies `location /` straight to Next.js with no dotfile deny rule, so
  the file reaches Next once the proxy allows it. The Docker image copies
  `public/`, so it ships with a normal frontend deploy.
- Bubblewrap needs JDK 17 and the Android SDK. The machine has JDK 17 but no
  Android SDK; Bubblewrap can download its own copy (~1 GB, license prompt).
- Production deploy of `assetlinks.json` is a separate, explicitly approved
  action.

## Approach

TWA via Bubblewrap, two independent Android projects.

| App | Package ID | Start URL | Web manifest |
|---|---|---|---|
| Studio | `com.myptstudio.studio` | `/` | `https://myptstudio.com/manifest.json` |
| Member | `com.myptstudio.member` | `/member/dashboard` | `https://myptstudio.com/member-manifest.json` |

Package IDs are permanent once published to Play. Both apps point at the same
host, which is supported: Digital Asset Links lists both package/fingerprint
pairs in one file.

### Locations

- Bubblewrap projects: `/home/oem/Desktop/myptstudio/android-twa/studio` and
  `/home/oem/Desktop/myptstudio/android-twa/member` (outside the app repo).
- Signing keys: `~/.myptstudio/keys/studio.jks` and
  `~/.myptstudio/keys/member.jks`, aliases `studio` and `member`, file mode
  `600`. Passwords are generated locally, saved to a `600` credentials file and
  must be copied into the owner's password manager. They never enter git.
- Outputs: `/home/oem/Desktop/myptstudio/android-twa/dist/`.

### App metadata

- Studio name `MY PT STUDIO`; member name `MY PT STUDIO Member`, launcher name
  `My PT Member`.
- Theme/background: studio `#FFFFFF`, member `#F8FAFC` (matches the manifests).
- Icons: existing `icon-512.png` and `icon-maskable-512.png`.
- Version `1.0.0`, versionCode `1`.
- `display: standalone`, orientation follows the existing manifest
  (`portrait-primary`).
- Notifications delegation disabled until push exists.

## App-repo changes

1. `public/.well-known/assetlinks.json` (new) — both package names and their
   SHA-256 signing fingerprints.
2. `src/proxy.ts` — add `/.well-known` to `PUBLIC_ASSET_PREFIXES`.
3. `src/__tests__/twa-assetlinks.test.ts` (new) — asserts the file lists both
   packages and that the proxy treats the path as public.

No `package.json` dependency changes. No Capacitor dependency changes.

## Build sequence

1. Create keys with `keytool` (RSA 2048, validity 10000 days).
2. Generate both Bubblewrap projects from the two manifests; set package IDs,
   names, start URLs and icon URLs.
3. Extract SHA-256 fingerprints; write `assetlinks.json` and the proxy change.
4. `bubblewrap build` for each project with password env vars; outputs
   `app-release-signed.apk` and `app-release-bundle.aab`.
5. Verify package ID, version, signature, and that the APK opens the expected
   start URL.
6. Deploy the frontend (assetlinks included) after explicit approval, then
   confirm `https://myptstudio.com/.well-known/assetlinks.json` returns `200`
   with `application/json`.
7. Install on a physical Android device and confirm full-screen mode (no URL
   bar), login, and member/studio routing.

## Verification

- `keytool -list -v` fingerprints match the deployed assetlinks entries.
- `apksigner verify --print-certs` on both APKs.
- `aapt dump badging` confirms package IDs and version.
- `curl -I` on the assetlinks URL returns `200`, not `307`.
- `bubblewrap validate --url https://myptstudio.com` and the member URL.
- Device test. No Android device or emulator is available on this machine, so
  this step needs the owner's phone or a later emulator setup.

## Risks

- Assetlinks not deployed: apps install and run, but show a browser URL bar.
- Lost signing key: no future updates under the same package ID.
- Site down or offline: the shell has nothing to show except `offline.html`.
- Old `android-apk.yml` keeps producing a debug Capacitor APK on `main`; it is
  not the TWA deliverable and should be retired or replaced in a later change.
- Two apps share one icon; users may confuse them until distinct icons are made.

## Open decisions

- Sideload only, or Play Store later? The build produces both APK and AAB, so
  this does not block the work.
- Retire `android-apk.yml` now or after the TWAs are verified? Proposed: after.
