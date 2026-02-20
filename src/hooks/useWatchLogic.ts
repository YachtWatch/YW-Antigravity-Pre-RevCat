import { useState, useEffect } from 'react';
import { playAlarm } from '../lib/audio-utils';

interface WatchLogicProps {
    vessel: any;
    schedule: any;
    user: any;
}

export const useWatchLogic = ({ vessel, schedule, user }: WatchLogicProps) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [watchStatus, setWatchStatus] = useState<'normal' | 'green' | 'orange' | 'red'>('normal');

    const now = new Date();

    // 1. Find the currently active slot (globally)
    const currentGlobalSlot = schedule?.slots.find((slot: any) => {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        return now >= start && now < end;
    });

    // 2. Check if user is on this active watch
    const isUserOnWatch = currentGlobalSlot?.crew.some((c: any) => c.userId === user?.id);

    // 3. Find the NEXT upcoming watch for this user
    const myNextSlot = schedule?.slots
        .filter((slot: any) => {
            const start = new Date(slot.start);
            return start > now && slot.crew.some((c: any) => c.userId === user?.id);
        })
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

    // 4. Find the NEXT global slot (for "Up Next" display)
    const nextGlobalSlot = schedule?.slots
        .filter((slot: any) => {
            const start = new Date(slot.start);
            return start > now;
        })
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

    const displaySlot = isUserOnWatch ? currentGlobalSlot : myNextSlot;
    const myCrewEntry = displaySlot?.crew.find((c: any) => c.userId === user?.id);
    const isCheckedIn = !!myCrewEntry?.checkedInAt;

    useEffect(() => {
        const updateTimer = () => {
            if (isUserOnWatch && currentGlobalSlot) {
                // CASE 1: ON WATCH (Count down to end of watch)
                const end = new Date(currentGlobalSlot.end).getTime();
                const nowTime = new Date().getTime();
                const diff = end - nowTime;

                if (diff <= 0) {
                    setTimeLeft('00:00:00');
                } else {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${h}h ${m}m ${s}s`);
                }

                // ALERT LOGIC (Only when on watch)
                if (isCheckedIn && myCrewEntry && vessel) {
                    let lastActiveTime = 0;
                    const entry = myCrewEntry as any;
                    if (entry.lastActiveAt) {
                        lastActiveTime = new Date(entry.lastActiveAt).getTime();
                    } else if (entry.checkedInAt) {
                        const [hh, mm] = entry.checkedInAt.split(':');
                        const d = new Date();
                        d.setHours(Number(hh), Number(mm), 0, 0);
                        if (d.getTime() > nowTime + 1000 * 60 * 60) {
                            d.setDate(d.getDate() - 1);
                        }
                        lastActiveTime = d.getTime();
                    }

                    if (lastActiveTime > 0) {
                        const diffMinutes = (nowTime - lastActiveTime) / 1000 / 60;
                        const interval = vessel.checkInInterval || 15;

                        let newStatus: 'green' | 'orange' | 'red' = 'green';
                        if (diffMinutes <= interval) newStatus = 'green';
                        else if (diffMinutes <= interval + 1) newStatus = 'orange';
                        else newStatus = 'red';

                        setWatchStatus(newStatus);

                        const seconds = Math.floor(nowTime / 1000);
                        if (newStatus === 'orange') {
                            if (seconds % 15 === 0) playAlarm('gentle');
                        } else if (newStatus === 'red') {
                            if (seconds % 5 === 0) playAlarm('loud');
                        }
                    }
                } else {
                    setWatchStatus('normal');
                }

            } else if (myNextSlot) {
                // CASE 2: OFF WATCH (Count down to start of next watch)
                // Format: HHh MMm (no seconds)
                const start = new Date(myNextSlot.start).getTime();
                const nowTime = new Date().getTime();
                const diff = start - nowTime;

                if (diff <= 0) {
                    setTimeLeft('Starting...');
                } else {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    setTimeLeft(`${h}h ${m}m`);
                }
                setWatchStatus('normal');
            } else {
                // CASE 3: NO UPCOMING WATCH
                setTimeLeft('');
                setWatchStatus('normal');
            }
        };

        const timer = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(timer);
    }, [isUserOnWatch, currentGlobalSlot, myNextSlot, isCheckedIn, myCrewEntry, vessel]);

    return {
        currentGlobalSlot,
        isUserOnWatch,
        myNextSlot,
        displaySlot,
        timeLeft,
        watchStatus,
        isCheckedIn,
        myCrewEntry,
        nextGlobalSlot
    };
};
