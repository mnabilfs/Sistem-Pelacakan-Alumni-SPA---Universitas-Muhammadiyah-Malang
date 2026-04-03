import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings2,
  CalendarClock,
  Radar,
  FileBarChart,
  GraduationCap,
  Globe,
  Database,
  LogOut,
  UserCircle
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pddikti-search', label: 'Search PDDikti', icon: Globe },
  { to: '/data-alumni', label: 'Data Alumni Master', icon: Users },
  { to: '/parameter', label: 'Parameter Pelacakan', icon: Settings2 },
  { to: '/jalankan', label: 'Jalankan Pelacakan', icon: Radar },
  { to: '/laporan', label: 'Laporan Jejak Alumni', icon: FileBarChart },
  { to: '/jadwal', label: 'Jadwal Pelacakan', icon: CalendarClock },
  { to: '/audit', label: 'Log Audit (SQLite)', icon: Database },
];

const userNavItems = [
  { to: '/', label: 'Update Profil', icon: UserCircle },
];

const pageTitles = {
  '/': 'Dashboard',
  '/pddikti-search': 'Pencarian PDDikti',
  '/data-alumni': 'Data Alumni Master',
  '/parameter': 'Parameter Pelacakan',
  '/jalankan': 'Jalankan Pelacakan',
  '/laporan': 'Laporan Jejak Alumni',
  '/jadwal': 'Jadwal Pelacakan',
  '/audit': 'Log Audit Pelacakan',
};

export default function Layout({ children, role, onLogout }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || (location.pathname.startsWith('/analyze/') ? 'Analyze Profile' : (role === 'user' ? 'Update Profil Pengguna' : 'Dashboard'));
  
  const activeNavItems = role === 'admin' ? navItems : userNavItems;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <GraduationCap size={22} />
            </div>
            <div className="sidebar-logo-text">
              <h2>SPA</h2>
              <span>Pelacakan Alumni</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu Utama</div>
          {activeNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
              end={item.to === '/'}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: role === 'admin' ? 'var(--gradient-blue)' : 'var(--gradient-card)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '13px', fontWeight: '700',
              border: role === 'user' ? '1px solid var(--border-color)' : 'none'
            }}>
              {role === 'admin' ? 'A' : 'U'}
            </div>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: '600' }}>{role === 'admin' ? 'Admin Kampus' : 'Alumni'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{role === 'admin' ? 'admin@umm.ac.id' : 'Akses Terbatas'}</div>
            </div>
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onLogout}
            style={{ width: '100%', justifyContent: 'center', color: 'var(--accent-red)', borderColor: 'var(--border-color)' }}
          >
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="main-header">
          <h1>{title}</h1>
          <div className="main-header-right">
            <div className="header-badge">
              <span className="header-badge-dot"></span>
              Sistem Aktif
            </div>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
