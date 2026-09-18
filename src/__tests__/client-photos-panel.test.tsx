/**
 * The Photos tab on a member's profile.
 *
 * ── What it used to do ─────────────────────────────────────────────────────
 *
 * Render a hardcoded `<EmptyPanel title="No progress photos yet" />`. The tab
 * queried nothing — there was not one photo API call in the entire profile
 * page — so it said "none" to every client on the platform, including the ones
 * with photos on file. The endpoint had existed the whole time and the
 * dedicated Progress Photos screen had always read it.
 *
 * A tab that renders a fixed empty state is worse than a missing one: missing
 * sends you to look elsewhere, and a confident "none" stops you looking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PhotosPanel from '@/components/pt-os/client/PhotosPanel';

const list = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { progress: { progressPhotos: { list: (...a: unknown[]) => list(...a) } } },
}));

const photo = (id: string, taken: string) => ({
  id, photo_url: `https://example.test/${id}.jpg`, photo_type: 'front', taken_at: taken,
});

// Braces matter: an arrow without them RETURNS the mock, and vitest awaits a
// hook's return value — which makes the hook itself the thing that fails.
beforeEach(() => { list.mockReset(); });

describe('when the client has photos', () => {
  it('shows them instead of claiming there are none', async () => {
    list.mockResolvedValue({ data: [photo('a', '2026-09-01'), photo('b', '2026-08-01')] });

    render(<PhotosPanel clientId="c1" />);

    await waitFor(() => expect(screen.getByText('2 photos')).toBeTruthy());
    // The exact words the old hardcoded panel always showed.
    expect(screen.queryByText('No progress photos yet')).toBeNull();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('asks the API for THIS client', async () => {
    list.mockResolvedValue({ data: [] });
    render(<PhotosPanel clientId="client-42" />);
    await waitFor(() => expect(list).toHaveBeenCalledWith({ client_id: 'client-42' }));
  });

  it('puts the newest first', async () => {
    // "Now versus then" is the comparison, so the most recent has to lead.
    list.mockResolvedValue({ data: [photo('old', '2026-01-01'), photo('new', '2026-09-01')] });

    render(<PhotosPanel clientId="c1" />);

    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(2));
    const srcs = screen.getAllByRole('img').map((i) => i.getAttribute('src'));
    expect(srcs[0]).toContain('new');
  });
});

describe('when the client genuinely has none', () => {
  it('shows the empty state, but only after the request answered', async () => {
    list.mockResolvedValue({ data: [] });
    render(<PhotosPanel clientId="c1" />);
    await waitFor(() => expect(screen.getByText('No progress photos yet')).toBeTruthy());
  });
});

describe('when the request fails', () => {
  it('says so rather than reporting an empty gallery', async () => {
    // The mistake the Documents card on the same page used to make: collapsing
    // "could not check" into "nothing on file". A trainer told a client has no
    // photos will re-shoot photos that already exist.
    // mockImplementation, not mockRejectedValue: the latter builds the
    // rejected promise at SETUP time, so vitest sees an unhandled rejection
    // before the component has had a chance to attach its catch. Creating it
    // per call means the component consumes it immediately, which is also what
    // really happens.
    list.mockImplementation(() => Promise.reject(new Error('network down')));

    render(<PhotosPanel clientId="c1" />);

    await waitFor(() => expect(screen.getByText('Could not load progress photos')).toBeTruthy());
    expect(screen.queryByText('No progress photos yet')).toBeNull();
    expect(screen.getByText(/may still have photos on file/)).toBeTruthy();
  });
});
