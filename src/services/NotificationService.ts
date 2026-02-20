import { LocalNotifications } from '@capacitor/local-notifications';
import { WatchSchedule } from '../contexts/DataContext';

export const NotificationService = {
    async requestPermissions() {
        try {
            const result = await LocalNotifications.requestPermissions();
            return result.display === 'granted';
        } catch (e) {
            console.error("Error requesting notification permissions", e);
            return false;
        }
    },

    async checkPermissions() {
        try {
            const result = await LocalNotifications.checkPermissions();
            return result.display === 'granted';
        } catch (e) {
            return false;
        }
    },

    // Generates a deterministic integer ID from a string
    generateId(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash); // Ensure positive matches typical int ID constraints
    },

    // Helper to parse "HH:MM" into a Date object for Today
    parseTime(timeStr: string): Date {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    },

    async scheduleWatchReminders(schedule: WatchSchedule, userId: string, reminder1: number, reminder2: number) {
        // 1. Clear pending to avoid dupes/ghosts
        try {
            // Clears everything to be safe during dev/testing. 
            // In prod, might want to be more selective, but for a watch app, syncing strict state is good.
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel({ notifications: pending.notifications });
            }
        } catch (e) {
            console.warn("Could not clear pending notifications", e);
        }

        if (reminder1 === 0 && reminder2 === 0) return;

        const notifications: any[] = [];
        const now = new Date();

        // 2. Loop through slots
        schedule.slots.forEach((slot) => {
            // slot.start is "HH:MM". We need to convert this to a future Date.
            // Assumption: Schedule implies "Daily" or "Next occurrence".

            let sStart = this.parseTime(slot.start);

            // If the slot time (e.g. 02:00) is earlier than now (e.g. 10:00), 
            // and we are looking at a 24h schedule, it likely means valid for Tomorrow?
            // However, typical watch schedules are 4h blocks. 
            // Let's just consider: "Is this slot in the future relative to Now?"
            // OR "If it's in the past, add 24h to target next recurrence?"
            // If we assume the schedule is active/recurring daily:
            if (sStart < now) {
                // It's passed for today. Check tomorrow? 
                // Let's only schedule "Next 24 Hours".
                sStart.setDate(sStart.getDate() + 1);
            }

            // Check if user is in this watch
            const isMyWatch = slot.crew.some(c => c.userId === userId);
            if (!isMyWatch) return;

            // Helper to add notification
            const addNotification = (minutesBefore: number, typeSuffix: string) => {
                const notifyAt = new Date(sStart.getTime() - minutesBefore * 60000);

                // Only schedule if the REMINDER time is still in the future.
                // If the watch is tomorrow at 02:00, and reminder is 15min, notifyAt is 01:45. Valid.
                // If watch is Today 10:00, now is 09:50, reminder 15min -> 09:45 (Past). Skip.
                if (notifyAt > now) {
                    const idString = `${schedule.id}-${slot.id}-${typeSuffix}`;
                    notifications.push({
                        title: 'Watch Reminder',
                        body: `Your watch starts in ${minutesBefore} minutes.`,
                        id: this.generateId(idString),
                        schedule: { at: notifyAt },
                        sound: 'default', // Plays default OS notification sound
                        actionTypeId: '',
                        extra: { slotId: slot.id, type: typeSuffix }
                    });
                }
            };

            if (reminder1 > 0) addNotification(reminder1, 'rem1');
            if (reminder2 > 0) addNotification(reminder2, 'rem2');
        });

        // 3. Schedule them
        if (notifications.length > 0) {
            try {
                await LocalNotifications.schedule({ notifications });
                console.log(`⏰ Scheduled ${notifications.length} watch reminders.`);
            } catch (e) {
                console.error("Failed to schedule notifications", e);
            }
        }
    },

    async sendLocalAlert(title: string, body: string) {
        try {
            await LocalNotifications.schedule({
                notifications: [{
                    title,
                    body,
                    id: Math.floor(Math.random() * 100000) + 900000,
                    schedule: { at: new Date(Date.now() + 1000) },
                    sound: 'default'
                }]
            });
        } catch (e) {
            console.error("Failed to send local alert", e);
        }
    }
};
