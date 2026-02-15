import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'captain' | 'crew';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    vesselId?: string;
    customRole?: string;
    nationality?: string;
    passportNumber?: string;
    dateOfBirth?: string;
    reminder1?: number;
    reminder2?: number;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper for timeouts
    const withTimeout = (promise: any, ms: number = 8000, errorMsg: string) => {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms));
        return Promise.race([promise, timeout]);
    };

    useEffect(() => {
        // Check active session
        const getSession = async () => {
            try {
                // Wrap session check in timeout
                const { data } = await withTimeout(
                    supabase.auth.getSession(),
                    5000,
                    'Session check timed out'
                );

                const session = data?.session;

                if (session?.user) {
                    await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Auth init error:", err);
                // Ensure we don't hang
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                // Ensure loading is true while we fetch the profile to prevent premature redirects
                setLoading(true);
                await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string, email: string, metadata?: any) => {
        console.log(`🔍 [AuthDebug] Fetching profile for ${userId} (${email})`);
        try {
            // Check if profile exists
            const { data, error } = await withTimeout(
                supabase.from('profiles').select('*').eq('id', userId).single() as any,
                8000,
                'Profile fetch timed out'
            );

            console.log(`🔍 [AuthDebug] Raw DB Result:`, { data, error });

            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn(`[AuthDebug] Profile not found (PGRST116). Creating new...`);
                    // ... creation logic ...
                } else {
                    console.error(`❌ [AuthDebug] Profile Fetch Error:`, error);
                    // alert(`DEBUG: Profile Fetch Error: ${error.message} (Code: ${error.code})`);
                }
            }

            // STRICT CHECK: Only auto-create if we explicitly got "Row not found" (PGRST116).
            // Any other error (network, timeout, 500) should NOT trigger auto-create.
            if (error && error.code === 'PGRST116') {
                console.warn(`Profile not found for ${userId}. Attempting create...`);

                const newProfile = {
                    id: userId,
                    email: email,
                    name: (metadata?.full_name || metadata?.name) || email.split('@')[0] || 'New User',
                    role: (metadata?.role === 'captain' || metadata?.role === 'crew') ? metadata.role : 'crew' as UserRole,
                };

                // Upsert with timeout
                const { error: insertError } = await withTimeout(
                    supabase.from('profiles').upsert(newProfile) as any,
                    8000,
                    'Profile creation timed out'
                );

                if (insertError) {
                    console.error("Failed to auto-create profile:", insertError);
                    setUser({ id: userId, name: 'Pending Setup', email: email, role: 'crew' });
                } else {
                    setUser({
                        id: userId,
                        name: newProfile.name,
                        email: newProfile.email,
                        role: newProfile.role,
                        vesselId: undefined,
                        customRole: undefined,
                        nationality: undefined,
                        passportNumber: undefined,
                        dateOfBirth: undefined
                    });
                }
            } else if (error) {
                // If we have an error that ISN'T "Not Found", it's a real problem (timeout, offline, etc).
                // DO NOT THROW. Instead, set a fallback user state so the user can at least log in.
                console.error("Critical error fetching profile (using fallback):", error);

                // Fallback user
                const fallbackUser: User = {
                    id: userId,
                    name: (metadata?.full_name || metadata?.name) || email.split('@')[0] || 'User',
                    email: email,
                    role: (metadata?.role === 'captain' || metadata?.role === 'crew') ? metadata.role : 'crew' as UserRole,
                };

                setUser(fallbackUser);

            } else if (data) {
                // Profile found
                let finalRole = data.role;

                // SELF-HEALING: If role is 'crew' (default safety), check if they actually own a vessel.
                // This fixes the bug where captains were downgraded to crew during network timeouts.
                if (finalRole === 'crew') {
                    if (finalRole === 'crew') {
                        // Check metadata first (STRONGEST SIGNAL)
                        const metadataRole = metadata?.role;
                        if (metadataRole === 'captain') {
                            console.log("⚓️ Self-healing detected: Metadata says 'captain' but profile says 'crew'. Promoting to Captain.");
                            finalRole = 'captain';
                            // Persist the fix
                            await supabase.from('profiles').update({ role: 'captain' }).eq('id', userId);
                        } else {
                            // Check vessel ownership
                            const { data: ownedVessel } = await supabase
                                .from('vessels')
                                .select('id')
                                .eq('captain_id', userId)
                                .single();

                            if (ownedVessel) {
                                console.log("⚓️ Self-healing detected: User owns vessel but has 'crew' role. Promoting to Captain.");
                                finalRole = 'captain';
                                // Persist the fix
                                await supabase.from('profiles').update({ role: 'captain' }).eq('id', userId);
                            }
                        }
                    }
                }

                // ROBUST OWNERSHIP: If captain, vessel source of truth is the vessels table, NOT the profile.
                let finalVesselId = data.vessel_id;

                if (finalRole === 'captain') {
                    const { data: ownedVessel } = await supabase
                        .from('vessels')
                        .select('id')
                        .eq('captain_id', userId)
                        .maybeSingle(); // Use maybeSingle to avoid 406 errors on 0 rows

                    if (ownedVessel) {
                        console.log("⚓️ Captain Ownership logic: Found owned vessel.", ownedVessel.id);
                        finalVesselId = ownedVessel.id;

                        // Fix the profile link if it was wrong
                        if (data.vessel_id !== ownedVessel.id) {
                            console.warn("⚠️ Fixing Profile Link mismatch for captain.");
                            supabase.from('profiles').update({ vessel_id: ownedVessel.id }).eq('id', userId).then();
                        }
                    } else {
                        // User is captain but owns no vessel.
                        // Ensure we don't accidentally link them to a phantom vessel from a stale profile (unlikely but possible).
                        // Actually, if they are captain, they should only be linked if they own it.
                        // But maybe they are a "hired captain" linked to someone else's vessel? (Not in v1 spec).
                        // For v1: Captain = Owner.
                        if (finalVesselId) {
                            console.warn("⚠️ Captain has profile link but specific ownership check returned none. TRUSTING PROFILE LINK.");
                            // finalVesselId = undefined; // DISABLE DESTRUCTIVE OVERWRITE
                        }
                    }
                }

                setUser({
                    id: data.id,
                    name: data.name,
                    email: data.email || email,
                    role: finalRole as UserRole,
                    vesselId: finalVesselId, // Use resolved ID
                    customRole: data.custom_role,
                    nationality: data.nationality,
                    passportNumber: data.passport_number,
                    dateOfBirth: data.date_of_birth,
                    reminder1: data.reminder_1 || 0,
                    reminder2: data.reminder_2 || 0
                });
            }
        } catch (err: any) {
            console.error("Unexpected error fetching profile:", err);
            // Fallback for unexpected errors
            const fallbackUser: User = {
                id: userId,
                name: (metadata?.full_name || metadata?.name) || email.split('@')[0] || 'User',
                email: email,
                role: (metadata?.role === 'captain' || metadata?.role === 'crew') ? metadata.role : 'crew' as UserRole,
            };
            setUser(fallbackUser);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const updateUser = (updates: Partial<User>) => {
        if (!user) return;
        setUser({ ...user, ...updates });
    }

    const refreshUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata);
            }
        } catch (e) {
            console.error("Refresh failed", e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, logout, updateUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

