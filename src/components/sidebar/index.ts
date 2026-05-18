/**
 * Barrel re-export for the sidebar module.
 *
 * Issue #12 FIX — Sidebar consolidation:
 *   Previously two competing Sidebar implementations existed:
 *     1. src/components/Sidebar.tsx  (legacy flat file)
 *     2. src/components/sidebar/Sidebar.tsx  (modular, current)
 *
 *   The legacy src/components/Sidebar.tsx has been removed (dead code).
 *   All imports should now use '@/components/sidebar' or the named export
 *   from this barrel.
 *
 *   AppShell and any other consumer must import like:
 *     import Sidebar from '@/components/sidebar';
 *   or:
 *     import { Sidebar } from '@/components/sidebar';
 */
export { default } from './Sidebar';
export { default as Sidebar } from './Sidebar';
export { default as SidebarGroup } from './SidebarGroup';
export { default as SidebarItem } from './SidebarItem';
