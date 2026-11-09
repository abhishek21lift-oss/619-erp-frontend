'use client';

import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

/**
 * The studio shell, mounted once for every page under `(chrome)`.
 *
 * `/` used to be the one exception: a visitor with no session saw the marketing
 * landing page at the same URL. The domain now opens on the unified sign-in
 * form, so there is no anonymous page left to special-case — every route here
 * is a dashboard behind Guard.
 */
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  return (
    <Guard>
      <AppShell>{children}</AppShell>
    </Guard>
  );
}
