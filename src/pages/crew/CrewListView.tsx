import { useData } from '../../contexts/DataContext';

interface CrewListViewProps {
    approvedCrew: any[];
}

export function CrewListView({ approvedCrew }: CrewListViewProps) {
    const { users } = useData();

    return (
        <div>
            <h3 className="font-bold mb-4">Shipmates ({approvedCrew.length})</h3>
            {approvedCrew.length === 0 ? (
                <p className="text-muted-foreground">No other crew members yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {approvedCrew.map(c => (
                        <div key={c.id} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {c.userName[0]}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold">
                                    {c.userName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Role: {users.find(u => u.id === c.userId)?.customRole || "Crew"}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
