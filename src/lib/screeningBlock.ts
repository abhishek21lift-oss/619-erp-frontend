// The backend's screening gate (src/lib/screeningGate.js) refuses training
// with 403 and one of three codes. Each one is fixed somewhere different, so
// the message names the reason and the action goes to the screen that fixes
// it. Used wherever a trainer can hit the gate: assigning a workout, starting
// a session, recording a fitness test.

import { ApiError } from '@/lib/http';

export type ScreeningBlockCode = 'PARQ_BLOCKED' | 'CONSENT_REVOKED' | 'PHYSICIAN_ADVISED_AGAINST';

export interface ScreeningBlock {
  code: ScreeningBlockCode;
  /** Completes "<client>'s …" / "This client's …". */
  reason: string;
  actionLabel: string;
  path: (clientId: string) => string;
}

const BLOCKS: Record<ScreeningBlockCode, Omit<ScreeningBlock, 'code'>> = {
  PARQ_BLOCKED: {
    reason: 'PAR-Q screening flags them as medically blocked — an approved medical clearance is required',
    actionLabel: 'Review PAR-Q',
    path: (id) => `/pt-os/parq?client_id=${id}`,
  },
  CONSENT_REVOKED: {
    reason: 'Informed Consent has been revoked — a new consent must be signed',
    actionLabel: 'Open Consent',
    path: (id) => `/pt-os/informed-consent?client_id=${id}`,
  },
  PHYSICIAN_ADVISED_AGAINST: {
    reason: 'Informed Consent records that a physician advised against exercise — upload a medical clearance first',
    actionLabel: 'Open Consent',
    path: (id) => `/pt-os/informed-consent?client_id=${id}`,
  },
};

export function screeningBlockOf(err: unknown): ScreeningBlock | null {
  if (!(err instanceof ApiError)) return null;
  const code = err.code as ScreeningBlockCode | undefined;
  if (!code || !(code in BLOCKS)) return null;
  return { code, ...BLOCKS[code] };
}
