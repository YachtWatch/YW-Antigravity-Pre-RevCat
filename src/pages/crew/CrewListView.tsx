
import { Card, CardContent } from '../../components/ui/card';
import { Users, Anchor, Compass, Coffee, Wrench, Activity, Star } from 'lucide-react'; // Added Star for Captain
import { useAuth } from '../../contexts/AuthContext';
import { UserData } from '../../contexts/DataContext';

interface CrewListViewProps {
    approvedCrew: UserData[];
    schedule?: any;
    vesselName?: string;
}

const DEPARTMENT_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
    bridge: { label: 'Bridge', icon: Compass, color: 'text-blue-500 bg-blue-500/10' },
    deck: { label: 'Deck', icon: Anchor, color: 'text-cyan-500 bg-cyan-500/10' },
    interior: { label: 'Interior', icon: Coffee, color: 'text-purple-500 bg-purple-500/10' },
    engineering: { label: 'Engineering', icon: Wrench, color: 'text-orange-500 bg-orange-500/10' },
    galley: { label: 'Galley', icon: Wrench, color: 'text-red-500 bg-red-500/10' },
    other: { label: 'Other', icon: Users, color: 'text-gray-500 bg-gray-500/10' }
};

const CREW_POSITIONS = {
    bridge: ['Captain', 'Chief Officer', 'Second Officer', 'Third Officer', 'Mate'],
    deck: ['Bosun', 'Lead Deckhand', 'Deckhand', 'Delivery Crew'],
    interior: ['Chief Steward/ess', 'Second Steward/ess', 'Steward/ess', 'Laundry'],
    galley: ['Head Chef', 'Sous Chef', 'Cook'],
    engineering: ['Chief Engineer', 'Second Engineer', 'Third Engineer', 'ETO']
};

const getDepartment = (role: string) => {
    if (!role) return 'other';
    for (const [dept, roles] of Object.entries(CREW_POSITIONS)) {
        if (roles.includes(role)) return dept;
    }
    return 'other';
};

export function CrewListView({ approvedCrew, schedule, vesselName }: CrewListViewProps) {

    const { user: currentUser } = useAuth();

    // Ensure we are working with unique users to avoid duplicates if any
    const uniqueCrew = Array.from(new Map(approvedCrew.map(item => [item.id, item])).values());

    // 1. Calculate Department Stats


    // 2. Calculate Watch Stats
    const now = new Date();
    const currentGlobalSlot = schedule?.slots.find((slot: any) => {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        return now >= start && now < end;
    });

    const crewOnWatchIds = currentGlobalSlot?.crew.map((c: any) => c.userId) || [];
    const onWatchCount = crewOnWatchIds.length;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">{vesselName ? `${vesselName} Crew` : 'Crew List'}</h2>

            {/* Insights Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* On Watch Card */}
                <Card className="bg-card">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${onWatchCount > 0 ? 'bg-green-500/10 text-green-600' : 'bg-muted/50 text-muted-foreground'}`}>
                            <Activity className="h-5 w-5" />
                        </div>
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">On Watch</div>
                        <div className="text-2xl font-bold mt-1">{onWatchCount}</div>
                    </CardContent>
                </Card>

                {/* Total Crew Card */}
                <Card className="bg-card">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary">
                            <Users className="h-5 w-5" />
                        </div>
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Crew</div>
                        <div className="text-2xl font-bold mt-1">{uniqueCrew.length}</div>
                    </CardContent>
                </Card>


            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    Shipmates
                    <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{uniqueCrew.length}</span>
                </h3>

                {uniqueCrew.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                        No crew members found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {uniqueCrew.map(c => {
                            const role = c.customRole || c.role || 'Crew';
                            const dept = getDepartment(role);
                            const config = DEPARTMENT_CONFIG[dept] || DEPARTMENT_CONFIG.other;
                            const Icon = config.icon;
                            const isOnWatch = crewOnWatchIds.includes(c.id);
                            const isCaptain = role.toLowerCase() === 'captain' || c.role === 'captain';

                            return (
                                <div key={c.id} className="relative group overflow-hidden bg-card hover:bg-accent/5 transition-colors border rounded-xl p-4 flex items-start gap-4 shadow-sm">
                                    {isOnWatch && (
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                            </span>
                                        </div>
                                    )}

                                    <div className={`h-12 w-12 rounded-full ${config.color} flex items-center justify-center font-bold text-lg shrink-0 relative`}>
                                        {c.name ? c.name[0] : '?'}
                                        {isCaptain && (
                                            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full p-0.5 border-2 border-card">
                                                <Star className="h-3 w-3 fill-current" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base truncate pr-4 flex items-center gap-2">
                                            {c.name}
                                            {currentUser?.id === c.id && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">You</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                                            <Icon className="h-3.5 w-3.5 opacity-70" />
                                            <span className="truncate">{role}</span>
                                        </div>

                                        {/* Status Line */}
                                        <div className="mt-3 flex items-center gap-2 text-xs font-medium">
                                            <div className={`px-2 py-0.5 rounded-full ${isOnWatch ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                                {isOnWatch ? 'On Watch' : 'Off Duty'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
