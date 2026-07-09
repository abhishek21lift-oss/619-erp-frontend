// Navigation context types — state and action interfaces for NavigationContext.

export type SidebarState = 'expanded' | 'collapsed' | 'hidden';
export type MobileDrawer = 'closed' | 'open';

export interface NavigationState {
  sidebar:      SidebarState;
  mobileDrawer: MobileDrawer;
  /** Keys of nav groups that are open (expanded) in the sidebar. */
  openGroups:   string[];
  /** Remembers which group IDs were manually toggled by the user. */
  pinnedGroups: string[];
}

export interface NavigationActions {
  setSidebar:        (state: SidebarState) => void;
  toggleSidebar:     () => void;
  setMobileDrawer:   (state: MobileDrawer) => void;
  toggleMobileDrawer: () => void;
  openGroup:         (groupId: string) => void;
  closeGroup:        (groupId: string) => void;
  toggleGroup:       (groupId: string) => void;
  isGroupOpen:       (groupId: string) => boolean;
}

export interface NavigationContextValue extends NavigationState, NavigationActions {}
