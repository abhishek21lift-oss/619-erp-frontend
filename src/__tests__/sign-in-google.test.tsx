import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  auth: {
    user: null, loading: false,
    login: vi.fn(), loginWithGoogle: vi.fn(), linkGoogle: vi.fn(),
    loginWithPasskey: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }));
vi.mock('next/image', () => ({
  default: ({ priority: _priority, ...props }: { priority?: boolean }) => <img alt="" {...props} />,
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/hooks/useWebAuthn', () => ({
  isWebAuthnSupported: () => true,
  isBiometricAvailable: async () => true,
  webAuthnError: () => 'passkey failed',
}));
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: { onSuccess: (r: { credential: string }) => void }) => (
    <button data-testid="google-login" onClick={() => props.onSuccess({ credential: 'cred-1' })}>
      Continue with Google
    </button>
  ),
}));

import SignInScreen from '@/components/auth/SignInScreen';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
  Object.values(mocks.auth).forEach((v) => { if (typeof v === 'function') v.mockReset(); });
  mocks.replace.mockReset();
  mocks.push.mockReset();
});

afterEach(() => vi.unstubAllEnvs());

it('puts Log In, then Google, then Face ID in that order', async () => {
  render(<SignInScreen portal="trainer" />);

  const login = screen.getByRole('button', { name: /^log in/i });
  const google = screen.getByTestId('google-login');
  const passkey = await screen.findByRole('button', { name: /face id/i });

  const follows = (a: HTMLElement, b: HTMLElement) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  expect(follows(login, google)).toBe(true);
  expect(follows(google, passkey)).toBe(true);
  expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
});

it('does not show Google on the member door', () => {
  render(<SignInScreen portal="member" />);
  expect(screen.queryByTestId('google-login')).not.toBeInTheDocument();
});

it('turns a Google wrong-portal refusal into a way to Member Login', async () => {
  mocks.auth.loginWithGoogle.mockRejectedValueOnce(Object.assign(
    new Error('This is the studio sign-in. Use Member Login for your client account.'),
    { code: 'WRONG_PORTAL', status: 403 },
  ));
  render(<SignInScreen portal="trainer" />);

  fireEvent.click(screen.getByTestId('google-login'));

  expect(await screen.findByText(/use member login for your client account/i)).toBeInTheDocument();
  const alert = screen.getByRole('alert');
  expect(within(alert).getByRole('link', { name: /member login/i })).toHaveAttribute('href', '/member-login');
});

it('tells an account that cannot link Google to use its password', async () => {
  mocks.auth.loginWithGoogle.mockRejectedValueOnce(Object.assign(
    new Error('link'), { code: 'GOOGLE_LINK_REQUIRED' },
  ));
  mocks.auth.linkGoogle.mockRejectedValueOnce(Object.assign(
    new Error('no password'), { code: 'GOOGLE_LINK_UNAVAILABLE' },
  ));

  render(<SignInScreen portal="trainer" />);
  fireEvent.click(screen.getByTestId('google-login'));
  await screen.findByText(/already uses a password/i);

  fireEvent.change(screen.getByLabelText('Account password'), { target: { value: 'anything' } });
  fireEvent.click(screen.getByRole('button', { name: /link google and sign in/i }));

  expect(await screen.findByText(/cannot link google.*sign in with your password/i)).toBeInTheDocument();
});

it('navigates a brand-new Google account to start-free', async () => {
  mocks.auth.loginWithGoogle.mockRejectedValueOnce(Object.assign(new Error('no'), { code: 'GOOGLE_NO_ACCOUNT' }));
  render(<SignInScreen portal="trainer" />);

  fireEvent.click(screen.getByTestId('google-login'));

  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/start-free'));
});

it('shows the link panel, rejects a wrong password, then links', async () => {
  mocks.auth.loginWithGoogle.mockRejectedValueOnce(Object.assign(new Error('link'), { code: 'GOOGLE_LINK_REQUIRED' }));
  mocks.auth.linkGoogle.mockRejectedValueOnce(Object.assign(new Error('bad'), { code: 'GOOGLE_LINK_INVALID_PASSWORD' }));
  mocks.auth.linkGoogle.mockResolvedValueOnce({ id: 'u1', email: 'owner@studio.com' });

  render(<SignInScreen portal="trainer" />);
  fireEvent.click(screen.getByTestId('google-login'));

  expect(await screen.findByText(/already uses a password/i)).toBeInTheDocument();

  const password = screen.getByLabelText('Account password');
  fireEvent.change(password, { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: /link google and sign in/i }));

  expect(await screen.findByText('That password is incorrect.')).toBeInTheDocument();

  // The error shakes the card, which is keyed — so the input node is replaced.
  // Re-query it; holding the old reference would type into a detached element.
  fireEvent.change(screen.getByLabelText('Account password'), { target: { value: 'Str0ng!pass' } });
  fireEvent.click(screen.getByRole('button', { name: /link google and sign in/i }));

  await waitFor(() => {
    expect(mocks.auth.linkGoogle).toHaveBeenLastCalledWith('cred-1', 'Str0ng!pass', 'trainer');
  });
});
