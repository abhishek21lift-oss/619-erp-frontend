import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const themeMock = vi.hoisted(() => ({ setTheme: vi.fn() }));
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggle: vi.fn(), setTheme: themeMock.setTheme }),
}));

import AppearanceCard from '@/components/member/AppearanceCard';

describe('AppearanceCard', () => {
  it('marks the active theme and switches to dark', () => {
    render(<AppearanceCard />);
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(themeMock.setTheme).toHaveBeenCalledWith('dark');
  });
});
