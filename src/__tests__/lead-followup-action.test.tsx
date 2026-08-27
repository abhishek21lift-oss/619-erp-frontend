// "Draft follow-ups" on the leads list — the scoped trigger for the
// lead_followup ai-action, reusing ActionConfirmView without pulling in the
// whole (unmounted) global assistant. Same propose/confirm contract as
// AiCommandCenter: opening the dialog only ever reads a plan, nothing is
// sent until the operator confirms that exact plan.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';

const mockActionPlan = vi.fn();
const mockActionExecute = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { ai: {
    actionPlan: (...a: unknown[]) => mockActionPlan(...a),
    actionExecute: (...a: unknown[]) => mockActionExecute(...a),
  } },
}));

import LeadFollowupAction from '@/components/pt-os/leads/LeadFollowupAction';

const PLAN = {
  plan_id: 'plan-1',
  action_id: 'lead_followup',
  title: 'Send lead follow-ups',
  description: 'WhatsApp every open lead whose follow-up is due within 7 days',
  outward: true,
  count: 2,
  preview: [{ name: 'Rahul Verma', detail: 'Gold Membership' }, { name: 'Sneha Kapoor', detail: 'contacted' }],
  sample_message: 'Hi Rahul Verma, following up on your interest in personal training (Gold Membership).',
  warnings: [] as string[],
  truncated: false,
  expires_at: new Date(Date.now() + 300000).toISOString(),
};

beforeEach(() => {
  mockActionPlan.mockReset();
  mockActionExecute.mockReset();
});
afterEach(() => cleanup());

describe('LeadFollowupAction', () => {
  it('is read-only until confirmed: opening the dialog plans, but never executes', async () => {
    mockActionPlan.mockResolvedValue({ data: PLAN });
    render(<LeadFollowupAction />);

    fireEvent.click(screen.getByRole('button', { name: /draft follow-ups/i }));

    await waitFor(() => expect(screen.getByText('Send lead follow-ups')).toBeInTheDocument());
    expect(mockActionPlan).toHaveBeenCalledWith('lead_followup');
    expect(mockActionExecute).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Rahul Verma/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Hi Rahul Verma, following up/)).toBeInTheDocument();
  });

  it('confirming sends exactly the planned id, and shows the honest tally', async () => {
    mockActionPlan.mockResolvedValue({ data: PLAN });
    mockActionExecute.mockResolvedValue({
      data: { tally: { not_configured: 2 }, sent: 0, total: 2, warnings: [], results: [] },
    });
    render(<LeadFollowupAction />);

    fireEvent.click(screen.getByRole('button', { name: /draft follow-ups/i }));
    await waitFor(() => expect(screen.getByText(/Send to 2/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Send to 2/));

    await waitFor(() => expect(mockActionExecute).toHaveBeenCalledWith('lead_followup', 'plan-1'));
    await waitFor(() => expect(screen.getByText('0 of 2 sent')).toBeInTheDocument());
    expect(screen.getByText(/not delivered — WhatsApp is not configured/)).toBeInTheDocument();
  });

  it('a plan-fetch failure shows an error with a retry, not a blank dialog', async () => {
    mockActionPlan.mockRejectedValue(new Error('Could not prepare the follow-up drafts.'));
    render(<LeadFollowupAction />);

    fireEvent.click(screen.getByRole('button', { name: /draft follow-ups/i }));

    await waitFor(() => expect(screen.getByText('Could not prepare the follow-up drafts.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(mockActionExecute).not.toHaveBeenCalled();
  });
});
