import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-card';

export const alt = 'Start free — MY PT STUDIO';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return renderOgCard({
    eyebrow: 'Start free',
    title: 'Run the training. Let the studio run itself.',
  });
}
