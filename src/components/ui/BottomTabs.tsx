import { Home, Calendar, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BottomTabsProps {
    activeTab: 'dashboard' | 'schedule' | 'crew';
    onTabChange: (tab: 'dashboard' | 'schedule' | 'crew') => void;
}

export function BottomTabs({ activeTab, onTabChange }: BottomTabsProps) {
    const tabs = [
        { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
        { id: 'schedule' as const, label: 'Schedule', icon: Calendar },
        { id: 'crew' as const, label: 'Crew', icon: Users },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-[100] safe-area-pb shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex justify-around items-center h-16">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                            <span className={cn("text-xs", isActive && "font-semibold")}>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
