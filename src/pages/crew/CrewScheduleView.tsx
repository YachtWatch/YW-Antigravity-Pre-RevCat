import { Card } from '../../components/ui/card';
import { Calendar } from 'lucide-react';

interface CrewScheduleViewProps {
    schedule: any;
    user: any;
}

export function CrewScheduleView({ schedule, user }: CrewScheduleViewProps) {
    if (!schedule) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 opacity-20 mb-4" />
                <p>No schedule published yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Current Schedule
                    <span className="text-xs font-normal px-2 py-1 bg-secondary rounded-full ml-2 uppercase">
                        {schedule.watchType || 'General'}
                    </span>
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedule.slots.map((slot: any) => {
                    const isMyWatch = slot.crew.some((c: any) => c.userId === user?.id);
                    return (
                        <Card key={slot.id} className={`overflow-hidden border-l-4 ${isMyWatch ? 'border-l-primary ring-1 ring-primary/20' : 'border-l-muted'}`}>
                            <div className={`p-2 text-center text-sm font-bold border-b flex justify-between px-4 ${isMyWatch ? 'bg-primary/10' : 'bg-muted/30'}`}>
                                <span>{slot.start} - {slot.end}</span>
                                <div className="flex gap-2 items-center">
                                    {isMyWatch && <span className="text-[10px] font-bold text-primary uppercase">My Watch</span>}
                                    {slot.condition === 'weekend-only' && (
                                        <span className="text-[10px] uppercase bg-amber-500/20 text-amber-700 px-1.5 py-0.5 rounded font-extrabold border border-amber-500/30">Weekend Only</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 space-y-2">
                                {slot.crew.map((member: any) => (
                                    <div key={member.id || member.userId} className="flex items-center gap-2 text-sm">
                                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px]">
                                            {member.userName?.[0]}
                                        </div>
                                        <span className={member.userId === user?.id ? 'font-bold' : ''}>
                                            {member.userName} {member.userId === user?.id && '(You)'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
