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
    <label>
      <span>{label}</span>
      {children}
      {error && <span>{error}</span>}
    </label>
  ),
  TextInput: (rest: Record<string, unknown>) => <input {...rest} />,
  SelectInput: ({ children, ...rest }: Record<string, unknown>) => (
    <select {...rest}>{children as React.ReactNode}</select>
  ),
}));
vi.mock('@/components/ai/AiClientPicker', () => ({
  AiClientPicker: ({ onSelect }: { onSelect: (c: { id: string; name: string }) => void }) => (
    <button onClick={() => onSelect({ id: 'c1', name: 'Amit' })}>Pick Amit</button>
  ),
}));
vi.mock('@/lib/client-training-facts', () => ({
  useClientTrainingFacts: (id: string | null) => (id
    ? {
      facts: {
        name: 'Amit', age: '34', restingHeartRate: '62',
        experienceLevel: 'advanced', goal: 'weight_loss', trainingDays: '4',
      },
      loading: false,
      failed: false,
    }
    : { facts: null, loading: false, failed: false }),
}));

import CardioCalculatorPage from '@/app/(chrome)/pt-os/cardio-calculator/page';

const age = () => screen.getByLabelText('Age (estimate only)');
const resting = () => screen.getByLabelText('Resting HR');

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
    fireEvent.change(screen.getByLabelText('Measured max HR (preferred)'), { target: { value: '50' } });
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

  it('fills the calculator from the selected client record', () => {
    render(<CardioCalculatorPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Amit' }));

    expect((age() as HTMLInputElement).value).toBe('34');
    expect((resting() as HTMLInputElement).value).toBe('62');
    expect((screen.getByLabelText('Sessions per week') as HTMLInputElement).value).toBe('4');
    expect(screen.getByText(/from Amit's record/i)).toBeTruthy();
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
