import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-card';

export const alt = 'PT OS — personal trainer software for India';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return renderOgCard({
    eyebrow: 'PT OS · Personal trainer software',
    title: 'Built for how India coaches.',
  });
}
