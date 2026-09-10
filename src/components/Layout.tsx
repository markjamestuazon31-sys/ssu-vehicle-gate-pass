import { useEffect, useMemo, useState } from 'react';
import {
  CarFront,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_QUEUE_LINKS = [
  { value: 'submitted', label: 'Submitted', icon: Clock3 },
  { value: 'under_review', label: 'Under Review', icon: Search },
  { value: 'for_inspection', label: 'For Inspection', icon: ShieldAlert },
  { value: 'approved', label: 'Approved', icon: CheckCircle2 },
  { value: 'rejected', label: 'Rejected', icon: XCircle },
] as const;

const ADMIN_QUEUE_LABELS: Record<string, string> = {
  submitted: 'Submitted Applications',
  under_review: 'Under Review',
  for_inspection: 'For Inspection',
  approved: 'Approved Applications',
  rejected: 'Rejected Applications',
};

export function PortalLayout({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const queryStatus = useMemo(
    () => new URLSearchParams(location.search).get('status') || 'all',
    [location.search],
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const administratorName = profile?.fullName || 'SSU Administrator';
  const administratorEmail = profile?.email || '';
  const administratorInitials = administratorName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'SA';

  const adminPageLabel = location.pathname.startsWith('/admin/users')
    ? 'User Management'
    : location.pathname.startsWith('/admin/application/')
      ? 'Application Review'
      : ADMIN_QUEUE_LABELS[queryStatus] || 'Dashboard';

  if (admin) {
    return (
      <div className="portal-shell admin-portal-shell">
        <aside className={`admin-sidebar no-print ${sidebarOpen ? 'is-open' : ''}`} aria-label="Administrator navigation">
          <div className="admin-sidebar-brand">
            <Link to="/admin" className="admin-brand-link" aria-label="Go to admin dashboard">
              <div className="admin-brand-seal">
                <img src="/ssu-logo.png" alt="Samar State University seal" />
              </div>
              <div>
                <strong>Samar State University</strong>
                <span>Vehicle Gate Pass</span>
              </div>
            </Link>

            <button
              type="button"
              className="admin-sidebar-close"
              aria-label="Close administrator navigation"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="admin-sidebar-scroll">
            <nav className="admin-sidebar-nav">
              <div className="admin-sidebar-section">
                <span className="admin-sidebar-label">Management</span>

                <Link
                  to="/admin"
                  className={`admin-sidebar-link ${location.pathname === '/admin' && queryStatus === 'all' ? 'active' : ''}`}
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/admin/users"
                  className={`admin-sidebar-link ${location.pathname.startsWith('/admin/users') ? 'active' : ''}`}
                >
                  <UsersRound size={18} />
                  <span>Manage Users</span>
                </Link>
              </div>

              <div className="admin-sidebar-section admin-queue-section">
                <span className="admin-sidebar-label">Application Status</span>

                {ADMIN_QUEUE_LINKS.map(({ value, label, icon: Icon }) => (
                  <Link
                    key={value}
                    to={`/admin?status=${value}`}
                    className={`admin-sidebar-link admin-queue-link queue-${value} ${location.pathname === '/admin' && queryStatus === value ? 'active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-account">
              <div className="admin-account-avatar">{administratorInitials}</div>
              <div className="admin-account-copy">
                <strong>{administratorName}</strong>
                <span>{administratorEmail || 'Administrator account'}</span>
              </div>
            </div>

            <button type="button" className="admin-signout-button" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            className="admin-sidebar-overlay no-print"
            aria-label="Close administrator navigation"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="admin-workspace">
          <header className="admin-topbar no-print">
            <div className="admin-topbar-left">
              <button
                type="button"
                className="admin-sidebar-toggle"
                aria-label="Open administrator navigation"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>

              <div className="admin-breadcrumbs" aria-label="Current administrator page">
                <span>Administration</span>
                <span className="admin-breadcrumb-separator">/</span>
                <strong>{adminPageLabel}</strong>
              </div>
            </div>

            <div className="admin-topbar-account">
              <div className="admin-topbar-avatar">{administratorInitials}</div>
              <div>
                <span>Signed in as</span>
                <strong>{administratorName}</strong>
              </div>
            </div>
          </header>

          <main className="portal-main admin-portal-main">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-shell">
      <header className="portal-header no-print">
        <Link to="/dashboard" className="brand-lockup">
          <img src="/ssu-logo.png" alt="Samar State University seal" />
          <div>
            <strong>Samar State University</strong>
            <span>Vehicle Registration & Gate Pass</span>
          </div>
        </Link>
        <nav className="portal-nav">
          <NavLink to="/dashboard"><UserRound size={17} /> My Portal</NavLink>
          <NavLink to="/apply"><CarFront size={17} /> Register Vehicle</NavLink>
          <button className="ghost-btn compact" onClick={handleLogout}><LogOut size={17} /> Sign out</button>
        </nav>
      </header>

      <main className="portal-main">
        <div className="welcome-strip no-print">
          <span>Applicant access</span>
          <strong>{profile?.fullName}</strong>
        </div>
        {children}
      </main>
    </div>
  );
}
