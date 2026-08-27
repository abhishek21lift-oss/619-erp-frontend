// Metadata for /start-free, the second and last indexable route.
//
// A layout rather than a server-component wrapper around the page, which is
// what `/` needed. The two differ for a structural reason, not a stylistic
// one: `/` is the index route of the (chrome) group, so a layout beside it
// would apply to all 105 pages in that group. This route has its own folder,
// so a layout here reaches exactly one URL and the page below stays a
// `'use client'` file with nothing about it changed.
//
// The root layout's default is `robots: { index: false, follow: false }` — see
// the comment there. This is the opt-in.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start free',
  description:
    'Start a free MY PT STUDIO trial — clients, training, nutrition, progress, payments and analytics for personal trainers, in one place.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/start-free' },
  openGraph: {
    url: 'https://myptstudio.com/start-free',
    title: 'Start free — MY PT STUDIO',
    description:
      'Start a free MY PT STUDIO trial — clients, training, nutrition, progress, payments and analytics for personal trainers, in one place.',
  },
};

export default function StartFreeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
