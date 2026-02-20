
export const playAlarm = (type: 'gentle' | 'loud') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'gentle') {
            osc.frequency.setValueAtTime(440, now); // A4
            gain.gain.setValueAtTime(0.1, now); // Quiet
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5); // Single beep
        } else {
            // Loud Alarm: Two high pitched beeps
            osc.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(0.5, now); // Louder
            osc.start(now);
            osc.stop(now + 0.2);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.setValueAtTime(880, now);
            gain2.gain.setValueAtTime(0.5, now);
            osc2.start(now + 0.3);
            osc2.stop(now + 0.5);
        }
    } catch (e) {
        console.error("Audio play failed", e);
    }
};
