'use client';

import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { NavigationContext } from './navigation-context';
import type { NavigationState, SidebarState, MobileDrawer } from './types';

const STORAGE_KEY = 'nav:state';

type Action =
  | { type: 'SET_SIDEBAR';         state: SidebarState  }
  | { type: 'TOGGLE_SIDEBAR'                            }
  | { type: 'SET_MOBILE_DRAWER';   state: MobileDrawer  }
  | { type: 'TOGGLE_MOBILE_DRAWER'                      }
  | { type: 'OPEN_GROUP';          groupId: string      }
  | { type: 'CLOSE_GROUP';         groupId: string      }
  | { type: 'TOGGLE_GROUP';        groupId: string      };

const defaultState: NavigationState = {
  sidebar:      'expanded',
  mobileDrawer: 'closed',
  openGroups:   [],
  pinnedGroups: [],
};

function reducer(state: NavigationState, action: Action): NavigationState {
  switch (action.type) {
    case 'SET_SIDEBAR':
      return { ...state, sidebar: action.state };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebar: state.sidebar === 'expanded' ? 'collapsed' : 'expanded' };

    case 'SET_MOBILE_DRAWER':
      return { ...state, mobileDrawer: action.state };

    case 'TOGGLE_MOBILE_DRAWER':
      return { ...state, mobileDrawer: state.mobileDrawer === 'open' ? 'closed' : 'open' };

    case 'OPEN_GROUP': {
      if (state.openGroups.includes(action.groupId)) return state;
      return { ...state, openGroups: [...state.openGroups, action.groupId] };
    }

    case 'CLOSE_GROUP':
      return { ...state, openGroups: state.openGroups.filter((id) => id !== action.groupId) };

    case 'TOGGLE_GROUP': {
      const isOpen = state.openGroups.includes(action.groupId);
      return {
        ...state,
        openGroups:   isOpen
          ? state.openGroups.filter((id) => id !== action.groupId)
          : [...state.openGroups, action.groupId],
        pinnedGroups: isOpen
          ? state.pinnedGroups.filter((id) => id !== action.groupId)
          : [...new Set([...state.pinnedGroups, action.groupId])],
      };
    }

    default:
      return state;
  }
}

function loadPersistedState(): Partial<NavigationState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<NavigationState>;
  } catch {
    return {};
  }
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState, (base) => ({
    ...base,
    ...loadPersistedState(),
    // Always start with mobile drawer closed
    mobileDrawer: 'closed' as MobileDrawer,
  }));

  // Persist sidebar + openGroups to sessionStorage
  useEffect(() => {
    try {
      const persisted: Partial<NavigationState> = {
        sidebar:      state.sidebar,
        openGroups:   state.openGroups,
        pinnedGroups: state.pinnedGroups,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // sessionStorage unavailable — silently ignore
    }
  }, [state.sidebar, state.openGroups, state.pinnedGroups]);

  const setSidebar        = useCallback((s: SidebarState)  => dispatch({ type: 'SET_SIDEBAR',       state: s }),  []);
  const toggleSidebar     = useCallback(()                  => dispatch({ type: 'TOGGLE_SIDEBAR'               }), []);
  const setMobileDrawer   = useCallback((s: MobileDrawer)  => dispatch({ type: 'SET_MOBILE_DRAWER', state: s }),  []);
  const toggleMobileDrawer = useCallback(()                 => dispatch({ type: 'TOGGLE_MOBILE_DRAWER'          }), []);
  const openGroup         = useCallback((id: string)        => dispatch({ type: 'OPEN_GROUP',   groupId: id }),    []);
  const closeGroup        = useCallback((id: string)        => dispatch({ type: 'CLOSE_GROUP',  groupId: id }),    []);
  const toggleGroup       = useCallback((id: string)        => dispatch({ type: 'TOGGLE_GROUP', groupId: id }),    []);
  const isGroupOpen       = useCallback((id: string)        => state.openGroups.includes(id),                      [state.openGroups]);

  const value = useMemo(() => ({
    ...state,
    setSidebar,
    toggleSidebar,
    setMobileDrawer,
    toggleMobileDrawer,
    openGroup,
    closeGroup,
    toggleGroup,
    isGroupOpen,
  }), [state, setSidebar, toggleSidebar, setMobileDrawer, toggleMobileDrawer, openGroup, closeGroup, toggleGroup, isGroupOpen]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}
