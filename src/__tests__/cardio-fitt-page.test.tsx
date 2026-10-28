// The Cardio & FITT page must stay on the K11 bands while it is reorganised.
//
// The calculations have their own suite; this pins the page to them — the
// selected band, the MHR/Karvonen method and the client heart-rate inputs all
// reach calcTargetRangeForBand, and an invalid input shows an error instead of
// a plausible-looking target.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
  FormField: ({ label, error, children }: {
    label: string; error?: string; children: React.ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      {children}
      {error && <span>{error}</span>}
    </div>
  ),
  TextInput: (rest: Record<string, unknown>) => <input {...rest} />,
  SelectInput: ({ children, ...rest }: Record<string, unknown>) => (
    <select {...rest}>{children as React.ReactNode}</select>
  ),
}));

import CardioCalculatorPage from '@/app/(chrome)/pt-os/cardio-calculator/page';

const age = () => screen.getByPlaceholderText('e.g. 40');
const resting = () => screen.getByPlaceholderText('e.g. 60');

describe('<CardioCalculatorPage />', () => {
  it('shows no target and cannot save until the client numbers are valid', () => {
    render(<CardioCalculatorPage />);

    expect(screen.getByText('K11 intensity target')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Save for plan builder/i })).toBeDisabled();
  });

  it('rejects an out-of-range age instead of calculating from it', () => {
    render(<CardioCalculatorPage />);
    fireEvent.change(age(), { target: { value: '0' } });

    expect(screen.getAllByText('Age must be between 1 and 120.').length).toBeGreaterThan(0);
    expect(screen.queryByText(/108–126 BPM/)).toBeNull();
  });

  it('rejects a measured max HR at or below resting HR', () => {
    render(<CardioCalculatorPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. 180'), { target: { value: '50' } });
    fireEvent.change(resting(), { target: { value: '60' } });

    expect(screen.getAllByText('Measured max heart rate must be greater than resting heart rate.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Save for plan builder/i })).toBeDisabled();
  });

  it('uses the moderate band (60–70% MHR) for age 40 with resting HR 60', () => {
    render(<CardioCalculatorPage />);
    fireEvent.change(age(), { target: { value: '40' } });
    fireEvent.change(resting(), { target: { value: '60' } });

    // 180 × 0.60 = 108, 180 × 0.70 = 126 — the K11 Moderate band.
    expect(screen.getByText('108–126 BPM')).toBeTruthy();
    expect(screen.getByText(/THR = 180 × 60%–70% = 108–126/)).toBeTruthy();
  });

  it('switches to Karvonen without moving the band percentages off %MHR', () => {
    render(<CardioCalculatorPage />);
    fireEvent.change(age(), { target: { value: '40' } });
    fireEvent.change(resting(), { target: { value: '60' } });
    fireEvent.change(screen.getByText(/Karvonen: THR/).closest('select')!, {
      target: { value: 'karvonen' },
    });

    // ((180 − 60) × 60%–70%) + 60 = 132–144.
    expect(screen.getByText('132–144 BPM')).toBeTruthy();
    expect(screen.getByText(/THR = \(\(180 − 60\) × 60%–70%\) \+ 60 = 132–144/)).toBeTruthy();
  });
});
