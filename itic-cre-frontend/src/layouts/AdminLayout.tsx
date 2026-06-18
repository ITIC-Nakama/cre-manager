import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';

export default function AdminLayout() {
    const user = useUserStore((state) => state.user);

    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== Role.ADMIN) return <Navigate to="/supervisor/dashboard" replace />;

    return <Outlet />;
}
