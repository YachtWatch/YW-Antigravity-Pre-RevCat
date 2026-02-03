import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';
import { Ship, Anchor, Clock, Users, Sailboat } from 'lucide-react';
import { generateSchedule as generateScheduleLogic } from '../../lib/scheduler';
import { CaptainScheduleView } from './CaptainScheduleView';
import { CaptainCrewView } from './CaptainCrewView';
import { getCurrentSlot } from '../../lib/time-utils';
import { NoScheduleState } from '../../components/NoScheduleState';

export default function CaptainDashboard() {
    const { user, updateUser } = useAuth();
    const { createVessel, getVessel, getRequestsForVessel, updateRequestStatus, createSchedule, getSchedule, updateUserInStore, updateScheduleSlot, updateScheduleSettings, removeCrew, updateCrewRole, users, refreshData, deleteSchedule, loading } = useData();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'crew'>('dashboard');

    // Vessel Setup State
    const [vesselName, setVesselName] = useState('');
    const [vesselLength, setVesselLength] = useState('');
    const [vesselType, setVesselType] = useState<'motor' | 'sail'>('motor');
    const [vesselCapacity, setVesselCapacity] = useState('');

    const vessel = user?.vesselId ? getVessel(user.vesselId) : undefined;
    const schedule = vessel ? getSchedule(vessel.id) : null;

    // Requests State
    const pendingRequests = vessel ? getRequestsForVessel(vessel.id).filter(r => r.status === 'pending') : [];
    const approvedCrew = vessel ? getRequestsForVessel(vessel.id).filter(r => r.status === 'approved') : [];

    const handleCreateVessel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        const newVessel = await createVessel({
            captainId: user.id,
            name: vesselName,
            length: Number(vesselLength),
            type: vesselType,
            capacity: Number(vesselCapacity),
            allowWatchSwapping: false,
            checkInInterval: 15
        });

        if (newVessel) {
            updateUser({ vesselId: newVessel.id });
            updateUserInStore(user.id, { vesselId: newVessel.id });
        }
    };

    const handleRequestAction = (requestId: string, action: 'approved' | 'declined') => {
        updateRequestStatus(requestId, action);
    };

    const handleGenerateSchedule = (options: any) => {
        if (!vessel || approvedCrew.length === 0) return;

        const slots = generateScheduleLogic(
            approvedCrew.map(c => ({ userId: c.userId, userName: c.userName })),
            options
        );

        createSchedule({
            vesselId: vessel.id,
            name: options.watchType === 'dock' ? 'Dock Schedule' : (options.watchType === 'anchor' ? 'Anchor Watch' : 'Standard Rotation'),
            watchType: options.watchType,
            createdAt: new Date().toISOString(),
            slots
        });
    };

    const handleRemoveCrew = (userId: string) => {
        if (!vessel || !confirm('Are you sure you want to remove this crew member?')) return;
        removeCrew(vessel.id, userId);
    };

    const handleEditRole = (userId: string) => {
        const role = prompt('Enter new role title (e.g. Bosun, Chef):');
        if (role) updateCrewRole(userId, role);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!vessel) {
        // Double check: if user has a vesselId but we can't find it, it might still be loading or it was deleted.
        // But since we checked 'loading' above, if we are here and have vesselId but no vessel, it's an error state (or deleted).
        if (user?.vesselId) {
            return (
                <div className="container max-w-md mx-auto py-12 px-4 text-center">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-destructive">Vessel Not Found</CardTitle>
                            <CardDescription>
                                Your profile is linked to a vessel (ID: {user.vesselId}) that cannot be found.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                <Button
                                    className="w-full"
                                    onClick={() => window.location.reload()}
                                >
                                    Retry Connection
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full text-destructive hover:text-destructive border-destructive/20"
                                    onClick={() => {
                                        // Clear the broken vessel ID so they can register a new one
                                        updateUser({ vesselId: undefined });
                                        updateUserInStore(user.id, { vesselId: undefined });
                                    }}
                                >
                                    Reset My Profile
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }
        return (
            <div className="container max-w-2xl mx-auto py-12 px-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Register your Vessel</CardTitle>
                        <CardDescription>Configure your vessel details to start managing your crew.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateVessel} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Vessel Name</label>
                                <Input required value={vesselName} onChange={e => setVesselName(e.target.value)} placeholder="e.g. M/Y Eclipse" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Length (meters)</label>
                                    <Input required type="number" value={vesselLength} onChange={e => setVesselLength(e.target.value)} placeholder="50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Type</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={vesselType}
                                        onChange={(e) => setVesselType(e.target.value as any)}
                                    >
                                        <option value="motor">Motor Yacht</option>
                                        <option value="sail">Sailing Yacht</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Crew Capacity</label>
                                <Input required type="number" value={vesselCapacity} onChange={e => setVesselCapacity(e.target.value)} placeholder="12" />
                            </div>

                            <Button type="submit" className="w-full">Initialize Vessel</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b bg-card relative z-50 safe-area-pt print:hidden">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Anchor className="h-6 w-6" />
                        <span>YachtWatch</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground hidden sm:block">
                            Captain of <span className="font-semibold text-foreground">{vessel.type === 'sail' ? 'S/Y' : 'M/Y'} {vessel.name}</span>
                        </div>
                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 pb-24">
                <div className="flex flex-col gap-6">
                    {activeTab === 'dashboard' && (
                        <>
                            <div className="flex justify-between items-center">
                                <h1 className="text-3xl font-bold">Captain's Dashboard</h1>
                            </div>

                            {/* Active Watch Status Widget */}
                            {(() => {
                                const activeSlot = schedule ? getCurrentSlot(schedule.slots) : undefined;

                                if (!activeSlot) return null;

                                return (
                                    <Card className="bg-primary/5 border-primary/20">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Clock className="h-5 w-5 text-primary" />
                                                Current Watch Status
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <div className="font-medium">{activeSlot.start} - {activeSlot.end}</div>
                                                    <div className="text-sm text-muted-foreground capitalize">{schedule?.watchType || 'Standard'} Watch</div>
                                                    <div className="flex -space-x-2 mt-2">
                                                        {activeSlot.crew.map((c: any) => (
                                                            <div key={c.userId} className="h-6 w-6 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[10px]" title={c.userName}>
                                                                {c.userName[0]}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    {/* Example Crew Status - Logic will be in the dedicated Overlay/Widget component but showing it here for Captain */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                                                        <span className="text-sm font-medium">Active</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })()}

                            <div className="space-y-6">
                                {/* 3-Card Vessel Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Vessel Name */}
                                    <Card className="flex flex-col items-center justify-center p-6 bg-card text-center hover:shadow-md transition-shadow">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                            <Ship className="h-6 w-6" />
                                        </div>
                                        <div className="text-sm text-muted-foreground font-medium mb-1">Vessel Name</div>
                                        <div className="font-bold text-lg leading-tight">{vessel.name}</div>
                                    </Card>

                                    {/* Vessel Length */}
                                    <Card className="flex flex-col items-center justify-center p-6 bg-card text-center hover:shadow-md transition-shadow">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                            <Sailboat className="h-6 w-6" />
                                        </div>
                                        <div className="text-sm text-muted-foreground font-medium mb-1">Length</div>
                                        <div className="font-bold text-lg leading-tight">{vessel.length}m</div>
                                    </Card>

                                    {/* Crew Size */}
                                    <Card className="flex flex-col items-center justify-center p-6 bg-card text-center hover:shadow-md transition-shadow">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                            <Users className="h-6 w-6" />
                                        </div>
                                        <div className="text-sm text-muted-foreground font-medium mb-1">Crew Size</div>
                                        <div className="font-bold text-lg leading-tight">{approvedCrew.length}</div>
                                    </Card>
                                </div>

                                {/* Join Code Card */}
                                <Card className="bg-primary/5 border-primary/20">
                                    <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                                        <div className="space-y-1 text-center sm:text-left">
                                            <h3 className="font-semibold text-foreground">Vessel Join Code</h3>
                                            <p className="text-sm text-muted-foreground">Share this code with your crew to let them join.</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-3xl font-mono font-bold tracking-[0.2em] text-primary bg-background px-6 py-3 rounded-lg border shadow-sm select-all cursor-pointer hover:border-primary transition-colors"
                                                onClick={() => { navigator.clipboard.writeText(vessel.joinCode); alert('Copied to clipboard!'); }}
                                                title="Click to copy">
                                                {vessel.joinCode}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">Click to Copy</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}



                    <div className="min-h-[300px] border rounded-lg p-6 bg-card/50">
                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                {/* Next Watch / Active Watch Status is handled by the widget above for Active, but we can show next here if none active */}
                                {!schedule ? (
                                    <div className="py-8">
                                        <NoScheduleState onCreateSchedule={() => setActiveTab('schedule')} />
                                    </div>
                                ) : (
                                    <CaptainScheduleView
                                        schedule={schedule}
                                        approvedCrew={approvedCrew}
                                        vessel={vessel}
                                        onGenerateSchedule={handleGenerateSchedule}
                                        onUpdateScheduleSettings={updateScheduleSettings}
                                        onUpdateSlot={updateScheduleSlot}
                                        onClearSchedule={() => {
                                            console.log('CaptainDashboard: calling deleteSchedule for vessel', vessel.id);
                                            deleteSchedule(vessel.id)
                                                .then(() => console.log('CaptainDashboard: deleteSchedule completed'))
                                                .catch(e => console.error('CaptainDashboard: deleteSchedule failed', e));
                                        }}
                                    />
                                )}
                            </div>
                        )}
                        {activeTab === 'schedule' && (
                            <CaptainScheduleView
                                schedule={schedule}
                                approvedCrew={approvedCrew}
                                vessel={vessel}
                                onGenerateSchedule={handleGenerateSchedule}
                                onUpdateScheduleSettings={updateScheduleSettings}
                                onUpdateSlot={updateScheduleSlot}
                                onClearSchedule={() => {
                                    console.log('CaptainDashboard: calling deleteSchedule for vessel', vessel.id);
                                    deleteSchedule(vessel.id)
                                        .then(() => console.log('CaptainDashboard: deleteSchedule completed'))
                                        .catch(e => console.error('CaptainDashboard: deleteSchedule failed', e));
                                }}
                            />
                        )}

                        {activeTab === 'crew' && (
                            <CaptainCrewView
                                vessel={vessel}
                                captainName={user?.name || 'Captain'}
                                approvedCrew={approvedCrew}
                                pendingRequests={pendingRequests}
                                users={users}
                                onEditRole={handleEditRole}
                                onRemoveCrew={handleRemoveCrew}
                                onRequestAction={handleRequestAction}
                                onRefresh={refreshData}
                            />
                        )}
                    </div>

                </div>
            </main>
            <div className="print:hidden">
                <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
        </div>
    );
}
