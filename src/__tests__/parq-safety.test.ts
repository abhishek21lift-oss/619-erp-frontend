import { describe, it, expect } from 'vitest';
import { computeParqRisk, clearanceApprovalProblem } from '@/lib/parq-calculations';
import { screeningBlockOf } from '@/lib/screeningBlock';
import { ApiError } from '@/lib/http';
import { calc1RM, classifyBp } from '@/lib/fitness-calculations';

// Assessment modules audit 2026-09-28. The backend owns every one of these
// decisions; these pin the frontend previews that must agree with it (the
// scoring parity script compares computeParqRisk, calc1RM and classifyBp
// against the backend directly).

const sheet = (yes: number[]) =>
  Array.from({ length: 10 }, (_, i) => ({ question_id: i + 1, answer: (yes.includes(i + 1) ? 'yes' : 'no') as 'yes' | 'no' }));

describe('PAR-Q risk', () => {
  it.each([1, 3, 4, 5])('a lone yes to cardiac question %i is high risk', (q) => {
    expect(computeParqRisk(sheet([q])).riskLevel).toBe('high');
  });
  it('a lone non-cardiac yes is medium; three are high; none is low', () => {
    expect(computeParqRisk(sheet([6])).riskLevel).toBe('medium');
    expect(computeParqRisk(sheet([2, 6, 7])).riskLevel).toBe('high');
    expect(computeParqRisk(sheet([])).riskLevel).toBe('low');
  });
});

describe('clearance approval evidence', () => {
  const base = { approval_status: 'approved', doctor_name: 'Dr A', clearance_date: '2026-09-01', expiry_date: '', certificate_url: '' };
  it('pending needs nothing', () => {
    expect(clearanceApprovalProblem({ ...base, approval_status: 'pending', doctor_name: '' }, false)).toBeNull();
  });
  it('approved needs the doctor, the date and a certificate', () => {
    expect(clearanceApprovalProblem({ ...base, doctor_name: ' ' }, true)).toMatch(/Doctor/);
    expect(clearanceApprovalProblem({ ...base, clearance_date: '' }, true)).toMatch(/Clearance date/);
    expect(clearanceApprovalProblem(base, false)).toMatch(/certificate/);
    expect(clearanceApprovalProblem(base, true)).toBeNull();
    expect(clearanceApprovalProblem({ ...base, certificate_url: 'https://x.test/c.pdf' }, false)).toBeNull();
  });
  it('refuses an expiry before the clearance and a future clearance date', () => {
    expect(clearanceApprovalProblem({ ...base, expiry_date: '2026-08-01' }, true)).toMatch(/Expiry/);
    expect(clearanceApprovalProblem({ ...base, clearance_date: '2099-01-01' }, true)).toMatch(/future/);
  });
});

describe('screening blocks', () => {
  it('maps each gate code to the screen that fixes it', () => {
    expect(screeningBlockOf(new ApiError('x', 403, 'PARQ_BLOCKED'))?.path('c1')).toBe('/pt-os/parq?client_id=c1');
    expect(screeningBlockOf(new ApiError('x', 403, 'CONSENT_REVOKED'))?.path('c1')).toBe('/pt-os/informed-consent?client_id=c1');
    expect(screeningBlockOf(new ApiError('x', 403, 'PHYSICIAN_ADVISED_AGAINST'))?.actionLabel).toBe('Open Consent');
  });
  it('ignores anything else', () => {
    expect(screeningBlockOf(new ApiError('x', 403, 'FORBIDDEN'))).toBeNull();
    expect(screeningBlockOf(new Error('x'))).toBeNull();
  });
});

describe('fitness scoring fixes', () => {
  it('a single is its own 1RM', () => {
    expect(calc1RM(230, 1, 'epley')).toBe(230);
    expect(calc1RM(100, 5, 'epley')).toBe(116.7);
  });
  it('stage-2 hypertension wins over a low diastolic', () => {
    expect(classifyBp(160, 58).category).toBe('Hypertension Stage 2');
    expect(classifyBp(85, 55).category).toBe('Hypotension');
    expect(classifyBp(135, 55)).toEqual({ category: 'Hypotension', isUnsafe: true });
  });
});

// Second batch: scoring accuracy and referrals (audit F-2, F-4, F-8, G-1,
// M-1, PO-1). The parity script holds the backend to the same answers.
import { classifyHarvardPei, classifyEndurance, classifyStrength } from '@/lib/fitness-calculations';
import { calcLifestyleReadinessScore } from '@/lib/goal-calculations';
import { calcMobilityReferrals } from '@/lib/mobility-calculations';
import { calcPostureReferrals } from '@/lib/posture-calculations';

describe('scoring accuracy', () => {
  it('uses the published Harvard fitness-index bands', () => {
    expect(classifyHarvardPei(54)).toBe('Poor');
    expect(classifyHarvardPei(70)).toBe('Average');
    expect(classifyHarvardPei(85)).toBe('Good');
    expect(classifyHarvardPei(90)).toBe('Excellent');
  });
  it('invents no category for tests or sexes without norms', () => {
    expect(classifyEndurance('Wall Sit', 90, 'Male')).toBeNull();
    expect(classifyEndurance('Plank', 90, null)).toBe('Good');
    expect(classifyEndurance('Push Up Test', 25, null)).toBeNull();
    expect(classifyStrength(100, 80, 'Lunges', 'Male')).toBeNull();
  });
  it('scores goal readiness out of the questions answered', () => {
    expect(calcLifestyleReadinessScore({ can_train_4_6_days: true, sleep_7_8_hours: true } as never)).toBe(100);
  });
});

describe('referrals', () => {
  it('pain on a movement screen and suspected scoliosis both refer', () => {
    expect(calcMobilityReferrals([{ region: 'Knee', score: 3, pain: true }], null)).toHaveLength(1);
    expect(calcPostureReferrals(null, null, ['Scoliosis'])).toHaveLength(1);
    expect(calcPostureReferrals(['Forward Head'], null, null)).toEqual([]);
  });
});
