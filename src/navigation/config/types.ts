// Navigation config types — source of truth for the nav system.
// Components, hooks, and context all consume these types.

export type { Role } from '@/lib/roles';

/** A single navigation link. */
export interface NavItem {
  href:         string;
  label:        string;
  /** Lucide icon name string (resolved via iconMap in components). */
  icon:         string;
  roles?:       string[];
  hidden?:      boolean;
  matchPrefix?: string;
  badge?:       string;
  isNew?:       boolean;
  comingSoon?:  boolean;
  children?:    NavItem[];
  /** @deprecated use `roles` array instead */
  role?:        string;
}

/** A grouped set of NavItems with optional role visibility. */
export interface NavGroup {
  id:     string;
  label:  string;
  icon:   string;
  roles?: string[];
  items:  NavItem[];
}

/** A named section composing multiple groups — used for sidebar region labels. */
export interface NavSection {
  id:     string;
  label:  string;
  groups: NavGroup[];
}

/** A quick-action entry used in command palette and FAB. */
export interface QuickAction {
  id:     string;
  label:  string;
  icon:   string;
  href:   string;
  roles?: string[];
}

/** A bottom nav tab (mobile). */
export interface BottomNavTab {
  href:        string;
  label:       string;
  icon:        string;
  matchPrefix?: string;
}

/** Top-level navigation configuration object. */
export interface NavigationConfig {
  sections:     NavSection[];
  quickActions: QuickAction[];
  bottomTabs:   BottomNavTab[];
}
