// The signed-out frame gives every auth page one visible H1, at every width.
//
// The desktop aside used to own the only <h1> and was `hidden lg:block`. On a
// phone that left the card title as an <h2> with no <h1> above it, so the page
// had no heading at all in the accessibility tree. The card is the page's
// subject — you came here to sign in — so it owns the <h1> now, and the aside
// headline is a tagline rather than a competing heading.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// AuthShell renders the real logo through next/image, which needs the Next
// compiler. The mark is decorative; a plain img is enough here.
vi.mock('next/image', () => ({
  default: ({ priority: _priority, ...props }: { priority?: boolean }) => <img alt="" {...props} />,
}));

import AuthShell, { AuthCard } from '@/components/landing/AuthShell';

const SRC = join(process.cwd(), 'src');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');

function renderDoor() {
  return render(
    <AuthShell
      nav={<nav />}
      mainStyle={{}}
      aside={{ eyebrow: 'Eyebrow', headline: 'Your studio, exactly where you left it.', sub: 'Sub' }}
    >
      <AuthCard title="Trainer Login" subtitle="Sign in">
        <form aria-label="sign in">
          <input aria-label="Email" />
        </form>
      </AuthCard>
    </AuthShell>,
  );
}

describe('the signed-out frame has one visible h1', () => {
  it('puts the h1 in the card, where the form is', () => {
    renderDoor();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Trainer Login');
  });

  it('keeps the h1 out of the desktop-only aside', () => {
    renderDoor();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.closest('.hidden')).toBeNull();
    expect(h1.closest('section')).toBeNull();
  });

  it('keeps the desktop headline as a tagline, not a second heading', () => {
    renderDoor();
    expect(screen.getByText('Your studio, exactly where you left it.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your studio, exactly where you left it.' })).toBeNull();
  });

  it('does not put a lower heading above the h1', () => {
    const { container } = renderDoor();
    const headings = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    expect(headings[0].tagName).toBe('H1');
  });
});

describe('every auth door renders its title through the shared card', () => {
  // Three SignInScreen doors plus the three recovery/signup pages. The card
  // owns the h1; a page that stops using it loses the heading.
  const doors: Array<[string, string]> = [
    ['/login', 'components/auth/SignInScreen.tsx'],
    ['/member-login', 'components/auth/SignInScreen.tsx'],
    ['/platform-login', 'components/auth/SignInScreen.tsx'],
    ['/forgot-password', 'app/(bare)/forgot-password/page.tsx'],
    ['/reset-password', 'app/(bare)/reset-password/page.tsx'],
    ['/start-free', 'app/(bare)/start-free/page.tsx'],
  ];

  it.each(doors)('%s renders AuthCard', (_route, file) => {
    expect(read(file)).toMatch(/AuthCard/);
  });
});
