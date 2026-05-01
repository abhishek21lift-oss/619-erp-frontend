'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  NAV_GROUPS,
  SETTINGS_ITEM,
  allNavItems,
  type NavItem,
} from '@/lib/nav-config';
import {
  readFavorites,
  toggleFavorite,
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from '@/lib/favorites';
import BrandLogo from './BrandLogo';

const COLLAPSED_GROUPS_KEY = '619_sidebar_groups';

function readCollapsedGroups(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(COLLAPSED_GROUPS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCollapsedGroups(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(state));
  } catch {}
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [groupState, setGroupState] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isTrainer = user?.role === 'trainer';
  const isMember = user?.role === 'member';

  useEffect(() => {
    setCollapsed(readSidebarCollapsed());
    setFavorites(readFavorites(user?.id));
    setGroupState(readCollapsedGroups());
    setHydrated(true);
  }, [user?.id]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!hydrated || typeof document === 'undefined') return;
    document.documentElement.style.setProperty(
      '--sidebar-w',
      collapsed ? '70px' : '248px',
    );
    document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
  }, [collapsed, hydrated]);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href: string) => {
    const cleanHref = href.split('?')[0];
    const cleanPath = path.split('?')[0];
    if (cleanHref === '/dashboard') return cleanPath === '/dashboard';
    return cleanPath === cleanHref || cleanPath.startsWith(cleanHref + '/');
  };

  const visibleForRole = (item: NavItem) => {
    if (item.hidden) return false;
    if (!item.role) return true;
    return user?.role === item.role;
  };

  const favItems = useMemo(() => {
    const all = allNavItems();
    return favorites
      .map((href) => all.find((i) => i.href === href))
      .filter((i): i is NonNullable<typeof i> => !!i && visibleForRole(i));
  }, [favorites, user?.role]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    writeSidebarCollapsed(next);
  }

  function handleToggleFavorite(href: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(toggleFavorite(user?.id, href));
  }

  function toggleGroup(id: string) {
    const next = { ...groupState, [id]: !groupState[id] };
    setGroupState(next);
    writeCollapsedGroups(next);
  }

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation menu"
      >
        <span />
        <span />
        <span />
      </button>

      {drawerOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar v2${drawerOpen ? ' sidebar-open' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}
      >
        <button
          className="sidebar-close"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          ✕
        </button>

        <div className="sidebar-header">
          <BrandLogo size={collapsed ? 30 : 34} showText={!collapsed} textPosition="right" />
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {hydrated && favItems.length > 0 && !collapsed && (
          <>
            <div className="nav-section" style={{ paddingTop: '0.85rem' }}>★ Pinned</div>
            <div style={{ padding: '0 0.65rem' }}>
              {favItems.map((it) => (
                <NavRow
                  key={'fav-' + it.href}
                  item={it}
                  isActive={isActive(it.href)}
                  isFav
                  onToggleFav={handleToggleFavorite}
                  onClick={() => setDrawerOpen(false)}
                />
              ))}
            </div>
            <div style={{ padding: '0 0.65rem' }}><div className="divider" /></div>
          </>
        )}

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(visibleForRole);
            if (visibleItems.length === 0) return null;
            const groupCollapsed = !!groupState[group.id];

            return (
              <div
                key={group.id}
                className={`nav-group${groupCollapsed ? ' is-collapsed' : ''}`}
              >
                {!collapsed && (
                  <button
                    type="button"
                    className="nav-group-header"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!groupCollapsed}
                  >
                    <span className="nav-group-icon">{group.icon}</span>
                    <span className="nav-group-label">{group.label}</span>
                    <span className="nav-group-chevron">{groupCollapsed ? '▸' : '▾'}</span>
                  </button>
                )}
                {(collapsed || !groupCollapsed) && (
                  <div className="nav-group-items">
                    {visibleItems.map((it) => (
                      <NavRow
                        key={it.href}
                        item={it}
                        isActive={isActive(it.href)}
                        collapsed={collapsed}
                        isFav={favorites.includes(it.href)}
                        onToggleFav={handleToggleFavorite}
                        onClick={() => setDrawerOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="divider" />
          <NavRow
            item={SETTINGS_ITEM}
            isActive={isActive(SETTINGS_ITEM.href)}
            collapsed={collapsed}
            isFav={favorites.includes(SETTINGS_ITEM.href)}
            onToggleFav={handleToggleFavorite}
            onClick={() => setDrawerOpen(false)}
          />
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="user-name truncate">{user?.name}</div>
                <div className="user-role">
                  {isAdmin ? 'Owner' : isTrainer ? 'Coach' : isMember ? 'Athlete' : 'User'}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              className="btn btn-ghost w-full btn-sm"
              style={{ justifyContent: 'center' }}
              onClick={() => {
                logout();
                router.replace('/login');
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

function NavRow({
  item,
  isActive,
  collapsed,
  isFav,
  onToggleFav,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
  isFav?: boolean;
  onToggleFav?: (href: string, e: React.MouseEvent) => void;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      className={`nav-link${isActive ? ' active' : ''}`}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
    >
      <span className="nav-icon">{item.icon}</span>
      {!collapsed && <span className="nav-label">{item.label}</span>}
      {!collapsed && onToggleFav && (
        <button
          type="button"
          className={`nav-pin${isFav ? ' is-fav' : ''}`}
          aria-label={isFav ? 'Unpin from favorites' : 'Pin to favorites'}
          onClick={(e) => onToggleFav(item.href, e)}
          tabIndex={-1}
        >
          {isFav ? '★' : '☆'}
        </button>
      )}
    </Link>
  );
}
