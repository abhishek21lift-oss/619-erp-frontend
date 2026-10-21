import { describe, expect, it } from 'vitest';
import {
  portfolioUploadDefaults, portfolioUploadSchema, toPortfolioUploadPayload,
} from '@/lib/forms/schemas/portfolioUpload';
import type { PortfolioKind } from '@/lib/api';

const parse = (kind: PortfolioKind, values: Record<string, unknown> = {}) =>
  portfolioUploadSchema(kind).safeParse({ ...portfolioUploadDefaults(), ...values });

const message = (kind: PortfolioKind, values: Record<string, unknown> = {}) => {
  const result = parse(kind, values);
  return result.success ? null : result.error.issues[0]?.message;
};

const values = (kind: PortfolioKind, overrides: Record<string, unknown> = {}) => {
  const result = parse(kind, overrides);
  if (!result.success) throw new Error(result.error.issues[0]?.message);
  return result.data;
};

describe('portfolio upload schema', () => {
  it('opens empty', () => {
    expect(portfolioUploadDefaults()).toEqual({
      external_url: '', title: '', caption: '',
    });
  });

  it('requires the link only for a video', () => {
    expect(parse('image').success).toBe(true);
    expect(parse('before_after').success).toBe(true);
    expect(message('video_link')).toBe('Video link is required.');
  });

  it('accepts https and leaves the provider allowlist to the server', () => {
    expect(values('video_link', { external_url: 'https://youtu.be/abc' }).external_url)
      .toBe('https://youtu.be/abc');
    expect(values('video_link', { external_url: 'https://example.com/watch' }).external_url)
      .toBe('https://example.com/watch');
  });

  it('rejects a link that is not https', () => {
    expect(message('video_link', { external_url: 'http://youtu.be/abc' }))
      .toBe('Video link must start with https://.');
    expect(message('video_link', { external_url: 'youtu.be/abc' }))
      .toBe('Video link must start with https://.');
  });

  it('trims the link, title and caption', () => {
    const parsed = values('video_link', {
      external_url: '  https://youtu.be/abc  ',
      title: '  Transformation  ',
      caption: '  Twelve weeks  ',
    });
    expect(parsed).toEqual({
      external_url: 'https://youtu.be/abc',
      title: 'Transformation',
      caption: 'Twelve weeks',
    });
  });

  it('accepts the title and caption boundaries and rejects one character more', () => {
    expect(values('image', { title: 'x'.repeat(120), caption: 'x'.repeat(400) }))
      .toMatchObject({ title: 'x'.repeat(120), caption: 'x'.repeat(400) });
    expect(message('image', { title: 'x'.repeat(121) })).toContain('currently 121');
    expect(message('image', { caption: 'x'.repeat(401) })).toContain('currently 401');
  });

  it('accepts a 500-character link and rejects a longer one', () => {
    const link = `https://youtu.be/${'x'.repeat(483)}`;
    expect(link).toHaveLength(500);
    expect(values('video_link', { external_url: link }).external_url).toBe(link);
    expect(message('video_link', { external_url: `${link}x` })).toContain('currently 501');
  });

  it('does not validate a stale link when another kind is selected', () => {
    expect(parse('image', { external_url: 'not a url' }).success).toBe(true);
    expect(parse('before_after', { external_url: 'http://youtu.be/abc' }).success).toBe(true);
  });
});

describe('portfolio upload payload', () => {
  it('sends the text fields only when they have a value', () => {
    expect(toPortfolioUploadPayload(values('image'), 'image')).toEqual({
      externalUrl: undefined,
      title: undefined,
      caption: undefined,
    });
  });

  it('sends a video link, title and caption for a video', () => {
    const parsed = values('video_link', {
      external_url: ' https://youtu.be/abc ',
      title: ' Transformation ',
      caption: ' Twelve weeks ',
    });
    expect(toPortfolioUploadPayload(parsed, 'video_link')).toEqual({
      externalUrl: 'https://youtu.be/abc',
      title: 'Transformation',
      caption: 'Twelve weeks',
    });
  });

  it('never attaches a stale video link to a photo or a before/after', () => {
    const parsed = values('image', { external_url: 'https://youtu.be/abc' });
    expect(toPortfolioUploadPayload(parsed, 'image').externalUrl).toBeUndefined();
    expect(toPortfolioUploadPayload(parsed, 'before_after').externalUrl).toBeUndefined();
  });
});
