import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0b0f1f] text-white/60 text-[15px]">
        Checking session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.must_change_password && pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />;
  }

  return <Outlet />;
}
