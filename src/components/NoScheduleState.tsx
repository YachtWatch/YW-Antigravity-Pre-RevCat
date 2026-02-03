import { Calendar, Clock, Users, CalendarDays } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface NoScheduleStateProps {
    onCreateSchedule: () => void;
}

export function NoScheduleState({ onCreateSchedule }: NoScheduleStateProps) {
    return (
        <Card className="max-w-md mx-auto text-center border shadow-sm">
            <CardContent className="pt-10 pb-8 px-8 flex flex-col items-center gap-6">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <CalendarDays className="h-10 w-10 stroke-[1.5]" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">No Schedule Created</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                        Create a watch schedule to organize crew rotations and manage watch assignments for your vessel.
                    </p>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs text-left text-sm text-muted-foreground bg-accent/30 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 shrink-0 text-primary/70" />
                        <span>Set watch durations and rotations</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 shrink-0 text-primary/70" />
                        <span>Assign crew members to watches</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
                        <span>View daily schedule breakdowns</span>
                    </div>
                </div>

                <Button
                    onClick={onCreateSchedule}
                    className="w-full max-w-xs bg-emerald-500 hover:bg-emerald-600 text-white font-medium h-11"
                >
                    Create New Schedule
                </Button>
            </CardContent>
        </Card>
    );
}
