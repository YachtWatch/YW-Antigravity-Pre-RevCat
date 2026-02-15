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
 * @deprecated Use Date objects instead
 */
export function parseHour(timeStr: string): number {
    return parseInt(timeStr.split(':')[0]);
}

/**
 * Checks if a given hour falls within a start/end range,
 * handling overnight wrapping (e.g. 20:00 - 08:00)
 * @deprecated Use Date comparisons
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
 * Supports both ISO strings and legacy "HH:mm" (fallback)
 */
export function getCurrentSlot(slots: Slot[]): Slot | undefined {
    const now = new Date();
    const currentHour = now.getHours();

    return slots.find(slot => {
        // CASE 1: ISO Date Strings (New System)
        if (slot.start.includes('T')) {
            const start = new Date(slot.start);
            const end = new Date(slot.end);
            return now >= start && now < end;
        }

        // CASE 2: Legacy "HH:mm" strings
        const startH = parseHour(slot.start);
        const endH = parseHour(slot.end);
        return isHourInInterval(currentHour, startH, endH);
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

    // CASE 1: ISO Date Strings
    if (slot.end.includes('T')) {
        const end = new Date(slot.end);
        if (now >= end) return '0h 0m 0s';
        if (now < new Date(slot.start)) return ''; // Not started yet

        const diff = end.getTime() - now.getTime();
        return formatDuration(diff);
    }

    // CASE 2: Legacy Logic
    const currentHour = now.getHours();
    const start = parseHour(slot.start);
    const end = parseHour(slot.end);

    // Verify we are actually in this slot
    if (!isHourInInterval(currentHour, start, end)) {
        return '';
    }

    const target = new Date();
    target.setMinutes(0, 0, 0); // Reset min/sec/ms
    target.setHours(end);

    if (start > end && currentHour >= start) {
        // We are before midnight in an overnight watch, so end time is tomorrow
        target.setDate(target.getDate() + 1);
    }

    const diff = target.getTime() - now.getTime();
    return formatDuration(diff);
}
