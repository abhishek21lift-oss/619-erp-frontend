// The progress analyser's error state.
//
// The backend's MPTS gate answers 422 `INSUFFICIENT_EVIDENCE` when the
// approved corpus is empty, and 503 with `detail: 'stale' | 'unavailable'`
// otherwise. Retrying cannot fix an empty corpus or a stale index, so those
// two must not offer Retry; only `unavailable` is transient. These pin the
// three branches, because the previous screen offered Retry for all of them.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApiError } from '@/lib/http';

const analyzeMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { ai: { analyzeProgress: (...args: unknown[]) => analyzeMock(...args) } },
}));
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...rest }: Record<string, unknown>) => <div {...rest}>{children as React.ReactNode}</div> },
}));
vi.mock('@/components/ui', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/visualizations', () => ({ PremiumLineChart: () => null }));
vi.mock('@/components/ai/AiClientPicker', () => ({
  AiClientPicker: ({ onSelect }: { onSelect: (c: { id: string; name: string }) => void }) => (
    <button onClick={() => onSelect({ id: 'c1', name: 'Asha' })}>Pick Asha</button>
  ),
}));

import ProgressAnalysisPage from '@/app/(chrome)/ai/progress-analysis/page';

const gate = (status: number, detail: string) =>
  new ApiError('gate refused', status, 'INSUFFICIENT_EVIDENCE', { detail });

async function analyze(error: ApiError) {
  analyzeMock.mockRejectedValueOnce(error);
  render(<ProgressAnalysisPage />);
  fireEvent.click(screen.getByRole('button', { name: /pick asha/i }));
  fireEvent.click(screen.getByRole('button', { name: /analyse progress/i }));
  await screen.findByRole('alert');
}

describe('the progress analyser names the gate state', () => {
  beforeEach(() => analyzeMock.mockReset());

  it('sends an empty corpus to the knowledge base, without Retry', async () => {
    await analyze(gate(422, 'empty'));

    expect(screen.getByRole('link', { name: /open knowledge base/i }))
      .toHaveAttribute('href', '/ai-coach/knowledge');
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });

  it('offers Retry when the knowledge base could not be checked', async () => {
    await analyze(gate(503, 'unavailable'));

    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /open knowledge base/i })).toBeNull();
  });

  it('asks for a reindex, and does not offer Retry, when the index is stale', async () => {
    await analyze(gate(503, 'stale'));

    expect(screen.getByRole('alert')).toHaveTextContent(/reindex/i);
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /open knowledge base/i })).toBeNull();
  });
});
