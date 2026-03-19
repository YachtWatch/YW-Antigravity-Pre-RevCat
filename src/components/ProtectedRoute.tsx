import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SailboatLoader } from './SailboatLoader';

interface ProtectedRouteProps {
    allowedRoles?: ('captain' | 'crew')[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <SailboatLoader />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        // Redirect to login page with the return url
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // Role-based access control
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to their appropriate dashboard if they try to access a forbidden route
        const correctPath = user.role === 'captain' ? '/dashboard/captain' : '/dashboard/crew';
        return <Navigate to={correctPath} replace />;
    }

    return <Outlet />;
}
