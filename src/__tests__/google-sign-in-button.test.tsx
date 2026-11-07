import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { onSuccessProps } = vi.hoisted(() => ({ onSuccessProps: vi.fn() }));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: {
    width: string; theme: string; text: string;
    onSuccess: (r: { credential: string }) => void;
    onError: () => void;
  }) => (
    <div>
      <button
        data-testid="google-login"
        data-width={props.width}
        data-theme={props.theme}
        data-text={props.text}
        onClick={() => { onSuccessProps(props); props.onSuccess({ credential: 'cred-1' }); }}
      >
        Continue with Google
      </button>
      <button data-testid="google-error" onClick={() => props.onError()}>error</button>
    </div>
  ),
}));

import GoogleSignInButton, { googleSignInConfigured } from '@/components/auth/GoogleSignInButton';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it('renders nothing without a client id', () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');
  const { container } = render(<GoogleSignInButton onCredential={vi.fn()} onError={vi.fn()} />);
  expect(googleSignInConfigured()).toBe(false);
  expect(container).toBeEmptyDOMElement();
});

it('renders the official button options and reports a credential', () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
  const onCredential = vi.fn();
  render(<GoogleSignInButton onCredential={onCredential} onError={vi.fn()} />);

  const button = screen.getByTestId('google-login');
  expect(button).toHaveAttribute('data-theme', 'outline');
  expect(button).toHaveAttribute('data-text', 'continue_with');

  button.click();
  expect(onCredential).toHaveBeenCalledWith('cred-1');
  expect(onSuccessProps).toHaveBeenCalledWith(
    expect.objectContaining({ width: expect.stringMatching(/^\d+$/) })
  );
});

it('reports a cancellation', () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
  const onError = vi.fn();
  render(<GoogleSignInButton onCredential={vi.fn()} onError={onError} />);
  screen.getByTestId('google-error').click();
  expect(onError).toHaveBeenCalled();
});

it('clamps the measured width to 400', async () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(999);

  render(<GoogleSignInButton onCredential={vi.fn()} onError={vi.fn()} />);

  await waitFor(() => {
    expect(screen.getByTestId('google-login')).toHaveAttribute('data-width', '400');
  });
});

it('makes the iframe inert while disabled, not just transparent', () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
  const { container } = render(
    <GoogleSignInButton onCredential={vi.fn()} onError={vi.fn()} disabled />,
  );
  // pointer-events only stops the mouse; inert also removes it from Tab order.
  expect(container.firstElementChild).toHaveAttribute('inert');
});
