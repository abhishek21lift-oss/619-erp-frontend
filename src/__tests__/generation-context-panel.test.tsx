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
      blocking: ['goal', 'experience_level', 'training_days'],
      completeness_pct: 0,
    },
    safety: null,
    current_program: null,
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
      blocking: [],
      completeness_pct: 63,
    },
    safety: {
      gate: { status: 'cleared' }, may_program: true, screened: true,
      sources_present: ['parq'], constraints: 2, not_assessed: [],
    },
    current_program: { name: 'Base Phase', status: 'active', start_date: '2026-08-01', end_date: null },
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
    expect(screen.getByText('On Base Phase')).toBeInTheDocument();
    expect(screen.getByText('12w of logged training')).toBeInTheDocument();
  });

  it('an unscreened client is not rendered as a cleared one', () => {
    const unknown = context({
      ...filled,
      safety: { gate: { status: 'unknown' }, may_program: false, screened: false, sources_present: [], constraints: 0, not_assessed: ['limitations'] },
    });
    render(<GenerationContextPanel context={unknown} />);
    expect(screen.getByText(/PAR-Q unknown/)).toBeInTheDocument();
    expect(screen.queryByText(/PAR-Q cleared/)).toBeNull();
  });
});
