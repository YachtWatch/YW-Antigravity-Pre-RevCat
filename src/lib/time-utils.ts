import { Slot } from './scheduler';

/**
 * Returns the current local hour (0-23).
 * Testable wrapper around new Date().getHours()
 */
export function getCurrentHour(): number {
    return new Date().getHours();
}

/**
 * Helper to parse "HH:00" string to hour integer
 */
export function parseHour(timeStr: string): number {
    return parseInt(timeStr.split(':')[0]);
}

/**
 * Checks if a given hour falls within a start/end range,
 * handling overnight wrapping (e.g. 20:00 - 08:00)
 */
export function isHourInInterval(hour: number, start: number, end: number): boolean {
    if (start === end) return false; // 0 duration?

    if (start < end) {
        // Normal day interval (e.g. 08:00 - 12:00)
        return hour >= start && hour < end;
    } else {
        // Overnight interval (e.g. 20:00 - 08:00)
        // It's in interval if it's AFTER start (>= 20) OR BEFORE end (< 8)
        return hour >= start || hour < end;
    }
}

/**
 * Finds the slot that is currently active based on system time.
 */
export function getCurrentSlot(slots: Slot[]): Slot | undefined {
    const currentHour = getCurrentHour();
    return slots.find(slot => {
        const start = parseHour(slot.start);
        const end = parseHour(slot.end);
        return isHourInInterval(currentHour, start, end);
    });
}

/**
 * Formats milliseconds into Xh Ym Zs
 */
export function formatDuration(ms: number): string {
    if (ms <= 0) return '0h 0m 0s';
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((ms % (1000 * 60)) / 1000);
    return `${h}h ${m}m ${s}s`;
}

/**
 * Returns time remaining until the end of the target slot.
 * Returns empty string if now is not within the slot (safety check).
 */
export function getTimeRemaining(slot: Slot): string {
    const now = new Date();
    const currentHour = now.getHours();
    const start = parseHour(slot.start);
    const end = parseHour(slot.end);

    // Verify we are actually in this slot, otherwise calculation might be weird
    if (!isHourInInterval(currentHour, start, end)) {
        return '';
    }

    const target = new Date();
    target.setMinutes(0, 0, 0); // Reset min/sec/ms
    
    // Set target hour. 
    // If end < start (overnight) and we are currently in the 'start' portion (e.g. 22:00 for 20-08), 
    // then target (08:00) is tomorrow.
    // If we are in the 'end' portion (e.g. 04:00 for 20-08), target (08:00) is today.
    
    target.setHours(end);

    if (start > end && currentHour >= start) {
        // We are before midnight in an overnight watch, so end time is tomorrow
        target.setDate(target.getDate() + 1);
    } 
    // Else: normal case, or post-midnight case where target is already today's 08:00

    const diff = target.getTime() - now.getTime();
    return formatDuration(diff);
}
