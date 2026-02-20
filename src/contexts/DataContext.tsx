import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

import { NotificationService } from '../services/NotificationService';
export interface Vessel {
    id: string;
    captainId: string;
    name: string;
    length: number;
    type: 'motor' | 'sail';
    capacity: number;
    joinCode: string;
    checkInEnabled: boolean;
    checkInInterval: number;
}

export interface JoinRequest {
    id: string;
    userId: string;
    userName: string;
    vesselId: string;
    status: 'pending' | 'approved' | 'declined';
    createdAt: string;
}

export interface WatchSchedule {
    id: string;
    vesselId: string;
    name: string;
    watchType: 'anchor' | 'Navigation' | 'dock';
    createdAt: string;
    // New fields for generator meta-data
    crewPerWatch?: number;
    isStaggered?: boolean;
    slots: {
        id: number;
        start: string;
        end: string;
        crew: { userId: string; userName: string; checkedInAt?: string }[];
    }[];
}

export interface UserData {
    id: string;
    email: string;
    password?: string; // In a real app, this would be hashed
    name: string;
    role: 'captain' | 'crew';
    customRole?: string; // e.g. "Bosun", "Chief Stew"
    vesselId?: string | null;
    // Extended profile fields for Crew List Export
    nationality?: string;
    passportNumber?: string;
    dateOfBirth?: string;
    reminder1?: number; // Minutes before watch
    reminder2?: number; // Minutes before watch
}

interface DataContextType {
    vessels: Vessel[];
    requests: JoinRequest[];
    schedules: WatchSchedule[];
    createVessel: (vessel: Omit<Vessel, 'id' | 'joinCode'>) => Promise<Vessel | null>;
    getVessel: (id: string) => Vessel | undefined;
    getVesselByJoinCode: (code: string) => Vessel | undefined;
    requestJoin: (userId: string, userName: string, code: string) => Promise<{ success: boolean; message: string }>;
    getRequestsForVessel: (vesselId: string) => JoinRequest[];
    updateRequestStatus: (requestId: string, status: 'approved' | 'declined') => Promise<void>;
    getCrewVessel: (userId: string) => Vessel | undefined;
    getPendingRequest: (userId: string) => JoinRequest | undefined;
    createSchedule: (schedule: Omit<WatchSchedule, 'id'>) => Promise<void>;
    updateScheduleSlot: (vesselId: string, slotId: number, crewIds: string[]) => Promise<void>;
    updateScheduleSettings: (vesselId: string, updates: Partial<WatchSchedule>) => Promise<void>;
    getSchedule: (vesselId: string) => WatchSchedule | undefined;
    users: UserData[];
    updateUserInStore: (userId: string, updates: Partial<UserData>) => Promise<void>;
    loading: boolean;
    removeCrew: (vesselId: string, userId: string) => Promise<void>;
    updateCrewRole: (userId: string, newRole: string) => void;
    updateVesselSettings: (vesselId: string, updates: Partial<Vessel>) => Promise<void>;
    checkInToWatch: (vesselId: string, slotId: number, userId: string) => Promise<void>;
    confirmWatchAlert: (vesselId: string, slotId: number, userId: string) => Promise<void>;
    deleteSchedule: (vesselId: string) => Promise<void>;
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Database interfaces representing the exact schema of Supabase tables
interface SupabaseProfile {
    id: string;
    email: string;
    name: string;
    role: 'captain' | 'crew';
    custom_role?: string;
    vessel_id?: string | null;
    nationality?: string;
    passport_number?: string;
    date_of_birth?: string;
    reminder_1?: number;
    reminder_2?: number;
}

interface SupabaseVessel {
    id: string;
    captain_id: string;
    name: string;
    length: number;
    type: 'motor' | 'sail';
    capacity: number;
    join_code: string;
    check_in_enabled: boolean;
    check_in_interval?: number;
}

interface SupabaseJoinRequest {
    id: string;
    user_id: string;
    user_name: string;
    vessel_id: string;
    status: 'pending' | 'approved' | 'declined';
    created_at: string;
}

interface SupabaseSchedule {
    id: string;
    vessel_id: string;
    name: string;
    watch_type: 'anchor' | 'Navigation' | 'dock';
    created_at: string;
    slots: {
        id: number;
        start: string;
        end: string;
        crew: { userId: string; userName: string; checkedInAt?: string }[];
        condition?: 'always' | 'weekend-only';
    }[];
}

export function DataProvider({ children }: { children: ReactNode }) {
    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [schedules, setSchedules] = useState<WatchSchedule[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    const mapProfile = (p: SupabaseProfile): UserData => ({
        id: p.id,
        email: p.email,
        password: '',
        name: p.name,
        role: p.role,
        customRole: p.custom_role,
        vesselId: p.vessel_id,
        nationality: p.nationality,
        passportNumber: p.passport_number,
        dateOfBirth: p.date_of_birth,
        reminder1: p.reminder_1 || 0,
        reminder2: p.reminder_2 || 0
    });

    const mapVessel = (v: SupabaseVessel): Vessel => ({
        id: v.id,
        captainId: v.captain_id,
        name: v.name,
        length: Number(v.length),
        type: v.type,
        capacity: v.capacity,
        joinCode: v.join_code,
        checkInEnabled: v.check_in_enabled,
        checkInInterval: v.check_in_interval || 15
    });

    const mapRequest = (r: SupabaseJoinRequest): JoinRequest => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        vesselId: r.vessel_id,
        status: r.status,
        createdAt: r.created_at
    });

    const mapSchedule = (s: SupabaseSchedule): WatchSchedule => ({
        id: s.id,
        vesselId: s.vessel_id,
        name: s.name,
        watchType: s.watch_type,
        createdAt: s.created_at,
        slots: s.slots
    });

    // State to track if we have loaded initial data to avoid spamming notifications on startup
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    // Refs to track known IDs for diffing
    const knownRequestIds = useRef<Set<string>>(new Set());
    const knownScheduleIds = useRef<Set<string>>(new Set());

    const refreshData = async () => {

        const { data: pData } = await supabase.from('profiles').select('*');
        if (pData) setUsers((pData as SupabaseProfile[]).map(mapProfile));

        const { data: vData } = await supabase.from('vessels').select('*');
        if (vData) setVessels((vData as SupabaseVessel[]).map(mapVessel));

        const { data: rData } = await supabase.from('join_requests').select('*');
        if (rData) {
            const newRequests = (rData as SupabaseJoinRequest[]).map(mapRequest);
            setRequests(newRequests);

            // Notification Logic for Join Requests
            if (initialLoadComplete) {
                newRequests.forEach(req => {
                    if (!knownRequestIds.current.has(req.id)) {
                        // New Request Found!
                        handleNewRequestNotification(req);
                        knownRequestIds.current.add(req.id);
                    }
                });

                // Track status changes for existing requests (e.g. Approved/Declined) needs more complex diffing
                // For now, we rely on the Realtime event for status updates, or we can add a 'knownStatus' map.
                // Let's stick to new requests for polling to keep it simple, as status updates are less critical to miss by a few seconds
                // unless we implement a full state diff.
            } else {
                // Initial Load - just populate
                newRequests.forEach(req => knownRequestIds.current.add(req.id));
            }
        }

        // ORDER BY created_at DESC to ensure we always get the latest schedule first
        const { data: sData } = await supabase.from('schedules').select('*').order('created_at', { ascending: false });
        if (sData) {

            const newSchedules = (sData as SupabaseSchedule[]).map(mapSchedule);
            setSchedules(newSchedules);

            // Notification Logic for Schedules
            if (initialLoadComplete) {
                newSchedules.forEach(sch => {
                    if (!knownScheduleIds.current.has(sch.id)) {
                        handleNewScheduleNotification(sch);
                        knownScheduleIds.current.add(sch.id);
                    }
                });
            } else {
                newSchedules.forEach(sch => knownScheduleIds.current.add(sch.id));
            }
        }

        if (!initialLoadComplete) setInitialLoadComplete(true);
    };

    const handleNewRequestNotification = async (req: JoinRequest) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Check if I am the captain
        const { data: vessel } = await supabase.from('vessels').select('captain_id, name').eq('id', req.vesselId).single();
        if (vessel && vessel.captain_id === user.id) {
            NotificationService.sendLocalAlert('New Join Request', `${req.userName} requests to join ${vessel.name}`);
        }
        // Also check if *I* am the one who was approved (status change) - but this function detects NEW requests (pending).
        // Approved requests are updates, not inserts. 
    };

    const handleNewScheduleNotification = async (sch: WatchSchedule) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Check if I am a crew member of this vessel
        const { data: profile } = await supabase.from('profiles').select('vessel_id').eq('id', user.id).single();
        if (profile && profile.vessel_id === sch.vesselId) {
            NotificationService.sendLocalAlert('New Watch Schedule', `A new schedule "${sch.name}" has been published.`);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            await refreshData();
            setLoading(false);
        };

        loadData();

        // Polling Fallback (every 5 seconds)
        const pollInterval = setInterval(() => {
            refreshData();
        }, 5000);

        // Realtime Subscription
        const channel = supabase.channel('vital-updates')
            // Join Requests (INSERT) -> Just refresh (polling handles notification via diff)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'join_requests' }, () => {
                refreshData();
            })
            // Join Requests (UPDATE) -> Notify Crew (Approved/Declined)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'join_requests' }, async (payload: any) => {
                await refreshData();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const updatedRequest = payload.new;
                if (updatedRequest.user_id === user.id) {
                    if (updatedRequest.status === 'approved') {
                        NotificationService.sendLocalAlert('Welcome Aboard!', `Your request to join has been approved.`);
                    } else if (updatedRequest.status === 'declined') {
                        NotificationService.sendLocalAlert('Request Declined', `Your request to join was declined.`);
                    }
                }
            })
            // Schedules (INSERT) -> Just refresh (polling handles notification)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'schedules' }, () => {
                refreshData();
            })
            // Schedules (UPDATE) -> Notify Crew of changes
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schedules' }, async (payload: any) => {
                await refreshData();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const updatedSchedule = payload.new;
                // Check if I am a crew member of this vessel (or the captain)
                const { data: profile } = await supabase.from('profiles').select('vessel_id').eq('id', user.id).single();

                if (profile && profile.vessel_id === updatedSchedule.vessel_id) {
                    NotificationService.sendLocalAlert('Schedule Updated', `The schedule "${updatedSchedule.name}" has been updated.`);
                }
            })
            .subscribe();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshData();
            }
        };

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Effect to schedule local notifications for upcoming watches
    useEffect(() => {
        const scheduleReminders = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const currentUser = users.find(u => u.id === user.id);
            if (!currentUser) return;

            const mySchedule = schedules.find(s => s.vesselId === currentUser.vesselId);
            if (mySchedule) {
                await NotificationService.scheduleWatchReminders(
                    mySchedule,
                    currentUser.id,
                    currentUser.reminder1 || 0,
                    currentUser.reminder2 || 0
                );
            }
        };

        scheduleReminders();
    }, [schedules, users]); // Re-schedule when data updates

    // Initial Permission Request
    useEffect(() => {
        NotificationService.requestPermissions();
    }, []);

    const updateUserInStore = async (userId: string, updates: Partial<UserData>) => {
        const dbUpdates: Partial<SupabaseProfile> = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.customRole) dbUpdates.custom_role = updates.customRole;
        if (updates.vesselId !== undefined) dbUpdates.vessel_id = updates.vesselId;
        if (updates.nationality) dbUpdates.nationality = updates.nationality;
        if (updates.passportNumber) dbUpdates.passport_number = updates.passportNumber;
        if (updates.dateOfBirth) dbUpdates.date_of_birth = updates.dateOfBirth;
        if (updates.reminder1 !== undefined) dbUpdates.reminder_1 = updates.reminder1;
        if (updates.reminder2 !== undefined) dbUpdates.reminder_2 = updates.reminder2;

        const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);

        if (error) {
            console.error("❌ STRICT UPDATE FAILED:", error);
            alert(`Failed to save profile changes: ${error.message}`);
            throw error;
        }

        await refreshData();
    };

    const createVessel = async (data: Omit<Vessel, 'id' | 'joinCode'>): Promise<Vessel | null> => {
        const joinCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        // Let server generate ID or use UUID
        const tempId = crypto.randomUUID();

        const dbVessel: SupabaseVessel = {
            id: tempId,
            captain_id: data.captainId,
            name: data.name,
            length: data.length,
            type: data.type,
            capacity: data.capacity,
            join_code: joinCode,
            check_in_enabled: data.checkInEnabled,
            check_in_interval: data.checkInInterval
        };



        // 1. Insert Vessel
        const { error: insertError } = await supabase.from('vessels').insert(dbVessel);
        if (insertError) {
            console.error("❌ VESSEL INSERT FAILED:", insertError);
            alert(`Failed to create vessel: ${insertError.message}`);
            return null;
        }

        // 2. Strict Verify: Read it back immediately
        const { data: verifyData, error: verifyError } = await supabase
            .from('vessels')
            .select('*')
            .eq('id', tempId)
            .single();

        if (verifyError || !verifyData) {
            console.error("❌ VESSEL VERIFICATION FAILED:", verifyError);
            alert("Vessel was created but could not be verified. Possible permissions issue.");
            return null;
        }



        // 3. Link to Captain Profile
        await updateUserInStore(data.captainId, { vesselId: tempId });


        await refreshData();
        return mapVessel(verifyData);
    };

    const getVessel = (id: string) => vessels.find(v => v.id === id);
    const getVesselByJoinCode = (code: string) => vessels.find(v => v.joinCode === code.trim().toUpperCase());

    const requestJoin = async (userId: string, userName: string, code: string) => {
        let vessel = getVesselByJoinCode(code);

        if (!vessel) {
            const { data } = await supabase.from('vessels').select('*').eq('join_code', code.trim().toUpperCase()).single();
            if (data) vessel = mapVessel(data);
        }

        if (!vessel) return { success: false, message: "Invalid Join Code" };

        const { error } = await supabase.from('join_requests').insert({
            user_id: userId,
            user_name: userName,
            vessel_id: vessel.id,
            status: 'pending'
        });

        if (error) {
            console.error("❌ Join Request Failed:", error);
            return { success: false, message: error.message };
        }

        await refreshData();
        return { success: true, message: "Request sent to Captain" };
    };

    const getRequestsForVessel = (vesselId: string) => requests.filter(r => r.vesselId === vesselId);

    const updateRequestStatus = async (requestId: string, status: 'approved' | 'declined') => {
        const { error } = await supabase.from('join_requests').update({ status }).eq('id', requestId);
        if (error) throw error;

        if (status === 'approved') {
            const request = requests.find(r => r.id === requestId);
            if (request) {
                await supabase.from('profiles').update({ vessel_id: request.vesselId }).eq('id', request.userId);
            }
        }
        await refreshData();
    };

    const getCrewVessel = (userId: string) => {
        const approvedRequest = requests.find(r => r.userId === userId && r.status === 'approved');
        if (approvedRequest) return getVessel(approvedRequest.vesselId);
        return undefined;
    };

    const getPendingRequest = (userId: string) => requests.find(r => r.userId === userId && r.status === 'pending');

    const createSchedule = async (schedule: Omit<WatchSchedule, 'id'>) => {


        // 1. Delete ALL existing schedules for this vessel to prevent duplicates
        const { error: deleteError } = await supabase.from('schedules').delete().eq('vessel_id', schedule.vesselId);
        if (deleteError) {
            console.error("❌ Failed to clear old schedules:", deleteError);
            // We proceed anyway, but warn
        } else {

        }

        // 2. Insert new schedule
        const { error: insertError } = await supabase.from('schedules').insert({
            vessel_id: schedule.vesselId,
            name: schedule.name,
            watch_type: schedule.watchType,
            slots: schedule.slots
        });

        if (insertError) {
            console.error("❌ Failed to create schedule:", insertError);
            alert("Failed to publish schedule. Please try again.");
            return;
        }


        await refreshData();
    };

    const deleteSchedule = async (vesselId: string) => {
        const { error } = await supabase.from('schedules').delete().eq('vessel_id', vesselId);

        if (error) {
            console.error("Error deleting schedule:", error);
            throw error;
        }

        await refreshData();
    };

    const updateScheduleSlot = async (vesselId: string, slotId: number, crewIds: string[]) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;

        const newSlots = schedule.slots.map(slot => {
            if (slot.id === slotId) {
                const updatedCrew = crewIds.map(id => {
                    const existingEntry = slot.crew.find((c: any) => c.userId === id);
                    if (existingEntry) return existingEntry;
                    const req = requests.find(r => r.userId === id && r.vesselId === vesselId);
                    return { userId: id, userName: req ? req.userName : 'Unknown' };
                });
                return { ...slot, crew: updatedCrew };
            }
            return slot;
        });

        await supabase.from('schedules').update({ slots: newSlots }).eq('id', schedule.id);
        await refreshData();
    };

    const updateScheduleSettings = async (vesselId: string, updates: Partial<WatchSchedule>) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;

        const dbUpdates: Partial<SupabaseSchedule> = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.watchType) dbUpdates.watch_type = updates.watchType;

        await supabase.from('schedules').update(dbUpdates).eq('id', schedule.id);
        await refreshData();
    };

    const getSchedule = (vesselId: string) => schedules.find(s => s.vesselId === vesselId);

    const removeCrew = async (vesselId: string, userId: string) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);

        // Check if user is in an active schedule
        if (schedule) {
            const isUserInSchedule = schedule.slots.some(slot =>
                slot.crew.some(c => c.userId === userId)
            );

            if (isUserInSchedule) {
                alert("This user is involved in a live watch schedule, and therefore cannot be removed from the vessel at this time. Please remove them from the schedule slots and try again.");
                return;
            }
        }

        // Proceed with removal if not in schedule


        // Optimistic UI Update
        setRequests(prev => prev.filter(r => !(r.userId === userId && r.vesselId === vesselId)));
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, vesselId: undefined } : u));

        try {
            // Use Secure RPC (v2)
            const { error } = await supabase.rpc('remove_crew_member_v2', {
                target_user_id: userId,
                target_vessel_id: vesselId
            });

            if (error) {
                console.error("Failed to remove crew member (RPC):", error);
                throw error;
            } else {

            }
        } catch (e) {
            console.error("Removal failed:", e);
            let errorMessage = "Unknown error";
            if (e instanceof Error) {
                errorMessage = e.message;
            } else if (typeof e === 'object' && e !== null && 'message' in e) {
                errorMessage = (e as any).message;
            } else if (typeof e === 'string') {
                errorMessage = e;
            }
            alert(`Failed to remove crew member: ${errorMessage}`);
            // Revert optimistic update by forcing a refresh
            await refreshData();
            return;
        }

        await refreshData();
    };

    const updateCrewRole = (userId: string, newRole: string) => {
        updateUserInStore(userId, { customRole: newRole });
    };

    const checkInToWatch = async (vesselId: string, slotId: number, userId: string) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;

        const newSlots = schedule.slots.map(slot => {
            if (slot.id === slotId) {
                const newCrew = slot.crew.map((c: any) => {
                    if (c.userId === userId) {
                        // Should we use ISO string for consistency? checking usage.. currently using localeTimeString.
                        // Let's stick to localeTimeString for display simplicity as per existing code, or switch to ISO if needed for calc.
                        // Existing code: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        // We need comparisons, so ISO is better for 'lastActiveAt'.
                        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        return { ...c, checkedInAt: timeString, lastActiveAt: new Date().toISOString() };
                    }
                    return c;
                });
                return { ...slot, crew: newCrew };
            }
            return slot;
        });

        await supabase.from('schedules').update({ slots: newSlots }).eq('id', schedule.id);
        await refreshData();
    };

    const confirmWatchAlert = async (vesselId: string, slotId: number, userId: string) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;

        const newSlots = schedule.slots.map(slot => {
            if (slot.id === slotId) {
                const newCrew = slot.crew.map((c: any) => {
                    if (c.userId === userId) {
                        return { ...c, lastActiveAt: new Date().toISOString() };
                    }
                    return c;
                });
                return { ...slot, crew: newCrew };
            }
            return slot;
        });

        await supabase.from('schedules').update({ slots: newSlots }).eq('id', schedule.id);
        await refreshData();
    };

    const updateVesselSettings = async (vesselId: string, updates: Partial<Vessel>) => {
        const dbUpdates: Partial<SupabaseVessel> = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.length) dbUpdates.length = updates.length;
        if (updates.capacity) dbUpdates.capacity = updates.capacity;
        if (updates.checkInEnabled !== undefined) dbUpdates.check_in_enabled = updates.checkInEnabled;
        if (updates.checkInInterval) dbUpdates.check_in_interval = updates.checkInInterval;

        await supabase.from('vessels').update(dbUpdates).eq('id', vesselId);
        await refreshData();
    };

    return (
        <DataContext.Provider value={{
            vessels, requests, schedules, createVessel, getVessel, getVesselByJoinCode,
            requestJoin, getRequestsForVessel, updateRequestStatus, getCrewVessel, getPendingRequest,
            createSchedule, updateScheduleSlot, updateScheduleSettings, getSchedule,
            users, updateUserInStore, loading,
            removeCrew, updateCrewRole, updateVesselSettings, checkInToWatch, confirmWatchAlert, deleteSchedule, refreshData
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
