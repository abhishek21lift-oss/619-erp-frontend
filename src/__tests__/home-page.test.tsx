import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/StudioHome', () => ({
  default: () => <div data-testid="studio-home" />,
}));

import Page, { metadata } from '@/app/(chrome)/page';

describe('/ is the dashboard, not the marketing site', () => {
  it('renders the studio home', () => {
    render(<Page />);
    expect(screen.getByTestId('studio-home')).toBeTruthy();
  });

  it('stays out of search', () => {
    // Before the unified door, `/` opted IN to indexing and carried the
    // public pricing JSON-LD. It is an authenticated dashboard now.
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
