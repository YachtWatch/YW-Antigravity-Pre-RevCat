import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center space-x-2 text-sm font-medium z-50 sticky top-0 shadow-md">
            <WifiOff className="w-4 h-4" />
            <span>Internet connection lost. Showing offline data. Check with Master.</span>
        </div>
    );
}
