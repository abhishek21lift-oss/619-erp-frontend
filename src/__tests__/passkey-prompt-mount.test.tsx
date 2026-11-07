import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('@/components/member/MemberNav', () => ({
  default: () => null,
  MEMBER_NAV_CLEARANCE: 0,
}));
vi.mock('@/components/auth/PasskeySetupPrompt', () => ({
  default: () => <div>passkey prompt</div>,
}));

import MemberShell from '@/components/member/MemberShell';

it('renders the prompt above member page content', () => {
  render(<MemberShell><div>page content</div></MemberShell>);
  expect(screen.getByText('passkey prompt')).toBeInTheDocument();
  expect(screen.getByText('page content')).toBeInTheDocument();
});

it('mounts the prompt in the studio shell too', () => {
  const shell = readFileSync(resolve(process.cwd(), 'src/components/AppShell.tsx'), 'utf8');
  expect(shell).toContain('PasskeySetupPrompt');
  expect(shell).toContain('<PasskeySetupPrompt />');
});
