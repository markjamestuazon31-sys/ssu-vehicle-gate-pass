import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export function ProtectedRoute({ allowedRole }: { allowedRole: Role }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
        <p>Loading secure portal…</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to={allowedRole === 'admin' ? '/admin/login' : '/login'} state={{ from: location.pathname }} replace />;
  }

  if (profile.role !== allowedRole) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <Outlet />;
}
