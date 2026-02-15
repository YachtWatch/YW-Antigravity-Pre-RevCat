
export interface SchedulerOptions {
    duration: number; // Watch duration in hours (e.g. 4)
    crewPerWatch: number;
    watchType: 'Navigation' | 'anchor' | 'dock';
    // Night hours for Anchor/Dock modes
    nightStart?: number; // e.g. 20 (8 PM)
    nightEnd?: number;   // e.g. 8 (8 AM)
}

export interface CrewMember {
    userId: string;
    userName: string;
    checkedInAt?: string;
}

export interface Slot {
    id: number;
    start: string;
    end: string;
    crew: CrewMember[];
    condition?: 'always' | 'weekend-only';
}

export function generateSchedule(crew: CrewMember[], options: SchedulerOptions): Slot[] {
    if (crew.length === 0) return [];

    const duration = Number(options.duration);
    const slotsCount = 24 / duration;
    const slots: Slot[] = [];
    let crewIndex = 0;

    const nightStart = options.nightStart ?? 20;
    const nightEnd = options.nightEnd ?? 8;
    const watchType = options.watchType;

    const isNight = (h: number, start: number, end: number) => {
        if (start > end) {
            // e.g. 20 to 8
            return h >= start || h < end;
        } else {
            // e.g. 18 to 22
            return h >= start && h < end;
        }
    };

    for (let i = 0; i < slotsCount; i++) {
        const startTime = i * duration;
        const endTime = (i + 1) * duration;

        // Determine if we should generate this slot and what its condition is
        let shouldGenerate = true;
        let condition: 'always' | 'weekend-only' = 'always';

        const isNightSlot = isNight(startTime, nightStart, nightEnd);

        // Check for Anchor mode (strict filtering)
        if (watchType === 'anchor') {
            if (!isNightSlot) {
                shouldGenerate = false;
            }
        }

        // Check for Dock mode (conditional filtering)
        if (watchType === 'dock') {
            if (!isNightSlot) {
                // Day time in Dock mode -> Weekend only
                condition = 'weekend-only';
            }
            // Night time -> Always
        }

        if (!shouldGenerate) continue;

        const assigned = [];
        for (let c = 0; c < Number(options.crewPerWatch); c++) {
            assigned.push(crew[crewIndex % crew.length]);
            crewIndex++;
        }

        slots.push({
            id: i,
            start: `${startTime.toString().padStart(2, '0')}:00`,
            end: `${endTime.toString().padStart(2, '0')}:00`,
            crew: assigned,
            condition // Add this to the slot object
        });
    }

    return slots;
}
