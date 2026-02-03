
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ui/Toast';
import { useData } from '../contexts/DataContext';

export function NotificationListener() {
    const { user } = useAuth();
    const { refreshData } = useData();
    const { showToast } = useToast();

    useEffect(() => {
        if (!user || !user.vesselId) return;

        // Subscribe to vessel-specific broadcast channel
        const channel = supabase.channel(`vessel_broadcast:${user.vesselId}`)
            .on(
                'broadcast',
                { event: 'schedule-published' },
                async (payload) => {
                    console.log("📣 Received Broadcast:", payload);
                    showToast("📅 New Watch Schedule Published!", 'info');

                    // Refresh data to show the new schedule immediately
                    await refreshData();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`📡 Listening for notifications on vessel_broadcast:${user.vesselId}`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, showToast, refreshData]);

    return null; // Headless component
}
