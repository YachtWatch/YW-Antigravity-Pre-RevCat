
import { describe, it, expect } from 'vitest';
import { generateSchedule, CrewMember } from './scheduler';

const mockCrew: CrewMember[] = [
    { userId: '1', userName: 'Alice' },
    { userId: '2', userName: 'Bob' },
    { userId: '3', userName: 'Charlie' },
    { userId: '4', userName: 'Dave' },
];

describe('Scheduler', () => {
    it('should generate 24h schedule for underway mode', () => {
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 2,
            watchType: 'underway'
        });

        expect(slots.length).toBe(6); // 24 / 4 = 6 slots
        expect(slots[0].condition).toBe('always');
        expect(slots[0].start).toBe('00:00');
    });

    it('should generate night-only schedule for anchor mode', () => {
        const slots = generateSchedule(mockCrew, {
            duration: 1, // 1 hour slots for precision
            crewPerWatch: 1,
            watchType: 'anchor',
            nightStart: 20,
            nightEnd: 8
        });

        // Night is 20, 21, 22, 23, 00, 01, 02, 03, 04, 05, 06, 07 (12 hours)
        expect(slots.length).toBe(12);

        // precise check
        const starts = slots.map(s => parseInt(s.start.split(':')[0]));
        expect(starts).toContain(20);
        expect(starts).toContain(7);
        expect(starts).not.toContain(12); // Noon matches nothing
    });

    it('should generate conditional schedule for dock mode', () => {
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 1,
            watchType: 'dock',
            nightStart: 20, // 8 PM
            nightEnd: 8     // 8 AM
        });

        // 4 hour slots: 0-4, 4-8, 8-12, 12-16, 16-20, 20-24
        // Night: 20-24, 00-04, 04-08 (Assuming slot inclusion logic)

        // 00:00 (Start 0, End 4) -> Night (0 < 8) -> Always
        // 04:00 (Start 4, End 8) -> Night (4 < 8) -> Always
        // 08:00 (Start 8, End 12) -> Day -> Weekend Only
        // 12:00 -> Day -> Weekend Only
        // 16:00 -> Day -> Weekend Only
        // 20:00 -> Night (20 >= 20) -> Always

        expect(slots.length).toBe(6); // Still generates 24h cycle

        const alwaysSlots = slots.filter(s => s.condition === 'always');
        const weekendSlots = slots.filter(s => s.condition === 'weekend-only');

        expect(alwaysSlots.length).toBe(3); // 20-00, 00-04, 04-08
        expect(weekendSlots.length).toBe(3); // 08-12, 12-16, 16-20
    });

    it('should rotate crew correctly', () => {
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 2,
            watchType: 'underway'
        });

        // Slot 0: Alice, Bob
        expect(slots[0].crew[0].userName).toBe('Alice');
        expect(slots[0].crew[1].userName).toBe('Bob');
        // Slot 1: Charlie, Dave
        expect(slots[1].crew[0].userName).toBe('Charlie');
        expect(slots[1].crew[1].userName).toBe('Dave');
        // Slot 2: Alice, Bob (Wrap around)
        expect(slots[2].crew[0].userName).toBe('Alice');
    });
});
