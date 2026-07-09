'use client';

// TODO: Implement NavShell — root responsive shell that renders the correct
// nav layout based on useBreakpoint():
//   desktop → DesktopShell
//   tablet  → TabletShell
//   mobile  → MobileShell

import type { ReactNode } from 'react';
import { NavigationProvider } from '../context/navigation-provider';

interface NavShellProps {
  children: ReactNode;
}

/**
 * NavShell wraps the app in NavigationProvider and will
 * eventually render the breakpoint-appropriate shell layout.
 *
 * TODO: Add DesktopShell / TabletShell / MobileShell when implemented.
 */
export function NavShell({ children }: NavShellProps) {
  return (
    <NavigationProvider>
      {children}
    </NavigationProvider>
  );
}
