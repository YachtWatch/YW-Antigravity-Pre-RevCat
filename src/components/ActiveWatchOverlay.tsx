import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentSlot, getWatchStatus } from '../lib/watchLogic';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { cn } from '../lib/utils';

export function ActiveWatchOverlay() {
    const { user } = useAuth();
    const { getSchedule, getVessel, checkInToWatch } = useData();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000 * 30); // update every 30s
        return () => clearInterval(interval);
    }, []);

    if (!user || user.role !== 'crew' || !user.vesselId) return null;

    const schedule = getSchedule(user.vesselId);
    const vessel = getVessel(user.vesselId);

    if (!schedule || !vessel) return null;

    const currentSlotData = getCurrentSlot(schedule);

    if (!currentSlotData) return null; // No active watch right now

    const { slot } = currentSlotData;

    // Check if I am in this slot
    const myCrewEntry = slot.crew.find(c => c.userId === user.id);

    if (!myCrewEntry) return null; // I am not on watch

    // I am on watch!
    const checkInInterval = vessel.checkInInterval || 15;
    const lastCheckIn = myCrewEntry.checkedInAt;

    const status = getWatchStatus(lastCheckIn, checkInInterval);

    const handleAcknowledge = () => {
        if (slot && user.vesselId) {
            checkInToWatch(user.vesselId, slot.id, user.id);
        }
    };

    // Style based on status
    const getStatusStyles = () => {
        switch (status) {
            case 'red':
                return "bg-red-500/10 border-red-500 text-red-700";
            case 'amber':
                return "bg-amber-500/10 border-amber-500 text-amber-700";
            default:
                return "bg-green-500/10 border-green-500 text-green-700";
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'red': return <AlertOctagon className="h-6 w-6 text-red-600 animate-pulse" />;
            case 'amber': return <AlertTriangle className="h-6 w-6 text-amber-600 animate-bounce" />;
            default: return <CheckCircle className="h-6 w-6 text-green-600" />;
        }
    };

    return (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-[110] w-80 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-500">
            <Card className={cn("border-2", getStatusStyles())}>
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            {getStatusIcon()}
                            Active Watch
                        </CardTitle>
                        <div className="text-xs font-mono font-bold opacity-70">
                            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pb-2 text-sm">
                    <p className="font-medium">
                        {status === 'green' ? "You are currently on watch." :
                            status === 'amber' ? "Check-in required! Please acknowledge." :
                                "MISSED CHECK-IN! Captain notified."}
                    </p>
                    <p className="text-xs opacity-75 mt-1">
                        Please check in every {checkInInterval} mins.
                    </p>
                    <div className="mt-2 text-xs">
                        Last check-in: {lastCheckIn || 'Never'}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className={cn("w-full", status !== 'green' ? "animate-pulse" : "")}
                        variant={status === 'red' ? "destructive" : "default"}
                        onClick={handleAcknowledge}
                    >
                        {status === 'green' ? "Acknowledge Watch" : "I'm Here!"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
