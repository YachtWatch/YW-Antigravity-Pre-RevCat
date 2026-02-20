import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';
import { Anchor, Clock, Ship, Loader2, CheckCircle, Sailboat, Users } from 'lucide-react';
import { CrewScheduleView } from './CrewScheduleView';
import { CrewListView } from './CrewListView';
import { useWatchLogic } from '../../hooks/useWatchLogic';
// import { getCurrentSlot, getTimeRemaining } from '../../lib/time-utils'; // Not used with new local logic

const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

// const CREW_POSITIONS = { // Removed unused constant
//     bridge: ['Captain', 'Chief Officer', 'Second Officer', 'Third Officer', 'Mate'],
//     deck: ['Bosun', 'Lead Deckhand', 'Deckhand', 'Delivery Crew'],
//     interior: ['Chief Steward/ess', 'Second Steward/ess', 'Steward/ess', 'Laundry'],
//     galley: ['Head Chef', 'Sous Chef', 'Cook'],
//     engineering: ['Chief Engineer', 'Second Engineer', 'Third Engineer', 'ETO']
// };



export default function CrewDashboard() {
    const { user } = useAuth();
    const { requestJoin, getCrewVessel, getPendingRequest, getVessel, getSchedule, checkInToWatch, users, requests, refreshData } = useData();
    const [joinCode, setJoinCode] = useState('');
    // const [selectedPosition, setSelectedPosition] = useState(''); // Removed per user request
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'crew'>('dashboard');

    const approvedVessel = user ? getCrewVessel(user.id) : undefined;
    const pendingRequest = user ? getPendingRequest(user.id) : undefined;

    const activeVessel = approvedVessel;
    const schedule = activeVessel ? getSchedule(activeVessel.id) : undefined;

    // Robustly get all approved crew:
    // 1. Get IDs of everyone with an APPROVED request for this vessel
    // 2. Add the Captain's ID
    const approvedCrewIds = activeVessel
        ? requests
            .filter(r => r.vesselId === activeVessel.id && r.status === 'approved')
            .map(r => r.userId)
        : [];

    if (activeVessel && !approvedCrewIds.includes(activeVessel.captainId)) {
        approvedCrewIds.push(activeVessel.captainId);
    }

    const approvedCrew = users.filter(u => approvedCrewIds.includes(u.id));

    // -- OPTIMIZED SLOT LOGIC --
    const {
        currentGlobalSlot,
        isUserOnWatch: isCurrentlyOnWatch,
        myNextSlot,
        displaySlot,
        timeLeft,
        watchStatus,
        isCheckedIn,
        myCrewEntry,
        nextGlobalSlot
    } = useWatchLogic({ vessel: activeVessel, schedule, user });

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setError('');
        setSuccess('');

        // Removed position validation per user request

        // Validate request
        const result = await requestJoin(user.id, user.name, joinCode.trim().toUpperCase());
        if (result.success) {
            // No need to update position here as it comes from signup
            setSuccess(result.message);
            setJoinCode('');
        } else {
            setError(result.message);
        }
    };

    const handleCheckIn = () => {
        if (!activeVessel || !displaySlot || !user) return;
        checkInToWatch(activeVessel.id, displaySlot.id, user.id);
    };


    if (!activeVessel) {
        return (
            <div className="container max-w-md mx-auto py-20 px-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Join a Vessel</CardTitle>
                        <CardDescription>Enter the unique Join Code provided by your Captain.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pendingRequest ? (
                            <div className="text-center space-y-4 py-4">
                                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Request Sent</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Waiting for approval from <strong>{getVessel(pendingRequest.vesselId)?.name || 'Vessel'}</strong>
                                    </p>
                                </div>
                                <div className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
                                    The Captain needs to accept your request before you can see the dashboard.
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        setSuccess("Refreshing...");
                                        await refreshData();
                                        setSuccess("");
                                    }}
                                    className="gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                    Check Status
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleJoin} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Join Code</label>
                                    <Input
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value)}
                                        placeholder="e.g. A1B2C3"
                                        className="uppercase font-mono tracking-widest text-center text-lg"
                                    />
                                </div>
                                {error && <p className="text-sm text-destructive">{error}</p>}
                                {success && <p className="text-sm text-green-600 font-medium">{success}</p>}
                                <Button type="submit" className="w-full">Request to Join</Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Status colors
    const getCardColor = () => {
        if (!isCurrentlyOnWatch) return 'bg-primary/5 border-primary/20'; // Normal / Next Watch

        switch (watchStatus) {
            case 'green': return 'bg-green-100 border-green-300'; // Subtle green
            case 'orange': return 'bg-orange-100 border-orange-300 animate-pulse-slow'; // Orange
            case 'red': return 'bg-red-100 border-red-500 animate-pulse'; // Red
            default: return 'bg-primary/5 border-primary/20';
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b bg-card relative z-50 safe-area-pt">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Anchor className="h-6 w-6" />
                        <span>YachtWatch</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground hidden sm:block">
                            {users.find(u => u.id === user?.id)?.customRole || 'Crew'} on <span className="font-semibold text-foreground">{activeVessel.type === 'sail' ? 'S/Y' : 'M/Y'} {activeVessel.name}</span>
                        </div>
                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 pb-24">

                {activeTab === 'dashboard' && (
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-3xl font-bold capitalize">{user?.name ? `${user.name}'s Dashboard` : 'Dashboard'}</h1>
                        </div>

                        {/* 3-Card Vessel Stats (Moved to Top) */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Vessel Name */}
                            <Card className="flex flex-col items-center justify-center p-6 bg-card text-center hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                    <Ship className="h-6 w-6" />
                                </div>
                                <div className="text-sm text-muted-foreground font-medium mb-1">Vessel</div>
                                <div className="font-bold text-lg leading-tight px-2 break-words">{activeVessel.name}</div>
                            </Card>

                            {/* Vessel Length */}
                            <Card className="flex flex-col items-center justify-center p-6 bg-card text-center hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                    <Sailboat className="h-6 w-6" />
                                </div>
                                <div className="text-sm text-muted-foreground font-medium mb-1">Length</div>
                                <div className="font-bold text-lg leading-tight">{activeVessel.length}m</div>
                            </Card>

                            {/* Crew Size */}
                            <Card className="flex flex-col items-center justify-center p-6 bg-card text-center hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div className="text-sm text-muted-foreground font-medium mb-1">Crew</div>
                                <div className="font-bold text-lg leading-tight">{approvedCrew.length}</div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Next Watch Card */}
                            <Card className={`transition-colors duration-500 flex flex-col justify-center border ${getCardColor()}`}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Clock className={`h-5 w-5 ${isCurrentlyOnWatch && watchStatus === 'red' ? 'text-red-600' : 'text-primary'}`} />
                                        Current Watch Status: <span className={(() => {
                                            if (isCurrentlyOnWatch) return "text-green-600 font-bold";
                                            // Check if next slot starts within 1 hour
                                            if (myNextSlot) {
                                                const diffHours = (new Date(myNextSlot.start).getTime() - new Date().getTime()) / (1000 * 60 * 60);
                                                if (diffHours <= 1) return "text-orange-500 font-bold";
                                            }
                                            return "text-blue-500 font-bold";
                                        })()}>
                                            {isCurrentlyOnWatch ? 'ON WATCH' : (myNextSlot && (new Date(myNextSlot.start).getTime() - new Date().getTime()) / (1000 * 60 * 60) <= 1 ? 'UP NEXT' : 'OFF')}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {displaySlot ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col">
                                                <div className="text-2xl font-bold">{formatTime(displaySlot.start)} - {formatTime(displaySlot.end)}</div>
                                                <div className="text-sm text-muted-foreground capitalize">
                                                    {schedule?.watchType === 'anchor' ? 'Anchor Watch' : 'Navigation Watch'}
                                                </div>

                                                {/* Timer for Crew */}
                                                {(isCurrentlyOnWatch || myNextSlot) && timeLeft && (
                                                    <div className="mt-2 text-right">
                                                        <div className="text-xs uppercase text-muted-foreground font-bold">
                                                            {isCurrentlyOnWatch ? 'Remaining' : 'Off Time Remaining'}
                                                        </div>
                                                        <div className="font-mono text-xl font-bold">{timeLeft}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Check In Action */}
                                            {/* Check In Action */}
                                            {isCurrentlyOnWatch && activeVessel?.checkInEnabled && (
                                                <div className="pt-2">
                                                    {(() => {
                                                        let showCheckInButton = !isCheckedIn;
                                                        let buttonText = "Check In Now";

                                                        if (isCheckedIn && myCrewEntry && activeVessel) {
                                                            let lastActiveTime = 0;
                                                            const entry = myCrewEntry as any;
                                                            if (entry.lastActiveAt) {
                                                                lastActiveTime = new Date(entry.lastActiveAt).getTime();
                                                            } else if (entry.checkedInAt) {
                                                                const [hh, mm] = entry.checkedInAt.split(':');
                                                                const d = new Date();
                                                                d.setHours(Number(hh), Number(mm), 0, 0);
                                                                lastActiveTime = d.getTime();
                                                            }

                                                            const diffMinutes = (new Date().getTime() - lastActiveTime) / 1000 / 60;
                                                            const interval = activeVessel.checkInInterval || 15;
                                                            // Enable re-check in if within 30 seconds of expiration (e.g. > 14.5m for 15m interval)
                                                            if (diffMinutes >= interval - 0.5) {
                                                                showCheckInButton = true;
                                                                buttonText = "Check In";
                                                            }
                                                        }

                                                        return showCheckInButton ? (
                                                            <Button variant="destructive" size="sm" className="w-full font-bold animate-pulse shadow-lg" onClick={handleCheckIn}>
                                                                {buttonText}
                                                            </Button>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2 text-green-600 font-bold bg-green-500/10 rounded py-2 border border-green-500/20">
                                                                <CheckCircle className="h-4 w-4" />
                                                                <span>Checked In at {myCrewEntry?.checkedInAt}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    ) : ( // No active/next slot
                                        <div className="py-4 text-center text-muted-foreground">
                                            {schedule?.slots.some(s => s.crew.some(c => c.userId === user?.id)) ? "No upcoming watches." : "No watch assigned."}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Global Watch Status Card */}
                            <Card className="bg-card border-border flex flex-col justify-center">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        On Watch Now
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {currentGlobalSlot ? (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-2">
                                                {currentGlobalSlot.crew.map((c: any) => (
                                                    <div key={c.userId} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                                                        <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center font-bold text-sm shadow-sm">
                                                            {c.userName[0]}
                                                        </div>
                                                        <span className="font-medium text-sm">{c.userName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground">No active watch.</div>
                                    )}

                                    {/* Up Next Section */}
                                    {nextGlobalSlot && (
                                        <div className="mt-6 pt-6 border-t">
                                            <div className="text-xs uppercase text-muted-foreground font-bold mb-3 flex justify-between items-center">
                                                <span>Up Next</span>
                                                <span>{formatTime(nextGlobalSlot.start)}</span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {nextGlobalSlot.crew.map((c: any) => (
                                                    <div key={c.userId} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                                                        <div className="h-6 w-6 rounded-full bg-secondary border flex items-center justify-center font-bold text-xs shadow-sm">
                                                            {c.userName[0]}
                                                        </div>
                                                        <span className="font-medium text-sm text-muted-foreground">{c.userName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <CrewScheduleView schedule={schedule} user={user} />
                )}

                {activeTab === 'crew' && (
                    <CrewListView approvedCrew={approvedCrew} schedule={schedule} vesselName={activeVessel.name} />
                )}



            </main>
            <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
}
