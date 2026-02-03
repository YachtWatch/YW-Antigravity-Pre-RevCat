import { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { WatchSchedule } from '../contexts/DataContext';
import { ChevronDown, ChevronUp, Calendar as CalendarIcon } from 'lucide-react';

interface ScheduleMatrixViewProps {
    schedule: WatchSchedule;
    className?: string;
    // currentUserRole: 'captain' | 'crew';
    currentUserId?: string;
    showOnlyUserId?: string;
    printMode?: boolean;
}

export function ScheduleMatrixView({ schedule, className, currentUserId, showOnlyUserId, printMode = false }: ScheduleMatrixViewProps) {
    // 1. Determine columns (Unique Crew, ordered if possible)
    // For now, we extract unique crew from all slots. In the future, schedule.crewOrder will drive this.
    const crewColumns = useMemo(() => {
        const uniqueCrew = new Map<string, string>(); // Id -> Name
        schedule.slots.forEach(slot => {
            slot.crew.forEach(c => uniqueCrew.set(c.userId, c.userName));
        });

        let allColumns = Array.from(uniqueCrew.entries()).map(([id, name]) => ({ id, name }));

        if (showOnlyUserId) {
            allColumns = allColumns.filter(c => c.id === showOnlyUserId);
        }

        return allColumns;
    }, [schedule, showOnlyUserId]);

    // 2. Determine Rows (Time Slots)
    // We assume slots are sorted by time.
    const rows = schedule.slots;

    // Helper: Is Valid Time
    const getHour = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const getDay = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
    };

    // Calculate current time position for Red Line
    // This is tricky in a static list, but we can highlight the "Active" slot?
    const now = new Date();
    const activeSlotId = rows.find(slot => {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        return now >= start && now < end;
    })?.id;


    // 3. Group slots by Day
    const dayGroups = useMemo(() => {
        const groups: { date: string; slots: typeof rows }[] = [];
        rows.forEach(slot => {
            const dateStr = getDay(slot.start);
            const existingGroup = groups.find(g => g.date === dateStr);
            if (existingGroup) {
                existingGroup.slots.push(slot);
            } else {
                groups.push({ date: dateStr, slots: [slot] });
            }
        });
        return groups;
    }, [rows]);

    // State for Open Accordion (Default: First Day)
    const [openDay, setOpenDay] = useState<string | null>(dayGroups[0]?.date || null);

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {/* Legend / Column Headers - kept sticky or at top? Users usually want to see columns. */}
            {/* If we put it inside each accordion, it repeats. If outside, it might be far away. */}
            {/* Let's put it at the top, but ensure alignment matches inner grids. */}
            <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                <div className="grid border-b bg-muted/30 schedule-header-row" style={{ gridTemplateColumns: `80px repeat(${crewColumns.length}, 1fr)` }}>
                    <div className="p-3 text-xs font-semibold text-muted-foreground border-r flex items-center justify-center">
                        Time
                    </div>
                    {crewColumns.map(c => (
                        <div key={c.id} className="p-3 text-sm font-semibold text-center border-r last:border-r-0 truncate">
                            {c.name}
                            {c.id === currentUserId && <span className="block text-[10px] text-primary">(You)</span>}
                        </div>
                    ))}
                </div>

                {/* Day Groups as Accordions */}
                <div className="divide-y">
                    {dayGroups.map((group) => {
                        const isOpen = printMode || openDay === group.date;

                        return (
                            <div key={group.date} className="bg-card schedule-day-group">
                                {/* Accordion Header */}
                                <button
                                    onClick={() => setOpenDay(isOpen ? null : group.date)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50",
                                        isOpen && "bg-muted/30 font-semibold"
                                    )}
                                >
                                    <span className="text-sm font-bold flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-primary" />
                                        {group.date}
                                    </span>
                                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </button>

                                {/* Accordion Body */}
                                {isOpen && (
                                    <div className={cn("animate-in fade-in slide-in-from-top-2 duration-200", printMode && "animate-none")}>
                                        {group.slots.map((slot, index) => {
                                            const prevSlot = group.slots[index - 1];
                                            const nextSlot = group.slots[index + 1];
                                            const isFirstRow = index === 0;

                                            return (
                                                <div
                                                    key={slot.id}
                                                    className={cn(
                                                        "grid min-h-[50px]",
                                                        slot.id === activeSlotId && "bg-primary/5" // Highlight active row background slightly
                                                    )}
                                                    style={{ gridTemplateColumns: `80px repeat(${crewColumns.length}, 1fr)` }}
                                                >
                                                    {/* Time Column */}
                                                    <div className={cn(
                                                        "p-2 text-xs text-muted-foreground border-r border-slate-300 dark:border-white/10 flex flex-col justify-center items-center text-center",
                                                        !isFirstRow && "border-t border-slate-300 dark:border-white/10"
                                                    )}>
                                                        <span>{getHour(slot.start)}</span>
                                                        <span className="text-[10px] opacity-50">{getHour(slot.end)}</span>
                                                    </div>

                                                    {/* Crew Columns */}
                                                    {crewColumns.map(column => {
                                                        const isOnWatch = slot.crew.some(c => c.userId === column.id);
                                                        const isConnectedTop = isOnWatch && prevSlot?.crew.some(c => c.userId === column.id);
                                                        const isConnectedBottom = isOnWatch && nextSlot?.crew.some(c => c.userId === column.id);

                                                        // Grid Lines: Always visible (except top row)
                                                        // Card sits on top (z-10) and is OPAQUE to cover the lines
                                                        return (
                                                            <div
                                                                key={`${slot.id}-${column.id}`}
                                                                className={cn(
                                                                    "border-r border-slate-300 dark:border-white/10 relative",
                                                                    !isFirstRow && "border-t border-slate-300 dark:border-white/10"
                                                                )}
                                                            >
                                                                {isOnWatch && (
                                                                    <div className={cn(
                                                                        "absolute z-10",
                                                                        // Solid Primary Blue to match app theme and hide grid lines
                                                                        "bg-blue-600 dark:bg-blue-600",
                                                                        "border border-primary/30",
                                                                        "rounded-md",

                                                                        // Simulated padding
                                                                        "left-1 right-1",

                                                                        // Vertical Merging Logic covering borders:
                                                                        // If connected top, pull up over the border (-1px). Else valid gap (top-1).
                                                                        isConnectedTop ? "-top-[1px] rounded-t-none border-t-0" : "top-1",

                                                                        // If connected bottom, extend to bottom edge (0). Else valid gap (bottom-1).
                                                                        isConnectedBottom ? "bottom-0 rounded-b-none border-b-0" : "bottom-1"
                                                                    )} />
                                                                )}

                                                                {/* Active Line - Highest Z-Index */}
                                                                {slot.id === activeSlotId && (
                                                                    <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-red-500 z-20 shadow-[0_0_4px_rgba(239,68,68,0.5)] pointer-events-none">
                                                                        <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-red-500" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
