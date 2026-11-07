# Fingerprint login enrollment after first sign-in

Date: 2026-11-07
Status: proposed, awaiting approval

## Intent

After a user signs in with email and password once, offer to enable
fingerprint sign-in on that Android phone, so later sign-ins can use the
device biometric instead of a remembered password.

The mechanism already exists: WebAuthn passkeys, `/api/auth/webauthn/*`,
`useWebAuthn`, and the "Sign in with Face ID / Fingerprint" button on
`SignInScreen`. The missing piece is enrollment: nothing prompts a user to
create a passkey, and the member portal has no passkey settings entry at all.

## Goals

- Show a one-time, dismissible enrollment card after sign-in when the phone
  has a platform authenticator and the account has no passkey yet.
- One tap registers the passkey through the existing endpoints.
- Works in both apps: studio (`AppShell`) and member (`MemberShell`).
- No backend, schema, or auth-protocol changes.

## Non-goals

- Silent/automatic passkey creation without a separate tap.
- Native Android biometric app-lock. The TWA uses the web origin, so the
  WebAuthn passkey is the correct mechanism; no Android native code changes.
- A new passkey management screen for members. The card reappears after its
  snooze period until a passkey exists.
- Changing passkey sign-in, MFA, or session lifetime.

## Constraints

- `navigator.credentials.create()` must run from a user tap; the card's
  **Enable** button provides it.
- Passkeys are user-scoped in `user_webauthn_credentials`; existing `auth`
  middleware means a user can only list and register their own credentials.
- `MemberShell` remounts on every member page, so eligibility must be cached
  per session to avoid an API call on every navigation.
- The prompt must not appear on shared studio devices once the account has a
  passkey.

## Approaches considered

1. **Post-login enrollment card (chosen).** Compact card at the top of the
   signed-in shell. Detects biometric support and zero credentials, and
   registers on tap. Reliable user gesture, explicit consent, one extra tap
   ever.
2. **Checkbox on the password form.** Register as part of the login submit.
   Fewer taps, but the WebAuthn call runs after a password/MFA network
   round-trip, where transient user activation may already be gone, and the
   consent is easy to miss.
3. **Settings-only entry.** Add a "Fingerprint login" row to the member
   account page and rely on the existing trainer settings page. Smallest
   diff, but it does not meet "after the first login" and relies on the user
   finding the setting.

## Design

### Component

New client component `src/components/auth/PasskeySetupPrompt.tsx`.

Eligibility, checked once per signed-in user per browser session:

- `isWebAuthnSupported()` and `isBiometricAvailable()` are true.
- `useFeatures().enabled('passkeys')` is not disabled (same key the trainer
  nav uses).
- `api.webauthn.listCredentials()` returns no credentials at all (active or
  disabled). A deliberately disabled passkey means the user chose not to use
  it, so do not prompt.
- The snooze key is absent.

State:

- `Enable fingerprint` → `useWebAuthn().register(deviceName)` with
  `deviceName` derived from the user agent (`Android phone` / `This device`).
- Success → short confirmation, card hides, session is marked checked.
- Failure → inline `webAuthnError(err)` and the card stays, so the user can
  retry.
- `Not now` → writes a snooze timestamp; the card returns after 7 days if no
  passkey exists. No permanent dismissal, because the member portal has no
  passkey settings screen.

Keys are namespaced by `user.id`, so two accounts on the same phone do not
share state:

- `passkey.prompt.checked.<userId>` (sessionStorage, one eligibility check
  per session)
- `passkey.prompt.snoozed.<userId>` (localStorage, 7-day snooze)

### Mount points

- Trainer: `src/components/AppShell.tsx`, inside `<main>` above the page
  subtree. `AppShell` is a layout and stays mounted across navigation.
- Member: `src/components/member/MemberShell.tsx`, above `{children}` inside
  the existing max-width container.

The card uses the shared card surface tokens (`--bg-card`, `--border`,
`--brand`) so it reads the same in both shells. Buttons are at least 44px,
the card is a labelled region, and the fingerprint icon is decorative.

### Copy

- Title: "Sign in faster with fingerprint"
- Body: "Enable fingerprint login on this phone and skip your password next
  time. Your fingerprint never leaves this device."
- Actions: "Enable fingerprint" / "Not now"
- Success: "Fingerprint login enabled."

## Verification

- New `src/__tests__/passkey-setup-prompt.test.tsx`:
  - shows when biometric is available, no credentials, not snoozed;
  - hides when a credential exists;
  - hides when snoozed;
  - Enable calls `register`;
  - Not now writes the snooze key.
- `npm run typecheck`, targeted Vitest run, and lint on the touched files.
- Manual Android check in the TWA: first password sign-in → card → fingerprint
  prompt → reload → "Sign in with Fingerprint" works. No Android device is
  available on this machine, so this must be run by the owner or reported as
  unverified.

## Risks

- Android reports no platform authenticator (device without biometrics, or a
  browser/WebView that refuses the capability check): no card, no passkey
  button, nothing breaks.
- A cancelled fingerprint prompt leaves the card visible with a retry.
- If Google Password Manager is unavailable, registration fails with the
  existing error text; password sign-in is unaffected.
- The passkey bypasses the password only; existing MFA/session rules are
  unchanged.
