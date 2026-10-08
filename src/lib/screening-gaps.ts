// Active clients who are not cleared to train (GET /api/pt-os/screening-gaps).
//
// The screening gate only blocks a client with no PT term yet; an existing
// client with no consent or an incomplete PAR-Q is trained with a warning
// nobody sees unless they open that client. This is the list the dashboard
// shows so the gap is closed rather than discovered. It flags — it does not
// block anything.

import { stepHref, type JourneyStepKey } from '@/lib/journey';

export type ScreeningMissing = 'informed_consent' | 'parq';
export type ScreeningBlock = 'PARQ_BLOCKED' | 'CONSENT_REVOKED' | 'PHYSICIAN_ADVISED_AGAINST';

export interface ScreeningGap {
  client_id: string;
  client_name: string;
  client_photo: string | null;
  missing: ScreeningMissing[];
  block: ScreeningBlock | null;
}

export interface ScreeningGapsResponse {
  data: ScreeningGap[];
  total: number;
}

export interface GapChip {
  label: string;
  /** A hard stop reads as danger; something merely missing as a warning. */
  severity: 'danger' | 'warning';
}

const BLOCK_LABEL: Record<ScreeningBlock, string> = {
  PARQ_BLOCKED: 'PAR-Q needs clearance',
  CONSENT_REVOKED: 'Consent revoked',
  PHYSICIAN_ADVISED_AGAINST: 'Doctor advised against',
};

const BLOCK_STEP: Record<ScreeningBlock, JourneyStepKey> = {
  // High risk with no valid medical clearance: the clearance lives on the PAR-Q.
  PARQ_BLOCKED: 'parq',
  CONSENT_REVOKED: 'consent',
  // Cleared by uploading the doctor's clearance to the consent.
  PHYSICIAN_ADVISED_AGAINST: 'consent',
};

const MISSING_LABEL: Record<ScreeningMissing, string> = {
  informed_consent: 'No consent',
  parq: 'PAR-Q incomplete',
};

/** What to show against a client, hard stop first. */
export function gapChips(gap: ScreeningGap): GapChip[] {
  const chips: GapChip[] = [];
  if (gap.block) chips.push({ label: BLOCK_LABEL[gap.block] ?? 'Not cleared', severity: 'danger' });
  for (const m of gap.missing) {
    // A revoked consent is also "not completed"; saying it twice is noise.
    if (m === 'informed_consent' && gap.block === 'CONSENT_REVOKED') continue;
    if (MISSING_LABEL[m]) chips.push({ label: MISSING_LABEL[m], severity: 'warning' });
  }
  return chips;
}

/**
 * Where one tap should take the trainer: the hard stop if there is one, else
 * the first missing step in journey order (consent before PAR-Q).
 */
export function gapHref(gap: ScreeningGap): string {
  if (gap.block && BLOCK_STEP[gap.block]) return stepHref(BLOCK_STEP[gap.block], gap.client_id);
  if (gap.missing.includes('informed_consent')) return stepHref('consent', gap.client_id);
  if (gap.missing.includes('parq')) return stepHref('parq', gap.client_id);
  return `/pt-os/clients/${gap.client_id}`;
}

/** Hard stops first, then by how much is missing; the API's name order within. */
export function sortGaps(gaps: readonly ScreeningGap[]): ScreeningGap[] {
  const weight = (g: ScreeningGap) => (g.block ? 10 : 0) + g.missing.length;
  return gaps
    .map((g, i) => ({ g, i }))
    .sort((a, b) => weight(b.g) - weight(a.g) || a.i - b.i)
    .map(({ g }) => g);
}
