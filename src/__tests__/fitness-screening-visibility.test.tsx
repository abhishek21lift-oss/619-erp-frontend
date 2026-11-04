// The save response's screening warnings render inline after save.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreeningWarningsNotice } from '@/components/pt-os/fitness-testing/ScreeningWarningsNotice';

describe('ScreeningWarningsNotice', () => {
  it('renders existing warnings with fix links', () => {
    render(<ScreeningWarningsNotice warnings={['No PAR-Q on file.']} clientId="c1" />);
    expect(screen.getByText('Screening notes')).toBeTruthy();
    expect(screen.getByText('No PAR-Q on file.')).toBeTruthy();
    expect(screen.getByText('Review PAR-Q')).toBeTruthy();
  });

  it('empty or absent warnings render nothing', () => {
    for (const w of [[], null, undefined, 'x'] as unknown as string[][]) {
      const { container, unmount } = render(<ScreeningWarningsNotice warnings={w} clientId="c1" />);
      expect(container.textContent).toBe('');
      unmount();
    }
  });
});
