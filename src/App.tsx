import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UserDashboard } from './pages/UserDashboard';
import { VehicleApplicationPage } from './pages/VehicleApplicationPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminApplicationPage } from './pages/AdminApplicationPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Keep old admin login bookmarks working, but use ONE login page. */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />

      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute allowedRole="user" />}>
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/apply" element={<VehicleApplicationPage />} />
        <Route path="/application/:id" element={<ApplicationDetailPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/application/:id" element={<AdminApplicationPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
