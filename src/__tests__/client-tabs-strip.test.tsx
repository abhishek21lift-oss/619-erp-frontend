// The client tab strip has seven tabs and a phone has room for about four.
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
import { useState } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ClientTabs, TabPanel, TABS, type TabKey } from '@/components/pt-os/client/ClientTabs';

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
  return screen.getByRole('navigation', { name: 'Client sections' });
}

describe('<ClientTabs /> — the strip', () => {
  it('renders every tab as a link', () => {
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    // The strip is navigation, not a tablist: every tile has an href, so
    // middle-click, Ctrl-click and copy-link all work.
    expect(screen.getAllByRole('link')).toHaveLength(TABS.length);
    expect(TABS).toHaveLength(7);
    expect(screen.getByRole('link', { name: /Nutrition/ })).toBeInTheDocument();
  });

  it('keeps the removed destinations off the strip', () => {
    // Workout Log, Measurements, Photos and Reports are linked from the tab
    // that owns the job now. The strip must not grow back to eleven.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    for (const name of [/Workout Log/, /Measurements/, /^Photos$/, /^Reports$/]) {
      expect(screen.queryByRole('link', { name })).toBeNull();
    }
  });

  it('sends the one link tab to the screen that does the job', () => {
    // It used to be a panel whose whole content was a list of links to this
    // page — a tap to reach a tap. The destination lives beside the tab now,
    // and it is a real href, so middle-click and long-press still work.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    expect(screen.getByRole('link', { name: /Nutrition/ }))
      .toHaveAttribute('href', '/pt-os/diet-plans?client_id=c1');
  });

  it('marks the tab that leaves this page, and only that one', () => {
    // Eight of the old eleven tiles switched a panel; three navigated away.
    // Nothing on screen told them apart, so a tap could leave the profile
    // without warning. The outbound arrow and the marker are that warning.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    const outbound = screen.getByRole('link', { name: /Nutrition/ });
    expect(outbound).toHaveAttribute('data-leaves-page', 'true');
    for (const name of [/Overview/, /Training/, /Check-ins/, /Payments/, /Documents/, /AI Coach/]) {
      expect(screen.getByRole('link', { name })).not.toHaveAttribute('data-leaves-page');
    }
  });

  it('builds that destination from the client it was given', () => {
    // A hard-coded id here would send every trainer to one client's diet.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="other-client" />);
    expect(screen.getByRole('link', { name: /Nutrition/ })!.getAttribute('href')).toContain('other-client');
  });

  it('does not switch panels for a tab that navigates', () => {
    // It would select a panel that no longer exists, behind the page the
    // browser is already leaving.
    const onChange = vi.fn();
    render(<ClientTabs active="overview" onChange={onChange} clientId="c1" />);
    fireEvent.click(screen.getByRole('link', { name: /Nutrition/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('points every panel tab at this profile with its tab in the query', () => {
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    for (const key of ['overview', 'training', 'checkins', 'payments']) {
      const tile = screen.getByRole('link', { name: new RegExp(TABS.find((t) => t.key === key)!.label) });
      expect(tile.tagName).toBe('A');
      expect(tile).toHaveAttribute('href', `/pt-os/clients/c1?tab=${key}`);
    }
  });

  it('gives every navigating tile a real href', () => {
    // The other half of the same defect: an <a> without href is not a link.
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    const anchors = Array.from(document.querySelectorAll('a'));
    expect(anchors).toHaveLength(TABS.length);
    for (const a of anchors) expect(a.getAttribute('href')).toBeTruthy();
  });

  it('marks exactly one tab as current, without claiming a page change', () => {
    // In-page panels change, the document does not. aria-current="page" told
    // a screen reader the page had navigated; "true" says "current item in
    // this set" and nothing more.
    render(<ClientTabs active="training" onChange={() => {}} clientId="c1" />);
    const current = screen.getAllByRole('link').filter((t) => t.getAttribute('aria-current') === 'true');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Training');
    expect(screen.getAllByRole('link').filter((t) => t.getAttribute('aria-current') === 'page')).toHaveLength(0);
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
    render(<ClientTabs active="ai" onChange={() => {}} clientId="c1" />);
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

    act(() => { render(<ClientTabs active="ai" onChange={() => {}} clientId="c1" />); });
    expect(scrollTo).toHaveBeenCalled();
  });

  it('marks the selected tile with a ring on the icon, not a card behind it', () => {
    // The icon grid has no card of its own — a coloured rectangle wrapped
    // around it was the extra layer that got simplified away. Selection is a
    // ring drawn on the icon tile's own box-shadow instead.
    render(<ClientTabs active="training" onChange={() => {}} clientId="c1" />);
    const tabs = screen.getAllByRole('link');
    const iconStyle = (t: HTMLElement) => (t.querySelector('span[style*="linear-gradient"]') as HTMLElement).style;

    const selected = tabs.find((t) => t.getAttribute('aria-current') !== null)!;
    const resting = tabs.find((t) => t.getAttribute('aria-current') === null)!;
    expect(iconStyle(selected).boxShadow).not.toBe(iconStyle(resting).boxShadow);
    // No tab, selected or not, wraps its icon in a background rectangle of
    // its own — the button itself carries no background at all.
    for (const t of tabs) expect(t.style.background).toBe('');
  });

  it('renders each tab as an icon tile over a label, like Quick Actions', () => {
    render(<ClientTabs active="overview" onChange={() => {}} clientId="c1" />);
    const overview = screen.getByRole('link', { name: /Overview/ });
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
    const tabs = screen.getAllByRole('link');
    const bg = (el: HTMLElement) => (el.querySelector('span[style*="linear-gradient"]') as HTMLElement).style.background;
    for (let i = 1; i < tabs.length; i++) {
      expect(bg(tabs[i])).not.toBe(bg(tabs[i - 1]));
    }
  });
});

describe('<TabPanel /> — leaving a tab does not throw its state away', () => {
  it('keeps an unsaved draft and hides the panel it is not showing', () => {
    // Unmounting Overview discarded an unsaved notes draft and a one-time
    // screening link (which cannot be reissued for free) on every tab switch.
    function Harness() {
      const [tab, setTab] = useState<TabKey>('overview');
      return (
        <>
          <button type="button" onClick={() => setTab(tab === 'overview' ? 'training' : 'overview')}>switch</button>
          <TabPanel id="overview" active={tab}>
            <textarea aria-label="draft notes" defaultValue="" />
          </TabPanel>
          <TabPanel id="training" active={tab}><p>training panel</p></TabPanel>
        </>
      );
    }

    render(<Harness />);
    fireEvent.change(screen.getByLabelText('draft notes'), { target: { value: 'keep me' } });
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(screen.getByRole('region', { name: 'Training' })).not.toHaveAttribute('hidden');
    // A hidden region has no computed accessible name, so find it by attribute.
    expect(document.querySelector('div[role="region"][aria-label="Overview"]')).toHaveAttribute('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect((screen.getByLabelText('draft notes') as HTMLTextAreaElement).value).toBe('keep me');
  });
});
