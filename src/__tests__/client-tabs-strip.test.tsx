// The client tab strip has twelve tabs and a phone has room for about four.
//
// It used to cut the last visible label in half against a hard container edge
// — "Mea…" — which reads as a rendering fault, not as an invitation to scroll.
// The strip now dissolves at whichever end has more content behind it.
//
// The fade is conditional, and that condition is the whole point. A permanent
// fade would dim two perfectly real tabs on a desktop where all twelve fit,
// and would claim there is more to see when there is not. So these tests pin
// both directions: fade when scrollable, no fade when not.
//
// jsdom performs no layout, so scrollWidth and clientWidth are both 0 and the
// strip is naturally "not scrollable". The scrollable case is created by
// stubbing those two properties, which is also the honest way to test it —
// the component reads exactly those two numbers and nothing else.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ClientTabs, TABS } from '@/components/pt-os/client/ClientTabs';

const originals: Array<() => void> = [];

/** Make the tablist report itself as horizontally scrollable. */
function stubScroll({ scrollWidth, clientWidth, scrollLeft }: {
  scrollWidth: number; clientWidth: number; scrollLeft: number;
}) {
  for (const [prop, value] of [
    ['scrollWidth', scrollWidth], ['clientWidth', clientWidth], ['scrollLeft', scrollLeft],
  ] as const) {
    const prev = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value });
    originals.push(() => {
      if (prev) Object.defineProperty(HTMLElement.prototype, prop, prev);
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
    });
  }
  // ResizeObserver drives the measurement; jsdom has none.
  const prevRO = global.ResizeObserver;
  global.ResizeObserver = class {
    constructor(private cb: () => void) {}
    observe() { this.cb(); }
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
  originals.push(() => { global.ResizeObserver = prevRO; });
}

afterEach(() => {
  while (originals.length) originals.pop()!();
  vi.restoreAllMocks();
});

function strip() {
  return screen.getByRole('tablist');
}

describe('<ClientTabs /> — the strip', () => {
  it('renders every tab', () => {
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    // Every tile is on screen, but they are not all the same kind of control:
    // three of them LEAVE the page and are links, the rest switch a panel and
    // are tabs. Counting only role="tab" would say nine and read as three
    // tabs having gone missing.
    const tabs = screen.getAllByRole('tab');
    const links = screen.getAllByRole('link');
    expect(tabs.length + links.length).toBe(TABS.length);
    // The one that was being cut in half — a link now, not a tab.
    expect(screen.getByRole('link', { name: /Measurements/ })).toBeInTheDocument();
  });

  it('sends the three link tabs to the screen that does the job', () => {
    // Each of these was a panel whose whole content was a list of links to
    // these pages — a tap to reach a tap. The destination lives beside the tab
    // now, and it is a real href, so middle-click and long-press still work.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    expect(screen.getByRole('link', { name: /Workout Log/ }))
      .toHaveAttribute('href', '/pt-os/clients/c1/workout-log');
    expect(screen.getByRole('link', { name: /Measurements/ }))
      .toHaveAttribute('href', '/pt-os/measurements?client_id=c1');
    expect(screen.getByRole('link', { name: /Nutrition/ }))
      .toHaveAttribute('href', '/pt-os/diet-plans?client_id=c1');
  });

  it('builds those destinations from the client it was given', () => {
    // A hard-coded id here would send every trainer to one client's log.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="other-client" />);
    for (const name of [/Workout Log/, /Measurements/, /Nutrition/]) {
      expect(screen.getByRole('link', { name })!.getAttribute('href')).toContain('other-client');
    }
  });

  it('does not switch panels for a tab that navigates', () => {
    // It would select a panel that no longer exists, behind the page the
    // browser is already leaving.
    const onChange = vi.fn();
    render(<ClientTabs active="overview" onChange={onChange} clientId="c1" />);
    fireEvent.click(screen.getByRole('link', { name: /Workout Log/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaves the panel tabs as buttons', () => {
    // The counter-test. Rendering every tile as an <a> keeps role="tab" on
    // the nine that do not navigate — so a role check alone passes while the
    // strip fills with anchors that have no href: not focusable, not
    // clickable by keyboard, and a link to nowhere in the accessibility
    // tree. The ELEMENT is the property that matters here.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    for (const name of [/Overview/, /Training/, /Check-ins/, /Payments/]) {
      const tile = screen.getByRole('tab', { name });
      expect(tile.tagName).toBe('BUTTON');
    }
  });

  it('gives every navigating tile a real href', () => {
    // The other half of the same defect: an <a> without href is not a link.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    const anchors = Array.from(document.querySelectorAll('a'));
    expect(anchors).toHaveLength(3);
    for (const a of anchors) expect(a.getAttribute('href')).toBeTruthy();
  });

  it('marks exactly one tab selected', () => {
    render(<ClientTabs active="training" onChange={() => {}} clientId="c1" />);
    const selected = screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Training');
  });

  // data-fade rather than style.maskImage: jsdom's CSS parser drops a
  // gradient containing calc(), so reading the mask back would test jsdom.
  // The mask itself is verified in a real browser.
  it('does not fade when every tab fits', () => {
    // Desktop. Fading here would dim two real, reachable tabs and imply there
    // is more content off-screen when there is not.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    expect(strip()).toHaveAttribute('data-fade', 'none');
    expect(strip().style.maskImage).toBe('');
  });

  it('fades only the right edge at the start of a scrollable strip', () => {
    stubScroll({ scrollWidth: 900, clientWidth: 400, scrollLeft: 0 });
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    expect(strip()).toHaveAttribute('data-fade', 'right');
  });

  it('fades only the left edge at the end of a scrollable strip', () => {
    stubScroll({ scrollWidth: 900, clientWidth: 400, scrollLeft: 500 });
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    expect(strip()).toHaveAttribute('data-fade', 'left');
  });

  it('fades both edges in the middle', () => {
    stubScroll({ scrollWidth: 900, clientWidth: 400, scrollLeft: 250 });
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    expect(strip()).toHaveAttribute('data-fade', 'both');
  });

  it('tolerates a fractional scroll position at either limit', () => {
    // Fractional layout widths mean scrollLeft rarely lands on exactly 0 or
    // exactly max. Without slack the fade never switches off, which is worse
    // than not having one.
    stubScroll({ scrollWidth: 900.4, clientWidth: 400.1, scrollLeft: 0.6 });
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    expect(strip()).toHaveAttribute('data-fade', 'right');
  });

  it('labels each tab for the scroll-into-view lookup', () => {
    // The effect finds the active tab by [data-tab="..."]. Drop the attribute
    // and a deep link to a far-right tab silently leaves it off-screen.
    render(<ClientTabs active="reports" onChange={() => {}} clientId="c1" />);
    for (const t of TABS) {
      expect(strip().querySelector(`[data-tab="${t.key}"]`)).not.toBeNull();
    }
  });

  it('scrolls a far-right active tab into view', () => {
    stubScroll({ scrollWidth: 900, clientWidth: 400, scrollLeft: 0 });
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: scrollTo });
    originals.push(() => { delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTo; });
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', { configurable: true, value: 800 });
    originals.push(() => { delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetLeft; });

    act(() => { render(<ClientTabs active="reports" onChange={() => {}} clientId="c1" />); });
    expect(scrollTo).toHaveBeenCalled();
  });

  it('marks the selected tile with a ring on the icon, not a card behind it', () => {
    // The icon grid has no card of its own — a coloured rectangle wrapped
    // around it was the extra layer that got simplified away. Selection is a
    // ring drawn on the icon tile's own box-shadow instead.
    render(<ClientTabs active="training" onChange={() => {}} clientId="c1" />);
    const tabs = screen.getAllByRole('tab');
    const iconStyle = (t: HTMLElement) => (t.querySelector('span[style*="linear-gradient"]') as HTMLElement).style;

    const selected = tabs.find((t) => t.getAttribute('aria-selected') === 'true')!;
    const resting = tabs.find((t) => t.getAttribute('aria-selected') === 'false')!;
    expect(iconStyle(selected).boxShadow).not.toBe(iconStyle(resting).boxShadow);
    // No tab, selected or not, wraps its icon in a background rectangle of
    // its own — the button itself carries no background at all.
    for (const t of tabs) expect(t.style.background).toBe('');
  });

  it('renders each tab as an icon tile over a label, like Quick Actions', () => {
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    const overview = screen.getByRole('tab', { name: /Overview/ });
    // The icon tile is a distinct child with its own coloured gradient fill,
    // not an icon sitting inline beside the label text.
    const tile = overview.querySelector('span[style*="linear-gradient"]');
    expect(tile).not.toBeNull();
  });

  it('gives every tab a colour, and does not repeat it on adjacent tabs', () => {
    // Not full uniqueness — Quick Actions itself rotates five colours across
    // more than five tiles — only that two tabs sitting next to each other in
    // the strip are never the same colour, which is what would actually blur
    // together while scrolling.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    const tabs = screen.getAllByRole('tab');
    const bg = (el: HTMLElement) => (el.querySelector('span[style*="linear-gradient"]') as HTMLElement).style.background;
    for (let i = 1; i < tabs.length; i++) {
      expect(bg(tabs[i])).not.toBe(bg(tabs[i - 1]));
    }
  });

  it('shows a count badge only where there is something to count', () => {
    render(<ClientTabs active="overview" onChange={() => {}} counts={{ photos: 4, notes: 0 }} clientId="c1" />);
    expect(screen.getByRole('tab', { name: /Photos/ })).toHaveTextContent('4');
    expect(screen.getByRole('tab', { name: /Notes/ })).not.toHaveTextContent('0');
  });
});
