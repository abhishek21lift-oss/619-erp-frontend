import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serverFilter } from '@/lib/client-filter';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('clients list server filter', () => {
  it('maps the expired pill to the derived term filter', () => {
    expect(serverFilter('expired')).toEqual({ term: 'ended' });
  });

  it('sends no filter for the all pill', () => {
    expect(serverFilter('all')).toEqual({});
  });

  it('maps the remaining pills straight to status', () => {
    expect(serverFilter('active')).toEqual({ status: 'active' });
    expect(serverFilter('pending')).toEqual({ status: 'pending' });
    expect(serverFilter('frozen')).toEqual({ status: 'frozen' });
  });
});

// The dashboard's "Active Clients" count is the number of active clients; the
// tile used to open the unfiltered roster, so the list contradicted the figure
// that was just tapped. It now hands the filter over in the URL.
describe('the Active Clients tile opens the active roster', () => {
  it('links with ?status=active', () => {
    expect(src('src/components/dashboards/PtOsDashboard.tsx'))
      .toContain('href="/pt-os/clients?status=active"');
  });

  it('the clients page seeds its pills from ?status= and validates the value', () => {
    const page = src('src/app/(chrome)/pt-os/clients/page.tsx');
    expect(page).toContain("new URLSearchParams(window.location.search).get('status')");
    // A hand-edited URL must not select a pill that no control can undo.
    expect(page).toContain('STATUS_FILTERS.some((f) => f.value === s)');
    expect(page).toContain("title={statusFilter === 'active' ? 'Active Clients' : 'PT Clients'}");
  });
});

// Both message screens now share one chat surface, so each has to hand it the
// viewer's accent and who is on the other side.
describe('both message screens drive the shared chat surface', () => {
  it('passes an accent and a peer into ChatThread', () => {
    for (const file of ['src/app/(bare)/member/messages/page.tsx', 'src/app/(chrome)/pt-os/messages/page.tsx']) {
      const page = src(file);
      expect(page).toContain('accent={');
      expect(page).toContain('peer={{');
    }
  });
});
