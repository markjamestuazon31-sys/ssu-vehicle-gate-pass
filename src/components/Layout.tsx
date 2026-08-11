import { CarFront, LogOut, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PortalLayout({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="portal-shell">
      <header className="portal-header no-print">
        <Link to={admin ? '/admin' : '/dashboard'} className="brand-lockup">
          <img src="/ssu-logo.png" alt="Samar State University seal" />
          <div>
            <strong>Samar State University</strong>
            <span>Vehicle Registration & Gate Pass</span>
          </div>
        </Link>
        <nav className="portal-nav">
          {admin ? (
            <>
              <NavLink to="/admin" end><ShieldCheck size={17} /> Admin Dashboard</NavLink>
              <NavLink to="/admin/users"><UsersRound size={17} /> Manage Users</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard"><UserRound size={17} /> My Portal</NavLink>
              <NavLink to="/apply"><CarFront size={17} /> Register Vehicle</NavLink>
            </>
          )}
          <button className="ghost-btn compact" onClick={handleLogout}><LogOut size={17} /> Sign out</button>
        </nav>
      </header>

      <main className="portal-main">
        <div className="welcome-strip no-print">
          <span>{admin ? 'Administrator access' : 'Applicant access'}</span>
          <strong>{profile?.fullName}</strong>
        </div>
        {children}
      </main>
    </div>
  );
}
