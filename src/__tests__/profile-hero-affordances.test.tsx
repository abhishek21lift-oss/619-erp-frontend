// "Unable to change profile photo or add banner image."
//
// Neither control was broken. Both worked, on the first tap, every time — the
// upload routes, the API client and the file inputs were all verified correct
// before a line was changed here. What failed was that on a phone neither one
// looked like a control:
//
//   • the camera icon lived only inside `opacity-0 group-hover:opacity-100`,
//     and a touch screen never fires hover, so the avatar was just a picture;
//   • the cover button's label was `hidden sm:inline`, so below 640px it was a
//     bare 13px glyph in a dark circle — decoration, to anybody looking at it.
//
// That is the expensive kind of bug: nothing throws, nothing logs, and the
// report that comes back is "it doesn't work". So what this file pins is not
// that the handlers fire (they always did) but that the affordances are
// visible without a pointer that can hover, which is the property that
// regressed and the property a `sm:` prefix silently takes away again.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProfileHero } from '@/components/profile/ProfileHero';
import type { ProfileMe } from '@/lib/api';

const me = {
  id: 'u1',
  name: 'Abhishek Katiyar',
  email: 'abhishek@myptstudio.com',
  avatarUrl: null,
  coverUrl: null,
  createdAt: '2026-07-21',
  yearsExperience: null,
  completion: { percent: 7, total: 19, done: 1 },
} as unknown as ProfileMe;

function hero(overrides: Partial<ProfileMe> = {}, props: Record<string, unknown> = {}) {
  return render(
    <ProfileHero
      me={{ ...me, ...overrides }}
      organizationName="MY PT STUDIO"
      resolveUrl={(p) => p}
      roleLabel="Super admin"
      memberSince="21-07-2026"
      avatarUploading={false}
      coverBusy={false}
      onPickAvatar={() => {}}
      onPickCover={() => {}}
      onRemoveCover={() => {}}
      {...props}
    />
  );
}

const affordance = () => document.querySelector('[data-avatar-affordance]') as HTMLElement | null;

describe('the avatar says it can be changed', () => {
  it('carries a permanent affordance, not a hover-only one', () => {
    // The whole fix. `sm:` would put this back on a pointer that can hover,
    // and `opacity-0` would put it back behind one.
    hero();
    const badge = affordance();
    expect(badge).not.toBeNull();
    expect(badge!.className).not.toMatch(/(^|\s|:)hidden\b/);
    expect(badge!.className).not.toMatch(/opacity-0|group-hover/);
  });

  it('shows it whether or not a photo has been set yet', () => {
    // Both states need it: an empty avatar shows initials, which look no more
    // tappable than a photograph does.
    for (const avatarUrl of [null, '/uploads/a.jpg']) {
      const { unmount } = hero({ avatarUrl });
      expect(affordance()).not.toBeNull();
      unmount();
    }
  });

  it('does not sit inside the hover scrim', () => {
    // Both elements are aria-hidden and the scrim comes first in the DOM, so a
    // check that only counted decorations would pass with the badge still
    // buried inside the thing that never appears on touch.
    hero();
    const scrim = document.querySelector('.group-hover\\:opacity-100');
    const badge = affordance();
    expect(scrim).not.toBeNull();
    // Asserted before the containment check, which `contains(null)` would
    // otherwise pass vacuously against the very code this is guarding against.
    expect(badge).not.toBeNull();
    expect(scrim!.contains(badge)).toBe(false);
  });

  it('cannot swallow the tap it is advertising', () => {
    // It is a marker painted on a button, not a second button. Without
    // pointer-events-none the bottom-right corner of the avatar would stop
    // opening the picker — a worse bug than the one being fixed.
    hero();
    expect(affordance()!.className).toContain('pointer-events-none');
    expect(affordance()!.tagName).not.toBe('BUTTON');
  });

  it('opens the file picker on a plain tap', () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    hero();
    fireEvent.click(screen.getByRole('button', { name: 'Add a profile photo' }));
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('names the action for a screen reader in both states', () => {
    const { unmount } = hero({ avatarUrl: null });
    expect(screen.getByRole('button', { name: 'Add a profile photo' })).toBeInTheDocument();
    unmount();
    hero({ avatarUrl: '/uploads/a.jpg' });
    expect(screen.getByRole('button', { name: 'Change profile photo' })).toBeInTheDocument();
  });
});

describe('the banner button says what it is', () => {
  it('keeps its label at every width', () => {
    // `hidden sm:inline` is what shipped, and it is a one-word change to
    // reintroduce. The label is the only thing that made the glyph read as a
    // button on a phone.
    hero();
    const label = screen.getByText('Add banner');
    expect(label.className).not.toMatch(/(^|\s|:)hidden\b/);
    expect(label.closest('button')).not.toBeNull();
  });

  it('says Change rather than Add once a banner exists', () => {
    hero({ coverUrl: '/uploads/c.jpg' });
    expect(screen.getByText('Change banner')).toBeInTheDocument();
    expect(screen.queryByText('Add banner')).toBeNull();
  });

  it('offers Remove only when there is something to remove', () => {
    const { unmount } = hero({ coverUrl: null });
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    unmount();
    hero({ coverUrl: '/uploads/c.jpg' });
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('opens the file picker on a plain tap', () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    hero();
    fireEvent.click(screen.getByRole('button', { name: 'Add banner' }));
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });
});

describe('targets a finger can hit', () => {
  it('gives the cover buttons 44px in pixels, not in rem', () => {
    // This app sets a 14px root, so every rem-named utility lands at 87.5% of
    // its name — `h-11` is 38.5px here, not 44. Hence an inline pixel value:
    // jsdom performs no layout, so the declaration is the assertable thing,
    // and it is also the thing that would quietly shrink again.
    hero({ coverUrl: '/uploads/c.jpg' });
    for (const name of ['Change banner', 'Remove']) {
      const btn = screen.getByRole('button', { name });
      expect(btn.style.minHeight).toBe('44px');
    }
  });

  it('keeps the avatar itself well past 44px', () => {
    hero();
    expect(screen.getByRole('button', { name: 'Add a profile photo' }).className)
      .toContain('h-[72px]');
  });
});

describe('picking the same file twice', () => {
  it('clears the input so a re-pick still fires', () => {
    // Without this, correcting a bad crop by choosing the same file again does
    // nothing at all — change never fires when the value has not changed, and
    // it reads exactly like the bug this file is about.
    // Both inputs share one `take` helper, and both are anonymous in the DOM,
    // so this asserts the property over each of them rather than guessing
    // which one document order puts first.
    const onPickAvatar = vi.fn();
    const onPickCover = vi.fn();
    const { container } = hero({}, { onPickAvatar, onPickCover });
    const inputs = [...container.querySelectorAll<HTMLInputElement>('input[type="file"]')];
    expect(inputs).toHaveLength(2);

    for (const input of inputs) {
      const file = new File(['x'], 'a.png', { type: 'image/png' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);
      expect(input.value).toBe('');
    }
    expect(onPickAvatar).toHaveBeenCalledTimes(1);
    expect(onPickCover).toHaveBeenCalledTimes(1);
  });
});

describe('nothing here is gated on hover', () => {
  it('never hides an upload affordance behind a pointer that can hover', () => {
    // A source check, because the failure mode is a class name rather than a
    // rendered value: `sm:` on a control is invisible in jsdom, which has no
    // media queries, and invisible in a desktop screenshot, which is the only
    // place it looks fine.
    //
    // Comments stripped first — this file's own prose quotes the very class
    // names it forbids, and so does ProfileHero's.
    const src = readFileSync(
      join(process.cwd(), 'src/components/profile/ProfileHero.tsx'),
      'utf8'
    );
    const code = src
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
      .join('\n');

    // The scrim may stay hover-only; it is an enhancement sitting on top of a
    // badge that is always there. Nothing else may be.
    const hoverGated = [...code.matchAll(/group-hover:opacity-100/g)];
    expect(hoverGated).toHaveLength(1);

    // And the label must not be width-gated back into a bare icon.
    expect(code).not.toMatch(/hidden\s+sm:inline/);
  });
});
