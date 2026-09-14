// What the AI will use, shown before the trainer presses Generate.
//
// This panel exists because the Client Profile card used to fill in the client
// it was generating for: height 175, weight 75, gender male, age 30,
// experience "beginner" and four training days for anyone whose record was
// thin, printed to the model under the heading CLIENT AUTHORITATIVE DATA. The
// plan came back looking exactly as trustworthy as one written for a client
// whose record was complete, and nothing on screen said otherwise.
//
// So what these tests hold is not layout. It is that a value nobody recorded
// can never be rendered as one that somebody did:
//
//   · a missing fact reads "not recorded", never a plausible number
//   · a recorded fact names the column it came from, so a trainer knows where
//     to go and correct it
//   · blocking and merely-absent are visibly different — a missing goal stops
//     the button working, a missing height does not
//   · completeness counts what the studio holds, not what was typed into the
//     request thirty seconds ago

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AiWorkoutContext } from '@/lib/api';
import GenerationContextPanel from '@/components/pt-os/GenerationContextPanel';

const MISSING = { value: null, source: null, origin: 'missing' as const };

function context(over: Partial<AiWorkoutContext> = {}): AiWorkoutContext {
  return {
    client: { id: 'c1', name: 'Bare' },
    facts: {
      age: MISSING, gender: MISSING, weight_kg: MISSING, height_cm: MISSING,
      goal: MISSING, experience_level: MISSING, training_days: MISSING, equipment: MISSING,
    },
    data_quality: {
      recorded: [],
      stated: [],
      missing: [
        { field: 'age', blocking: false },
        { field: 'height_cm', blocking: false },
        { field: 'goal', blocking: true },
        { field: 'experience_level', blocking: true },
        { field: 'training_days', blocking: true },
      ],
      conflicting: [],
      blocking: ['goal', 'experience_level', 'training_days'],
      completeness_pct: 0,
    },
    safety: null,
    current_program: { active: false },
    training_history: null,
    ...over,
  };
}

describe('a record the studio has not filled in', () => {
  it('says needs trainer input and names the fields that block a programme', () => {
    render(<GenerationContextPanel context={context()} />);
    expect(screen.getByText(/Needs trainer input/)).toBeInTheDocument();
    const warning = screen.getByText(/Needs trainer input/).parentElement?.textContent ?? '';
    expect(warning).toContain('Goal');
    expect(warning).toContain('Experience');
    expect(warning).toContain('Training days');
    // And where to put it, because a field name is not an instruction.
    expect(warning).toContain('set sessions per week in enrolment');
  });

  it('renders a missing fact as not recorded, never as a plausible value', () => {
    render(<GenerationContextPanel context={context()} />);
    expect(screen.getAllByText('not recorded').length).toBeGreaterThan(0);
    // The six values this card used to invent.
    for (const invented of ['175', '75', 'male', 'beginner', '30', 'general_fitness']) {
      expect(screen.queryByText(invented)).toBeNull();
    }
  });

  it('reports nothing on file as 0%', () => {
    render(<GenerationContextPanel context={context()} />);
    expect(screen.getByText('0% on file')).toBeInTheDocument();
  });
});

describe('a record the studio has filled in', () => {
  const filled = context({
    facts: {
      age: { value: 34, source: 'pt_clients.dob', origin: 'recorded' },
      gender: { value: 'female', source: 'pt_clients.gender', origin: 'recorded' },
      weight_kg: MISSING,
      height_cm: MISSING,
      goal: { value: 'muscle_gain', source: 'pt_clients.goal', origin: 'recorded' },
      experience_level: { value: 'intermediate', source: 'pt_clients.workout_experience_level', origin: 'recorded' },
      training_days: { value: 3, source: 'pt_clients.sessions_per_week', origin: 'recorded' },
      equipment: MISSING,
    },
    data_quality: {
      recorded: [
        { field: 'age', source: 'pt_clients.dob' },
        { field: 'gender', source: 'pt_clients.gender' },
        { field: 'goal', source: 'pt_clients.goal' },
        { field: 'experience_level', source: 'pt_clients.workout_experience_level' },
        { field: 'training_days', source: 'pt_clients.sessions_per_week' },
      ],
      stated: [],
      missing: [
        { field: 'weight_kg', blocking: false },
        { field: 'height_cm', blocking: false },
        { field: 'equipment', blocking: false },
      ],
      conflicting: [],
      blocking: [],
      completeness_pct: 63,
    },
    safety: {
      gate: { status: 'cleared' }, may_program: true, screened: true,
      sources_present: ['parq'], constraints: 2, not_assessed: [], stale: [],
    },
    current_program: {
      active: true, plan_id: 'p1', plan_name: 'Base Phase', started_on: '2026-08-01',
      duration_weeks: 12, current_week: 4, weeks_remaining: 8, planned_days_per_week: 3,
      sessions_completed_in_window: 6, progress_pct: 25, expired: false,
    },
    training_history: { has_history: true, window_weeks: 12 },
  });

  it('names the column every recorded fact came from', () => {
    render(<GenerationContextPanel context={filled} />);
    // The one that matters most: the enrolment column the old resolver ignored
    // in favour of the browser's four.
    expect(screen.getByText('pt_clients.sessions_per_week')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('pt_clients.dob')).toBeInTheDocument();
  });

  it('drops the blocking warning but still admits what is absent', () => {
    render(<GenerationContextPanel context={filled} />);
    expect(screen.queryByText(/Needs trainer input/)).toBeNull();
    expect(screen.getAllByText('not recorded').length).toBe(3);
  });

  it('shows the gate, the current programme and whether there is history to progress from', () => {
    render(<GenerationContextPanel context={filled} />);
    expect(screen.getByText(/PAR-Q cleared/)).toBeInTheDocument();
    expect(screen.getByText(/2 constraints/)).toBeInTheDocument();
    // Where they are, not just that they are on something: the week is what
    // decides whether the next programme is a new block or the next weeks of
    // this one.
    expect(screen.getByText('Base Phase, week 4 of 12')).toBeInTheDocument();
    expect(screen.getByText('12w of logged training')).toBeInTheDocument();
  });

  // ── Three gate states must LOOK like three states ───────────────────────
  //
  // The first version of this panel computed `may_program || status ===
  // 'unknown'` and painted both green. An unscreened client — nobody has asked
  // this person whether it is safe for them to train — sat behind the same
  // shield as a cleared one, in the single place a trainer glances before
  // pressing Generate.
  //
  // The earlier test caught the word and missed the colour, which is how the
  // bug survived a mutation run. It now asserts the rendered colour too.
  const gateOf = (status: string, mayProgram: boolean) => context({
    ...filled,
    safety: {
      gate: { status }, may_program: mayProgram, screened: mayProgram,
      sources_present: [], constraints: 0, not_assessed: [], stale: [],
    },
  });

  const gateColour = (container: HTMLElement) => {
    const el = Array.from(container.querySelectorAll('span'))
      .find((n) => /PAR-Q/.test(n.textContent ?? ''));
    return el ? getComputedStyle(el).color : null;
  };

  it('an unscreened client is not rendered as a cleared one', () => {
    const { container } = render(<GenerationContextPanel context={gateOf('unknown', false)} />);
    expect(screen.getByText(/PAR-Q not screened/)).toBeInTheDocument();
    expect(screen.queryByText(/PAR-Q cleared/)).toBeNull();
    // "unknown" is the server's word for the gate; "not screened" is what a
    // trainer needs to read. Neither may be the word "cleared".
    expect(screen.queryByText(/cleared/)).toBeNull();
  });

  it('cleared, unscreened and blocked each render a different colour', () => {
    const cleared = render(<GenerationContextPanel context={gateOf('cleared', true)} />);
    const clearedColour = gateColour(cleared.container);
    cleared.unmount();

    const unscreened = render(<GenerationContextPanel context={gateOf('unknown', false)} />);
    const unscreenedColour = gateColour(unscreened.container);
    unscreened.unmount();

    const blocked = render(<GenerationContextPanel context={gateOf('referred', false)} />);
    const blockedColour = gateColour(blocked.container);
    blocked.unmount();

    for (const c of [clearedColour, unscreenedColour, blockedColour]) expect(c).toBeTruthy();
    expect(new Set([clearedColour, unscreenedColour, blockedColour]).size).toBe(3);
  });

  // ── Stale is neither missing nor current ────────────────────────────────
  //
  // A mobility screen taken two years ago used to reach the programme with
  // exactly the authority of one taken last Tuesday. The action differs from a
  // missing screen — that one needs taking, this one needs repeating — so it
  // gets its own line rather than being folded into the missing list.
  it('names a stale assessment, with how old it is', () => {
    const stale = context({
      ...filled,
      safety: {
        gate: { status: 'cleared' }, may_program: true, screened: true,
        sources_present: ['parq'], constraints: 0, not_assessed: [],
        stale: [{ section: 'limitations', as_of: '2024-02-01', age_days: 591, stale_after_days: 180 }],
      },
    });
    render(<GenerationContextPanel context={stale} />);
    expect(screen.getByText(/Worth repeating/)).toBeInTheDocument();
    expect(screen.getByText(/limitations last assessed 2024-02-01 \(591d\)/)).toBeInTheDocument();
    // A stale screen on a CLEARED client must not turn the gate amber; the two
    // are separate facts and conflating them would make the gate meaningless.
    expect(screen.getByText(/PAR-Q cleared/)).toBeInTheDocument();
  });

  it('says nothing about staleness when everything is current', () => {
    render(<GenerationContextPanel context={filled} />);
    expect(screen.queryByText(/Worth repeating/)).toBeNull();
  });

  it('a gate the server refused is rendered as blocked, not as unscreened', () => {
    render(<GenerationContextPanel context={gateOf('referred', false)} />);
    expect(screen.getByText(/PAR-Q referred/)).toBeInTheDocument();
    expect(screen.queryByText(/not screened/)).toBeNull();
  });
});

// ── Two of the studio's own records disagreeing ────────────────────────────
//
// Precedence used to decide silently: a client whose profile said fat loss and
// whose goal assessment said muscle gain was programmed for fat loss, with
// nothing anywhere saying a clinical question had been settled by the order of
// a list in a source file.
//
// Precedence still decides. What these hold is that the choice is visible, and
// that the panel shows BOTH sides — a trainer who can see only the winner
// cannot tell there was a question.
describe('records that disagree', () => {
  const CONFLICT = {
    field: 'goal' as const,
    chosen: { source: 'client_fitness_profiles.goal', value: 'fat_loss' },
    rejected: [{ source: 'pt_goals.goal_type', value: 'muscle_gain' }],
  };
  const withConflicts = (conflicting: AiWorkoutContext['data_quality']['conflicting']) =>
    context({ data_quality: { ...context().data_quality, conflicting } });

  it('names what was used and what was not', () => {
    render(<GenerationContextPanel context={withConflicts([CONFLICT])} />);
    const text = screen.getByText(/Records disagree/).parentElement?.textContent ?? '';
    expect(text).toContain('used fat_loss (client_fitness_profiles.goal)');
    expect(text).toContain('not muscle_gain (pt_goals.goal_type)');
  });

  it('says nothing when the records agree', () => {
    render(<GenerationContextPanel context={withConflicts([])} />);
    expect(screen.queryByText(/Records disagree/)).toBeNull();
  });

  // Backend and frontend deploy separately, backend first. A browser holding
  // the new bundle can ask an API that predates this field, and a thrown
  // TypeError there would blank the whole panel — the one outcome this
  // component exists to prevent.
  it('survives an API that does not send the field at all', () => {
    const older = withConflicts(undefined as unknown as AiWorkoutContext['data_quality']['conflicting']);
    render(<GenerationContextPanel context={older} />);
    expect(screen.getByText('What the AI will use')).toBeInTheDocument();
    expect(screen.queryByText(/Records disagree/)).toBeNull();
  });
});

// ── Four states that were being collapsed into "we have it" ────────────────
//
// A weight the client mentioned at the door and a weight the studio measured
// rendered identically. So did "on a programme" and "doing Wednesday of week
// 4". So did one active assignment and four. Each of these tests holds one of
// those distinctions open.

describe('a value the studio holds but never measured', () => {
  const reported = (): AiWorkoutContext => context({
    facts: {
      ...context().facts,
      weight_kg: { value: 82, source: 'weekly_checkins.weight', origin: 'unverified' },
    },
    data_quality: {
      ...context().data_quality,
      unverified: [{ field: 'weight_kg', source: 'weekly_checkins.weight' }],
      completeness_pct: 13,
    },
  });

  it('renders the value, and says in words that nobody measured it', () => {
    render(<GenerationContextPanel context={reported()} />);
    expect(screen.getByText('82')).toBeInTheDocument();
    // Words, not only a hue: the distinction has to survive a colour-blind
    // trainer on a bad monitor, which is the same argument the PAR-Q gate makes.
    expect(screen.getByText('client-reported')).toBeInTheDocument();
    expect(screen.getByText('weekly_checkins.weight')).toBeInTheDocument();
  });

  it('says nothing of the kind about a measured one', () => {
    render(<GenerationContextPanel context={context({
      facts: {
        ...context().facts,
        weight_kg: { value: 80, source: 'pt_assessments.weight', origin: 'recorded' },
      },
    })} />);
    expect(screen.queryByText('client-reported')).not.toBeInTheDocument();
  });

  it('puts the age of a stale measurement beside it', () => {
    render(<GenerationContextPanel context={context({
      facts: {
        ...context().facts,
        weight_kg: {
          value: 80, source: 'pt_assessments.weight', origin: 'recorded',
          stale: { as_of: '2024-01-03', age_days: 620, stale_after_days: 90 },
        },
      },
    })} />);
    expect(screen.getByText('620d old')).toBeInTheDocument();
  });
});

describe('the exact next workout', () => {
  it('names the plan, the week and the day', () => {
    render(<GenerationContextPanel context={context({
      next_session: {
        resolvable: true, reason: null, assignment_id: 'a1', plan_id: 'p1',
        plan_name: 'Upper/Lower', week: 4, duration_weeks: 12, day_of_week: 3,
        day: 'Wednesday', source: 'derived', anchor_week: 1, starts_next_week: false,
        planned_days: ['Monday', 'Wednesday', 'Friday'],
        completed_days_this_week: ['Monday'], week_starts_on: '2026-08-24',
        exercises: [],
      },
    })} />);
    expect(screen.getByText(/Up next: Upper\/Lower, week 4 of 12, Wednesday/)).toBeInTheDocument();
    expect(screen.getByText(/1 done this week/)).toBeInTheDocument();
  });

  it('says a hand-written week is hand-written', () => {
    render(<GenerationContextPanel context={context({
      next_session: {
        resolvable: true, reason: null, assignment_id: 'a1', plan_id: 'p1',
        plan_name: 'Upper/Lower', week: 4, duration_weeks: 12, day_of_week: 1,
        day: 'Monday', source: 'override', anchor_week: 4, starts_next_week: false,
        planned_days: ['Monday'], completed_days_this_week: [], week_starts_on: '2026-08-24',
        exercises: [],
      },
    })} />);
    expect(screen.getByText(/written by hand/)).toBeInTheDocument();
  });

  // Each unresolvable state gets its own words. Rendering them the same would
  // teach a trainer to skip the line, which defeats the point of having it.
  it.each([
    ['no_active_programme', /Not on a programme/],
    ['programme_expired', /Programme finished/],
    ['plan_prescribes_no_days', /prescribes no training days/],
    ['block_complete', /Every prescribed session of this block is done/],
  ] as const)('says why it could not name one: %s', (reason, pattern) => {
    render(<GenerationContextPanel context={context({
      next_session: { resolvable: false, reason },
    })} />);
    expect(screen.getByText(pattern)).toBeInTheDocument();
  });

  // Backend and browser deploy separately. A bundle that assumed the field
  // would blank the whole panel, which is the one outcome it exists to prevent.
  it('renders without the line at all when the server did not send one', () => {
    render(<GenerationContextPanel context={context()} />);
    expect(screen.queryByText(/Up next/)).not.toBeInTheDocument();
    expect(screen.getByText(/Needs trainer input/)).toBeInTheDocument();
  });
});

describe('what the logged sets say to do with each lift', () => {
  type Counts = NonNullable<AiWorkoutContext['adaptation']>['counts'];
  const withCounts = (counts: Partial<Counts>, evidenceFree = false) =>
    context({
      adaptation: {
        decisions: [],
        counts: {
          progress: 0, hold: 0, regress: 0, insufficient_evidence: 0, total: 0, ...counts,
        },
        evidence_free: evidenceFree,
      },
    });

  it('counts the verdicts', () => {
    render(<GenerationContextPanel context={withCounts({ progress: 2, hold: 1, regress: 1, total: 4 })} />);
    expect(screen.getByText(/2 to progress/)).toBeInTheDocument();
    expect(screen.getByText(/1 to hold/)).toBeInTheDocument();
    expect(screen.getByText(/1 to reduce/)).toBeInTheDocument();
  });

  it('says plainly when there is nothing to go on', () => {
    render(<GenerationContextPanel context={withCounts({ insufficient_evidence: 4, total: 4 }, true)} />);
    expect(screen.getByText(/No logged evidence for any of the 4 prescribed lifts/)).toBeInTheDocument();
    // And does not also render a reassuring breakdown beside it.
    expect(screen.queryByText(/to progress/)).not.toBeInTheDocument();
  });

  it('stays quiet when there is no next session to decide about', () => {
    render(<GenerationContextPanel context={withCounts({ total: 0 })} />);
    expect(screen.queryByText(/to progress/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No logged evidence/)).not.toBeInTheDocument();
  });
});

describe('more than one programme claiming to be active', () => {
  it('names the count, the one it chose, the rule and the ones it did not', () => {
    render(<GenerationContextPanel context={context({
      assignment_ambiguity: {
        active_count: 3,
        chosen: { assignment_id: 'a1', plan_id: 'p1', plan_name: 'Upper/Lower', start_date: '2026-08-03' },
        not_chosen: [
          { assignment_id: 'a2', plan_id: 'p2', plan_name: 'Full Body', start_date: '2026-07-01' },
          { assignment_id: 'a3', plan_id: 'p3', plan_name: 'Legacy', start_date: '2026-01-01' },
        ],
        rule: 'most recently started, then most recently created',
      },
    })} />);
    const banner = screen.getByText(/3 active programmes/).parentElement?.textContent ?? '';
    expect(banner).toContain('Upper/Lower');
    expect(banner).toContain('most recently started');
    expect(banner).toContain('Full Body');
    expect(banner).toContain('Legacy');
  });

  it('says nothing at all when only one programme is active', () => {
    render(<GenerationContextPanel context={context()} />);
    expect(screen.queryByText(/active programmes/)).not.toBeInTheDocument();
  });
});
