// Shared chrome for windows opened via window.open('') + document.write() +
// window.print() (fitness reports, printable QR cards, invoices). These
// popups have no browser toolbar on most mobile browsers, so once the
// print dialog is dismissed there's no way back to the app — this injects
// a small floating "Close" button (hidden when actually printing) that
// closes the window opened by our own script.
export function printWindowCloseButtonHtml(label = '✕ Close'): string {
  return `
<button onclick="window.close()" class="pw-close-btn no-print" type="button">${label}</button>
<style>
  .pw-close-btn{position:fixed;top:14px;right:14px;z-index:9999;padding:10px 18px;border-radius:999px;border:none;background:#0f172a;color:#fff;font:700 13px system-ui,-apple-system,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(15,23,42,0.25)}
  .pw-close-btn:hover{background:#1e293b}
  @media print{.no-print{display:none !important}}
</style>`;
}
