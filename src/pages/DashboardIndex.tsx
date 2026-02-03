import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardIndex() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    return <Navigate to={user.role === 'captain' ? '/dashboard/captain' : '/dashboard/crew'} replace />;
}
