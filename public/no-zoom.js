/* Stop pinch-zoom on iOS, where the viewport meta tag cannot.
 *
 * layout.tsx sets maximum-scale=1 and user-scalable=no. Android Chrome and
 * desktop touch honour that; MOBILE SAFARI DOES NOT, and has not since iOS 10.
 * Apple stopped obeying those attributes deliberately, because sites were using
 * them to make text permanently unreadable. The consequence here is that on an
 * iPad — which is what this app is mostly used on — the meta tag alone changes
 * nothing at all, and two fingers still zoom the page.
 *
 * So the gestures are cancelled directly.
 *
 * ── Why three listeners and not one ────────────────────────────────────────
 *
 * `gesturestart` / `gesturechange` / `gestureend` are Safari-only events fired
 * for multi-touch scale and rotate. gesturestart alone is not enough: Safari
 * still applies the zoom if the later events go unhandled, so all three are
 * cancelled. They do not exist in other browsers, where these listeners simply
 * never fire and cost nothing.
 *
 * `touchmove` with two or more touches is the fallback for the same gesture in
 * WebKit builds that do not emit the gesture events (older iOS, and some
 * embedded webviews). It checks the touch count so that ordinary one-finger
 * scrolling is untouched.
 *
 * ── passive: false is load-bearing ─────────────────────────────────────────
 *
 * Touch listeners on the document default to passive in every modern browser,
 * and a passive listener's preventDefault() is IGNORED — the browser logs a
 * console warning and zooms anyway. Every listener here must opt out
 * explicitly or the whole file silently does nothing.
 *
 * ── What is deliberately NOT blocked ───────────────────────────────────────
 *
 * One-finger scroll, tap, long-press and text selection: all untouched, since
 * the touch handler returns immediately unless a second finger is down.
 *
 * Browser and OS zoom: desktop Ctrl +/- and the iOS/Android system Zoom
 * accessibility setting operate above the page and cannot be intercepted from
 * here. That is the point — someone who genuinely needs magnification keeps a
 * route to it, which is what makes turning off the in-page gesture defensible
 * rather than hostile.
 *
 * Double-tap-to-zoom is handled in CSS (`touch-action` in globals.css) rather
 * than here, because doing it in JS means guessing at a double-tap timeout and
 * getting it wrong for slow tappers.
 *
 * This lives in /public and is loaded as an external file for the same reason
 * theme-init.js is: an author-written inline script is what forces
 * 'unsafe-inline' into the CSP's script-src.
 */
(function () {
  var stop = function (e) { e.preventDefault(); };

  // Safari's multi-touch scale/rotate events. All three, not just the first.
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('gesturechange', stop, { passive: false });
  document.addEventListener('gestureend', stop, { passive: false });

  // Fallback for WebKit builds that do not fire the gesture events. Only acts
  // once a second finger is down, so one-finger scrolling is unaffected.
  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
})();
