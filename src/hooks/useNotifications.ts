import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { NotificationService } from '../services/NotificationService';
import { supabase } from '../lib/supabase';

export function useNotifications() {
    const { user, refreshUser } = useAuth();
    const { schedules, refreshData, getRequestsForVessel } = useData();
    const activeSchedule = user?.vesselId ? schedules.find(s => s.vesselId === user.vesselId) : undefined;

    // 1. Check Permissions on mount
    useEffect(() => {
        NotificationService.checkPermissions().then(granted => {
            if (!granted) {
                // Optionally request? Better to do this on user action or specific setting page
                // NotificationService.requestPermissions();
            }
        });
    }, []);

    // 2. Watch Reminders
    useEffect(() => {
        if (!user || !user.vesselId) return;

        // If we have an active schedule, schedule reminders
        if (activeSchedule) {
            console.log("⏰ [useNotifications] Scheduling Watch Reminders...", { r1: user.reminder1, r2: user.reminder2 });
            NotificationService.scheduleWatchReminders(
                activeSchedule,
                user.id,
                user.reminder1 || 0,
                user.reminder2 || 0
            );
        }
    }, [user?.id, user?.vesselId, user?.reminder1, user?.reminder2, activeSchedule]);

    // 3. Realtime Listeners
    useEffect(() => {
        if (!user) return;

        console.log("🔔 [useNotifications] Setting up Realtime Listeners for:", user.role);

        // CHANNEL 0: PROFILE CHANGES (Self) - Ensure AuthContext stays in sync
        const profileChannel = supabase.channel('profile-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    console.log("👤 Profile Updated!", payload);
                    refreshUser(); // Sync AuthContext
                    refreshData(); // Sync DataContext
                }
            )
            .subscribe();

        // CHANNEL 1: CAPTAIN ALERTS (Join Requests)
        let captainChannel: any = null;
        if (user.role === 'captain' && user.vesselId) {
            captainChannel = supabase.channel('captain-alerts')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'join_requests',
                        filter: `vessel_id=eq.${user.vesselId}`
                    },
                    (payload) => {
                        console.log("🔔 New Join Request!", payload);
                        NotificationService.sendLocalAlert(
                            'New Crew Request',
                            `A new crew member has requested to join your vessel.`
                        );
                        // Refresh data to show badge
                        getRequestsForVessel(user.vesselId!); // trigger fetch
                        refreshData();
                    }
                )
                .subscribe();
        }

        // CHANNEL 2: CREW ALERTS (Approval)
        let crewChannel: any = null;
        if (user.role === 'crew') {
            crewChannel = supabase.channel('crew-alerts')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'join_requests',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload: any) => {
                        console.log("🔔 Request Update!", payload);
                        if (payload.new.status === 'approved' && payload.old.status !== 'approved') {
                            NotificationService.sendLocalAlert(
                                'Request Approved!',
                                `You have been approved to join the vessel.`
                            );
                            refreshUser(); // Force refresh to get vesselId
                            refreshData();
                        }
                    }
                )
                .subscribe();
        }

        // CHANNEL 3: SCHEDULE ALERTS (All Users in a Vessel)
        let scheduleChannel: any = null;
        if (user.vesselId) {
            scheduleChannel = supabase.channel('schedule-updates')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'schedules',
                        filter: `vessel_id=eq.${user.vesselId}`
                    },
                    (payload) => {
                        console.log("🔔 Schedule Event!", payload);
                        if (payload.eventType === 'INSERT') {
                            NotificationService.sendLocalAlert(
                                'New Schedule',
                                'A new watch schedule has been published.'
                            );
                            refreshData();
                        } else if (payload.eventType === 'UPDATE') {
                            NotificationService.sendLocalAlert(
                                'Schedule Updated',
                                'The watch schedule has been updated.'
                            );
                            refreshData();
                        } else if (payload.eventType === 'DELETE') {
                            console.log("🔔 Schedule Deleted!");
                            refreshData();
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            supabase.removeChannel(profileChannel);
            if (captainChannel) supabase.removeChannel(captainChannel);
            if (crewChannel) supabase.removeChannel(crewChannel);
            if (scheduleChannel) supabase.removeChannel(scheduleChannel);
        };
    }, [user?.id, user?.vesselId, user?.role]);
}
