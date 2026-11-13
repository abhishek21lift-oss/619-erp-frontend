import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

import { CountUp } from '@/components/member/MemberUI';

describe('CountUp', () => {
  it('renders the final value immediately under reduced motion', () => {
    render(<CountUp to={1234} />);
    expect(screen.getByText('1,234')).toBeTruthy();
  });
});
