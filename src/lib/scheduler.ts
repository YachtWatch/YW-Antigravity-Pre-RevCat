
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
    userFirstName: string;
    userLastName: string;
    isWatchLeader?: boolean;
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

    // Separate crew into leaders and keepers
    const leaders = crew.filter(c => c.isWatchLeader);
    const keepers = crew.filter(c => !c.isWatchLeader);

    // If there ARE designated leaders, ensure mathematically we have enough to cover the watch slots.
    // If the Captain hasn't designated ANY leaders, ignore this check and use standard cycle logic.
    if (leaders.length > 0 && leaders.length < slotsCount && options.watchType !== 'dock') {
        throw new Error(`Invalid configuration: You have ${slotsCount} watch slots in an active schedule but only ${leaders.length} Watch Leaders. You must designate more Watch Leaders or reduce the number of slots.`);
    }

    let leaderIndex = 0;
    let keeperIndex = 0;
    let standardIndex = 0;

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
        const requiredCrew = Number(options.crewPerWatch);

        if (leaders.length > 0) {
            // Staggered Mode: Leaders + Keepers
            // 1. Assign exactly one watch leader
            assigned.push(leaders[leaderIndex % leaders.length]);
            leaderIndex++;

            // 2. Fill the rest of the required crew with keepers
            let keepersNeeded = requiredCrew - 1;
            for (let c = 0; c < keepersNeeded; c++) {
                if (keepers.length > 0) {
                    assigned.push(keepers[keeperIndex % keepers.length]);
                    keeperIndex++;
                } else {
                    // Fallback if there are zero non-leaders (all crew are leaders)
                    assigned.push(leaders[leaderIndex % leaders.length]);
                    leaderIndex++;
                }
            }
        } else {
            // Standard Mode: No designated leaders, cycle normally
            for (let c = 0; c < requiredCrew; c++) {
                assigned.push(crew[standardIndex % crew.length]);
                standardIndex++;
            }
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
