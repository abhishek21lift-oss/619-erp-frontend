/**
 * Adding one item to the portfolio.
 *
 * The old dialog held the link, title and caption as uncontrolled-adjacent
 * state and checked only that the link was non-empty. The limits existed only
 * as `maxLength` on the inputs, which silently truncates a paste, and the
 * server's own limits lived in `lib/portfolio.js`: 120 characters of title,
 * 400 of caption, a 500-character https link. Those are mirrored here so the
 * user gets a field-level reason before the upload starts.
 *
 * The URL's host is deliberately NOT checked here. The server owns the
 * YouTube/Vimeo allowlist, and duplicating it client-side would mean a provider
 * the server accepts can be rejected by a stale bundle.
 */

import { z } from 'zod';
import type { PortfolioKind } from '@/lib/api';
import { textField } from '../primitives';

export type PortfolioUploadState = {
  external_url: string;
  title: string;
  caption: string;
};

export function portfolioUploadDefaults(): PortfolioUploadState {
  return { external_url: '', title: '', caption: '' };
}

export function portfolioUploadSchema(kind: PortfolioKind) {
  return z.object({
    // Only a video needs the link. When another kind is selected, a value left
    // behind by a previous choice must not block the upload or be sent.
    external_url: kind === 'video_link'
      ? textField({
        label: 'Video link',
        required: true,
        maxLength: 500,
        pattern: {
          test: /^https:\/\/\S+$/i,
          message: 'Video link must start with https://.',
        },
      })
      : textField({ label: 'Video link' }),
    title: textField({ label: 'Title', maxLength: 120 }),
    caption: textField({ label: 'Caption', maxLength: 400 }),
  });
}

export type PortfolioUploadValues = z.output<ReturnType<typeof portfolioUploadSchema>>;

export interface PortfolioUploadPayload {
  externalUrl?: string;
  title?: string;
  caption?: string;
}

/**
 * The text half of the create payload.
 *
 * `externalUrl` is sent only for a video, matching the old dialog: a stale link
 * left in state after switching kinds must not attach itself to a photo.
 */
export function toPortfolioUploadPayload(
  values: PortfolioUploadValues,
  kind: PortfolioKind,
): PortfolioUploadPayload {
  return {
    externalUrl: kind === 'video_link' ? values.external_url ?? undefined : undefined,
    title: values.title ?? undefined,
    caption: values.caption ?? undefined,
  };
}
