import { Navigate } from 'react-router-dom';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';

interface RequireAuthMiddlewareProps {
  allowedRoles?: Role[];
  redirectTo?: string;
  children: React.ReactNode;
}

export default function RequireAuthMiddleware({
  allowedRoles,
  redirectTo = '/dashboard',
  children,
}: RequireAuthMiddlewareProps) {
  const user = useUserStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password-required" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}

export { RequireAuthMiddleware as RequireAuth };
