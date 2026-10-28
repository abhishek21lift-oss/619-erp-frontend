// Creating a macrocycle is three separate POSTs, not one transaction.
//
// The page used to record the result only after the last phase succeeded, so a
// failure on phase 3 looked like nothing had been created — while phases 1 and
// 2 were already in the workout list. Retrying then filed duplicates.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const create = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };

vi.mock('@/lib/api', () => ({
  api: { workouts: { plans: { create: (...a: unknown[]) => create(...(a as [])) } } },
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui', () => ({
  Button: ({ children, ...rest }: Record<string, unknown>) => (
    <button {...rest}>{children as React.ReactNode}</button>
  ),
  PageContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
  FormField: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TextInput: (rest: Record<string, unknown>) => <input {...rest} />,
  SelectInput: ({ children, ...rest }: Record<string, unknown>) => (
    <select {...rest}>{children as React.ReactNode}</select>
  ),
}));
vi.mock('@/components/ui/form', () => ({
  CheckboxField: () => null,
}));

import MacrocyclePage from '@/app/(chrome)/pt-os/macrocycle/page';

beforeEach(() => {
  create.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

describe('creating a macrocycle', () => {
  it('keeps the programmes that were created when a later phase fails', async () => {
    create
      .mockResolvedValueOnce({ plan: { id: 'p1', name: 'Accumulation — Weeks 1–7' } })
      .mockResolvedValueOnce({ plan: { id: 'p2', name: 'Intensification — Weeks 8–10' } })
      .mockRejectedValueOnce(new Error('server error'));

    render(<MacrocyclePage />);
    fireEvent.click(screen.getByRole('button', { name: /create 3 programmes/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(3));

    expect(screen.getByRole('link', { name: /Accumulation/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Intensification/i })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Only 2 of 3 programmes were created');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
