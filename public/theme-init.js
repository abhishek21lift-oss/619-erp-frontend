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
 * ── The '619-theme' migration ───────────────────────────────────────────────
 *
 * There used to be TWO theme systems writing TWO different keys. This script
 * and ThemeProvider used 'theme'; the visible toggle in AppShell and the
 * settings page used '619-theme' and never told the context about it. The
 * result was a reproducible bug rather than untidiness: toggling from the
 * header left every useTheme() consumer stale (the diet-plan charts kept their
 * old palette), and on the next load this script read 'theme', found nothing,
 * and fell back to the SYSTEM preference — silently discarding the choice the
 * user had just made. Exactly the flash-of-wrong-theme this script exists to
 * prevent, reintroduced by the key mismatch.
 *
 * AppShell now goes through ThemeProvider, so 'theme' is the only key written.
 * The read below promotes any existing '619-theme' value once, so nobody who
 * had set a preference under the old key loses it on the release that fixes
 * this, and then clears it so the two can never diverge again.
 *
 * try/catch because localStorage throws in some privacy modes.
 */
(function () {
  try {
    var t = localStorage.getItem('theme');

    if (t !== 'dark' && t !== 'light') {
      var legacy = localStorage.getItem('619-theme');
      if (legacy === 'dark' || legacy === 'light') {
        t = legacy;
        localStorage.setItem('theme', t);
      }
    }
    // Safe to drop once promoted: nothing writes it any more.
    try { localStorage.removeItem('619-theme'); } catch (e2) { /* ignore */ }

    if (t !== 'dark' && t !== 'light') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Both hooks, because globals.css targets `[data-theme="dark"], .dark` and
    // AppShell previously set the attribute while ThemeProvider set only the
    // class. Writing both here means the pre-paint frame matches whichever
    // selector a rule happens to use.
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* private mode */ }
})();
