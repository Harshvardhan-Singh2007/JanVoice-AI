import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import type { UserRole } from '../../types/auth';

export function ProtectedRoute({ role }: { role?: UserRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/dashboard/${user.role}`} replace />;
  return <Outlet />;
}
