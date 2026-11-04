// The accessible equivalent under every chart. A regression here quietly
// removes the only way a screen-reader user can read the figures, so the
// caption, the scopes and the row headers are pinned.

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartDataTable } from '@/components/visualizations';

describe('ChartDataTable', () => {
  it('renders the chart figures as a table with a caption and scopes', () => {
    render(
      <ChartDataTable
        title="Collected by method"
        caption="Collected amount by payment method"
        columns={[{ header: 'Method' }, { header: 'Collected' }]}
        rows={[
          { key: 'cash', cells: ['Cash', '₹1,000'] },
          { key: 'upi', cells: ['UPI', '₹2,000'] },
        ]}
        footer={['Total', '₹3,000']}
      />,
    );

    const table = screen.getByRole('table', { name: 'Collected amount by payment method' });
    expect(table).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Method', 'Collected']);
    expect(screen.getAllByRole('rowheader').map((th) => th.textContent)).toEqual(['Cash', 'UPI', 'Total']);
    expect(screen.getByText('₹3,000').tagName).toBe('TD');
  });

  it('says there is no data instead of drawing an empty table', () => {
    render(
      <ChartDataTable
        title="Sentiment breakdown"
        caption="Feedback sentiment"
        columns={[{ header: 'Sentiment' }, { header: 'Entries' }]}
        rows={[]}
        emptyMessage="No feedback yet."
      />,
    );

    expect(screen.getByRole('status').textContent).toBe('No feedback yet.');
    expect(screen.queryByRole('table')).toBeNull();
  });
});
