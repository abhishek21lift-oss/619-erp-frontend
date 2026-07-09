'use client';

// TODO: Implement MobileShell
// Layout: full-screen content + fixed floating top bar + fixed bottom nav
//
// Structure:
//   <>
//     <MobileTopBar />                    ← from components/top-bar
//     <main class="pt-[top-bar-height] pb-[bottom-nav-height]">{children}</main>
//     <MobileBottomNav />                 ← existing src/components/MobileBottomNav.tsx until superseded
//     <FAB />                             ← existing src/components/FAB.tsx
//   </>

import type { ReactNode } from 'react';

interface MobileShellProps {
  children: ReactNode;
}

export function MobileShell({ children }: MobileShellProps) {
  // TODO: Replace placeholder with real mobile layout
  return <>{children}</>;
}
