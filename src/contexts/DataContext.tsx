import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface Vessel {
    id: string;
    captainId: string;
    name: string;
    length: number;
    type: 'motor' | 'sail';
    capacity: number;
    joinCode: string;
    allowWatchSwapping: boolean;
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
    watchType: 'anchor' | 'underway' | 'dock';
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
    vesselId?: string;
    // Extended profile fields for Crew List Export
    nationality?: string;
    passportNumber?: string;
    dateOfBirth?: string;
}

interface DataContextType {
    vessels: Vessel[];
    requests: JoinRequest[];
    schedules: WatchSchedule[];
    users: UserData[];
    loading: boolean;
    updateUserInStore: (userId: string, updates: Partial<UserData>) => Promise<void>;
    createVessel: (vessel: Omit<Vessel, 'id' | 'joinCode'>) => Promise<Vessel | null>;
    getVessel: (id: string) => Vessel | undefined;
    getVesselByJoinCode: (code: string) => Vessel | undefined;
    requestJoin: (userId: string, userName: string, code: string) => Promise<{ success: boolean; message: string }>;
    getRequestsForVessel: (vesselId: string) => JoinRequest[];
    updateRequestStatus: (requestId: string, status: 'approved' | 'declined') => void;
    getCrewVessel: (userId: string) => Vessel | undefined;
    getPendingRequest: (userId: string) => JoinRequest | undefined;
    createSchedule: (schedule: Omit<WatchSchedule, 'id'>) => void;
    updateScheduleSlot: (vesselId: string, slotId: number, crewIds: string[]) => void;
    updateScheduleSettings: (vesselId: string, updates: Partial<WatchSchedule>) => void;
    getSchedule: (vesselId: string) => WatchSchedule | undefined;
    removeCrew: (vesselId: string, userId: string) => void;
    updateCrewRole: (userId: string, newRole: string) => void;
    updateVesselSettings: (vesselId: string, updates: Partial<Vessel>) => void;
    checkInToWatch: (vesselId: string, slotId: number, userId: string) => void;
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
    vessel_id?: string;
    nationality?: string;
    passport_number?: string;
    date_of_birth?: string;
}

interface SupabaseVessel {
    id: string;
    captain_id: string;
    name: string;
    length: number;
    type: 'motor' | 'sail';
    capacity: number;
    join_code: string;
    allow_watch_swapping: boolean;
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
    watch_type: 'anchor' | 'underway' | 'dock';
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
        dateOfBirth: p.date_of_birth
    });

    const mapVessel = (v: SupabaseVessel): Vessel => ({
        id: v.id,
        captainId: v.captain_id,
        name: v.name,
        length: Number(v.length),
        type: v.type,
        capacity: v.capacity,
        joinCode: v.join_code,
        allowWatchSwapping: v.allow_watch_swapping,
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

    useEffect(() => {
        const loadData = async () => {
            await refreshData();
            setLoading(false);
        };

        loadData();

        // Realtime Subscription
        const channel = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                console.log("🔔 Realtime Update received:", payload);
                refreshData();
            })
            .subscribe((status) => {
                console.log("📡 Realtime Subscription Status:", status);
            });

        return () => { supabase.removeChannel(channel); };
    }, []);

    const refreshData = async () => {
        console.log("🔄 Fetching Fresh Data...");
        const { data: pData } = await supabase.from('profiles').select('*');
        if (pData) setUsers((pData as SupabaseProfile[]).map(mapProfile));

        const { data: vData } = await supabase.from('vessels').select('*');
        if (vData) setVessels((vData as SupabaseVessel[]).map(mapVessel));

        const { data: rData } = await supabase.from('join_requests').select('*');
        if (rData) setRequests((rData as SupabaseJoinRequest[]).map(mapRequest));

        const { data: sData } = await supabase.from('schedules').select('*');
        if (sData) setSchedules((sData as SupabaseSchedule[]).map(mapSchedule));
    };

    const updateUserInStore = async (userId: string, updates: Partial<UserData>) => {
        const dbUpdates: Partial<SupabaseProfile> = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.customRole) dbUpdates.custom_role = updates.customRole;
        if (updates.vesselId !== undefined) dbUpdates.vessel_id = updates.vesselId;
        if (updates.nationality) dbUpdates.nationality = updates.nationality;
        if (updates.passportNumber) dbUpdates.passport_number = updates.passportNumber;
        if (updates.dateOfBirth) dbUpdates.date_of_birth = updates.dateOfBirth;

        console.log(`📝 STRICT UPDATE: Updating user ${userId}`, dbUpdates);

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
            allow_watch_swapping: data.allowWatchSwapping,
            check_in_interval: data.checkInInterval
        };

        console.log("🚀 STRICT CREATE: Attempting to create vessel:", dbVessel);

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

        console.log("✅ VESSEL VERIFIED. Linking to Captain...");

        // 3. Link to Captain Profile
        await updateUserInStore(data.captainId, { vesselId: tempId });

        console.log("🎉 Vessel Setup Complete.");
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
        // Attempt to delete existing schedule first (if allowing one per vessel)
        await supabase.from('schedules').delete().eq('vessel_id', schedule.vesselId);

        await supabase.from('schedules').insert({
            vessel_id: schedule.vesselId,
            name: schedule.name,
            watch_type: schedule.watchType,
            slots: schedule.slots
        });
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
        await updateUserInStore(userId, { vesselId: undefined });

        await supabase.from('join_requests').delete().eq('user_id', userId).eq('vessel_id', vesselId);

        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (schedule) {
            const newSlots = schedule.slots.map(slot => ({
                ...slot,
                crew: slot.crew.filter((c: any) => c.userId !== userId)
            }));
            await supabase.from('schedules').update({ slots: newSlots }).eq('id', schedule.id);
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
                        return { ...c, checkedInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
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
        if (updates.allowWatchSwapping !== undefined) dbUpdates.allow_watch_swapping = updates.allowWatchSwapping;
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
            removeCrew, updateCrewRole, updateVesselSettings, checkInToWatch, deleteSchedule, refreshData
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
