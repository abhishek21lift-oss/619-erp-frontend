import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { Role } from '@/lib/roles';

const mockReplace = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

import Guard from '@/components/Guard';

beforeEach(() => {
  mockReplace.mockReset();
  mockUseAuth.mockReset();
});

describe('<Guard />', () => {
  it('renders children when user is allowed', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'admin' as Role }, loading: false });
    render(
      <Guard role="admin">
        <div>secret content</div>
      </Guard>,
    );
    await waitFor(() => expect(screen.getByText('secret content')).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders children for any of the allowed roles', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u2', role: 'manager' as Role }, loading: false });
    render(
      <Guard roles={['admin', 'manager']}>
        <div>manager area</div>
      </Guard>,
    );
    await waitFor(() => expect(screen.getByText('manager area')).toBeInTheDocument());
  });

  it('redirects to /login when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <Guard role="admin">
        <div>never</div>
      </Guard>,
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('never')).not.toBeInTheDocument();
  });

  it('redirects to /pt-os when role is not allowed', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u3', role: 'trainer' as Role }, loading: false });
    render(
      <Guard role="admin">
        <div>never</div>
      </Guard>,
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/pt-os'));
  });

  it('normalises receptionist to reception', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u4', role: 'receptionist' as Role }, loading: false });
    render(
      <Guard role="reception">
        <div>reception desk</div>
      </Guard>,
    );
    await waitFor(() => expect(screen.getByText('reception desk')).toBeInTheDocument());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <Guard role="admin">
        <div>never</div>
      </Guard>,
    );
    expect(screen.queryByText('never')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
