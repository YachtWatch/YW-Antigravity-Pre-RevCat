import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { UserData, Vessel } from '../../contexts/DataContext';
import { X, Check, Printer, RefreshCw } from 'lucide-react';
import { CrewListPrintView } from '../../components/CrewListPrintView'; // Import the print view


interface CaptainCrewViewProps {
    vessel: Vessel;
    captainName: string;
    approvedCrew: any[];
    pendingRequests: any[];
    users: UserData[];
    onEditRole: (userId: string) => void;
    onRemoveCrew: (userId: string) => void;
    onRequestAction: (requestId: string, action: 'approved' | 'declined') => void;
    onRefresh: () => void;
}

export function CaptainCrewView({ vessel, captainName, approvedCrew, pendingRequests, users, onEditRole, onRemoveCrew, onRequestAction, onRefresh }: CaptainCrewViewProps) {
    const [showPrintView, setShowPrintView] = useState(false);

    // Map approved crew requests to full user objects for the print view
    /* DEBUG LOGGING */
    // console.log("CaptainCrewView: approvedCrew", approvedCrew);
    // console.log("CaptainCrewView: users", users);

    const crewForPrint = approvedCrew
        .map(req => {
            const user = users.find(u => u.id === req.userId);
            if (!user) {
                // Return a partial user object if profile is missing
                return {
                    id: req.userId,
                    name: req.userName || 'Unknown Crew',
                    email: '',
                    role: 'crew',
                    customRole: 'Deckhand', // Default
                    vesselId: vessel.id,
                    nationality: '-',
                    passportNumber: '-',
                    dateOfBirth: '-'
                } as UserData;
            }
            return user;
        });

    // console.log("CaptainCrewView: crewForPrint", crewForPrint);

    // Add Captain to the list
    const captainUser = users.find(u => u.name === captainName) || {
        id: 'captain',
        name: captainName,
        email: '',
        role: 'captain',
        customRole: 'Captain'
    } as UserData;

    // Prepend Captain
    const finalCrewList = [captainUser, ...crewForPrint];

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8">
            {/* Print Overlay */}
            {showPrintView && (
                <div className="fixed inset-0 z-50 bg-white overflow-auto flex flex-col print:absolute print:inset-0 print:h-auto print:overflow-visible print:block">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:hidden">
                        <div className="font-bold">Print Preview</div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowPrintView(false)}>Close</Button>
                            <Button onClick={handlePrint} className="gap-2">
                                <Printer className="h-4 w-4" />
                                Print / Save as PDF
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-100 p-8 print:p-0 print:bg-white overflow-y-auto">
                        <div className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0">
                            <CrewListPrintView
                                vessel={vessel}
                                crew={finalCrewList}
                                captainName={captainName}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Join Code Card (Moved from Dashboard) */}
            <Card className="bg-primary/5 border-primary/20 print:hidden">
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

            {/* Pending Requests Section */}
            <div className="print:hidden">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    Pending Requests
                    {pendingRequests.length > 0 && <span className="px-2 py-1 text-xs bg-primary text-white rounded-full">{pendingRequests.length}</span>}
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={onRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </h3>
                {pendingRequests.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-card/30 border-dashed">
                        No pending join requests.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm">
                                <div>
                                    <div className="font-bold text-sm">{req.userName}</div>
                                    <div className="text-xs text-muted-foreground">Request sent today</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => onRequestAction(req.id, 'declined')}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white" onClick={() => onRequestAction(req.id, 'approved')}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active Crew Section */}
            <div className="print:hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Active Crew ({finalCrewList.length})</h3>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowPrintView(true)}>
                        <Printer className="h-3 w-3" />
                        Export Crew List
                    </Button>
                </div>

                {finalCrewList.length === 0 ? (
                    <p className="text-muted-foreground">No crew members yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {finalCrewList.map(c => {
                            const isCaptain = c.role === 'captain';
                            return (
                                <div key={c.id} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        {c.name ? c.name[0] : '?'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold flex items-center justify-between">
                                            {c.name}
                                            {!isCaptain && (
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onEditRole(c.id)}>
                                                        Edit Role
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:bg-destructive/10" onClick={() => onRemoveCrew(c.id)}>
                                                        Remove
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Role: {c.customRole || (isCaptain ? "Captain" : "Deckhand")}
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
