/**
 * The weekly check-in form against a mocked API.
 *
 * The schema tests pin the ranges; this file pins the call site: typed numbers
 * reach the endpoint, blank optional readings stay absent instead of becoming
 * zero, an invalid fraction or word cannot reach the mutation, a server refusal
 * stays visible, and a success keeps the values and refreshes the list.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/http';

// The page renders the hero and chart shells; a cold parallel run can take
// longer than the 5s default to get through the first full render.
vi.setConfig({ testTimeout: 20000 });

const mocks = vi.hoisted(() => ({
  clients: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/visualizations', () => ({
  PremiumAreaChart: () => null,
}));
vi.mock('@/components/pt-os/WeeklyCheckinInsightCard', () => ({
  default: () => null,
}));
vi.mock('@/lib/api', () => ({
  api: {
    pt: { clients: mocks.clients },
    progress: {
      weeklyCheckins: { list: mocks.list, create: mocks.create },
    },
  },
}));

import WeeklyCheckinPage from '@/app/(chrome)/pt-os/weekly-checkin/page';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const WEEK = '2026-10-19';

const CLIENTS = [
  { id: CLIENT_ID, name: 'Asha Rao' },
  { id: OTHER_ID, name: 'Ravi Kumar' },
];

beforeAll(() => {
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
  mocks.clients.mockResolvedValue({ data: CLIENTS });
  mocks.list.mockResolvedValue({ data: [] });
  mocks.create.mockResolvedValue({ data: { id: 'checkin-1' } });
});

afterEach(() => { vi.restoreAllMocks(); });

async function renderPage() {
  render(<WeeklyCheckinPage />);
  await screen.findByRole('option', { name: 'Asha Rao' });
}

async function selectClient(id = CLIENT_ID) {
  fireEvent.change(screen.getByLabelText(/^client/i), { target: { value: id } });
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ client_id: id }));
}

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /log check-in/i }));

describe('the form sends the payload the endpoint expects', () => {
  it('sends typed numbers, a chosen mood and trimmed notes', async () => {
    await renderPage();
    await selectClient();
    fill(/week starting/i, WEEK);
    fill(/weight/i, ' 72.5 ');
    fill(/^sleep/i, '7.5');
    fill(/^water/i, '8');
    fill(/^workouts/i, '4');
    fill(/adherence/i, '87.5');
    fill(/^stress/i, '3');
    fill(/^energy/i, '8');
    fill(/^soreness/i, '4');
    fill(/trainer notes/i, '  Good week  ');
    fireEvent.click(screen.getByRole('radio', { name: 'Great' }));

    submit();

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith({
      client_id: CLIENT_ID,
      week_start_date: WEEK,
      weight: 72.5,
      mood: 'great',
      sleep_hours: 7.5,
      water_glasses: 8,
      workout_count: 4,
      adherence_pct: 87.5,
      trainer_notes: 'Good week',
      stress_level: 3,
      energy_level: 8,
      soreness_level: 4,
    });
  });

  it('omits every blank optional instead of sending zero', async () => {
    await renderPage();
    await selectClient();
    fill(/week starting/i, WEEK);

    submit();

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const payload = mocks.create.mock.calls[0]![0];
    expect(payload).toMatchObject({
      client_id: CLIENT_ID,
      week_start_date: WEEK,
      mood: 'good',
    });
    for (const key of [
      'weight', 'sleep_hours', 'water_glasses', 'workout_count', 'adherence_pct',
      'trainer_notes', 'stress_level', 'energy_level', 'soreness_level',
    ]) {
      expect(payload[key]).toBeUndefined();
    }
  });

  it('refetches the list for the selected client', async () => {
    await renderPage();
    expect(mocks.list).toHaveBeenCalledWith({});

    await selectClient(OTHER_ID);

    expect(mocks.list).toHaveBeenCalledWith({ client_id: OTHER_ID });
  });
});

describe('invalid input cannot trigger the mutation', () => {
  it('keeps the submit disabled until a client is chosen', async () => {
    await renderPage();
    const button = screen.getByRole('button', { name: /log check-in/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects a fractional water count', async () => {
    await renderPage();
    await selectClient();
    fill(/^water/i, '2.5');

    submit();

    expect(await screen.findByText('Water must be a whole number.')).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects an unparseable weight', async () => {
    await renderPage();
    await selectClient();
    fill(/weight/i, 'seventy');

    submit();

    expect(await screen.findByText('Weight must be a number.')).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects a weight outside the server range', async () => {
    await renderPage();
    await selectClient();
    fill(/weight/i, '19.9');

    submit();

    expect(await screen.findByText('Weight must be at least 20 kg.')).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe('the submit guard and the failure path still hold', () => {
  it('issues one request when the button is clicked twice in one frame', async () => {
    let settle!: (value: unknown) => void;
    mocks.create.mockImplementationOnce(() => new Promise((resolve) => { settle = resolve; }));

    await renderPage();
    await selectClient();
    fill(/week starting/i, WEEK);

    const button = screen.getByRole('button', { name: /log check-in/i });
    act(() => { button.click(); button.click(); });

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    settle({ data: { id: 'checkin-1' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /saved!/i })).toBeTruthy());
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('shows the server sentence and keeps the values when the save fails', async () => {
    mocks.create.mockRejectedValueOnce(
      new ApiError('weight must be at least 20', 400),
    );

    await renderPage();
    await selectClient();
    fill(/weight/i, '72.5');

    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('weight must be at least 20');
    expect(screen.getByLabelText(/weight/i)).toHaveValue('72.5');
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('keeps the values and refreshes the list after a successful save', async () => {
    await renderPage();
    await selectClient();
    fill(/week starting/i, WEEK);
    fill(/weight/i, '72.5');
    const before = mocks.list.mock.calls.length;

    submit();

    expect(await screen.findByRole('button', { name: /saved!/i })).toBeTruthy();
    expect(screen.getByLabelText(/weight/i)).toHaveValue('72.5');
    expect((screen.getByLabelText(/^client/i) as HTMLSelectElement).value).toBe(CLIENT_ID);
    await waitFor(() => expect(mocks.list.mock.calls.length).toBeGreaterThan(before));
  });
});
