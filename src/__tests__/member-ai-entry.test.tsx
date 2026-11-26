// The two doors into the member assistant: a card on Home and a row on
// Profile. Both are gated on the studio's ai_suite flag — a studio without the
// suite gets no door to a room the server will refuse.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let featureOn = true;
vi.mock('@/lib/features-context', () => ({
  useFeatures: () => ({ enabled: () => featureOn }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import MemberAiEntry from '@/components/member/MemberAiEntry';

describe('MemberAiEntry', () => {
  it('links to the member AI page when the studio has the suite', () => {
    featureOn = true;
    render(<MemberAiEntry variant="card" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/member/ai');
    expect(screen.getByText('Ask your AI coach')).toBeInTheDocument();
  });

  it('renders nothing when ai_suite is off', () => {
    featureOn = false;
    const { container } = render(<MemberAiEntry variant="card" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('supports the profile row variant', () => {
    featureOn = true;
    render(<MemberAiEntry variant="row" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/member/ai');
  });
});
