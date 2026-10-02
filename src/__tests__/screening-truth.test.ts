// Screening the UI shows is the screening the server enforces (Phase 2).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { restoreKeepingIdentity } from '@/lib/draft-identity';
import { TRAINING_BLOCK_ACTIONS } from '@/lib/screening';

const APP = path.join(__dirname, '..', 'app', '(chrome)', 'pt-os');
const read = (rel: string) => fs.readFileSync(path.join(APP, rel), 'utf8');

describe('a restored draft never brings back who the form is about', () => {
  const base = { fullName: 'Ravi Kumar', mobile: '9876543210', notes: '' };

  it('the profile identity wins over the draft; everything else the trainer typed is kept', () => {
    const draft = { fullName: 'Ravi', mobile: '9000000000', notes: 'knee pain on stairs' };
    expect(restoreKeepingIdentity(base, draft, { fullName: 'Ravi Kumar', mobile: '9876543210' }))
      .toEqual({ fullName: 'Ravi Kumar', mobile: '9876543210', notes: 'knee pain on stairs' });
  });

  it('with no profile loaded, the draft stands — it is what the trainer typed', () => {
    expect(restoreKeepingIdentity(base, { fullName: 'Typed' }, null).fullName).toBe('Typed');
  });

  it('no draft leaves the fresh base alone', () => {
    expect(restoreKeepingIdentity(base, null, { fullName: 'Ravi Kumar' })).toEqual(base);
  });

  it.each([['informed-consent/page.tsx'], ['parq/page.tsx']])('%s restores through it, with the profile identity', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/restoreKeepingIdentity\(base, draft, profileIdentity\)/);
    expect(src).not.toMatch(/base = \{ \.\.\.base, \.\.\.draft \}/);
  });
});

describe('the profile reads screening from the server, never from the newest list row', () => {
  const src = read('clients/[id]/page.tsx');

  it('the Documents card is given client.screening', () => {
    expect(src).toMatch(/<DocumentsCard clientId=\{client\.id\} screening=\{client\.screening\} \/>/);
  });

  it('it no longer lists the forms itself and takes data[0]', () => {
    const card = src.slice(src.indexOf('function DocumentsCard'), src.indexOf('// ── QR Check-in card'));
    expect(card).not.toMatch(/parqForms\.list|informedConsent\.list|data\?\.\[0\]/);
  });

  it('a hard block is shown with the server\'s reason', () => {
    const card = src.slice(src.indexOf('function DocumentsCard'), src.indexOf('// ── QR Check-in card'));
    expect(card).toMatch(/role="alert"/);
    expect(card).toMatch(/screening\.block\.message/);
  });

  it('every block code the server sends has a title', () => {
    for (const code of ['CLIENT_NOT_ENROLLED', 'TERM_EXPIRED', 'CLIENT_FROZEN', 'CLIENT_NOT_ACTIVE',
      'SCREENING_REQUIRED', 'CONSENT_REVOKED', 'PHYSICIAN_ADVISED_AGAINST', 'PARQ_BLOCKED']) {
      expect(TRAINING_BLOCK_ACTIONS[code]?.title).toBeTruthy();
    }
  });
});
