import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const requestPause = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { me: { requestPause } } }));

import MemberPauseCard from '@/components/member/MemberPauseCard';
import { ToastProvider } from '@/lib/toast';

beforeEach(() => { requestPause.mockReset().mockResolvedValue({ data: { sent: true } }); });

describe('<MemberPauseCard />', () => {
  it('sends the dates and reason the member chose', async () => {
    const onSent = vi.fn();
    render(<ToastProvider><MemberPauseCard requestedAt={null} onSent={onSent} /></ToastProvider>);

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByLabelText('Until (optional)'), { target: { value: '2026-11-24' } });
    fireEvent.change(screen.getByLabelText('Reason (optional)'), { target: { value: 'Travel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request pause' }));

    await vi.waitFor(() => expect(requestPause).toHaveBeenCalledWith({
      start_date: '2026-11-10', end_date: '2026-11-24', reason: 'Travel',
    }));
    expect(onSent).toHaveBeenCalled();
  });

  it('sends null for a blank end date and reason', async () => {
    render(<ToastProvider><MemberPauseCard requestedAt={null} onSent={vi.fn()} /></ToastProvider>);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request pause' }));

    await vi.waitFor(() => expect(requestPause).toHaveBeenCalledWith({
      start_date: '2026-11-10', end_date: null, reason: null,
    }));
  });

  it('shows the waiting state instead of the form', () => {
    render(<ToastProvider>
      <MemberPauseCard requestedAt="2026-11-05T09:00:00.000Z" onSent={vi.fn()} />
    </ToastProvider>);
    expect(screen.getByText('Pause requested')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Request pause' })).toBeNull();
  });
});
