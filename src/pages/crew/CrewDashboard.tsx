import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';
import { Anchor, Clock, Ship, Loader2, CheckCircle } from 'lucide-react';
import { CrewScheduleView } from './CrewScheduleView';
import { CrewListView } from './CrewListView';
import { getCurrentSlot, getTimeRemaining } from '../../lib/time-utils';

const CREW_POSITIONS = {
    bridge: ['Captain', 'Chief Officer', 'Second Officer', 'Third Officer', 'Mate'],
    deck: ['Bosun', 'Lead Deckhand', 'Deckhand', 'Delivery Crew'],
    interior: ['Chief Steward/ess', 'Second Steward/ess', 'Steward/ess', 'Laundry'],
    galley: ['Head Chef', 'Sous Chef', 'Cook'],
    engineering: ['Chief Engineer', 'Second Engineer', 'Third Engineer', 'ETO']
};

export default function CrewDashboard() {
    const { user, updateUser } = useAuth();
    const { requestJoin, getCrewVessel, getPendingRequest, getVessel, getSchedule, checkInToWatch, updateUserInStore, users, refreshData } = useData();
    const [joinCode, setJoinCode] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'crew'>('dashboard');

    const approvedVessel = user ? getCrewVessel(user.id) : undefined;
    const pendingRequest = user ? getPendingRequest(user.id) : undefined;

    const activeVessel = approvedVessel;
    const schedule = activeVessel ? getSchedule(activeVessel.id) : undefined;

    // Get all approved crew for the vessel to pass to CrewListView
    const approvedCrew = activeVessel ? users.filter(u => u.vesselId === activeVessel.id) : [];

    const myAssignedSlot = schedule?.slots.find((slot: any) => slot.crew.some((c: any) => c.userId === user?.id));

    // Check if we are currently in an active slot
    const currentGlobalSlot = schedule ? getCurrentSlot(schedule.slots) : undefined;
    const isCurrentlyOnWatch = currentGlobalSlot && currentGlobalSlot.crew.some((c: any) => c.userId === user?.id);

    // For display, if we are on watch, show the current slot. If not, show our assigned slot (upcoming)
    const displaySlot = isCurrentlyOnWatch ? currentGlobalSlot : myAssignedSlot;

    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!isCurrentlyOnWatch || !currentGlobalSlot) {
            setTimeLeft('');
            return;
        }

        const updateTimer = () => {
            setTimeLeft(getTimeRemaining(currentGlobalSlot));
        };

        const timer = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(timer);
    }, [isCurrentlyOnWatch, currentGlobalSlot]);

    const watchBuddies = displaySlot?.crew.filter((c: any) => c.userId !== user?.id) || [];

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setError('');
        setSuccess('');

        if (!selectedPosition) {
            setError('Please select your position');
            return;
        }

        // Validate request
        const result = await requestJoin(user.id, user.name, joinCode.trim().toUpperCase());
        if (result.success) {
            // Store the selected position
            updateUser({ customRole: selectedPosition } as any);
            updateUserInStore(user.id, { customRole: selectedPosition });
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

    const myCrewEntry = displaySlot?.crew.find((c: any) => c.userId === user?.id);
    const isCheckedIn = !!myCrewEntry?.checkedInAt;

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
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Your Position</label>
                                    <select
                                        value={selectedPosition}
                                        onChange={e => setSelectedPosition(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">Select your position...</option>
                                        <optgroup label="Bridge">
                                            {CREW_POSITIONS.bridge.map(p => <option key={p} value={p}>{p}</option>)}
                                        </optgroup>
                                        <optgroup label="Deck">
                                            {CREW_POSITIONS.deck.map(p => <option key={p} value={p}>{p}</option>)}
                                        </optgroup>
                                        <optgroup label="Interior">
                                            {CREW_POSITIONS.interior.map(p => <option key={p} value={p}>{p}</option>)}
                                        </optgroup>
                                        <optgroup label="Galley">
                                            {CREW_POSITIONS.galley.map(p => <option key={p} value={p}>{p}</option>)}
                                        </optgroup>
                                        <optgroup label="Engineering">
                                            {CREW_POSITIONS.engineering.map(p => <option key={p} value={p}>{p}</option>)}
                                        </optgroup>
                                    </select>
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
                <h1 className="text-2xl font-bold mb-6">Hello, {user?.name}</h1>

                {activeTab === 'dashboard' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className={`border-none transition-colors duration-500 ${isCurrentlyOnWatch ? 'bg-red-900/90 text-white shadow-lg shadow-red-900/20' : 'bg-primary text-primary-foreground'}`}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className={`relative flex h-3 w-3 ${isCurrentlyOnWatch ? '' : 'hidden'}`}>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                        <Clock className={`h-5 w-5 ${isCurrentlyOnWatch ? 'text-red-200' : ''}`} />
                                        {isCurrentlyOnWatch ? 'CURRENTLY ON WATCH' : 'Next Watch'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {displaySlot ? (
                                        <>
                                            <div className="text-4xl font-bold mb-2">{displaySlot.start} - {displaySlot.end}</div>
                                            <div className="space-y-2">
                                                <p className="opacity-90 font-medium">
                                                    {schedule?.watchType === 'anchor' ? 'Anchor Watch' : 'Underway Watch'}
                                                </p>

                                                {isCurrentlyOnWatch && (
                                                    <div className="bg-black/20 rounded-lg p-2 text-center my-2">
                                                        <div className="text-xs uppercase opacity-75">Time Remaining</div>
                                                        <div className="font-mono text-xl font-bold mb-2">{timeLeft}</div>

                                                        {!isCheckedIn ? (
                                                            <Button variant="secondary" size="sm" className="w-full font-bold animate-pulse" onClick={handleCheckIn}>
                                                                Check In Now
                                                            </Button>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2 text-green-300 font-bold bg-green-900/40 rounded py-1">
                                                                <CheckCircle className="h-4 w-4" />
                                                                <span>Checked In at {myCrewEntry.checkedInAt}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {watchBuddies.length > 0 && (
                                                    <div className="text-sm">
                                                        <div className="opacity-75 text-xs uppercase mb-1">On Watch With:</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {watchBuddies.map((buddy: any) => (
                                                                <span key={buddy.userId} className="px-2 py-0.5 bg-white/20 rounded-full">
                                                                    {buddy.userName}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-2xl font-bold mb-2 opacity-50">--:--</div>
                                            <p className="opacity-90">No watch assigned</p>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Vessel Info</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center gap-4">
                                    <div className="p-3 bg-secondary rounded-lg">
                                        <Ship className="h-6 w-6 text-foreground" />
                                    </div>
                                    <div>
                                        <div className="font-bold">{activeVessel.name}</div>
                                        <div className="text-sm text-muted-foreground">{activeVessel.type} • {activeVessel.length}m</div>
                                        {schedule && (
                                            <div className="mt-1 text-xs px-2 py-0.5 bg-secondary rounded-full inline-block uppercase font-bold text-secondary-foreground">
                                                {schedule.watchType || 'Standard'} Mode
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="mt-8">
                            <h2 className="text-xl font-semibold mb-4">Upcoming Schedule</h2>
                            <Card>
                                <CardContent className="p-0">
                                    {!schedule ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            No schedule published yet.
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {schedule.slots.map((slot: any) => {
                                                const isMyWatch = slot.crew.some((c: any) => c.userId === user?.id);
                                                return (
                                                    <div key={slot.id} className={`p-4 flex items-center justify-between ${isMyWatch ? 'bg-primary/5' : ''}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="font-mono font-bold w-32 flex flex-col">
                                                                <span>{slot.start} - {slot.end}</span>
                                                                {slot.condition === 'weekend-only' && (
                                                                    <span className="text-[10px] text-amber-600 font-extrabold uppercase">Wknd Only</span>
                                                                )}
                                                            </div>
                                                            <div className="flex -space-x-2">
                                                                {slot.crew.map((c: any) => (
                                                                    <div key={c.userId} className="h-8 w-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs" title={c.userName}>
                                                                        {c.userName[0]}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {isMyWatch && <div className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded-full">YOUR WATCH</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}

                {activeTab === 'schedule' && (
                    <CrewScheduleView schedule={schedule} user={user} />
                )}

                {activeTab === 'crew' && (
                    <CrewListView approvedCrew={approvedCrew} />
                )}

            </main>
            <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
}
