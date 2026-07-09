'use client';

// TODO: Implement TabletShell
// Layout: compact icon sidebar (64px) + content area with floating top bar
//
// Structure:
//   <div class="flex h-screen overflow-hidden">
//     <TabletSidebar />                    ← from components/sidebar
//     <div class="flex flex-col flex-1 relative">
//       <TabletTopBar />                   ← from components/top-bar
//       <main>{children}</main>
//     </div>
//   </div>

import type { ReactNode } from 'react';

interface TabletShellProps {
  children: ReactNode;
}

export function TabletShell({ children }: TabletShellProps) {
  // TODO: Replace placeholder with real tablet layout
  return <>{children}</>;
}
