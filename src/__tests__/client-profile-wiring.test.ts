/**
 * The member profile's links, and the context they were dropping.
 *
 * ── Why these are source assertions ────────────────────────────────────────
 *
 * Each finding here is "screen A sends a client_id and screen B never reads
 * it". That is a fact about two files, and it is invisible to a component test
 * of either one: A renders a perfectly good link, B renders a perfectly good
 * form. Only the pair is wrong, and only by reading both.
 *
 * Rendering B and asserting it pre-selected the client would be a better test
 * and needs the whole app harness plus a client fixture; these are the cheap
 * ratchet that stops the wiring being removed again.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (...p: string[]) =>
  readFileSync(resolve(process.cwd(), 'src', ...p), 'utf8')
    // Comments explain this history at length; only code counts.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const PROFILE = read('app', '(chrome)', 'pt-os', 'clients', '[id]', 'page.tsx');

describe('pages the profile links to read the client_id it sends', () => {
  it('session-balance seeds its client from the URL', () => {
    // The profile's "Session Balance" action and its Payments panel both link
    // as ?client_id=<id>. The page used to start with useState('') and only
    // ever set it from a dropdown, so a trainer arriving from a client's
    // profile had to find that same client in a list of the whole studio.
    const page = read('app', '(chrome)', 'pt-os', 'session-balance', 'page.tsx');
    expect(page).toMatch(/useSearchParams/);
    expect(page).toMatch(/sp\.get\('client_id'\)/);
  });

  it('ai/progress-analysis resolves the client it was linked with', () => {
    const page = read('app', '(chrome)', 'ai', 'progress-analysis', 'page.tsx');
    expect(page).toMatch(/useSearchParams/);
    expect(page).toMatch(/client_id/);
    // Fetched by id, not searched for in the first page of clients — a studio
    // with more than twenty would otherwise find some clients and not others.
    expect(page).toMatch(/api\.pt\.client\(/);
  });

  it('the profile still sends the id to both', () => {
    // Guards the other direction: a test that only checked the destinations
    // would keep passing if the links themselves lost their parameter.
    expect(PROFILE).toMatch(/session-balance\?client_id=/);
    expect(PROFILE).toMatch(/progress-analysis\?client_id=/);
  });
});

describe('a failed save is not silent', () => {
  it('session-balance reports why a package could not be created', () => {
    // It was try/finally with no catch at all: a failed save reset the button
    // and said nothing, so the form looked like it had ignored the click.
    const page = read('app', '(chrome)', 'pt-os', 'session-balance', 'page.tsx');
    expect(page).toMatch(/catch\s*\(/);
    expect(page).toMatch(/errorMessage\(/);
    expect(page).toMatch(/role="alert"/);
  });
});

describe('the Documents card tells "could not check" from "nothing on file"', () => {
  it('starts unknown rather than none', () => {
    // Both used to start at 'none' behind `.catch(() => ({ data: [] }))`, so a
    // failed request rendered "Not Started" for a PAR-Q that may be signed —
    // the wrong claim to make confidently about the form that decides whether
    // somebody is cleared to train.
    expect(PROFILE).toMatch(/useState\('unknown'\)/);
    expect(PROFILE).not.toMatch(/catch\(\(\) => \(\{ data: \[\] \}\)\)/);
  });

  it('settles each document separately', () => {
    // One combined catch let a single failing endpoint blank the other.
    expect(PROFILE).toMatch(/Promise\.allSettled\(\[\s*\n\s*api\.progress\.parqForms/);
  });

  it('an unrecognised status falls back to unknown, not to Not Started', () => {
    expect(PROFILE).toMatch(/DOC_STATUS_STYLE\[status\] \|\| DOC_STATUS_STYLE\.unknown/);
  });
});

describe('the Photos tab queries', () => {
  it('renders the fetching panel rather than a hardcoded empty state', () => {
    expect(PROFILE).toMatch(/<PhotosPanel clientId=/);
    expect(PROFILE).not.toMatch(/title="No progress photos yet"/);
  });
});

describe('dead state that cost two requests per page view', () => {
  it('no longer computes counts nothing renders', () => {
    // activityCounts fed an Activity Mix donut that was removed. The state
    // survived, written on every load and read nowhere — and it was the only
    // consumer of two of the five requests in loadData.
    expect(PROFILE).not.toMatch(/activityCounts/);
    expect(PROFILE).not.toMatch(/baselineDone/);
  });

  it('no longer fetches check-ins and payments for the profile page', () => {
    expect(PROFILE).not.toMatch(/weeklyCheckins\.list/);
    expect(PROFILE).not.toMatch(/api\.pt\.payments\(/);
  });
});

describe('the Notes tab goes somewhere', () => {
  it('switches tab instead of linking to the page you are already on', () => {
    // It linked to /pt-os/clients/{id} — this page's own URL — so tapping it
    // navigated nowhere and left the Notes panel exactly where it was.
    expect(PROFILE).toMatch(/onClick=\{\(\) => setTab\('overview'\)\}/);
  });
});

describe('the Reports tab promises what it delivers', () => {
  it('no longer sends client_id to the studio-wide finance report', () => {
    // /pt-os/reports is revenue, commissions and trainer counts, with no
    // per-client concept and no reading of the parameter it was handed.
    expect(PROFILE).not.toMatch(/pt-os\/reports\?client_id=/);
  });

  it('still offers the studio report, unparameterised', () => {
    expect(PROFILE).toMatch(/href: '\/pt-os\/reports'/);
  });
});
