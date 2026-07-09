// Navigation system barrel export.
// Import from '@/navigation' to access the full navigation API.

// ─── Config ─────────────────────────────────────────────────────────────────
export type {
  NavItem,
  NavGroup,
  NavSection,
  QuickAction,
  BottomNavTab,
  NavigationConfig,
} from './config/types';

export {
  ADAPTED_NAV_GROUPS,
  ADAPTED_SETTINGS_GROUP,
  allAdaptedNavItems,
} from './config/items';

export {
  NAV_SECTIONS,
  SETTINGS_SECTION,
} from './config/groups';

export {
  QUICK_ACTIONS,
  BOTTOM_NAV_TABS,
} from './config/quick-actions';

// ─── Context ─────────────────────────────────────────────────────────────────
export type {
  SidebarState,
  MobileDrawer,
  NavigationState,
  NavigationActions,
  NavigationContextValue,
} from './context/types';

export { NavigationContext, useNavigation } from './context/navigation-context';
export { NavigationProvider }              from './context/navigation-provider';

// ─── Hooks ───────────────────────────────────────────────────────────────────
export { useNavigation as useNav } from './hooks/use-navigation';
export { useActiveRoute }          from './hooks/use-active-route';
export {
  useBreakpoint,
  useIsDesktop,
  useIsTablet,
  useIsMobile,
  type Breakpoint,
}                                  from './hooks/use-breakpoint';
export { useNavScroll }            from './hooks/use-nav-scroll';
export {
  useNavPermissions,
  filterNavItem,
  filterNavGroup,
  filterNavSection,
}                                  from './hooks/use-nav-permissions';
export {
  useKeyboardShortcuts,
  type ShortcutConfig,
}                                  from './hooks/use-keyboard-shortcuts';

// ─── Primitives ──────────────────────────────────────────────────────────────
export { NavBadge, type BadgeVariant } from './primitives/nav-badge';
export { NavSeparator }                from './primitives/nav-separator';
export { NavTooltip }                  from './primitives/nav-tooltip';
export { NavItemPrimitive }            from './primitives/nav-item';
export { NavGroupPrimitive }           from './primitives/nav-group';

// ─── Motion ──────────────────────────────────────────────────────────────────
export { MOTION_TOKENS, type EaseCurve, type MotionTokens } from './motion/tokens';
export {
  fadeVariants,
  slideUpVariants,
  slideInRightVariants,
  sidebarVariants,
  collapseVariants,
  scaleInVariants,
  staggerContainerVariants,
}                                                            from './motion/variants';

// ─── Shell ───────────────────────────────────────────────────────────────────
export { NavShell }     from './shell/nav-shell';
export { DesktopShell } from './shell/desktop-shell';
export { TabletShell }  from './shell/tablet-shell';
export { MobileShell }  from './shell/mobile-shell';
