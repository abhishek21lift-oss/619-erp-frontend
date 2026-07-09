'use client';

// TODO: Implement DesktopShell
// Layout: fixed sidebar (left) + main content area with top bar
//
// Structure:
//   <div class="flex h-screen overflow-hidden">
//     <DesktopSidebar />                   ← from components/sidebar
//     <div class="flex flex-col flex-1">
//       <DesktopTopBar />                  ← from components/top-bar
//       <main>{children}</main>
//     </div>
//   </div>

import type { ReactNode } from 'react';

interface DesktopShellProps {
  children: ReactNode;
}

export function DesktopShell({ children }: DesktopShellProps) {
  // TODO: Replace placeholder with real desktop layout
  return <>{children}</>;
}
