// ClientAvatar decides one thing: photo or initials.
//
// Every list in the app used to draw its own initials tile, so a photo
// uploaded on the profile page appeared on exactly one screen. Consolidating
// them means this component is now the single point of failure for a client's
// face — including the fallback, which is the part that is easy to get wrong
// and impossible to notice in review: photo_url holds both data URLs from the
// in-app crop and stored paths, and a path this deployment cannot serve has to
// land on the initials rather than a broken-image icon repeated down a table.

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClientAvatar, { initialsOf } from '@/components/pt-os/ClientAvatar';

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('Ajeet Yadav')).toBe('AY');
    expect(initialsOf('Hari Narayan Singh')).toBe('HN');
  });

  it('survives the inputs a roster actually contains', () => {
    expect(initialsOf('Madonna')).toBe('M');
    expect(initialsOf('  ')).toBe('?');
    expect(initialsOf('')).toBe('?');
    expect(initialsOf(null)).toBe('?');
    expect(initialsOf(undefined)).toBe('?');
  });
});

describe('ClientAvatar', () => {
  it('shows the photo when there is one', () => {
    render(<ClientAvatar name="Ajeet Yadav" photoUrl="https://example.test/a.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.test/a.jpg');
    expect(screen.queryByText('AY')).toBeNull();
  });

  it('shows initials when there is no photo', () => {
    render(<ClientAvatar name="Ajeet Yadav" />);
    expect(screen.getByText('AY')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('treats an empty photo_url as no photo', () => {
    render(<ClientAvatar name="Ajeet Yadav" photoUrl="" />);
    expect(screen.getByText('AY')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  // The one that matters. A stored path this deployment cannot serve fires
  // onError, and what the user must see next is the initials — not a broken
  // image, and not an empty tile.
  it('falls back to initials when the photo fails to load', () => {
    render(<ClientAvatar name="Ajeet Yadav" photoUrl="https://example.test/gone.jpg" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('AY')).toBeTruthy();
  });

  it('uses a caller-supplied fallback instead of initials', () => {
    // The `children` escape hatch, kept because a caller may have something
    // better than initials to show when there is no photo. Today used to be
    // that caller — it passed a Moon for rest days — and no longer is: it
    // shows the face on every row and marks the rest day with a corner badge
    // instead. The prop stays supported and tested on its own terms.
    render(<ClientAvatar name="Ajeet Yadav"><span>rest</span></ClientAvatar>);
    expect(screen.getByText('rest')).toBeTruthy();
    expect(screen.queryByText('AY')).toBeNull();
  });

  it('keeps the caller looking the way the caller asked', () => {
    const { container } = render(
      <ClientAvatar name="A B" className="h-9 w-9" style={{ borderRadius: 7 }} />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toBe('h-9 w-9');
    expect(el.style.borderRadius).toBe('7px');
    // and it clips the photo to that shape rather than letting it spill
    expect(el.style.overflow).toBe('hidden');
  });
});
