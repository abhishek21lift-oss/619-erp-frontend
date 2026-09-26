'use client';

import { useEffect } from 'react';
import { initPwa } from '@/lib/pwa';

/** Starts the service worker and catches the install prompt. Renders nothing. See lib/pwa.ts. */
export default function PwaInit() {
  useEffect(() => { initPwa(); }, []);
  return null;
}
