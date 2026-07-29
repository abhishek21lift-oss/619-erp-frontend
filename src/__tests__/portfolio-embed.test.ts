// Turning a stored video link into something an iframe will play.
//
// The failure mode is silent: a URL the embed player does not recognise
// renders as a black rectangle with no error, no console message and no
// difference from a slow network. Nobody reports it, and the card just looks
// broken forever. So every shape the server is willing to store has a case
// here, and anything unfamiliar must return null so the caller can fall back
// to opening the original link.
import { describe, it, expect } from 'vitest';
import { embedUrl } from '@/components/profile/PortfolioSection';

describe('embedUrl', () => {
  it('converts a YouTube watch URL', () => {
    expect(embedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('keeps extra query parameters out of the embed', () => {
    // A watch URL routinely carries a playlist, a timestamp and tracking
    // parameters. Only the id belongs in the embed.
    expect(embedUrl('https://www.youtube.com/watch?v=abc123&list=PL9&t=42s&si=xyz'))
      .toBe('https://www.youtube.com/embed/abc123');
  });

  it('converts a youtu.be short link', () => {
    expect(embedUrl('https://youtu.be/abc123')).toBe('https://www.youtube.com/embed/abc123');
  });

  it('converts a Vimeo link', () => {
    expect(embedUrl('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789');
  });

  it('leaves an already-embeddable URL alone', () => {
    expect(embedUrl('https://www.youtube.com/embed/abc123')).toBe('https://www.youtube.com/embed/abc123');
    expect(embedUrl('https://player.vimeo.com/video/123')).toBe('https://player.vimeo.com/video/123');
  });

  it('returns null rather than guessing at an unfamiliar shape', () => {
    // Better a "watch the video" link than an embed that silently shows
    // nothing. A Vimeo channel page and a YouTube channel are both stored-able
    // by the server's host check but are not videos.
    for (const url of [
      'https://vimeo.com/channels/staffpicks',
      'https://www.youtube.com/watch',
      'https://www.youtube.com/@somechannel',
      'https://vimeo.com/',
    ]) {
      expect(embedUrl(url)).toBeNull();
    }
  });

  it('returns null for nothing and for nonsense', () => {
    expect(embedUrl(null)).toBeNull();
    expect(embedUrl('')).toBeNull();
    expect(embedUrl('not a url')).toBeNull();
  });

  it('escapes an id rather than pasting it into the URL', () => {
    // The server validates the host, not the path. An id carrying a slash or a
    // query would otherwise change which URL the iframe actually loads.
    expect(embedUrl('https://www.youtube.com/watch?v=a/../evil?x=1'))
      .toBe('https://www.youtube.com/embed/a%2F..%2Fevil%3Fx%3D1');
  });
});
