import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Payments audit 2026-09-28 (backend docs/PAYMENTS-AUDIT-2026-09-28.md).
// Static guards on two screens that used to claim things that did not happen.

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('payments audit guards', () => {
  it('the Invoices page offers no "Send Reminder" while the API sends nothing (PAY-4)', () => {
    const src = read('app/(chrome)/finance/invoices/page.tsx');
    expect(src).not.toMatch(/label: 'Send Reminder'/);
    expect(src).not.toMatch(/>Send Reminder</);
    expect(src).not.toMatch(/api\.invoices\.remind\(/);
  });

  it('the Enroll page sends a renewed client to Renew instead of re-enrolling them (PAY-1)', () => {
    const src = read('app/(chrome)/pt-os/clients/[id]/enroll/page.tsx');
    expect(src).toMatch(/api\.clients\.renewalHistory\(clientId\)/);
    expect(src).toMatch(/if \(hasRenewed\)/);
    expect(src).toMatch(/\/pt-os\/clients\/\$\{clientId\}\/renew/);
  });

  it('a duplicate renewal reads as done, not as a failure (PAY-2)', () => {
    const src = read('app/(chrome)/pt-os/clients/[id]/renew/page.tsx');
    expect(src).toMatch(/err\.code === 'DUPLICATE_RENEWAL'/);
  });
});
