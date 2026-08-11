// The bottom navigation must not re-lay itself out a second after it appears.
//
// Reproduced in a real throttled mobile browser before this was written: the
// bar painted FIVE tabs at +1.0s and THREE at +2.0s, because the feature map
// arrives one API round trip after the bar has already rendered and an unknown
// flag means "visible". Seeding from the last known map removes the second
// layout — for a returning user, which is the reported case ("app completely
// closed and reopened").
//
// These tests are about WHEN the map is known, not about what it permits. The
// fail-open rule and the server's 403 FEATURE_DISABLED are unchanged, and the
// last test here holds that line.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

const featuresMap = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { features: { map: () => featuresMap() } },
}));

let user: { id: string; role: string } | null = null;
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user, loading: false }),
}));

import { FeaturesProvider, useFeatures } from '@/lib/features-context';
import { readCachedFeatures, writeCachedFeatures, clearCachedUser } from '@/lib/session-cache';

/** Stands in for the nav: renders the tabs a feature map allows, so the test
 *  asserts on what a reader would actually see rather than on internals. */
function Tabs() {
  const { enabled, loaded } = useFeatures();
  const items = [
    { key: undefined, label: 'Home' },
    { key: 'ai_suite', label: 'AI' },
    { key: 'attendance', label: 'Attendance' },
  ].filter((i) => enabled(i.key));
  return (
    <div>
      <span data-testid="tabs">{items.map((i) => i.label).join(',')}</span>
      {/* One element per tab, so a tab disappearing is a DOM removal an
          observer can catch — see the no-tab-is-ever-withdrawn test. */}
      <div data-testid="bar">
        {items.map((i) => <a key={i.label} data-tab={i.label}>{i.label}</a>)}
      </div>
      <span data-testid="loaded">{String(loaded)}</span>
    </div>
  );
}

const renderTabs = () => render(<FeaturesProvider><Tabs /></FeaturesProvider>);
const tabs = () => screen.getByTestId('tabs').textContent;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  featuresMap.mockReset();
  user = { id: 'u1', role: 'trainer' };
});

describe('feature map caching — layout stability', () => {
  it('paints every tab on a first-ever launch, then settles when the server answers', async () => {
    // The unavoidable case, stated rather than hidden: with nothing cached
    // there is no way to know the answer before asking, and fail-open means
    // "show it". This is the one launch that still re-lays out.
    let resolve!: (v: unknown) => void;
    featuresMap.mockReturnValue(new Promise((r) => { resolve = r; }));

    renderTabs();
    expect(tabs()).toBe('Home,AI,Attendance');

    await act(async () => { resolve({ data: { ai_suite: false, attendance: false } }); });
    await waitFor(() => expect(tabs()).toBe('Home'));
  });

  it('paints the settled tab set on the FIRST render of the next launch', async () => {
    // The reported scenario. The bar must never show a tab it is about to
    // remove, so this asserts the very first render — not an eventual state.
    writeCachedFeatures('u1', { ai_suite: false, attendance: false });
    featuresMap.mockReturnValue(new Promise(() => {})); // server never answers

    renderTabs();

    expect(tabs()).toBe('Home');
  });

  it('never withdraws a tab it has already painted', () => {
    // The discriminating test, and the reason the seed happens during render
    // rather than in an effect.
    //
    // A DOM query cannot catch this: RTL flushes effects inside act(), so by
    // the time any assertion runs an effect-based seed has already corrected
    // itself and the tabs read 'Home' either way. An earlier version of this
    // file asserted exactly that and passed against a deliberately broken
    // effect-based seed. What the reader actually sees is the WITHDRAWAL — two
    // tabs painting and then vanishing — so that is what is observed here.
    writeCachedFeatures('u1', { ai_suite: false, attendance: false });
    featuresMap.mockReturnValue(new Promise(() => {}));

    const removed: string[] = [];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        r.removedNodes.forEach((n) => {
          const label = (n as HTMLElement).dataset?.tab;
          if (label) removed.push(label);
        });
      }
    });
    observer.observe(host, { childList: true, subtree: true });

    render(<FeaturesProvider><Tabs /></FeaturesProvider>, { container: host });

    observer.takeRecords().forEach((r) => {
      r.removedNodes.forEach((n) => {
        const label = (n as HTMLElement).dataset?.tab;
        if (label) removed.push(label);
      });
    });
    observer.disconnect();

    expect(removed).toEqual([]);
    host.remove();
  });

  it('still reports loaded=false until the server actually answers', async () => {
    // The cache is a paint hint, not the answer. Anything gated on `loaded`
    // must keep waiting, or a cached map would start standing in for the
    // server's word.
    writeCachedFeatures('u1', { ai_suite: false, attendance: false });
    featuresMap.mockReturnValue(new Promise(() => {}));

    renderTabs();

    expect(screen.getByTestId('loaded').textContent).toBe('false');
  });

  it('never paints one account\'s map for another', async () => {
    // A shared device, or an operator switching studios. The map is stamped
    // with the id it was written for and must not be applied to anyone else.
    writeCachedFeatures('someone-else', { ai_suite: false, attendance: false });
    featuresMap.mockReturnValue(new Promise(() => {}));

    renderTabs();

    expect(tabs()).toBe('Home,AI,Attendance');
  });

  it('records the server\'s answer so the next launch can use it', async () => {
    featuresMap.mockResolvedValue({ data: { ai_suite: false } });

    renderTabs();
    await waitFor(() => expect(tabs()).toBe('Home,Attendance'));

    expect(readCachedFeatures('u1')).toEqual({ ai_suite: false });
  });

  it('forgets the map when the session is forgotten', () => {
    // Logout, a 401, and starting or ending impersonation all clear the cached
    // user. The feature map has to go with it, or the next person to use this
    // browser inherits the last studio's navigation.
    writeCachedFeatures('u1', { ai_suite: false });
    clearCachedUser();
    expect(readCachedFeatures('u1')).toBeNull();
  });

  it('keeps failing OPEN — the cache narrows nothing the server has not', async () => {
    // The documented product decision: an unknown key answers true. A cached
    // map must not turn that into a closed door, and it is not an authorisation
    // input — the server still refuses a disabled capability with 403.
    writeCachedFeatures('u1', { ai_suite: false });
    featuresMap.mockReturnValue(new Promise(() => {}));

    render(
      <FeaturesProvider>
        <Unknown />
      </FeaturesProvider>,
    );

    expect(screen.getByTestId('unknown').textContent).toBe('true');
  });
});

function Unknown() {
  const { enabled } = useFeatures();
  return <span data-testid="unknown">{String(enabled('a_key_nobody_has_heard_of'))}</span>;
}
