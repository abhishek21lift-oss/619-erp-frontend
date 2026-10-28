// Create Package is a page now, not a sheet over the catalogue.
//
// The fields and the write are shared with the edit dialog (PackageForm), so
// this pins the create path end to end: fill the real form, submit once, send
// the parsed payload, then return to the list. It also keeps the price rule
// that "8,000" is eight thousand, not eight.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const push = vi.fn();
const create = vi.fn();
const toast = vi.hoisted(() => ({
  success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/api', () => ({
  api: {
    automation: {
      ptPackages: {
        create: (...args: unknown[]) => create(...args),
        update: vi.fn(),
      },
    },
  },
}));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: new Proxy({}, {
    get: (_t, tag: string) =>
      ({ children, whileHover, whileTap, ...rest }: Record<string, unknown>) => {
        // Motion-only props are not DOM attributes; passing them through
        // makes React log a warning per render.
        void whileHover; void whileTap;
        return React.createElement(tag, rest, children as React.ReactNode);
      },
  }),
}));
vi.mock('@/components/ui', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import NewPackagePage from '@/app/(chrome)/subscription/packages/new/page';

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  push.mockReset();
  create.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  create.mockResolvedValue({ data: { id: 'pkg-1' } });
});

describe('<NewPackagePage />', () => {
  it('creates the package with the parsed price and returns to the list', async () => {
    render(<NewPackagePage />);

    fill(/^Package name/, 'Fat Loss Starter');
    fill(/^Sessions/, '12');
    fill(/^Duration/, '30');
    fill(/^Price/, '8,000');

    fireEvent.click(screen.getByRole('button', { name: /^Create$/ }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({
      name: 'Fat Loss Starter',
      session_count: 12,
      duration_days: 30,
      price: 8000,
      goal_type: null,
      description: null,
    });
    expect(toast.success).toHaveBeenCalledWith('Package created');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/subscription/packages'));
  });

  it('refuses a blank price instead of sending zero', async () => {
    render(<NewPackagePage />);

    fill(/^Package name/, 'No Price');
    fill(/^Sessions/, '10');
    fill(/^Duration/, '30');

    fireEvent.click(screen.getByRole('button', { name: /^Create$/ }));

    // Give an async submit a chance to run; it must not.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(create).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('leaves a dedicated page without saving', async () => {
    render(<NewPackagePage />);
    fill(/^Package name/, 'Abandoned');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(create).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/subscription/packages');
  });
});
