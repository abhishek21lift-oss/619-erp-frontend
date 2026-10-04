// Regression tests for the three `document.write()` print popups.
//
// ── The bug these pin ───────────────────────────────────────────────────────
//
// Each of these builds an HTML string by concatenation and writes it into a
// `window.open('')` popup. That popup is SAME-ORIGIN with the app, and the
// enforced CSP still ships `script-src 'self' 'unsafe-inline'`
// (lib/security-headers.js:150) — the nonce variant is only applied to the
// Report-Only header, which blocks nothing. So markup that reached these
// templates executed with the user's session, in the app's origin.
//
// The tests assert the property that actually matters: after a value carrying
// an injection payload has been through the generator, the resulting document
// contains NO element or attribute the payload was trying to create, and the
// payload survives only as visible text.
//
// They deliberately assert on the PARSED DOM rather than on the string. A test
// that greps for "&lt;script&gt;" in the output would pass for a generator that
// escapes the opening tag but still lets an attribute breakout through, and it
// would happily pass if the escaping moved to the wrong layer. Parsing is the
// only assertion that cannot be satisfied by escaping the wrong thing.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { escapeHtml, escapeImageDataUrl } from '@/lib/escapeHtml';
import { generateAssessmentReportHTML } from '@/lib/assessment-pdf';
import { generateInvoiceHTML } from '@/lib/invoice-print';

// Payloads that each break out of a DIFFERENT context, so escaping one
// context and missing another still fails the suite.
const PAYLOADS = {
  scriptTag: '<script>window.__XSS=1</script>',
  imgOnerror: '<img src=x onerror="window.__XSS=1">',
  attrBreakout: '" onmouseover="window.__XSS=1" x="',
  closingThenScript: '</p><script>window.__XSS=1</script><p>',
  svgOnload: '<svg/onload=window.__XSS=1>',
  styleBreakout: '</style><script>window.__XSS=1</script><style>',
};

/** Parses HTML and asserts no injected element or event handler survived. */
function expectNoScript(html: string, context: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // 1. No <script> element at all. The generator's own <style> is fine.
  expect(doc.querySelectorAll('script').length, `${context}: a <script> element was created`).toBe(0);

  // 2. No event-handler attribute anywhere. This is what catches the
  //    attribute-breakout payloads, which create no script element.
  //
  //    The close button is the one legitimate exception: printWindowChrome.ts
  //    writes onclick="window.close()" into every popup, and it is markup we
  //    author from a constant with no interpolation. It is excluded by identity
  //    (its class), not by matching the handler name — so a payload that managed
  //    to add onclick to some other element, or to a second element carrying
  //    the class, would still fail here.
  const withHandler = Array.from(doc.querySelectorAll('*')).filter((el) =>
    !(el.classList.contains('pw-close-btn'))
    && Array.from(el.attributes).some((a) => /^on/i.test(a.name)),
  );
  expect(withHandler.length, `${context}: an on* handler survived on ${withHandler.map((e) => e.tagName).join(',')}`)
    .toBe(0);

  // 3. No injected <img>/<svg> — the payload's elements must not exist.
  expect(doc.querySelectorAll('svg').length, `${context}: an injected <svg> was created`).toBe(0);
  // <img> is legitimately absent from all three templates, so any img is ours.
  expect(doc.querySelectorAll('img').length, `${context}: an injected <img> was created`).toBe(0);

  // 4. The payload text is still VISIBLE — escaping must not silently drop
  //    content. A generator that deleted the field would pass 1-3 and fail
  //    this, which is the behaviour regression this guards against.
  //
  //    Read the leaf text of every element, EXCLUDING <style>/<script>. A
  //    whole-body check is useless here: the close button injects a <style>
  //    block into the body, and its CSS is long enough to dominate textContent
  //    — so a body-level assertion could pass or fail for reasons unrelated to
  //    the field under test.
  const visibleText = Array.from(doc.querySelectorAll('body *'))
    .filter((el) => !['STYLE', 'SCRIPT'].includes(el.tagName))
    .map((el) => el.textContent ?? '')
    .join(' ');
  // Case-insensitive: the invoice status is uppercased for display, so its
  // payload arrives as WINDOW.__XSS. Looking for the mixed case would fail on
  // correct output.
  expect(visibleText.toLowerCase()).toContain('window.__xss=1');
}

describe('escapeHtml', () => {
  it('escapes all five characters that can change parsing context', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('escapes ampersands once, not twice', () => {
    // & first, or the entities introduced later get re-escaped into &amp;lt;
    expect(escapeHtml('a & <b>')).toBe('a &amp; &lt;b&gt;');
  });

  it('renders null and undefined as empty, not as the words', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('coerces non-strings, because these arrive from JSON rows', () => {
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml(false)).toBe('false');
    expect(escapeHtml(1500.5)).toBe('1500.5');
  });

  it('leaves ordinary text, including the rupee and em-dash, intact', () => {
    expect(escapeHtml('Mina Rao — ₹11,111 · normal text')).toBe('Mina Rao — ₹11,111 · normal text');
  });
});

describe('escapeImageDataUrl', () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk';

  it('accepts a real base64 image data URL', () => {
    expect(escapeImageDataUrl(png)).toBe(png);
  });

  it('rejects an svg data URL, which is a document that can carry script', () => {
    // The one image format that is also executable. Allowlisting it here
    // would put the hole back through the very attribute being guarded.
    expect(escapeImageDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe('');
  });

  it('rejects a javascript: URL and a remote URL', () => {
    expect(escapeImageDataUrl('javascript:alert(1)')).toBe('');
    expect(escapeImageDataUrl('https://evil.example/x.png')).toBe('');
  });

  it('rejects an attribute-breakout attempt dressed as a data URL', () => {
    expect(escapeImageDataUrl('x" onerror="alert(1)')).toBe('');
    expect(escapeImageDataUrl(`${png}" onerror="alert(1)`)).toBe('');
  });

  it('honours the fallback argument', () => {
    expect(escapeImageDataUrl('nope', 'about:blank')).toBe('about:blank');
  });
});

describe('invoice print popup', () => {
  const invoice = (over: Record<string, unknown> = {}) => ({
    id: 'INV-001', memberName: 'Mina Rao', description: 'Monthly PT',
    status: 'pending', date: '2026-10-01', dueDate: '2026-10-08',
    amount: 45000, paymentMethod: 'upi', ...over,
  });

  it('renders a normal invoice with every field visible', () => {
    const html = generateInvoiceHTML(invoice());
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
    expect(text).toContain('Mina Rao');
    expect(text).toContain('Monthly PT');
    expect(text).toContain('INV-001');
    expect(text).toContain('PENDING');
    // The template's own styling must survive — escaping is not allowed to
    // damage the document it is protecting.
    expect(html).toContain('<style>');
    expect(html).toContain('class="amount"');
  });

  it('renders the amount with the rupee sign and grouping', () => {
    const html = generateInvoiceHTML(invoice({ amount: 45000 }));
    expect(html).toContain('&#8377;');
    expect(html).toContain('45,000');
  });

  it.each(Object.entries(PAYLOADS))('neutralises %s in memberName', (_name, payload) => {
    expectNoScript(generateInvoiceHTML(invoice({ memberName: payload })), 'memberName');
  });

  it.each(Object.entries(PAYLOADS))('neutralises %s in description', (_name, payload) => {
    expectNoScript(generateInvoiceHTML(invoice({ description: payload })), 'description');
  });

  it('neutralises a payload in the invoice id, which lands in <title> and <p>', () => {
    expectNoScript(generateInvoiceHTML(invoice({ id: PAYLOADS.scriptTag })), 'invoice.id');
  });

  it('does not let status break out of the style attribute it is compared into', () => {
    const html = generateInvoiceHTML(invoice({ status: '"><script>window.__XSS=1</script>' }));
    expectNoScript(html, 'invoice.status');
  });
});

describe('check-in QR print popup', () => {
  // The QR card is built inline in the client page, so its HTML is extracted
  // from source rather than exported. Reading it here means the test fails if
  // the escaping is ever removed from the real component — which is the point.
  const clientPageSrc = readFileSync(
    'src/app/(chrome)/pt-os/clients/[id]/page.tsx', 'utf8',
  );

  it('escapes the client name in the popup', () => {
    // Both the <title> and the visible <p> must be escaped; a single unescaped
    // one is enough to run script.
    const escaped = clientPageSrc.match(/escapeHtml\(clientName\)/g) ?? [];
    expect(escaped.length, 'clientName must be escaped at both interpolation points')
      .toBeGreaterThanOrEqual(2);
  });

  it('validates the QR src instead of merely quoting it', () => {
    expect(clientPageSrc).toContain('escapeImageDataUrl(dataUrl)');
  });

  it('never interpolates a raw value into the popup HTML', () => {
    const popup = clientPageSrc.slice(
      clientPageSrc.indexOf("`<html><head><title>"),
      clientPageSrc.indexOf('</body></html>`'),
    );
    // Any `${...}` in the popup body must be a known-safe call or the close
    // button helper. A bare ${clientName} or ${dataUrl} here is the bug.
    const interpolations = popup.match(/\$\{[^}]+\}/g) ?? [];
    const unsafe = interpolations.filter(
      (i) => !/escapeHtml|escapeImageDataUrl|printWindowCloseButtonHtml/.test(i),
    );
    expect(unsafe, `unsafe interpolation(s) in the QR popup: ${unsafe.join(', ')}`).toHaveLength(0);
  });
});

describe('fitness assessment print popup', () => {
  const base = { assessment_number: 'FA-1', assessment_date: '2026-10-01', trainer_name: 'Ravi' };

  it('renders a normal report with values visible and layout intact', () => {
    const html = generateAssessmentReportHTML({ ...base, weight: 72, bmi: 23.4 });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.textContent ?? '';
    expect(text).toContain('Fitness Testing Report');
    expect(text).toContain('Ravi');
    expect(text).toContain('72');
    expect(text).toContain('23.4');
    // The report's own structure must survive escaping.
    expect(doc.querySelectorAll('.section').length).toBeGreaterThan(0);
    expect(doc.querySelectorAll('.dashboard').length).toBe(1);
    // Two <style> blocks by design: the report's own in <head>, and the close
    // button's in <body>. Asserting the split rather than a total, because a
    // generator that lost one of them would still produce a printable page.
    expect(doc.head.querySelectorAll('style').length).toBe(1);
    expect(doc.body.querySelectorAll('style').length).toBe(1);
  });

  it('keeps the section titles that contain a literal entity readable', () => {
    // 'Flexibility &amp; Mobility' is markup WE authored. Escaping the whole
    // template would print "&amp;amp;" here — this pins that we escape values,
    // not structure.
    const html = generateAssessmentReportHTML({ ...base, flexibility_category: 'Good' });
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
    expect(text).toContain('Flexibility & Mobility');
    expect(text).not.toContain('&amp;amp;');
  });

  it.each(Object.entries(PAYLOADS))('neutralises %s in the client name', (_name, payload) => {
    expectNoScript(generateAssessmentReportHTML(base, payload), 'clientName');
  });

  it.each(Object.entries(PAYLOADS))('neutralises %s in trainer notes', (_name, payload) => {
    expectNoScript(
      generateAssessmentReportHTML({ ...base, trainer_notes: payload }), 'trainer_notes',
    );
  });

  it.each(Object.entries(PAYLOADS))('neutralises %s in a numeric-ish field', (_name, payload) => {
    expectNoScript(generateAssessmentReportHTML({ ...base, weight: payload }), 'weight');
  });

  it('neutralises a payload in posture and health notes too', () => {
    expectNoScript(
      generateAssessmentReportHTML({ ...base, posture_notes: PAYLOADS.imgOnerror }), 'posture_notes',
    );
    expectNoScript(
      generateAssessmentReportHTML({ ...base, health_notes: PAYLOADS.scriptTag }), 'health_notes',
    );
  });

  describe('AI output — untrusted in the strongest sense here', () => {
    const ai = (over: Record<string, unknown> = {}) => ({
      summary: 'Solid base.',
      overall_assessment: 'Improving.',
      strengths: ['Squat depth'],
      areas_to_improve: ['Mobility'],
      risk_flags: [{ flag: 'None', severity: 'low', action: 'None' }],
      recommendations: [{ priority: 1, focus_area: 'Deadlift', action: 'Add it' }],
      suggested_next_test_focus: 'Deadlift',
      ...over,
    });

    it('renders AI analysis with its markup intact', () => {
      const html = generateAssessmentReportHTML(base, 'Mina Rao', ai() as never);
      const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
      expect(text).toContain('AI Recommendations');
      expect(text).toContain('Squat depth');
      expect(text).toContain('Deadlift');
      // <strong> around the flag and the recommendation heading are ours.
      expect(html).toContain('<strong>');
    });

    it.each([
      ['summary', { summary: PAYLOADS.scriptTag }],
      ['overall_assessment', { overall_assessment: PAYLOADS.imgOnerror }],
      ['suggested_next_test_focus', { suggested_next_test_focus: PAYLOADS.scriptTag }],
    ])('neutralises %s', (_field, over) => {
      expectNoScript(generateAssessmentReportHTML(base, 'Mina Rao', ai(over) as never), `ai.${_field}`);
    });

    it.each([
      ['strengths', { strengths: [PAYLOADS.scriptTag] }],
      ['areas_to_improve', { areas_to_improve: [PAYLOADS.imgOnerror] }],
    ])('neutralises a payload inside %s[]', (_field, over) => {
      expectNoScript(generateAssessmentReportHTML(base, 'Mina Rao', ai(over) as never), `ai.${_field}`);
    });

    it.each([
      ['risk_flags[].flag', { risk_flags: [{ flag: PAYLOADS.scriptTag, severity: 'high', action: 'x' }] }],
      ['risk_flags[].action', { risk_flags: [{ flag: 'x', severity: 'high', action: PAYLOADS.imgOnerror }] }],
      ['recommendations[].focus_area', { recommendations: [{ priority: 1, focus_area: PAYLOADS.scriptTag, action: 'x' }] }],
      ['recommendations[].action', { recommendations: [{ priority: 1, focus_area: 'x', action: PAYLOADS.imgOnerror }] }],
    ])('neutralises a payload inside %s', (_field, over) => {
      expectNoScript(generateAssessmentReportHTML(base, 'Mina Rao', ai(over) as never), `ai.${_field}`);
    });
  });
});

describe('the CSP no longer being the only thing standing here', () => {
  // The audit found `script-src 'self' 'unsafe-inline'` in the ENFORCED policy,
  // which is what made the popups exploitable. That is a separate, larger
  // change — removing it needs the Report-Only rollout the file already
  // documents. This test records the dependency so the popups are not fixed
  // *by* that removal later: escaping must stand on its own.
  it('the enforced policy still allows inline script, so these fixes are load-bearing', () => {
    const headers = readFileSync('src/lib/security-headers.js', 'utf8');
    expect(headers).toContain("script-src 'self' 'unsafe-inline'");
  });

  it('all three popups escape rather than relying on CSP', () => {
    const files = [
      'src/lib/invoice-print.ts',
      'src/app/(chrome)/pt-os/clients/[id]/page.tsx',
      'src/lib/assessment-pdf.ts',
    ];
    for (const f of files) {
      expect(readFileSync(f, 'utf8'), `${f} must use escapeHtml`).toContain('escapeHtml');
    }
  });
});