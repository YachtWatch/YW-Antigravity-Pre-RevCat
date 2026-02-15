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

    async scheduleWatchReminders(schedule: WatchSchedule, userId: string, reminder1: number, reminder2: number) {
        // 1. Cancel existing notifications for this schedule/user context to avoid dupes
        // (In a real app, we might track specific IDs, but clearing all for simplicity is safer for v1)
        try {
            await LocalNotifications.cancel({ notifications: [] }); // Cancel logic needs IDs usually, let's implement a smarter way or just clear pending.
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel({ notifications: pending.notifications });
            }
        } catch (e) {
            console.warn("Could not clear pending notifications", e);
        }

        if (reminder1 === 0 && reminder2 === 0) return; // No reminders set

        const notifications: any[] = [];
        const now = new Date();

        // 2. Loop through slots
        // We only care about future slots for THIS user
        schedule.slots.forEach((slot, index) => {
            const sStart = new Date(slot.start);
            if (sStart < now) return; // Skip past slots

            // Check if user is in this watch
            const isMyWatch = slot.crew.some(c => c.userId === userId);
            if (!isMyWatch) return;

            // Schedule Reminder 1
            if (reminder1 > 0) {
                const notifyAt = new Date(sStart.getTime() - reminder1 * 60000);
                if (notifyAt > now) {
                    notifications.push({
                        title: 'Watch Reminder',
                        body: `Your watch starts in ${reminder1} minutes.`,
                        id: parseInt(`${index}1`), // Simple unique ID generation strategy: slotIndex + 1
                        schedule: { at: notifyAt },
                        sound: 'default',
                        actionTypeId: '',
                        extra: { slotId: index, type: 'reminder1' }
                    });
                }
            }

            // Schedule Reminder 2
            if (reminder2 > 0) {
                const notifyAt = new Date(sStart.getTime() - reminder2 * 60000);
                if (notifyAt > now) {
                    notifications.push({
                        title: 'Watch Reminder',
                        body: `Your watch starts in ${reminder2} minutes.`,
                        id: parseInt(`${index}2`), // slotIndex + 2
                        schedule: { at: notifyAt },
                        sound: 'default',
                        actionTypeId: '',
                        extra: { slotId: index, type: 'reminder2' }
                    });
                }
            }
        });

        // 3. Schedule them
        if (notifications.length > 0) {
            try {
                await LocalNotifications.schedule({ notifications });
                console.log(`Scheduled ${notifications.length} watch reminders.`);
            } catch (e) {
                console.error("Failed to schedule notifications", e);
            }
        }
    },

    async sendLocalAlert(title: string, body: string) {
        // Immediate notification (for social alerts like "Request Approved")
        try {
            await LocalNotifications.schedule({
                notifications: [{
                    title,
                    body,
                    id: Math.floor(Math.random() * 100000),
                    schedule: { at: new Date(Date.now() + 1000) }, // 1 sec delay
                    sound: 'default'
                }]
            });
        } catch (e) {
            console.error("Failed to send local alert", e);
        }
    }
};
