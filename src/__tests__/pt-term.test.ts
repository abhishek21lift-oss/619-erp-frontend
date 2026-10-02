// Enroll vs Renew. The client profile decided on `!!client.pt_start_date`, and
// client creation defaulted that date to today for everyone — so a client who
// had never been enrolled was offered "Renew PT", and renewing them locked
// them out of enrolling. The rule now comes from the server (`has_pt_term`)
// and every Enroll-or-Renew screen reads it through lib/pt-term.ts.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { hasPtTerm } from '@/lib/pt-term';

describe('hasPtTerm', () => {
  it('a new client with no term is not enrolled, whatever their start date says', () => {
    expect(hasPtTerm({ has_pt_term: false })).toBe(false);
    // The legacy shape: a start date from the day they were added, no term.
    expect(hasPtTerm({ has_pt_term: false, pt_end_date: null, ...{ pt_start_date: '2026-03-04' } } as never)).toBe(false);
    expect(hasPtTerm({ pt_start_date: '2026-03-04' } as never)).toBe(false);
  });

  it('an enrolled, renewed or expired client has a term', () => {
    expect(hasPtTerm({ has_pt_term: true })).toBe(true);
    expect(hasPtTerm({ has_pt_term: true, pt_end_date: '2025-01-01' })).toBe(true); // expired
  });

  it('the server flag wins over the end date, both ways', () => {
    // Renewal history with a cleared end date: the server still says term.
    expect(hasPtTerm({ has_pt_term: true, pt_end_date: null })).toBe(true);
    expect(hasPtTerm({ has_pt_term: false, pt_end_date: '2026-12-01' })).toBe(false);
  });

  it('without the flag, the row-level half of the rule applies — never the start date', () => {
    expect(hasPtTerm({ pt_end_date: '2026-12-01' })).toBe(true);
    expect(hasPtTerm({ duration_months: 3 })).toBe(true);
    expect(hasPtTerm({ final_amount: '9000.00' })).toBe(true);
    expect(hasPtTerm({ final_amount: '0.00', duration_months: null, pt_end_date: null })).toBe(false);
    expect(hasPtTerm({ pt_end_date: '' })).toBe(false);
    expect(hasPtTerm({ pt_end_date: 'soon' })).toBe(false);
    expect(hasPtTerm(null)).toBe(false);
    expect(hasPtTerm(undefined)).toBe(false);
  });
});

describe('every Enroll-or-Renew screen reads the one rule', () => {
  const APP = path.join(__dirname, '..', 'app', '(chrome)', 'pt-os', 'clients', '[id]');
  const read = (rel: string) => fs.readFileSync(path.join(APP, rel), 'utf8');

  it('the profile no longer decides on pt_start_date', () => {
    const src = read('page.tsx');
    expect(src).not.toMatch(/hasTerm\s*=\s*!!\s*client\?\.pt_start_date/);
    expect(src).toMatch(/const hasTerm = hasPtTerm\(client\)/);
  });

  it('the subscription history only offers Renew to a client with a term', () => {
    const src = read('subscriptions/page.tsx');
    expect(src).toMatch(/hasPtTerm\(client\) \?/);
    expect(src).toMatch(/\/enroll`\)/);
  });

  it('the renew screen refuses a client with no term, before and after submit', () => {
    const src = read('renew/page.tsx');
    expect(src).toMatch(/client && !hasPtTerm\(client\)/);
    expect(src).toMatch(/err\.code === 'NOT_ENROLLED'/);
  });

  it('the enroll screen does not pre-fill a start date invented at creation', () => {
    const src = read('enroll/page.tsx');
    expect(src).toMatch(/hasPtTerm\(c as PtTermFields\) && String\(c\.pt_start_date/);
  });
});
