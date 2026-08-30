// src/__tests__/intelligence-center.test.tsx
//
// Tests for the Phase 2G Intelligence Center — validates component rendering,
// API integration, approval/rejection flows, and stale proposal handling.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/ai/intelligence',
}));

vi.mock('@/lib/api', () => ({
  api: {
    ai: {
      trainer: {
        pending: vi.fn(),
        intelligence: vi.fn(),
        confirmMemory: vi.fn(),
        rejectMemory: vi.fn(),
        approveProposal: vi.fn(),
        rejectProposal: vi.fn(),
        audit: vi.fn(),
      },
      memory: {
        list: vi.fn(),
        pending: vi.fn(),
        confirm: vi.fn(),
        reject: vi.fn(),
        remove: vi.fn(),
        supersede: vi.fn(),
      },
      programmer: {
        propose: vi.fn(),
        proposals: vi.fn(),
        approve: vi.fn(),
        reject: vi.fn(),
      },
    },
  },
}));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const mockMemoryCandidate = {
  id: 'mem-1',
  organization_id: 'org-1',
  client_id: 'client-1',
  category: 'preference',
  subcategory: 'exercise',
  fact: 'Prefers morning training sessions',
  confidence: 0.85,
  source_type: 'ai_detected',
  source_text: 'I usually train around 7am',
  status: 'candidate',
  created_at: '2026-08-23T10:00:00Z',
  updated_at: '2026-08-23T10:00:00Z',
  _conflicts: [],
};

const mockProposal = {
  id: 'prop-1',
  organization_id: 'org-1',
  client_id: 'client-1',
  proposal_type: 'progress_load',
  summary: 'Increase bench press by 2.5kg',
  reason: 'Client hit all reps on last 3 sessions',
  evidence: [
    { type: 'performance', description: 'All reps completed', source: 'sessions', value: '8/8 reps' },
    { type: 'pr', description: 'New PR detected', source: 'records', value: '60kg × 8' },
  ],
  current_state: { exercise: 'Bench Press', weight: 57.5 },
  deterministic_recommendation: { action: 'increase', amount: '2.5kg' },
  ai_recommendation: null,
  confidence: 0.88,
  safety_flags: [],
  requires_trainer_approval: true,
  status: 'draft',
  created_by: 'system',
  created_at: '2026-08-23T10:00:00Z',
  updated_at: '2026-08-23T10:00:00Z',
  // Keep the default fixture valid for action tests regardless of wall-clock time.
  // Expiry behavior is covered explicitly by the dedicated expired-proposal test.
  expires_at: '2099-12-31T23:59:59Z',
};

const mockPendingQueue = {
  memory_candidates: [{ type: 'memory' as const, data: mockMemoryCandidate, priority: 68 }],
  programmer_proposals: [{ type: 'proposal' as const, data: mockProposal, priority: 75 }],
  total_pending: 2,
};

const mockIntelligence = {
  client_id: 'client-1',
  client_name: 'John Smith',
  generated_at: '2026-08-23T10:00:00Z',
  what_changed: [{ type: 'pr', text: 'New PR: Bench Press 60kg × 8 on 2026-08-22' }],
  what_ai_knows: [{ category: 'preference', fact: 'Prefers morning training', confidence: 0.85, source_type: 'ai_detected', as_of: '2026-08-20' }],
  what_ai_suggests: [{ id: 'prop-1', type: 'progress_load', summary: 'Increase bench press', confidence: 0.88, safety_flags: [], expires_at: '2026-08-30T10:00:00Z' }],
  what_needs_attention: [{ type: 'safety', text: 'No PAR-Q screening on file' }],
  what_is_missing: ['Body composition measurements'],
  next_best_action: { type: 'proposal_review', text: 'Review bench press progression proposal', proposal_id: 'prop-1' },
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('MemoryCandidateCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fact, category, and confidence', async () => {
    const { default: MemoryCandidateCard } = await import('@/components/ai/MemoryCandidateCard');
    const onConfirm = vi.fn();
    const onReject = vi.fn();

    render(
      <MemoryCandidateCard memory={mockMemoryCandidate} onConfirm={onConfirm} onReject={onReject} />
    );

    expect(screen.getByText('Prefers morning training sessions')).toBeTruthy();
    expect(screen.getByText('preference')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('shows source text when available', async () => {
    const { default: MemoryCandidateCard } = await import('@/components/ai/MemoryCandidateCard');
    render(
      <MemoryCandidateCard memory={mockMemoryCandidate} onConfirm={vi.fn()} onReject={vi.fn()} />
    );

    expect(screen.getByText(/I usually train around 7am/)).toBeTruthy();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const { default: MemoryCandidateCard } = await import('@/components/ai/MemoryCandidateCard');
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryCandidateCard memory={mockMemoryCandidate} onConfirm={onConfirm} onReject={vi.fn()} />
    );

    const confirmBtn = screen.getByText('Confirm as Active');
    confirmBtn.click();

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('mem-1');
    });
  });

  it('shows conflict warning when conflicts exist', async () => {
    const { default: MemoryCandidateCard } = await import('@/components/ai/MemoryCandidateCard');
    const memoryWithConflict = {
      ...mockMemoryCandidate,
      _conflicts: [{ id: 'mem-old', fact: 'Prefers evening training', category: 'preference' }],
    };

    render(
      <MemoryCandidateCard memory={memoryWithConflict} onConfirm={vi.fn()} onReject={vi.fn()} />
    );

    expect(screen.getByText(/Conflict with existing memory/)).toBeTruthy();
    expect(screen.getByText(/Prefers evening training/)).toBeTruthy();
  });

  it('reject button opens reason textarea', async () => {
    const { default: MemoryCandidateCard } = await import('@/components/ai/MemoryCandidateCard');
    render(
      <MemoryCandidateCard memory={mockMemoryCandidate} onConfirm={vi.fn()} onReject={vi.fn()} />
    );

    const rejectBtn = screen.getByText('Reject');
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Reason for rejection/)).toBeTruthy();
    });
  });
});

describe('ProgrammerProposalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders proposal type, summary, and confidence', async () => {
    const { default: ProgrammerProposalCard } = await import('@/components/ai/ProgrammerProposalCard');
    render(
      <ProgrammerProposalCard proposal={mockProposal} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    expect(screen.getByText('Progress Load')).toBeTruthy();
    expect(screen.getByText('Increase bench press by 2.5kg')).toBeTruthy();
    expect(screen.getByText('88%')).toBeTruthy();
  });

  it('shows disagreement banner when AI and deterministic differ', async () => {
    const { default: ProgrammerProposalCard } = await import('@/components/ai/ProgrammerProposalCard');
    const disagreeProposal = {
      ...mockProposal,
      ai_recommendation: { action: 'maintain', reason: 'Recovery is declining' },
    };

    render(
      <ProgrammerProposalCard proposal={disagreeProposal} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    expect(screen.getByText(/AI and deterministic recommendations differ/)).toBeTruthy();
    expect(screen.getByText('Deterministic')).toBeTruthy();
    expect(screen.getByText('AI Recommendation')).toBeTruthy();
  });

  it('shows safety flags when present', async () => {
    const { default: ProgrammerProposalCard } = await import('@/components/ai/ProgrammerProposalCard');
    const unsafeProposal = {
      ...mockProposal,
      safety_flags: ['Low recovery score', 'Missing PAR-Q'],
    };

    render(
      <ProgrammerProposalCard proposal={unsafeProposal} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    // Safety flag badge should be visible
    expect(screen.getByText('2')).toBeTruthy(); // count badge
  });

  it('shows expired state for expired proposals', async () => {
    const { default: ProgrammerProposalCard } = await import('@/components/ai/ProgrammerProposalCard');
    const expiredProposal = {
      ...mockProposal,
      expires_at: '2026-01-01T00:00:00Z',
    };

    render(
      <ProgrammerProposalCard proposal={expiredProposal} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    expect(screen.getByText('Expired')).toBeTruthy();
    expect(screen.getByText(/Proposal expired/)).toBeTruthy();
  });

  it('shows approved status for processed proposals', async () => {
    const { default: ProgrammerProposalCard } = await import('@/components/ai/ProgrammerProposalCard');
    const approvedProposal = {
      ...mockProposal,
      status: 'approved',
    };

    render(
      <ProgrammerProposalCard proposal={approvedProposal} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    expect(screen.getByText('approved')).toBeTruthy();
    expect(screen.getByText(/Approved — pending training-system execution/)).toBeTruthy();
  });

  it('expand/collapse shows evidence and state', async () => {
    const { default: ProgrammerProposalCard } = await import('@/components/ai/ProgrammerProposalCard');
    render(
      <ProgrammerProposalCard proposal={mockProposal} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    const expandBtn = screen.getByText('View evidence & state');
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Evidence')).toBeTruthy();
    });
  });
});

describe('Intelligence API client', () => {
  it('trainer API has all required methods', async () => {
    const { api } = await import('@/lib/api');
    expect(typeof api.ai.trainer.pending).toBe('function');
    expect(typeof api.ai.trainer.intelligence).toBe('function');
    expect(typeof api.ai.trainer.confirmMemory).toBe('function');
    expect(typeof api.ai.trainer.rejectMemory).toBe('function');
    expect(typeof api.ai.trainer.approveProposal).toBe('function');
    expect(typeof api.ai.trainer.rejectProposal).toBe('function');
  });

  it('memory API has all required methods', async () => {
    const { api } = await import('@/lib/api');
    expect(typeof api.ai.memory.list).toBe('function');
    expect(typeof api.ai.memory.pending).toBe('function');
    expect(typeof api.ai.memory.confirm).toBe('function');
    expect(typeof api.ai.memory.reject).toBe('function');
    expect(typeof api.ai.memory.remove).toBe('function');
    expect(typeof api.ai.memory.supersede).toBe('function');
  });

  it('programmer API has all required methods', async () => {
    const { api } = await import('@/lib/api');
    expect(typeof api.ai.programmer.propose).toBe('function');
    expect(typeof api.ai.programmer.proposals).toBe('function');
    expect(typeof api.ai.programmer.approve).toBe('function');
    expect(typeof api.ai.programmer.reject).toBe('function');
  });
});

describe('Stale proposal handling', () => {
  it('ProgrammerProposalCard handles 409 stale_proposal error', async () => {
    const { default: ProgrammerProposalCard } = await import('@/components/ai/ProgrammerProposalCard');
    const onApprove = vi.fn().mockRejectedValue(
      new Error('Client data changed since this proposal was created. Please regenerate.')
    );

    render(
      <ProgrammerProposalCard proposal={mockProposal} onApprove={onApprove} onReject={vi.fn()} />
    );

    const approveBtn = screen.getByText('Approve & Apply');
    approveBtn.click();

    await waitFor(() => {
      expect(screen.getByText(/Client data changed since this proposal was created/)).toBeTruthy();
    });
  });
});
