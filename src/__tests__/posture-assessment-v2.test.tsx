// The structured postural assessment: view vocabulary, exclusive neutral
// answers, honest "not assessed" state, explicit-resolution comparison and a
// report that escapes trainer/AI text and only emits image data URLs.

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  POSTURE_VIEWS, initPostureForm, postureFindingCount,
  togglePostureObservation, validatePostureFindings, viewStatus,
} from '@/components/pt-os/posture-assessment/types';
import PostureComparison from '@/components/pt-os/posture-assessment/PostureComparison';
import { generatePostureReportHTML } from '@/lib/posture-pdf';

describe('posture view vocabulary', () => {
  it('offers every required anterior, lateral and posterior category', () => {
    expect(POSTURE_VIEWS.front.categories.map((c) => c.name)).toEqual([
      'Head & Neck', 'Shoulders', 'Chest & Ribcage', 'Pelvis / Hip Level', 'Knee Alignment', 'Feet & Ankles',
    ]);
    expect(POSTURE_VIEWS.side.categories.map((c) => c.name)).toEqual([
      'Head Position', 'Shoulders', 'Thoracic Spine', 'Lumbar Spine', 'Pelvic Tilt', 'Knee Joint',
    ]);
    expect(POSTURE_VIEWS.back.categories.map((c) => c.name)).toEqual([
      'Spinal Column', 'Scapular Alignment', 'Gluteal Fold & Hip Symmetry', 'Achilles Tendon / Heel',
    ]);
  });

  it('supports left, right and bilateral findings', () => {
    const feet = POSTURE_VIEWS.front.categories.find((c) => c.name === 'Feet & Ankles')!;
    const values = feet.options.map((o) => o.value);
    expect(values).toContain('Right Foot Pronation');
    expect(values).toContain('Left Foot Pronation');
    expect(values).toContain('Bilateral Pronation');
    expect(values).toContain('Supination');
  });
});

describe('observation selection', () => {
  const head = POSTURE_VIEWS.front.categories[0];

  it('selects and deselects a deviation', () => {
    expect(togglePostureObservation(head, [], 'Left Head Tilt')).toEqual(['Left Head Tilt']);
    expect(togglePostureObservation(head, ['Left Head Tilt'], 'Left Head Tilt')).toEqual([]);
  });

  it('keeps a neutral answer exclusive', () => {
    expect(togglePostureObservation(head, ['Left Head Tilt', 'Right Head Tilt'], 'Neutral')).toEqual(['Neutral']);
  });

  it('withdraws neutral when a deviation is selected', () => {
    expect(togglePostureObservation(head, ['Neutral'], 'Right Neck Rotation')).toEqual(['Right Neck Rotation']);
  });

  it('allows two sides to be recorded separately', () => {
    const knees = POSTURE_VIEWS.front.categories.find((c) => c.name === 'Knee Alignment')!;
    expect(togglePostureObservation(knees, ['Right Knee Valgus'], 'Left Knee Valgus'))
      .toEqual(['Right Knee Valgus', 'Left Knee Valgus']);
  });
});

describe('unselected means not assessed', () => {
  it('reports an untouched view as not assessed', () => {
    expect(viewStatus(initPostureForm(), 'front')).toBe('not_assessed');
  });

  it('reports a confirmed clean view as no findings', () => {
    expect(viewStatus({ ...initPostureForm(), noIssuesNoted: true }, 'front')).toBe('no_findings');
  });

  it('reports a view with a finding', () => {
    const form = { ...initPostureForm(), frontIssues: ['Left Head Tilt'] };
    expect(viewStatus(form, 'front')).toBe('findings');
    expect(postureFindingCount(form)).toBe(1);
  });

  it('requires a finding or an explicit no-findings confirmation', () => {
    expect(validatePostureFindings(initPostureForm())).toMatch(/posture finding|no issues/i);
    expect(validatePostureFindings({ ...initPostureForm(), noIssuesNoted: true })).toBeUndefined();
  });

  it('counts a muscle finding as recorded evidence', () => {
    const form = {
      ...initPostureForm(),
      muscleImbalances: [{ id: 'm1', muscle: 'Gluteus Maximus', status: 'weak' as const, side: 'bilateral' as const, notes: '' }],
    };
    expect(postureFindingCount(form)).toBe(1);
    expect(validatePostureFindings(form)).toBeUndefined();
  });
});

describe('previous vs current comparison', () => {
  const initial = {
    assessment_date: '2026-01-01',
    front_issues: ['Left Head Tilt', 'Uneven Shoulders'],
    side_issues: ['Forward Head Posture'],
    back_issues: [],
  };
  const latest = {
    assessment_date: '2026-02-01',
    front_issues: ['Left Head Tilt', 'Rib Flare'],
    side_issues: [],
    back_issues: [],
    resolved_findings: ['Forward Head Posture'],
  };

  it('never turns an unrecorded finding into a resolved one', () => {
    render(<PostureComparison initial={initial} latest={latest} />);
    expect(screen.getByText(/did not capture it/i)).toBeInTheDocument();
    expect(screen.getByText(/is not marked resolved unless/i)).toBeInTheDocument();
  });

  it('shows explicit resolution separately', () => {
    render(<PostureComparison initial={initial} latest={latest} />);
    expect(screen.getByText(/explicitly resolved · 1/i)).toBeInTheDocument();
  });
});

describe('postural report', () => {
  const row = {
    assessment_date: '2026-11-07',
    assessment_type: 'initial',
    status: 'completed',
    assessment_number: 3,
    front_issues: ['Left Head Tilt'],
    side_issues: [],
    back_issues: ['Possible Scoliosis'],
    view_notes: { front: '<script>alert(1)</script>', side: '', back: '' },
    assessment_summary: { primary_concern: '<img src=x onerror=alert(1)>', trainer_assessment: 'Steady' },
    muscle_imbalances: [{ muscle: 'Upper Trapezius', status: 'tight', side: 'left', notes: '' }],
    corrective_plan: {
      mobility: [{ exercise: 'Chin tuck', target_muscle: 'Deep Neck Flexors', sets: '2', reps: '10' }],
      activation: [],
      strengthening: [],
      recommendations: { follow_up: 'Reassess in 4 weeks' },
    },
    front_photo_url: 'data:image/jpeg;base64,AAAA',
    side_photo_url: 'javascript:alert(1)',
    back_photo_url: '',
  };

  it('includes all report sections and the photographs', () => {
    const html = generatePostureReportHTML(row, 'Asha');
    expect(html).toContain('Anterior View Findings');
    expect(html).toContain('Lateral View Findings');
    expect(html).toContain('Posterior View Findings');
    expect(html).toContain('Posture Photographs');
    expect(html).toContain('Muscle Imbalance Findings');
    expect(html).toContain('Corrective Exercise Plan');
    expect(html).toContain('Trainer Remarks');
    expect(html).toContain('Follow-up Recommendations');
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"');
  });

  it('escapes trainer text and refuses non-image photo URLs', () => {
    const html = generatePostureReportHTML(row, 'Asha');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('javascript:alert(1)');
  });

  it('does not diagnose suspected scoliosis', () => {
    const html = generatePostureReportHTML(row, 'Asha');
    expect(html).toContain('Possible Scoliosis');
    expect(html).toContain('requires referral for medical assessment');
  });
});
