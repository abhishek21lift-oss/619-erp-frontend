/**
 * The session-balance create form against a mocked API.
 *
 * The schema tests pin the rules; this file pins the call site: a valid form
 * sends exactly the old payload shape, invalid input cannot reach the mutation,
 * two taps in one frame issue one create, a failed save is visible, and the
 * irreversible "Use 1" action still works unchanged.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/http';

const mocks = vi.hoisted(() => ({
  clients: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  useSession: vi.fn(),
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  nav: { query: '' },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mocks.nav.query),
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock('@/lib/api', () => ({
  api: {
    pt: { clients: mocks.clients },
    automation: {
      sessionBalance: {
        list: mocks.list,
        create: mocks.create,
        useSession: mocks.useSession,
      },
    },
  },
}));

import SessionBalancePage from '@/app/(chrome)/pt-os/session-balance/page';

const CLIENTS = [
  { id: 'client-1', name: 'Asha Rao' },
  { id: 'client-2', name: 'Ravi Kumar' },
];

const BALANCE = {
  id: 'sb-1',
  client_id: 'client-1',
  client_name: 'Asha Rao',
  package_name: '12 PT Sessions',
  total_sessions: 12,
  used_sessions: 3,
  remaining_sessions: 9,
  status: 'active',
};

beforeAll(() => {
  // jsdom has no matchMedia; PageHero reads it through framer-motion's
  // useReducedMotion. Report "no preference".
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterAll(() => { vi.unstubAllGlobals(); });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.nav.query = '';
  mocks.clients.mockResolvedValue({ data: CLIENTS });
  // The page reads both lists: the low-balance one for the alert, and the
  // unfiltered one for the panel.
  mocks.list.mockImplementation((params?: { low_balance?: string }) =>
    Promise.resolve({ data: params?.low_balance ? [] : [BALANCE] }));
  mocks.create.mockResolvedValue({ data: { id: 'sb-new' } });
  mocks.useSession.mockResolvedValue({ data: {} });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => { vi.restoreAllMocks(); });

async function renderPage() {
  render(<SessionBalancePage />);
  // Wait for the async client list, so the dropdown can be driven.
  await screen.findByRole('option', { name: 'Asha Rao' });
}

function fill(values: { total?: string; name?: string; end?: string } = {}) {
  if (values.total !== undefined) {
    fireEvent.change(screen.getByLabelText(/total sessions/i), {
      target: { value: values.total },
    });
  }
  if (values.name !== undefined) {
    fireEvent.change(screen.getByLabelText(/package name/i), {
      target: { value: values.name },
    });
  }
  if (values.end !== undefined) {
    fireEvent.change(screen.getByLabelText(/valid until/i), {
      target: { value: values.end },
    });
  }
}

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /create balance/i }));

describe('the form sends the create request the endpoint expects', () => {
  it('seeds the client from the profile link', async () => {
    mocks.nav.query = 'client_id=client-2';
    await renderPage();
    expect((screen.getByLabelText(/client/i) as HTMLSelectElement).value).toBe('client-2');
  });

  it('sends the numeric count, trimmed name and real date', async () => {
    mocks.nav.query = 'client_id=client-2';
    await renderPage();
    fill({ total: '12', name: '  12 PT Sessions  ', end: '2026-12-31' });
    submit();

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith({
      client_id: 'client-2',
      total_sessions: 12,
      package_name: '12 PT Sessions',
      end_date: '2026-12-31',
    });
  });

  it('omits the optional fields when they are left blank', async () => {
    mocks.nav.query = 'client_id=client-1';
    await renderPage();
    fill({ total: '8' });
    submit();

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const payload = mocks.create.mock.calls[0]![0];
    expect(payload.client_id).toBe('client-1');
    expect(payload.total_sessions).toBe(8);
    expect(payload.package_name).toBeUndefined();
    expect(payload.end_date).toBeUndefined();
  });

  it('clears the counts but keeps the client after a successful create', async () => {
    mocks.nav.query = 'client_id=client-1';
    await renderPage();
    fill({ total: '12', name: '12 PT Sessions' });
    submit();

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByLabelText(/total sessions/i)).toHaveValue(''));
    expect(screen.getByLabelText(/package name/i)).toHaveValue('');
    expect((screen.getByLabelText(/client/i) as HTMLSelectElement).value).toBe('client-1');
  });
});

describe('invalid input cannot trigger the mutation', () => {
  it('blocks a blank client and a blank count', async () => {
    await renderPage();
    submit();

    expect(await screen.findByText('Client is required.')).toBeTruthy();
    expect(screen.getByText('Total sessions is required.')).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([
    ['0', 'Total sessions must be at least 1.'],
    ['-3', 'Total sessions must be at least 1.'],
    ['2.5', 'Total sessions must be a whole number.'],
    ['2147483648', 'Total sessions cannot be more than 2147483647.'],
  ])('blocks the count %p', async (total, message) => {
    mocks.nav.query = 'client_id=client-1';
    await renderPage();
    fill({ total });
    submit();

    expect(await screen.findByText(message)).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  // An impossible date cannot be driven through `<input type="date">`: the
  // browser's own value sanitisation blanks it before React sees it, so the
  // field is merely absent. The schema test is where that rule is pinned.
});

describe('the submit guard and the failure path still hold', () => {
  it('issues one request when the button is clicked twice in one frame', async () => {
    let settle!: (value: unknown) => void;
    mocks.create.mockImplementationOnce(() => new Promise((resolve) => { settle = resolve; }));

    mocks.nav.query = 'client_id=client-1';
    await renderPage();
    fill({ total: '12' });

    const button = screen.getByRole('button', { name: /create balance/i });
    act(() => { button.click(); button.click(); });

    // The schema validates in a microtask, so the call lands just after the
    // two synchronous clicks.
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    settle({ data: { id: 'sb-new' } });
    await waitFor(() => expect(screen.getByLabelText(/total sessions/i)).toHaveValue(''));
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('shows the server sentence when the create fails', async () => {
    mocks.create.mockRejectedValueOnce(
      new ApiError('client_id and total_sessions are required', 400),
    );

    mocks.nav.query = 'client_id=client-1';
    await renderPage();
    fill({ total: '12' });
    submit();

    expect(await screen.findByText('client_id and total_sessions are required')).toBeTruthy();
    expect(screen.getByLabelText(/total sessions/i)).toHaveValue('12');
  });
});

describe('using a session is unchanged', () => {
  it('confirms, calls useSession for the row and reports success', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /use one session for asha rao/i }));

    await waitFor(() => expect(mocks.useSession).toHaveBeenCalledWith('sb-1'));
    expect(window.confirm).toHaveBeenCalledWith(
      'Mark one session used for Asha Rao? They have 9 left.',
    );
    expect(mocks.toast.success).toHaveBeenCalledWith('Session used for Asha Rao.');
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
