'use client';

import { useEffect } from 'react';
import { initSentry } from '@/lib/sentry';

/** Initialises client-side error monitoring on mount (no-op without a DSN). */
export default function SentryInit() {
  useEffect(() => {
    initSentry();
  }, []);
  return null;
}
