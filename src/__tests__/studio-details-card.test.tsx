import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ studio: vi.fn(), updateStudio: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api: { profile: { studio: mocks.studio, updateStudio: mocks.updateStudio } },
}));

import StudioDetailsCard from '@/components/profile/StudioDetailsCard';
import { ToastProvider } from '@/lib/toast';

const ROW = {
  name: 'Iron Studio', phone: '9876543210', address: 'MG Road', hours: 'Mon–Sat 6am–9pm',
};

beforeEach(() => {
  mocks.studio.mockReset().mockResolvedValue(ROW);
  mocks.updateStudio.mockReset().mockResolvedValue(ROW);
});

describe('<StudioDetailsCard />', () => {
  it('shows what the studio has published', async () => {
    render(<ToastProvider><StudioDetailsCard /></ToastProvider>);
    expect(await screen.findByDisplayValue('9876543210')).toBeTruthy();
    expect(screen.getByDisplayValue('MG Road')).toBeTruthy();
    expect(screen.getByDisplayValue('Mon–Sat 6am–9pm')).toBeTruthy();
  });

  it('saves trimmed values and sends null for a cleared field', async () => {
    render(<ToastProvider><StudioDetailsCard /></ToastProvider>);
    const phone = await screen.findByLabelText('Phone');
    fireEvent.change(phone, { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save studio details' }));

    await vi.waitFor(() => expect(mocks.updateStudio).toHaveBeenCalledWith({
      phone: null, address: 'MG Road', hours: 'Mon–Sat 6am–9pm',
    }));
  });

  it('keeps the form usable when the read fails', async () => {
    mocks.studio.mockRejectedValue(new Error('offline'));
    render(<ToastProvider><StudioDetailsCard /></ToastProvider>);
    expect(await screen.findByLabelText('Phone')).toBeTruthy();
  });
});
