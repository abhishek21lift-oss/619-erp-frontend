// Creating a programme must keep working.
//
// This is the regression risk Phase 3 carries. The Programs screen used to
// hold a four-step wizard that was the ONLY way to create a plan with
// exercises in it. Phase 2's builder supersedes it, so the wizard is gone —
// and if the replacement is wrong, a trainer simply cannot make a programme.
//
// So these assert the contract that replaced it: create the shell, assign it,
// then hand over to the builder with the id the server returned.

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, waitFor, cleanup, fireEvent} from '@testing-library/react';
import fs from 'node:fs';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const create = vi.fn();
const assign = vi.fn();
const clients = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    workouts: { plans: { create: (...a: unknown[]) => create(...a) }, assign: (...a: unknown[]) => assign(...a) },
    pt: {
      clients: () => clients(),
      // Selecting a client now fills the form from that client's record, so
      // the dialog reads the row. This one answers nothing, which is the case
      // that must leave the form's own defaults standing.
      client: async () => ({ data: { id: 'c1', name: 'Ajeet Yadav' } }),
    },
    // The goal now comes from the goal-setting screening. This client has not
    // been screened, which is the case that leaves the form's goal alone.
    progress: { goals: { list: async () => ({ data: [] }) } },
  },
}));

const toastError = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: vi.fn(), warning: vi.fn() } }),
}));

import NewProgrammeDialog from '@/components/pt-os/builder/NewProgrammeDialog';
import { ApiError } from '@/lib/http';
import {appPath, routeExists} from '@/__tests__/helpers/app-routes';

beforeEach(() => {
  push.mockReset(); create.mockReset(); assign.mockReset(); toastError.mockReset();
  clients.mockResolvedValue({ data: [{ id: 'cl-1', name: 'Ravi' }] });
  create.mockResolvedValue({ plan: { id: 'plan-99', name: 'Upper / Lower' } });
  assign.mockResolvedValue({});
});
afterEach(cleanup);

/** Fill the name field and submit. */
async function fillAndSubmit(name = 'Upper / Lower') {
  fireEvent.change(screen.getByPlaceholderText(/Upper \/ Lower Split/i), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: /create and add exercises/i }));
}

describe('NewProgrammeDialog — the replacement for the deleted wizard', () => {
  it('creates the plan, assigns it, then opens the builder with the new id', async () => {
    render(<NewProgrammeDialog open onClose={() => {}} presetClientId="cl-1" />);
    await fillAndSubmit();

    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0][0]).toMatchObject({ name: 'Upper / Lower' });

    await waitFor(() => expect(assign).toHaveBeenCalledOnce());
    expect(assign).toHaveBeenCalledWith({ workout_plan_id: 'plan-99', client_id: 'cl-1' });

    // The id must come from the RESPONSE, not from anything client-side.
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/pt-os/clients/cl-1/training/builder?plan=plan-99'));
  });

  it('creates the shell WITHOUT exercises', async () => {
    // The whole reason the flow split in two: exercises are added in the
    // builder, one granular request each, so they hold stable ids from birth.
    // Sending them here would go through the whole-plan PUT path instead.
    render(<NewProgrammeDialog open onClose={() => {}} presetClientId="cl-1" />);
    await fillAndSubmit();
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0].exercises).toBeUndefined();
  });

  it('refuses to create without a name', async () => {
    render(<NewProgrammeDialog open onClose={() => {}} presetClientId="cl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /create and add exercises/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses to create without a client', async () => {
    render(<NewProgrammeDialog open onClose={() => {}} />);
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(create).not.toHaveBeenCalled();
  });

  it('still opens the builder when assignment fails', async () => {
    // The plan exists at this point. Stranding the trainer on a dialog with an
    // error — and an orphan plan they cannot see — would be worse than telling
    // them assignment failed and letting them carry on building.
    assign.mockRejectedValue(new Error('offline'));
    render(<NewProgrammeDialog open onClose={() => {}} presetClientId="cl-1" />);
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith('/pt-os/clients/cl-1/training/builder?plan=plan-99');
  });

  it('names PAR-Q, not a generic failure, when the client is medically blocked', async () => {
    // This is the bug report: assignment silently failing behind one generic
    // toast that nobody read before the page moved on to the builder. The
    // trainer would only discover the plan was never assigned by later
    // opening the client's own profile. A PARQ_BLOCKED rejection now has to
    // read as PAR-Q, specifically — the same message the Workout Plans
    // page's own "Assign" button already gives.
    assign.mockRejectedValue(new ApiError('blocked', 403, 'PARQ_BLOCKED'));
    render(<NewProgrammeDialog open onClose={() => {}} presetClientId="cl-1" />);
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/PAR-Q/);
    // Never auto-dismisses — the whole point is that it must still be
    // visible after navigation.
    expect(toastError.mock.calls[0][1]).toMatchObject({ duration: 0 });
    expect(push).toHaveBeenCalledWith('/pt-os/clients/cl-1/training/builder?plan=plan-99');
  });

  it('does not navigate when creation itself fails', async () => {
    create.mockRejectedValue(new Error('nope'));
    render(<NewProgrammeDialog open onClose={() => {}} presetClientId="cl-1" />);
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<NewProgrammeDialog open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the Programs screen no longer carries the old wizard', () => {
  const PAGE = appPath('pt-os/workout-plans/page.tsx');
  const src = fs.readFileSync(PAGE, 'utf8');

  it('has no builder tab or wizard state left behind', () => {
    // Dead state that still compiles is the usual residue of a deletion this
    // size — it reads as live code and drifts.
    for (const ghost of [
      "'builder'", 'builderStep', 'builderExercises', 'handleSaveBuilderPlan',
      'BuilderExercise', 'resetBuilder',
    ]) {
      expect(src).not.toContain(ghost);
    }
  });

  it('routes plan creation through the dialog', () => {
    expect(src).toContain('NewProgrammeDialog');
  });
});

describe('Training navigation', () => {
  const PROFILE = appPath('pt-os/clients/[id]/page.tsx');
  const src = fs.readFileSync(PROFILE, 'utf8');

  it('offers the Training section on the client profile', () => {
    // The profile used to reach Training through a tile in the Quick Actions
    // grid; it is a tab in the client workspace now. The requirement is
    // unchanged — Training must be reachable from the profile — so this
    // asserts the destination rather than the widget that happened to carry
    // it, which is what made the original brittle.
    expect(src).toMatch(/TabPanel id="training"/);
    expect(src).toMatch(/\/pt-os\/workout-plans\?client_id=/);
  });

  it('every destination it links to exists on disk', () => {
    // The orphan-link check. A tile pointing at a route nobody created 404s,
    // and nothing in the build would say so — the same class of miss the
    // platform-split orphan check caught.
    for (const route of [
      'pt-os/workout-plans',
      'pt-os/clients/[id]/training/assigned',
      'pt-os/clients/[id]/training/analytics',
      'pt-os/clients/[id]/training/builder',
      'pt-os/clients/[id]/workout-log',
    ]) {
      expect(routeExists(route), `${route} missing`).toBe(true);
    }
  });
});
