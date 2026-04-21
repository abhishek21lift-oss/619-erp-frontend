'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const NAV = [
  { href:'/dashboard',  label:'Dashboard',  icon:'📊', all: true },
  { href:'/clients',    label:'Clients',     icon:'👥', all: true },
  { href:'/payments',   label:'Payments',    icon:'💳', all: true },
  { href:'/attendance', label:'Attendance',  icon:'📅', all: true },
  { href:'/reports',    label:'Reports',     icon:'📈', all: true },
];
const ADMIN_NAV = [
  { href:'/trainers', label:'Trainers', icon:'🏋️' },
  { href:'/settings', label:'Settings', icon:'⚙️' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const path   = usePathname();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">619 ERP</div>
        <div className="sidebar-tagline">Fitness Studio Management</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">Main Menu</div>
        {NAV.map(l => (
          <Link key={l.href} href={l.href}
            className={`nav-link${path.startsWith(l.href)?' active':''}`}>
            <span className="nav-icon">{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="divider" style={{margin:'1rem 0 .5rem'}}/>
            <div className="nav-section">Admin</div>
            {ADMIN_NAV.map(l => (
              <Link key={l.href} href={l.href}
                className={`nav-link${path.startsWith(l.href)?' active':''}`}>
                <span className="nav-icon">{l.icon}</span>
                <span>{l.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div style={{minWidth:0}}>
            <div className="user-name truncate">{user?.name}</div>
            <div className="user-role">{user?.role === 'admin' ? '👑 Admin' : '🏋️ Trainer'}</div>
          </div>
        </div>
        <button className="btn btn-ghost w-full btn-sm"
          style={{justifyContent:'center'}}
          onClick={() => { logout(); router.replace('/login'); }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
