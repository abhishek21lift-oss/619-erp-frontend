/*
 * Catch the browser's install prompt as early as possible.
 *
 * Chrome and Edge fire `beforeinstallprompt` once, often before React has
 * hydrated — so a listener added from a component can miss it, and then the
 * app never offers "Install". This runs from <head>, before any app code,
 * keeps the event on window, and announces it; lib/pwa.ts picks it up.
 */
(function () {
  try {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); // offered from our own UI instead of the browser's mini-bar
      window.__myptInstallPrompt = e;
      window.dispatchEvent(new Event('mypt:installable'));
    });
    window.addEventListener('appinstalled', function () {
      window.__myptInstallPrompt = null;
      window.dispatchEvent(new Event('mypt:installable'));
    });
  } catch (err) { /* an install offer is a nicety; never break the page */ }
})();
