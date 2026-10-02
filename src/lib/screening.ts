// Screening as the server's training gate reads it.
//
// GET /api/pt-os/clients/:id returns `screening` (backend lib/screeningGate
// screeningSummary). The profile used to work this out itself from the newest
// row of each list, drafts included, so it could say "Draft" while training
// was hard-blocked by an older submitted PAR-Q, or "Draft" for a consent the
// client had revoked. Reading the server's own answer means the profile and
// the gate cannot disagree, and the profile can show WHY a client is blocked.

export type ConsentScreeningStatus = 'completed' | 'revoked' | 'expired' | 'in_progress' | 'none';
export type ParqScreeningStatus = 'submitted' | 'reviewed' | 'in_progress' | 'none';

export interface ScreeningSummary {
  consent: { status: ConsentScreeningStatus };
  parq: {
    status: ParqScreeningStatus;
    risk_level: 'low' | 'medium' | 'high' | null;
    has_valid_clearance: boolean;
    complete: boolean;
    stale: boolean;
  };
  /** A medical hard stop, with the reason to show. Null when nothing blocks. */
  block: { code: string; message: string } | null;
  /** Paperwork that is missing or out of date, short of a hard stop. */
  warnings: string[];
  /** A completed consent and a fully answered PAR-Q, and nothing blocking. */
  complete: boolean;
}

/** The server error codes that refuse training, and what to do about each. */
export const TRAINING_BLOCK_ACTIONS: Record<string, { title: string; action?: 'enroll' | 'renew' | 'consent' | 'parq' }> = {
  CLIENT_NOT_ENROLLED: { title: 'Not enrolled in PT', action: 'enroll' },
  TERM_EXPIRED: { title: 'PT term has ended', action: 'renew' },
  CLIENT_FROZEN: { title: 'Membership frozen' },
  CLIENT_NOT_ACTIVE: { title: 'Client not active' },
  SCREENING_REQUIRED: { title: 'Screening not complete' },
  CONSENT_REVOKED: { title: 'Consent revoked', action: 'consent' },
  PHYSICIAN_ADVISED_AGAINST: { title: 'Physician advised against exercise', action: 'consent' },
  PARQ_BLOCKED: { title: 'Medical clearance required', action: 'parq' },
};
