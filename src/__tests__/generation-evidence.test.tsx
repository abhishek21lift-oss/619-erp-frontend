// The evidence block above the Save button on a generated programme.
//
// The generator has always returned the safety screen, the rule audit, a
// quality score and a second model's critique alongside the plan. The card
// rendered the plan and discarded the rest, which made the trainer's approval
// — "the final gate" in this design — a decision taken with strictly less
// information than the server had when it proposed.
//
// What these tests hold:
//
//   · UNSCREENED must never render as screened-and-clear. Production has 0 of
//     34 clients with an injury on file, so an empty constraint list is the
//     normal case and "no constraints" is the most dangerous sentence this
//     component could imply.
//   · An `unknown` PAR-Q gate is a third state. "Nobody asked" is not
//     "cleared", and a default that collapsed them would be invisible.
//   · A REFERRAL is not a caution and must not be filed as one.
//   · An UNVERIFIED exercise will not save at all. Saying so before the tap is
//     the whole value of showing this.
//   · Fact and opinion stay apart: the rule audit is checkable, the critique
//     is a model's view, and they are rendered under different headings.

import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AiWorkoutGenerationResult } from '@/lib/api';
import GenerationEvidence from '@/components/pt-os/GenerationEvidence';

const PLAN = { name: 'Plan', goal: 'muscle_gain', level: 'beginner', weeks: 8, days_per_week: 4, weekly_schedule: {} } as unknown as AiWorkoutGenerationResult['data'];

function result(over: Partial<AiWorkoutGenerationResult> = {}): AiWorkoutGenerationResult {
  return {
    data: PLAN,
    model: 'test-model',
    tier: 'standard',
    used_fallback: false,
    generation_id: 'gen-1',
    audit: {
      violations: [],
      unverified: [],
      counts: { exercises: 12, verified: 10, critical: 0, major: 0, minor: 0 },
      revised: false,
    },
    quality: { score: 84, max: 100, components: {}, basis: 'the rules this studio programs by' },
    critique: [],
    critique_verdict: 'sound',
    screen: {
      gate: { status: 'cleared', cleared: true, risk_level: 'low', assessed_on: '2026-01-04' },
      screened: true,
      sources: ['parq', 'mobility'],
      constraints: [],
      excluded_exercises: [],
      referrals: [],
      not_assessed: [],
    },
    ...over,
  };
}

describe('generation evidence', () => {
  it('says the plan was not screened, in words, rather than showing an empty constraint list', () => {
    render(<GenerationEvidence result={result({
      screen: {
        gate: { status: 'unknown', cleared: false, risk_level: null, assessed_on: null },
        screened: false,
        sources: [],
        constraints: [],
        excluded_exercises: [],
        referrals: [],
        not_assessed: ['PAR-Q', 'mobility screen'],
      },
    })} />);

    expect(screen.getByText('Not screened against this client')).toBeInTheDocument();
    expect(screen.getByText(/an empty constraint list here means nobody looked/i)).toBeInTheDocument();
    // And it is not dressed as a passed check. The tone carries an accessible
    // label, so a green shield here would read out as "Checked: not screened"
    // — the words saying one thing while everything around them says another.
    expect(screen.queryByText('Checked:')).not.toBeInTheDocument();
  });

  it('names what it was screened against when it was', () => {
    render(<GenerationEvidence result={result()} />);
    expect(screen.getByText('Screened against parq, mobility')).toBeInTheDocument();
    expect(screen.getByText('Checked:')).toBeInTheDocument();
  });

  it('reads an unknown PAR-Q gate as nobody having cleared the client, not as cleared', () => {
    render(<GenerationEvidence result={result({
      screen: { ...result().screen!, gate: { status: 'unknown', cleared: false, risk_level: null, assessed_on: null } },
    })} />);

    expect(screen.getByText(/No PAR-Q on file — nobody has cleared this client to train/))
      .toBeInTheDocument();
  });

  it('shows a gate that exists and did not clear, with the reading behind it', () => {
    render(<GenerationEvidence result={result({
      screen: {
        ...result().screen!,
        gate: { status: 'referral_required', cleared: false, risk_level: 'high', assessed_on: '2026-02-02' },
      },
    })} />);

    expect(screen.getByText('PAR-Q gate: referral_required')).toBeInTheDocument();
    expect(screen.getByText('risk high · assessed 2026-02-02')).toBeInTheDocument();
  });

  it('says nothing about the gate when the client is cleared', () => {
    render(<GenerationEvidence result={result()} />);
    expect(screen.queryByText(/PAR-Q gate/)).not.toBeInTheDocument();
    expect(screen.queryByText(/nobody has cleared/)).not.toBeInTheDocument();
  });

  it('shows a referral at the top level, not filed away with the cautions', () => {
    render(<GenerationEvidence result={result({
      screen: {
        ...result().screen!,
        referrals: [{
          source: 'parq.current_health',
          evidence: 'chest_pain',
          note: 'chest pain on file — a programming decision here would be a medical one; refer',
        }],
      },
    })} />);

    // Visible without opening anything: no amount of programming makes it go away.
    expect(screen.getByText('Refer: chest_pain')).toBeInTheDocument();
    expect(screen.getByText(/would be a medical one; refer/)).toBeInTheDocument();
  });

  it('shows a blocked constraint up front and a caution behind the disclosure', () => {
    render(<GenerationEvidence result={result({
      screen: {
        ...result().screen!,
        constraints: [
          { verdict: 'block', region: 'lower_back', label: 'Lower back', source: 'mobility', evidence: 'pain reported', note: 'no axial loading' },
          { verdict: 'caution', region: 'shoulder', label: 'Shoulder', source: 'posture', evidence: 'rounded shoulders', note: null },
        ],
      },
    })} />);

    expect(screen.getByText('Blocked: Lower back')).toBeInTheDocument();
    expect(screen.queryByText(/rounded shoulders/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /what else was checked/i }));
    expect(screen.getByText(/Shoulder: rounded shoulders/)).toBeInTheDocument();
  });

  it('shows critical and major rule breaches up front and minor ones behind the disclosure', () => {
    render(<GenerationEvidence result={result({
      audit: {
        violations: [
          { severity: 'critical', rule: 'blocked_exercise_prescribed', detail: 'prescribed despite a block', exercise: 'Barbell Squat' },
          { severity: 'major', rule: 'no_warm_up', detail: 'no warm-up protocol' },
          { severity: 'minor', rule: 'no_cool_down', detail: 'no cool-down' },
        ],
        unverified: [],
        counts: { exercises: 12, verified: 10, critical: 1, major: 1, minor: 1 },
        revised: true,
      },
    })} />);

    expect(screen.getByText('blocked exercise prescribed: Barbell Squat')).toBeInTheDocument();
    expect(screen.getByText('no warm up')).toBeInTheDocument();
    expect(screen.queryByText(/no cool-down/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /what else was checked/i }));
    expect(screen.getByText(/no cool down: no cool-down/)).toBeInTheDocument();
  });

  it('names the exercises that cannot be saved, before the trainer taps save', () => {
    render(<GenerationEvidence result={result({
      audit: {
        violations: [],
        unverified: [
          { day: 'monday', position: 2, name: 'Landmine Press' },
          { day: 'thursday', position: 1, name: 'Copenhagen Plank' },
        ],
        counts: { exercises: 12, verified: 10, critical: 0, major: 0, minor: 0 },
        revised: false,
      },
    })} />);

    expect(screen.getByText('2 exercises not in the library')).toBeInTheDocument();
    expect(screen.getByText(/Landmine Press, Copenhagen Plank — these cannot be saved/))
      .toBeInTheDocument();
  });

  it('reports the coverage count that predicts what will actually save', () => {
    render(<GenerationEvidence result={result()} />);
    expect(screen.getByText('10 of 12 exercises in the library')).toBeInTheDocument();
  });

  it('shows the quality score with the basis it was scored against', () => {
    render(<GenerationEvidence result={result()} />);
    expect(screen.getByText('Quality 84/100')).toBeInTheDocument();
    expect(screen.getByText('the rules this studio programs by')).toBeInTheDocument();
  });

  it('says when the plan was revised after the rule check', () => {
    render(<GenerationEvidence result={result({
      audit: { ...result().audit!, revised: true },
    })} />);
    expect(screen.getByText(/revised once after the rule check/)).toBeInTheDocument();
  });

  it('keeps the model\'s opinion labelled as one, apart from the rule findings', () => {
    render(<GenerationEvidence result={result({
      critique: [
        { severity: 'high', point: 'Too much pressing volume', because: 'four pressing days in a row' },
        { severity: 'low', point: 'Consider tempo work', because: 'the block never varies tempo' },
      ],
    })} />);

    expect(screen.getByText('Second opinion: Too much pressing volume')).toBeInTheDocument();
    expect(screen.queryByText(/Consider tempo work/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /what else was checked/i }));
    // The heading is what keeps opinion from reading as a rule breach.
    expect(screen.getByText(/A second model's opinion — judgement, not a rule/)).toBeInTheDocument();
    expect(screen.getByText(/Consider tempo work/)).toBeInTheDocument();
  });

  it('lists what was never assessed for this client, behind the disclosure', () => {
    render(<GenerationEvidence result={result({
      screen: { ...result().screen!, not_assessed: ['posture screen', 'lifestyle questionnaire'] },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: /what else was checked/i }));
    expect(screen.getByText('posture screen')).toBeInTheDocument();
    expect(screen.getByText('lifestyle questionnaire')).toBeInTheDocument();
  });

  it('offers no disclosure when there is nothing behind it', () => {
    render(<GenerationEvidence result={result()} />);
    expect(screen.queryByRole('button', { name: /what else was checked/i })).not.toBeInTheDocument();
  });

  it('says a generation came back unchecked rather than rendering a reassuring empty frame', () => {
    render(<GenerationEvidence result={result({
      screen: undefined, audit: undefined, quality: undefined, critique: [], critique_verdict: null,
    })} />);

    expect(screen.getByText(/came back without a screen or a rule check. Review it as unchecked/))
      .toBeInTheDocument();
  });
});
