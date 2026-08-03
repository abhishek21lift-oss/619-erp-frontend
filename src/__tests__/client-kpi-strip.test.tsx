// The four numbers above the client list.
//
// They used to be four cards in a 2×2 grid, 296px tall on a 430px phone —
// most of the first screen spent before a single client appeared, on a page
// whose whole subject is the client list. It is one object with four columns
// now: 139px at 430px, 78px from sm up, both measured in a browser.
//
// jsdom performs no layout, so those heights cannot be asserted here. What can
// be asserted is everything that made the reduction possible and everything
// that would quietly undo it.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ClientKpiStrip from '@/components/pt-os/ClientKpiStrip';

const SUMMARY = { total: 11, revenue: 90000, paid: 90000, balance: 0 };
const cell = (key: string) => document.querySelector(`[data-kpi="${key}"]`) as HTMLElement;

describe('what it shows', () => {
  it('renders all four metrics', () => {
    render(<ClientKpiStrip summary={SUMMARY} activeCount={3} />);
    for (const label of ['Clients', 'Revenue', 'Paid', 'Balance']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('drops "Total" from every label', () => {
    // Four labels reading Total/Total/Total/Total under one border is noise.
    render(<ClientKpiStrip summary={SUMMARY} />);
    expect(screen.queryByText(/^Total /)).toBeNull();
  });

  it('drops the sub-labels that only restated their own metric', () => {
    // These were pills beside each icon. Laid out with justify-between on a
    // narrow card, "Combined PT revenue" wrapped out of its own background —
    // and it said nothing the label above it did not.
    render(<ClientKpiStrip summary={SUMMARY} activeCount={3} />);
    for (const gone of ['Combined PT revenue', 'Amounts collected', 'Pending dues']) {
      expect(screen.queryByText(gone)).toBeNull();
    }
  });

  it('keeps the one sub-label that adds something', () => {
    // "3 active" is not derivable from "11".
    render(<ClientKpiStrip summary={SUMMARY} activeCount={3} />);
    expect(within(cell('clients')).getByText('3 active')).toBeInTheDocument();
  });

  it('omits the active count when there are none', () => {
    render(<ClientKpiStrip summary={SUMMARY} activeCount={0} />);
    expect(within(cell('clients')).queryByText(/active/)).toBeNull();
  });

  it('shows an em dash per metric while loading, not a zero', () => {
    // Rendering ₹0 before the data arrives states something false about the
    // studio's revenue.
    render(<ClientKpiStrip summary={null} />);
    expect(screen.getAllByText('—')).toHaveLength(4);
  });
});

describe('colour that means something', () => {
  it('turns Balance red only when money is owed', () => {
    const { unmount } = render(<ClientKpiStrip summary={{ ...SUMMARY, balance: 2500 }} />);
    expect(cell('balance').querySelector('p')!.style.color).toBe('rgb(220, 38, 38)');
    unmount();

    render(<ClientKpiStrip summary={{ ...SUMMARY, balance: 0 }} />);
    // A balance of zero is the goal, not a warning. Red either way would make
    // the signal mean nothing.
    expect(cell('balance').querySelector('p')!.style.color).not.toBe('rgb(220, 38, 38)');
  });

  it('never colours the other three by value', () => {
    // Revenue and Paid are always neutral: a big number is not a state to act
    // on, and colouring it would compete with the one cell that is.
    render(<ClientKpiStrip summary={{ total: 0, revenue: 0, paid: 0, balance: 0 }} />);
    for (const key of ['clients', 'revenue', 'paid']) {
      expect(cell(key).querySelector('p')!.style.color).toBe('var(--text-primary)');
    }
  });
});

describe('layout that survives real numbers', () => {
  it('is one container, not four cards', () => {
    // The whole reduction comes from this. Four bordered, shadowed, padded
    // cards cost four sets of chrome; one grid costs one.
    const { container } = render(<ClientKpiStrip summary={SUMMARY} />);
    const strip = container.firstElementChild as HTMLElement;
    expect(strip.className).toContain('grid');
    expect(strip.children).toHaveLength(4);
  });

  it('is 2×2 on mobile and 4×1 from sm up', () => {
    // Four across at 430px leaves about 77px per cell. ₹90,000 fits;
    // ₹1,25,00,000 does not, and that is an ordinary figure for a good year.
    const { container } = render(<ClientKpiStrip summary={SUMMARY} />);
    const strip = container.firstElementChild as HTMLElement;
    expect(strip.className).toContain('grid-cols-2');
    expect(strip.className).toContain('sm:grid-cols-4');
  });

  it('uses tabular figures', () => {
    // Without them the four values do not align down the grid, and the box
    // resizes on every frame of the count-up animation.
    render(<ClientKpiStrip summary={SUMMARY} />);
    for (const key of ['clients', 'revenue', 'paid', 'balance']) {
      expect(cell(key).querySelector('p')!.className).toContain('tabular-nums');
    }
  });

  it('formats long values without breaking', () => {
    // The value this layout was actually verified against.
    render(<ClientKpiStrip summary={{ total: 1148, revenue: 12500000, paid: 9875400, balance: 262600 }} />);
    expect(within(cell('revenue')).getByText(/1,25,00,000/)).toBeInTheDocument();
    expect(within(cell('clients')).getByText(/1,148/)).toBeInTheDocument();
  });

  it('lets the caller own the count-up animation', () => {
    // The page passes an AnimatedCounter; the strip renders whatever it is
    // given rather than owning a second animation implementation.
    render(
      <ClientKpiStrip summary={SUMMARY} renderValue={(v, p) => <span>{p}[{v}]</span>} />
    );
    expect(within(cell('revenue')).getByText('[90000]', { exact: false })).toBeInTheDocument();
  });
});
