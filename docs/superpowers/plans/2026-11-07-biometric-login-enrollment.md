# Fingerprint Login Enrollment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prompt a signed-in user to enroll a fingerprint passkey once, on devices that support it, in both the studio and member apps.

**Architecture:** One client component checks the platform authenticator and the user's existing credentials, then renders a dismissible card. Enrollment reuses `useWebAuthn().register()` and the existing `/api/auth/webauthn/*` endpoints. The card is mounted in `AppShell` (studio) and `MemberShell` (member). No backend or schema changes.

**Tech Stack:** Next.js App Router client components, React, TypeScript, Vitest, React Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-07-biometric-login-enrollment-design.md`

## Global Constraints

- No backend, database, migration, auth-protocol, or dependency changes.
- UI copy is English, exactly as written in the spec.
- Buttons are at least 44px tall; the card is a labelled region.
- Storage keys are namespaced by `user.id`; never share prompt state between accounts.
- No commit or push unless the user explicitly asks (project rule overrides the usual commit-per-task workflow).
- Existing `useWebAuthn`, `api.webauthn`, and design-system `Button` are used as-is.

## Review Focus

- Device has no biometric sensor or WebAuthn support: the card never appears and no API call is made.
- Account already has a passkey, active or disabled: the card never appears.
- `listCredentials` fails: the card stays hidden, no crash, no page-level error.
- User cancels the fingerprint prompt: the card stays with an inline error and can be retried.
- Two accounts share one phone: dismissing or enrolling for one account must not hide the card for the other.

---

### Task 1: Passkey enrollment card

**Files:**
- Create: `src/components/auth/PasskeySetupPrompt.tsx`
- Test: `src/__tests__/passkey-setup-prompt.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (user), `useFeatures().enabled(key?: string)`, `useWebAuthn()` → `{ register(deviceName?: string): Promise<boolean>; loading: boolean; error: string | null; clearError(): void }`, `isWebAuthnSupported(): boolean`, `isBiometricAvailable(): Promise<boolean>`, `api.webauthn.listCredentials()`.
- Produces: default export `PasskeySetupPrompt(): React.ReactElement | null`; storage keys `passkey.prompt.checked.<userId>` (sessionStorage) and `passkey.prompt.snoozed.<userId>` (localStorage).

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/passkey-setup-prompt.test.tsx` with these cases. The mutable `state` is the per-test control surface for the mocked capability and API functions.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const state = vi.hoisted(() => ({
  userId: 'u1',
  featureEnabled: true,
  supported: true,
  biometric: true,
  credentials: [] as { id: string; is_active: boolean }[],
  listError: null as Error | null,
  registerResult: true,
  hookError: null as string | null,
  listCredentials: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
vi.mock('@/lib/features-context', () => ({
  useFeatures: () => ({ enabled: (key?: string) => (key === 'passkeys' ? state.featureEnabled : true) }),
}));
vi.mock('@/lib/api', () => ({
  api: { webauthn: { listCredentials: state.listCredentials } },
}));
vi.mock('@/hooks/useWebAuthn', () => ({
  isWebAuthnSupported: () => state.supported,
  isBiometricAvailable: async () => state.biometric,
  webAuthnError: () => 'Biometric authentication failed.',
  useWebAuthn: () => ({
    register: state.register,
    loading: false,
    error: state.hookError,
    clearError: () => { state.hookError = null; },
  }),
}));

import PasskeySetupPrompt from '@/components/auth/PasskeySetupPrompt';

const TITLE = /sign in faster with fingerprint/i;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  state.userId = 'u1';
  state.featureEnabled = true;
  state.supported = true;
  state.biometric = true;
  state.credentials = [];
  state.listError = null;
  state.registerResult = true;
  state.hookError = null;
  state.listCredentials.mockReset();
  state.listCredentials.mockImplementation(async () => {
    if (state.listError) throw state.listError;
    return { credentials: state.credentials };
  });
  state.register.mockReset();
  state.register.mockImplementation(async () => state.registerResult);
});

it('shows when biometrics are available and the account has no passkey', async () => {
  render(<PasskeySetupPrompt />);
  expect(await screen.findByText(TITLE)).toBeInTheDocument();
});

it('stays hidden when the passkeys feature is disabled', async () => {
  state.featureEnabled = false;
  render(<PasskeySetupPrompt />);
  await waitFor(() => expect(screen.queryByText(TITLE)).not.toBeInTheDocument());
  expect(state.listCredentials).not.toHaveBeenCalled();
});

it('stays hidden without a platform authenticator', async () => {
  state.biometric = false;
  render(<PasskeySetupPrompt />);
  await waitFor(() => expect(screen.queryByText(TITLE)).not.toBeInTheDocument());
  expect(state.listCredentials).not.toHaveBeenCalled();
});

it('stays hidden when the account already has a credential', async () => {
  state.credentials = [{ id: 'c1', is_active: false }];
  render(<PasskeySetupPrompt />);
  await waitFor(() => expect(state.listCredentials).toHaveBeenCalled());
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
});

it('stays hidden when the credential list cannot be loaded', async () => {
  state.listError = new Error('offline');
  render(<PasskeySetupPrompt />);
  await waitFor(() => expect(state.listCredentials).toHaveBeenCalled());
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
});

it('stays hidden while snoozed', async () => {
  localStorage.setItem('passkey.prompt.snoozed.u1', String(Date.now()));
  render(<PasskeySetupPrompt />);
  await waitFor(() => expect(screen.queryByText(TITLE)).not.toBeInTheDocument());
});

it('registers a passkey on Enable', async () => {
  render(<PasskeySetupPrompt />);
  fireEvent.click(await screen.findByRole('button', { name: /enable fingerprint/i }));
  await waitFor(() => expect(state.register).toHaveBeenCalledWith('This device'));
  expect(await screen.findByText(/fingerprint login enabled/i)).toBeInTheDocument();
});

it('keeps the card and shows the error when registration fails', async () => {
  state.registerResult = false;
  state.register.mockImplementation(async () => {
    state.hookError = 'Biometric authentication failed.';
    return false;
  });
  render(<PasskeySetupPrompt />);
  fireEvent.click(await screen.findByRole('button', { name: /enable fingerprint/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Biometric authentication failed.');
  expect(screen.getByText(TITLE)).toBeInTheDocument();
});

it('snoozes for seven days on Not now', async () => {
  render(<PasskeySetupPrompt />);
  fireEvent.click(await screen.findByRole('button', { name: /not now/i }));
  expect(Number(localStorage.getItem('passkey.prompt.snoozed.u1'))).toBeGreaterThan(0);
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
});

it('does not snooze another account on the same device', async () => {
  const { rerender } = render(<PasskeySetupPrompt />);
  fireEvent.click(await screen.findByRole('button', { name: /not now/i }));
  state.userId = 'u2';
  rerender(<PasskeySetupPrompt />);
  expect(await screen.findByText(TITLE)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/passkey-setup-prompt.test.tsx`

Expected: FAIL — `Failed to resolve import "@/components/auth/PasskeySetupPrompt"`.

- [ ] **Step 3: Implement the component**

Create `src/components/auth/PasskeySetupPrompt.tsx` as a `'use client'` default-exported component with no props.

Rules the implementation must follow:

- Eligibility effect runs on `user?.id` and returns early when any is true:
  - no user;
  - `sessionStorage.getItem('passkey.prompt.checked.<id>') === '1'`;
  - `!useFeatures().enabled('passkeys')`;
  - `!isWebAuthnSupported()`;
  - a snooze timestamp exists and is less than `7 * 24 * 60 * 60 * 1000` ms old.
- After those checks, await `isBiometricAvailable()`. If false, mark the session checked and stay hidden.
- Await `api.webauthn.listCredentials()`. On rejection, mark checked and stay hidden. On success, mark checked and set visible only when `credentials.length === 0`.
- `Enable fingerprint` calls `clearError()` then `register(deviceName)`, where `deviceName` is `'Android phone'` when `/Android/i.test(navigator.userAgent)`, otherwise `'This device'`. On `true`, mark checked, show `Fingerprint login enabled.` for 4 seconds, then hide. On `false`, keep the card visible.
- `Not now` writes `String(Date.now())` to the snooze key and hides the card.
- Render nothing when not visible. When visible render a `<section aria-label="Fingerprint login">` with:
  - a decorative `Fingerprint` icon;
  - title `Sign in faster with fingerprint`;
  - body `Enable fingerprint login on this phone and skip your password next time. Your fingerprint never leaves this device.`;
  - the hook `error` in a `role="alert"` paragraph when present;
  - a primary `Button` labelled `Enable fingerprint` (`loading` bound to hook `loading`, `className="min-h-[44px]"`);
  - a ghost `Button` labelled `Not now` (disabled while loading, same min height).
- Use `--bg-card`, `--border`, `--text-primary`, `--text-muted`, and `--brand` tokens. No hard-coded palette, no new dependency.
- Clear the 4-second timeout on unmount.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/passkey-setup-prompt.test.tsx`

Expected: PASS, 10 tests.

- [ ] **Step 5: Typecheck and lint the new files**

Run: `npm run typecheck`

Expected: PASS.

Run: `npx eslint src/components/auth/PasskeySetupPrompt.tsx src/__tests__/passkey-setup-prompt.test.tsx`

Expected: PASS, no errors.

---

### Task 2: Mount in both app shells

**Files:**
- Modify: `src/components/AppShell.tsx` (inside `<main>`, after `{pathname === '/' && <TrialBanner />}`)
- Modify: `src/components/member/MemberShell.tsx` (inside the max-width container, before `{children}`)
- Test: `src/__tests__/passkey-prompt-mount.test.tsx`

**Interfaces:**
- Consumes: default export `PasskeySetupPrompt` from Task 1.
- Produces: the card is mounted once per signed-in shell; no new exports.

- [ ] **Step 1: Write the failing mount test**

Create `src/__tests__/passkey-prompt-mount.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('@/components/member/MemberNav', () => ({
  default: () => null,
  MEMBER_NAV_CLEARANCE: 0,
}));
vi.mock('@/components/auth/PasskeySetupPrompt', () => ({
  default: () => <div>passkey prompt</div>,
}));

import MemberShell from '@/components/member/MemberShell';

it('renders the prompt above member page content', () => {
  render(<MemberShell><div>page content</div></MemberShell>);
  expect(screen.getByText('passkey prompt')).toBeInTheDocument();
  expect(screen.getByText('page content')).toBeInTheDocument();
});

it('mounts the prompt in the studio shell too', () => {
  const shell = readFileSync(resolve(process.cwd(), 'src/components/AppShell.tsx'), 'utf8');
  expect(shell).toContain('PasskeySetupPrompt');
  expect(shell).toContain('<PasskeySetupPrompt />');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/passkey-prompt-mount.test.tsx`

Expected: FAIL — the member shell does not render `passkey prompt`, and the studio shell source does not contain the component.

- [ ] **Step 3: Mount the component**

In `src/components/AppShell.tsx`:

- Add `import PasskeySetupPrompt from '@/components/auth/PasskeySetupPrompt';`
- Inside `<main id="main-content" ...>`, after `{pathname === '/' && <TrialBanner />}` and before the `<m.div key={pathname}>`, render `<PasskeySetupPrompt />`.

In `src/components/member/MemberShell.tsx`:

- Add the same import.
- Inside the `<div className="mx-auto w-full max-w-[560px] px-4 pt-5" ...>` container, render `<PasskeySetupPrompt />` before `{children}`.

Do not add wrapper margins; both shells already own their gutters. Give the card its own bottom margin.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/passkey-prompt-mount.test.tsx`

Expected: PASS, 2 tests.

- [ ] **Step 5: Typecheck the mounted shells**

Run: `npm run typecheck`

Expected: PASS.

---

### Task 3: Final verification and tracker entry

**Files:**
- Modify: `/home/oem/Desktop/myptstudio/TRACKER.md` (append one entry under `## Task log`)

- [ ] **Step 1: Run the targeted suite**

Run: `npx vitest run src/__tests__/passkey-setup-prompt.test.tsx src/__tests__/passkey-prompt-mount.test.tsx`

Expected: PASS, 12 tests total.

- [ ] **Step 2: Run typecheck and lint on every touched file**

Run: `npm run typecheck`

Expected: PASS.

Run: `npx eslint src/components/auth/PasskeySetupPrompt.tsx src/components/AppShell.tsx src/components/member/MemberShell.tsx src/__tests__/passkey-setup-prompt.test.tsx src/__tests__/passkey-prompt-mount.test.tsx`

Expected: PASS.

- [ ] **Step 3: Review the diff**

Run: `git -C /home/oem/Desktop/myptstudio/619-erp-frontend diff -- src/components/auth/PasskeySetupPrompt.tsx src/components/AppShell.tsx src/components/member/MemberShell.tsx src/__tests__/passkey-setup-prompt.test.tsx src/__tests__/passkey-prompt-mount.test.tsx`

Expected: only the intended files; no secrets, no unrelated edits. Do not commit.

- [ ] **Step 4: Append the tracker entry**

Add a dated entry under `## Task log` in `/home/oem/Desktop/myptstudio/TRACKER.md` recording: what changed, commands run and their exact status, and the unverified item — physical Android fingerprint enrollment in the TWA still needs the owner's phone.

## Self-Review

- Spec coverage: card eligibility, enrollment, snooze, both shells, storage namespacing, tests, no backend changes — each maps to Task 1, 2, or 3.
- Review Focus: hardware absent, existing credential, fetch failure, cancelled prompt, and two accounts each have a named test in Task 1.
- Types: `PasskeySetupPrompt` takes no props; the test mock and both shells import the same default export. `register` resolves to `boolean` as in `useWebAuthn`.
- No commit steps, matching the project rule.
