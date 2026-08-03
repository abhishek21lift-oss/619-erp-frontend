// The signed-out bar, and the two pages that have to carry it.
//
// /login used to start flush against the status bar, with a small floating
// "← Home" pill sitting on top of the content instead of a header. /start-free
// grew a proper bar first; this pins that both pages now use the same one, and
// that each reserves enough top padding for it — a fixed header over a page
// that does not pad for it puts the first field under the bar.
//
// The `action` prop is the one thing that differs by page and the one thing
// easy to get backwards: a bar that links to the page you are already on is
// furniture, not navigation.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicNav, { PUBLIC_NAV_CLEARANCE } from '@/components/PublicNav';

const SRC = join(process.cwd(), 'src');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');

describe('<PublicNav />', () => {
  it('always links the wordmark back to the marketing site', () => {
    render(<PublicNav action="sign-in" />);
    expect(screen.getByLabelText('MY PT STUDIO home')).toHaveAttribute('href', '/');
  });

  it('offers Sign in when it sits on the signup page', () => {
    render(<PublicNav action="sign-in" />);
    const cta = screen.getByRole('link', { name: 'Sign in' });
    expect(cta).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'Start free' })).toBeNull();
  });

  it('offers Start free when it sits on the login page', () => {
    render(<PublicNav action="start-free" />);
    const cta = screen.getByRole('link', { name: 'Start free' });
    expect(cta).toHaveAttribute('href', '/start-free');
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  it('pins itself to the top so it survives the page scrolling under it', () => {
    const { container } = render(<PublicNav action="sign-in" />);
    const header = container.querySelector('header')!;
    expect(header.className).toContain('fixed');
    expect(header.className).toContain('top-0');
  });

  it('reserves more clearance than the bar occupies', () => {
    // The bar is a notch reserve plus its own row; the clearance has to be the
    // reserve plus more than that row, or the first element lands under it.
    expect(PUBLIC_NAV_CLEARANCE).toContain('env(safe-area-inset-top)');
    expect(PUBLIC_NAV_CLEARANCE).toContain('5.5rem');
  });
});

describe('signed-out pages', () => {
  const pages: Array<[string, string]> = [
    ['login', 'app/login/page.tsx'],
    ['start-free', 'app/start-free/page.tsx'],
  ];

  it.each(pages)('/%s renders the shared bar', (_name, file) => {
    const src = read(file);
    expect(src).toContain("from '@/components/PublicNav'");
    expect(src).toMatch(/<PublicNav\s+action=/);
  });

  it.each(pages)('/%s pads for the bar rather than hard-coding a gap', (_name, file) => {
    expect(read(file)).toContain('paddingTop: PUBLIC_NAV_CLEARANCE');
  });

  it('/login no longer floats a Home pill over the form', () => {
    // Superseded by the wordmark in the bar, which is where a way back belongs.
    expect(read('app/login/page.tsx')).not.toMatch(/<ArrowLeft[^>]*\/>\s*Home/);
  });

  it('/login offers exactly one way to reset a password', () => {
    // There were two: a link to /forgot-password, and — beside the Password
    // label — a button opening a modal that said resets came from your
    // studio's trainer. That modal predated the self-serve endpoint having a
    // UI; once it had one the page contradicted itself in two places at once.
    // Comment lines are stripped first: the file's own header explains why
    // there is only one, and counting that would defeat the point.
    const src = read('app/login/page.tsx');
    const code = src.split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l)).join('\n');
    expect(code.match(/Forgot password\?/g) ?? []).toHaveLength(1);
    expect(src).toContain('href="/forgot-password"');
    expect(src).not.toContain('ForgotModal');
  });
});
