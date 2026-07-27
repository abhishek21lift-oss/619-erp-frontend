/* Resolve the theme BEFORE first paint.
 *
 * ThemeProvider applies the class in a useEffect, which runs after the browser
 * has already painted — so a dark-mode user saw a full-page white flash on
 * every load (measured: body painted #F8FAFC, then flipped to #0F172A). This
 * runs synchronously from <head>, so the very first frame is already correct.
 *
 * It lives in /public rather than inline in layout.tsx for a security reason:
 * it was the app's only author-written inline script, and inline scripts are
 * what force 'unsafe-inline' into the CSP's script-src. An external file needs
 * only 'self'. The alternative — keeping it inline and stamping it with a
 * per-request nonce — would mean calling headers() in the root layout, which
 * opts every route in the app out of static rendering. Not worth it for eight
 * lines of theme code.
 *
 * Mirrors ThemeProvider's resolution order (stored preference beats the system
 * preference). try/catch because localStorage throws in some privacy modes.
 */
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t !== 'dark' && t !== 'light') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) { /* private mode */ }
})();
