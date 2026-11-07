import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

const state = vi.hoisted(() => ({
  userId: 'u1',
  featureEnabled: true,
  supported: true,
  biometric: true,
  impersonating: false,
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
vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>();
  return {
    ...actual,
    getImpersonation: () => (state.impersonating ? { token: 'imp', readOnly: true } : null),
  };
});
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

const TITLE = /sign in faster on this device/i;

// Lets every already-started promise continuation run, so a "no API call"
// assertion cannot pass before the effect's async branch is reached.
const flushMicrotasks = async () => {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  state.userId = 'u1';
  state.featureEnabled = true;
  state.supported = true;
  state.biometric = true;
  state.impersonating = false;
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

afterEach(() => {
  vi.useRealTimers();
});

it('shows when biometrics are available and the account has no passkey', async () => {
  render(<PasskeySetupPrompt />);
  expect(await screen.findByText(TITLE)).toBeInTheDocument();
});

it('stays hidden when the passkeys feature is disabled', async () => {
  state.featureEnabled = false;
  render(<PasskeySetupPrompt />);
  await flushMicrotasks();
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  expect(state.listCredentials).not.toHaveBeenCalled();
});

it('stays hidden without WebAuthn support and makes no API call', async () => {
  state.supported = false;
  render(<PasskeySetupPrompt />);
  await flushMicrotasks();
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  expect(state.listCredentials).not.toHaveBeenCalled();
});

it('stays hidden without a platform authenticator', async () => {
  state.biometric = false;
  render(<PasskeySetupPrompt />);
  await flushMicrotasks();
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  expect(state.listCredentials).not.toHaveBeenCalled();
});

it('stays hidden while impersonating and makes no API call', async () => {
  state.impersonating = true;
  render(<PasskeySetupPrompt />);
  await flushMicrotasks();
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
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
  await flushMicrotasks();
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  expect(state.listCredentials).not.toHaveBeenCalled();
});

it('checks credentials once per browser session, not on every remount', async () => {
  const first = render(<PasskeySetupPrompt />);
  await screen.findByText(TITLE);
  await waitFor(() => expect(sessionStorage.getItem('passkey.prompt.checked.u1')).toBe('1'));
  expect(state.listCredentials).toHaveBeenCalledTimes(1);
  first.unmount();

  render(<PasskeySetupPrompt />);
  await flushMicrotasks();
  expect(state.listCredentials).toHaveBeenCalledTimes(1);
});

it('registers a passkey on Enable', async () => {
  render(<PasskeySetupPrompt />);
  fireEvent.click(await screen.findByRole('button', { name: /enable passkey/i }));
  await waitFor(() => expect(state.register).toHaveBeenCalledWith('This device'));
  const status = await screen.findByRole('status');
  expect(status).toHaveTextContent(/passkey login enabled/i);
  expect(status).toHaveFocus();
});

it('does not refetch when the provider re-renders with the same flags', async () => {
  const { rerender } = render(<PasskeySetupPrompt />);
  await screen.findByText(TITLE);
  rerender(<PasskeySetupPrompt />);
  await flushMicrotasks();
  expect(state.listCredentials).toHaveBeenCalledTimes(1);
});

it('hides the card when the passkeys feature turns off', async () => {
  const { rerender } = render(<PasskeySetupPrompt />);
  await screen.findByText(TITLE);
  state.featureEnabled = false;
  rerender(<PasskeySetupPrompt />);
  await waitFor(() => expect(screen.queryByText(TITLE)).not.toBeInTheDocument());
});

it('names Android devices in the passkey label', async () => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
    configurable: true,
  });
  try {
    render(<PasskeySetupPrompt />);
    fireEvent.click(await screen.findByRole('button', { name: /enable passkey/i }));
    await waitFor(() => expect(state.register).toHaveBeenCalledWith('Android phone'));
  } finally {
    delete (window.navigator as { userAgent?: string }).userAgent;
  }
});

it('keeps the card and shows the hook error when registration fails', async () => {
  state.registerResult = false;
  state.register.mockImplementation(async () => {
    state.hookError = 'Request timed out.';
    return false;
  });
  render(<PasskeySetupPrompt />);
  fireEvent.click(await screen.findByRole('button', { name: /enable passkey/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Request timed out.');
  expect(screen.getByText(TITLE)).toBeInTheDocument();
});

it('can retry after a failed attempt', async () => {
  state.registerResult = false;
  render(<PasskeySetupPrompt />);
  fireEvent.click(await screen.findByRole('button', { name: /enable passkey/i }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();

  state.registerResult = true;
  fireEvent.click(screen.getByRole('button', { name: /enable passkey/i }));
  expect(await screen.findByText(/passkey login enabled/i)).toBeInTheDocument();
  expect(state.register).toHaveBeenCalledTimes(2);
});

it('hides the success card after four seconds', async () => {
  render(<PasskeySetupPrompt />);
  const enable = await screen.findByRole('button', { name: /enable passkey/i });

  vi.useFakeTimers();
  fireEvent.click(enable);
  await flushMicrotasks();
  expect(screen.getByText(/passkey login enabled/i)).toBeInTheDocument();

  act(() => { vi.advanceTimersByTime(4000); });
  expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
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
