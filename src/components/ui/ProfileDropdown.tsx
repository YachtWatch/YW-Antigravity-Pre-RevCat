import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Settings, User, Menu } from 'lucide-react';


export function ProfileDropdown() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/auth/login', { replace: true });
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    console.log("Profile dropdown toggled");
                    setIsOpen(!isOpen);
                }}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-accent transition-colors cursor-pointer relative z-[101]"
            >
                <Menu className="h-6 w-6 text-primary" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[100]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-card border rounded-lg shadow-lg z-[102] overflow-hidden">
                        <div className="p-3 border-b bg-muted/30">
                            <div className="font-medium truncate">{user?.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                            <div className="text-xs text-primary font-medium capitalize mt-1">{user?.role}</div>
                        </div>

                        <div className="py-1">
                            <button
                                onClick={() => { setIsOpen(false); navigate('/profile'); }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                            >
                                <User className="h-4 w-4" />
                                Profile
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); navigate('/settings'); }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </button>
                        </div>

                        <div className="border-t py-1">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
