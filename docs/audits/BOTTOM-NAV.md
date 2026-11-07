# The mobile bottom nav, and two wrong fixes

`.mobile-bottom-nav { bottom: 0 }`. That is the whole mechanism, and it took
three attempts to get back to it. This file exists so the fourth attempt does
not happen.

## The original report

On iOS, the bottom nav sometimes sat with a strip of blank page beneath it —
most often on `/ai-coach`, after the keyboard had been opened and dismissed.

The diagnosis: `position: fixed; bottom: 0` resolves against the **layout**
viewport. iOS moves the **visual** one instead, and in a standalone PWA it
frequently leaves the web view shifted after a keyboard dismissal.

That diagnosis is correct. The fix built on it was not.

## Attempt 1 — measure and offset (PR #108)

`useVisualViewportAnchor` compared `window.innerHeight` against
`visualViewport.offsetTop + visualViewport.height` and published the difference
as `--vv-bottom-inset`, which the nav added to its own `bottom`.

The clamp was symmetric:

```js
Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, Math.round(shift)))
```

so a **positive** reading lifted the bar. A positive reading is the ordinary
state of mobile Safari: the bottom toolbar overlays the layout viewport, so
`visualViewport.height` is 40–90px shorter than `window.innerHeight` for as
long as the toolbar is showing. The nav floated mid-page with content visible
underneath it, at a different height on every route and every scroll position,
because the toolbar collapses as you scroll.

**The unit test asserted this.** `it('lifts it by a small gap, e.g. chrome
mid-collapse')` expected `'80px'` and was green through four merges.

## Attempt 2 — fix the sign (PR #119)

Made the correction one-directional: push down, never lift.

That removed the lift and left the other half. A **negative** reading pushes the
bar down, and `visualViewport.offsetTop` goes positive during rubber-band
overscroll and during the toolbar transition — both of which happen at the
absolute bottom of a document. So the nav slid *below* the viewport and
half-vanished exactly when you scrolled to the end of a page.

Found on a physical iPhone. It did not reproduce anywhere else, and could not
have: the whole mechanism only fires on a real mobile browser.

## What was actually wrong

Not the arithmetic — the premise. `visualViewport`'s geometry moves for toolbar
collapse, rubber-band overscroll and pinch-zoom. **None of those should move
application chrome.** Any code that positions fixed chrome from those numbers is
signing up to move the chrome whenever the browser does something ordinary.

The hook is gone. What remains:

- `.mobile-bottom-nav { bottom: 0 }` — the bar sits on the layout viewport's
  bottom edge, which is where every other website puts its bottom bar, and is
  behind Safari's toolbar when the toolbar is showing. That is correct and
  expected.
- `useViewportDesyncFix` — still there, and it is the honest half of the
  original fix: it re-asserts the **document's** scroll position so Safari
  recomputes. It never repositions an element.

## The rule

**Do not position the bottom nav from `visualViewport`.** If the keyboard case
needs handling again, handle it by changing what the *document* does, not by
moving the bar. A bar that moves is a worse bug than the one being fixed —
twice now.

`src/__tests__/bottom-nav-anchor.test.ts` enforces this: the nav's `bottom` must
be exactly `0` with no second term, nothing in `src/` may write
`--vv-bottom-inset` or `--bottom-nav-h` at runtime, and no ancestor of the nav
may carry a property that captures a fixed descendant.

## Diagnosing it on a device

`src/components/dev/ViewportProbe.tsx` renders a live readout of every value
involved. Dev-only and opt-in — it needs `NODE_ENV !== 'production'` **and**
`?vvprobe=1` in the URL, so it cannot appear for a customer.

Append `?vvprobe=1` to any route on the phone and scroll to the absolute bottom.
The line to watch is:

```
drift nav.bottom-vv.h  0   OK
```

`nav.getBoundingClientRect().bottom` minus `visualViewport.height`. It should
read 0 and stay 0 through the toolbar collapsing, the rubber-band at the end of
the document, and the scroll back up. Anything else is the bar leaving the
viewport edge, and the rest of the readout says which value moved first.
