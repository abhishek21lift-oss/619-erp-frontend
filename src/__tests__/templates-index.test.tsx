// The workouts index — the builder's front door.
//
// Before this page the new training domain was reachable only by typing a URL,
// so the things worth testing are the ways in and out: does a workout open its
// builder, does creating one land you where the work actually happens, and
// does a failure say so rather than looking like an empty studio.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/pt-os/training/templates',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...rest}>{children}</a>,
}));

const errorToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: errorToast, info: vi.fn(), warning: vi.fn() } }),
}));

const list = vi.fn();
const create = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    training: {
      templates: {
        list: (...a: unknown[]) => list(...(a as [])),
        create: (...a: unknown[]) => create(...(a as [])),
      },
    },
  },
}));

import TemplatesPage from '@/app/(chrome)/pt-os/training/templates/page';
import { describeTemplate } from '@/lib/training/templates';

const LEG_DAY = {
  id: 't1', name: 'Leg Day A', day_label: 'Monday', day_number: 1,
  goal: 'Strength', estimated_duration_minutes: 60,
};

beforeEach(() => {
  push.mockClear(); errorToast.mockClear();
  list.mockReset(); list.mockResolvedValue({ data: [LEG_DAY] });
  create.mockReset(); create.mockResolvedValue({ data: { id: 'new-1' } });
});

describe('describing a workout in a list', () => {
  it('reads day, goal and length as one line', () => {
    expect(describeTemplate(LEG_DAY)).toBe('Monday · Strength · 60 min');
  });

  it('falls back to the day number when there is no label', () => {
    expect(describeTemplate({ ...LEG_DAY, day_label: null })).toBe('Day 1 · Strength · 60 min');
  });

  it('says nothing rather than something empty', () => {
    // An unnamed, goal-less, undated template should render a card with no
    // subtitle, not a card with a stray separator under the name.
    expect(describeTemplate({
      day_label: null, day_number: null, goal: null, estimated_duration_minutes: null,
    })).toBe('');
  });
});

describe('the index', () => {
  it('lists each workout, linked to its builder', async () => {
    render(<TemplatesPage />);
    const link = await screen.findByRole('link', { name: /Leg Day A/ });
    expect(link.getAttribute('href')).toBe('/pt-os/training/templates/t1');
  });

  it('explains what a workout is when there are none', async () => {
    list.mockResolvedValue({ data: [] });
    render(<TemplatesPage />);
    expect(await screen.findByText('No workouts yet')).toBeTruthy();
  });

  it('says so and offers Retry when the list fails', async () => {
    // An empty grid here would read as a studio with no workouts, which is a
    // different and much less alarming thing than a broken request.
    list.mockRejectedValueOnce(new Error('network down'));
    render(<TemplatesPage />);
    expect(await screen.findByText('network down')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeTruthy();
    expect(screen.queryByText('No workouts yet')).toBeNull();
  });
});

describe('creating one', () => {
  const openDialog = async () => {
    render(<TemplatesPage />);
    await screen.findByRole('link', { name: /Leg Day A/ });
    // PageHero renders its actions twice — one copy for narrow viewports, one
    // for wide — so this button legitimately appears more than once.
    fireEvent.click(screen.getAllByRole('button', { name: /New workout/ })[0]);
    return screen.findByRole('dialog');
  };

  it('sends the name and drops the labels left blank', async () => {
    // Empty strings would be stored as empty strings and then rendered as a
    // subtitle made of separators.
    await openDialog();
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: '  Push Day  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Create and add exercises/ }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual({ name: 'Push Day', goal: null, day_label: null });
  });

  it('goes straight to the builder, not back to the list', async () => {
    // A workout with no exercises is not a thing anyone wanted to create; it
    // is step one of creating one.
    await openDialog();
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Push Day' } });
    fireEvent.click(screen.getByRole('button', { name: /Create and add exercises/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/pt-os/training/templates/new-1'));
  });

  it('will not create a workout with no name', async () => {
    await openDialog();
    expect(screen.getByRole('button', { name: /Create and add exercises/ })).toHaveProperty('disabled', true);
  });

  it('keeps the typed name when creating fails', async () => {
    // Closing on failure loses the name and explains nothing.
    create.mockRejectedValueOnce(new Error('plan limit reached'));
    await openDialog();
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Push Day' } });
    fireEvent.click(screen.getByRole('button', { name: /Create and add exercises/ }));

    await waitFor(() => expect(errorToast).toHaveBeenCalledWith('plan limit reached'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByLabelText(/Name/)).toHaveProperty('value', 'Push Day');
    expect(push).not.toHaveBeenCalled();
  });
});
