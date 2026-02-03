import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { isHourInInterval, getCurrentSlot, formatDuration } from './time-utils';
import { Slot } from './scheduler';

describe('time-utils', () => {
    describe('isHourInInterval', () => {
        it('handles simple day intervals', () => {
            // 08:00 to 12:00
            expect(isHourInInterval(8, 8, 12)).toBe(true);  // Inclusive start
            expect(isHourInInterval(11, 8, 12)).toBe(true);
            expect(isHourInInterval(12, 8, 12)).toBe(false); // Exclusive end
            expect(isHourInInterval(7, 8, 12)).toBe(false);
        });

        it('handles overnight intervals', () => {
            // 20:00 to 08:00
            expect(isHourInInterval(20, 20, 8)).toBe(true); // Start
            expect(isHourInInterval(23, 20, 8)).toBe(true); // Pre-midnight
            expect(isHourInInterval(0, 20, 8)).toBe(true);  // Midnight
            expect(isHourInInterval(7, 20, 8)).toBe(true);  // Pre-end
            expect(isHourInInterval(8, 20, 8)).toBe(false); // End
            expect(isHourInInterval(12, 20, 8)).toBe(false); // Noon
        });
    });

    describe('getCurrentSlot', () => {
        const mockSlots: Slot[] = [
            { id: 1, start: '08:00', end: '12:00', crew: [] },
            { id: 2, start: '12:00', end: '16:00', crew: [] },
            { id: 3, start: '20:00', end: '08:00', crew: [] }, // Overnight
        ];

        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('finds correct day slot', () => {
            const date = new Date(2023, 1, 1, 9, 0, 0); // 09:00
            vi.setSystemTime(date);
            const slot = getCurrentSlot(mockSlots);
            expect(slot?.id).toBe(1);
        });

        it('finds correct night slot pre-midnight', () => {
            const date = new Date(2023, 1, 1, 22, 0, 0); // 22:00
            vi.setSystemTime(date);
            const slot = getCurrentSlot(mockSlots);
            expect(slot?.id).toBe(3);
        });

        it('finds correct night slot post-midnight', () => {
            const date = new Date(2023, 1, 1, 2, 0, 0); // 02:00
            vi.setSystemTime(date);
            const slot = getCurrentSlot(mockSlots);
            expect(slot?.id).toBe(3);
        });

        it('returns undefined if no slot matches', () => {
            const date = new Date(2023, 1, 1, 18, 0, 0); // 18:00 (Gap)
            vi.setSystemTime(date);
            const slot = getCurrentSlot(mockSlots);
            expect(slot).toBeUndefined();
        });
    });

    describe('formatDuration', () => {
        it('formats simple durations', () => {
            expect(formatDuration(3661000)).toBe('1h 1m 1s');
            expect(formatDuration(60000)).toBe('0h 1m 0s');
        });
    });
});
