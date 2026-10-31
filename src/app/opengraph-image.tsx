import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-card';

export const alt = 'MY PT STUDIO — personal training business management';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return renderOgCard({
    eyebrow: 'Personal training business management',
    title: 'Your whole PT studio, built as one.',
  });
}
