import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';

export default function DashboardIndex() {
    const { user, loading } = useAuth();

    useEffect(() => {
        // Request notification permissions on dashboard load
        const requestNotifs = async () => {
            const granted = await NotificationService.checkPermissions();
            if (!granted) {
                await NotificationService.requestPermissions();
            }
        };
        requestNotifs();
    }, []);

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
