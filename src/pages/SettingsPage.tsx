import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Moon, Sun, Bell, Ship } from 'lucide-react';
import { useTheme } from '../components/theme-provider';

import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

export default function SettingsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getVessel, updateVesselSettings, updateUserInStore } = useData();
    const { theme, setTheme } = useTheme();

    const vessel = user?.vesselId ? getVessel(user.vesselId) : undefined;
    const isCaptain = user?.role === 'captain';

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card sticky top-0 z-50 safe-area-pt">
                <div className="container mx-auto px-4 h-14 flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (window.history.length > 2) {
                                navigate(-1);
                            } else {
                                navigate(user?.role === 'captain' ? '/dashboard/captain' : '/dashboard/crew');
                            }
                        }}
                        className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="font-semibold">Settings</h1>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-lg space-y-8">

                {/* Profile Settings Section */}
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Profile Settings</h2>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Appearance</CardTitle>
                            <CardDescription>Customize how the app looks</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                                    <div>
                                        <div className="font-medium">Theme</div>
                                        <div className="text-sm text-muted-foreground capitalize">{theme}</div>
                                    </div>
                                </div>
                                <div className="flex bg-secondary rounded-lg p-1">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'light' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Light
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Dark
                                    </button>
                                    <button
                                        onClick={() => setTheme('system')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'system' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        System
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">Notifications</CardTitle>
                            </div>
                            <CardDescription>Manage your watch alerts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Measurement</label>
                                    <div className="text-sm text-muted-foreground my-1">
                                        Select how many minutes before your watch you want to be notified.
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">1st Reminder</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={user?.reminder1 || 0}
                                            onChange={(e) => {
                                                if (user?.id) updateUserInStore(user.id, { reminder1: Number(e.target.value) });
                                            }}
                                        >
                                            <option value={0}>None</option>
                                            <option value={5}>5 min before</option>
                                            <option value={10}>10 min before</option>
                                            <option value={15}>15 min before</option>
                                            <option value={20}>20 min before</option>
                                            <option value={25}>25 min before</option>
                                            <option value={30}>30 min before</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">2nd Reminder</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={user?.reminder2 || 0}
                                            onChange={(e) => {
                                                if (user?.id) updateUserInStore(user.id, { reminder2: Number(e.target.value) });
                                            }}
                                        >
                                            <option value={0}>None</option>
                                            <option value={5}>5 min before</option>
                                            <option value={10}>10 min before</option>
                                            <option value={15}>15 min before</option>
                                            <option value={20}>20 min before</option>
                                            <option value={25}>25 min before</option>
                                            <option value={30}>30 min before</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Notifications will be sent on this device.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Vessel Settings Section (Captain Only) */}
                {isCaptain && vessel && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Vessel Settings</h2>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Ship className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-lg">Watch Configuration</CardTitle>
                                </div>
                                <CardDescription>Configure watch intervals and rules for {vessel.name}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Watch Acknowledgement Interval</label>
                                    <div className="flex gap-2">
                                        {[15, 30, 45, 60].map(mins => (
                                            <Button
                                                key={mins}
                                                variant={vessel.checkInInterval === mins ? "default" : "outline"}
                                                onClick={() => updateVesselSettings(vessel.id, { checkInInterval: mins })}
                                                className="flex-1"
                                                size="sm"
                                            >
                                                {mins}m
                                            </Button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Crew must check in every {vessel.checkInInterval} minutes while on watch.</p>
                                </div>

                                <div className="flex items-center justify-between border pt-4 mt-4 border-t-border">
                                    <div>
                                        <div className="font-medium text-sm">Allow Watch Swapping</div>
                                        <div className="text-xs text-muted-foreground">Crew can swap watches without approval</div>
                                    </div>
                                    <Button
                                        variant={vessel.allowWatchSwapping ? "default" : "outline"}
                                        onClick={() => updateVesselSettings(vessel.id, { allowWatchSwapping: !vessel.allowWatchSwapping })}
                                        size="sm"
                                    >
                                        {vessel.allowWatchSwapping ? "Enabled" : "Disabled"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">About</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-1">
                            <div>YachtWatch v1.0.0</div>
                            <div>© 2026 YachtWatch</div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
