// The FAQs are reachable from the avatar menu now, so their answers have to
// name screens that exist. The first version sent people to "Members → Add
// Member" and "Assign PT" — neither is in the app — and put the password form
// under "Settings → Security".

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const { default: HelpPage } = await import('@/app/(chrome)/help/page');

describe('the help page', () => {
  it('names the navigation the app actually has', () => {
    render(<HelpPage />);

    expect(screen.getByRole('heading', { name: 'Help & Support' })).toBeInTheDocument();
    expect(screen.queryByText(/Add Member/)).toBeNull();
    expect(screen.queryByText(/Assign PT/)).toBeNull();
    expect(screen.queryByText(/Settings → Security/)).toBeNull();
  });

  it('searches the answers, not only the questions', () => {
    render(<HelpPage />);
    fireEvent.change(screen.getByLabelText('Search FAQs'), { target: { value: 'amount you received' } });

    expect(screen.getByText('How do I record a payment?')).toBeInTheDocument();
    expect(screen.queryByText('How do I add a new client?')).toBeNull();
  });

  it('points at the ticket form as well as the contact channels', () => {
    render(<HelpPage />);

    expect(screen.getByRole('link', { name: /Raise a support ticket/ })).toHaveAttribute('href', '/support');
  });
});
