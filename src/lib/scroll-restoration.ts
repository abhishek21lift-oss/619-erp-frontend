'use client';
// Scroll restoration that waits for the page to be tall enough.
//
// ── Why this exists at all ───────────────────────────────────────────────────
//
// The browser (and Next's App Router on top of it) restores scroll on
// back/forward by applying the saved offset once, at the moment the history
// entry is activated. That works when the document is already its final height
// and fails silently when it is not: this app fetches page data client-side on
// mount, so a list you had scrolled 720px down renders as a ~200px spinner on
// the way back. `scrollTo(720)` against a 200px document is clamped to 0, the
// data lands a moment later, and the page is tall again with the position
// already thrown away.
//
// So the saved offset is re-applied as the document changes height, and stops
// when the user takes over or the window closes. Nothing here waits a fixed
// number of milliseconds for content: the trigger is a measurement of the
// layout, and the only timer is an upper bound so a page that never reaches its
// old height cannot leave an observer running for the rest of the session.
//
// ── Why not just let the browser do it ───────────────────────────────────────
//
// `history.scrollRestoration = 'manual'` is set deliberately. Leaving it on
// 'auto' means the browser also restores, at its own moment, against the short
// document — so the two mechanisms fight and the visible result is a jump to
// the top followed by a jump down. Owning it outright is what removes the
// double movement.
//
// Taking it over does mean the browser stops restoring on a full reload too,
// which would be a regression, so positions are flushed to sessionStorage when
// the page is hidden and read back on install. The history entry's key survives
// a reload inside `history.state`, so the position finds its way back to the
// right entry rather than to whichever page happens to load first.
//
// ── What is deliberately NOT done ────────────────────────────────────────────
//
// No global `scrollTo(0, 0)` on pathname change. A forward navigation lands on
// a new history entry, which has no saved position, and the absence of one is
// what puts it at the top — the same result, without a rule that also fires on
// the way back.

/** Positions are per history entry, not per pathname: the same route can be on
 *  the stack several times (a client profile opened from two different lists),
 *  and those entries must not share one offset. */
const KEY = '__mps_scroll_key';

/** Where the map is parked when the page is hidden, so a reload — which the
 *  browser no longer restores for us, see above — can still come back to the
 *  same place. */
const STORAGE_KEY = '__mps_scroll_positions';

/** Upper bound on how long a restore keeps chasing a changing document. Not a
 *  delay before restoring — the first attempt is immediate — but the point at
 *  which we stop expecting more content to arrive. */
const GROW_WINDOW_MS = 3000;

/** Below this, treat the page as "at the top" and store nothing. Saves writing
 *  a position for every trivial nudge of a short page. */
const MIN_SAVE = 8;

/** Enough entries to cover any realistic back-stack, few enough that a long
 *  session cannot grow the map without bound. */
const MAX_ENTRIES = 50;

const positions = new Map<string, number>();

/** Keys must survive a reload without colliding with keys minted before it, so
 *  they cannot come from a counter that resets to 1 with the page. */
function mintKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function remember(key: string, y: number): void {
  // Map iteration is insertion-ordered, so the first key is the oldest.
  if (!positions.has(key) && positions.size >= MAX_ENTRIES) {
    const oldest = positions.keys().next();
    if (!oldest.done) positions.delete(oldest.value);
  }
  positions.set(key, y);
}

/**
 * The key for the entry currently on screen, minting one if this entry has
 * never been seen. Next.js owns `history.state`, so the key is merged into it
 * rather than replacing it.
 *
 * Read fresh every time rather than cached in a variable. A cached key goes
 * stale the moment the router pushes a new entry — there is no event for that —
 * and the next scroll would then file the new page's offset under the previous
 * page's key, overwriting the position we are trying to protect.
 */
function currentKey(): string {
  const state = (window.history.state ?? {}) as Record<string, unknown>;
  const existing = state[KEY];
  if (typeof existing === 'string') return existing;

  const key = mintKey();
  try {
    window.history.replaceState({ ...state, [KEY]: key }, '');
  } catch {
    // replaceState is rate-limited in Safari. Losing the key costs a restore,
    // not correctness — the entry simply behaves like one never scrolled.
  }
  return key;
}

function maxScroll(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

/**
 * Apply `target` now, and keep re-applying while the document changes height.
 *
 * There is no "we reached it, stop" shortcut, and that absence is the point.
 * On a back navigation this runs at `popstate`, when the DOM still belongs to
 * the OUTGOING page — which is tall, so the target is trivially reachable and
 * an early exit would fire before React has even rendered the page we are
 * restoring. The shrink to a spinner and the grow back happen after that.
 *
 * What ends it early instead is the user: any genuine scroll input hands
 * control back immediately, so a restore can never fight a person.
 */
function restoreWhenTallEnough(target: number): () => void {
  let cancelled = false;
  let observer: ResizeObserver | null = null;
  let timer: number | null = null;

  // wheel/touchstart/keydown cover the obvious gestures; pointerdown is what
  // catches a scrollbar drag, which produces scroll events and none of the
  // other three.
  const USER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

  const apply = () => {
    if (cancelled) return;
    // `behavior: 'instant'` because globals.css sets `scroll-behavior: smooth`
    // on <html>, which would otherwise animate every one of these steps into a
    // visible slide down the page.
    window.scrollTo({ top: Math.min(target, maxScroll()), behavior: 'instant' });
  };

  const stop = () => {
    if (cancelled) return;
    cancelled = true;
    observer?.disconnect();
    observer = null;
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    for (const type of USER_INPUT) window.removeEventListener(type, stop);
  };

  for (const type of USER_INPUT) window.addEventListener(type, stop, { passive: true });

  apply();

  // The document changes height when the spinner replaces the list and again
  // when the data lands; those resizes are the signal to try again. This is why
  // there is no polling loop and no arbitrary delay before restoring.
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(apply);
    observer.observe(document.documentElement);
  }
  timer = window.setTimeout(stop, GROW_WINDOW_MS);

  return stop;
}

function loadFromStorage(): void {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) positions.set(key, value);
    }
  } catch {
    // Storage can be unavailable (privacy mode) or hold something we did not
    // write. Either way the in-memory map still works for this page's life.
  }
}

function saveToStorage(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(positions)));
  } catch {
    /* see above */
  }
}

/**
 * Install scroll restoration. Call once, from the root layout.
 * Returns a teardown for the effect that owns it.
 */
export function installScrollRestoration(): () => void {
  if (typeof window === 'undefined') return () => {};

  const previous = window.history.scrollRestoration;
  try {
    window.history.scrollRestoration = 'manual';
  } catch {
    // Unsupported: the browser keeps doing it its way, and the popstate
    // handler below becomes a second opinion rather than the only one. Still
    // better than nothing on that browser.
  }

  loadFromStorage();

  let cancelRestore: (() => void) | null = null;

  const restoreCurrentEntry = () => {
    cancelRestore?.();
    cancelRestore = null;
    const saved = positions.get(currentKey());
    // No saved offset means this entry was never scrolled — leave it alone
    // rather than forcing it to the top, which is what a global reset would do.
    if (saved != null && saved >= MIN_SAVE) cancelRestore = restoreWhenTallEnough(saved);
  };

  // Scroll events are already coalesced to at most one per frame by the
  // browser, so this needs no throttling of its own — and doing the work
  // synchronously here is what keeps the key and the offset in step. Deferring
  // to rAF would let a navigation land in between and file this page's offset
  // against the next page's history entry.
  const onScroll = () => {
    const y = window.scrollY;
    if (y >= MIN_SAVE) remember(currentKey(), y);
    else positions.delete(currentKey());
  };

  const onPopState = () => { restoreCurrentEntry(); };

  // pagehide covers reload, tab close and the bfcache in one event, and unlike
  // beforeunload it also fires on mobile Safari.
  const onPageHide = () => { saveToStorage(); };
  const onVisibility = () => { if (document.visibilityState === 'hidden') saveToStorage(); };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('popstate', onPopState);
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibility);

  // A reload lands on the same history entry, carrying the same key, so the
  // position saved before the reload is still addressable.
  restoreCurrentEntry();

  return () => {
    cancelRestore?.();
    saveToStorage();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('popstate', onPopState);
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibility);
    try {
      window.history.scrollRestoration = previous;
    } catch {
      /* see above */
    }
  };
}

/** Test seam: the module keeps positions in a module-level map, which persists
 *  between tests in the same file. Not exported from the app's perspective —
 *  nothing in src/ calls it. */
export function __resetScrollRestorationForTests(): void {
  positions.clear();
}
