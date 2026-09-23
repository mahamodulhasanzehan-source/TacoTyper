// Web Audio API Audio Synthesizer + HTML5 Audio Fallback
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

const moveAudio = new Audio('/games/chess/move.mp3');
const captureAudio = new Audio('/games/chess/capture.mp3');
moveAudio.preload = 'auto';
captureAudio.preload = 'auto';

export const SoundEngine = {
    muted: false,

    init() {
        getAudioContext();
    },

    // Soft click sound when selecting a piece
    playSelect() {
        if (this.muted) return;
        try {
            const ctx = getAudioContext();
            if (ctx) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.04);
            }
        } catch (e) {}
    },

    // Crisp sound when moving a piece
    playMove() {
        if (this.muted) return;
        try {
            moveAudio.currentTime = 0;
            moveAudio.volume = 1.0;
            const playPromise = moveAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    this.playSynthMove();
                });
            }
        } catch (e) {
            this.playSynthMove();
        }
    },

    playSynthMove() {
        try {
            const ctx = getAudioContext();
            if (ctx) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(320, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.07);
                gain.gain.setValueAtTime(0.4, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.07);
            }
        } catch (e) {}
    },

    // Solid sound when capturing a piece
    playCapture() {
        if (this.muted) return;
        try {
            captureAudio.currentTime = 0;
            captureAudio.volume = 1.0;
            const playPromise = captureAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    this.playSynthCapture();
                });
            }
        } catch (e) {
            this.playSynthCapture();
        }
    },

    playSynthCapture() {
        try {
            const ctx = getAudioContext();
            if (ctx) {
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = 'square';
                osc2.type = 'sine';

                osc1.frequency.setValueAtTime(450, ctx.currentTime);
                osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.09);

                osc2.frequency.setValueAtTime(200, ctx.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.09);

                gain.gain.setValueAtTime(0.5, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc1.start();
                osc2.start();
                osc1.stop(ctx.currentTime + 0.09);
                osc2.stop(ctx.currentTime + 0.09);
            }
        } catch (e) {}
    },

    // Dual-tone alert for check
    playCheck() {
        if (this.muted) return;
        this.playCapture();
        try {
            const ctx = getAudioContext();
            if (ctx) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15); // A5 -> D6
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
            }
        } catch (e) {}
    },

    // Double move sound for castling
    playCastle() {
        if (this.muted) return;
        this.playMove();
        setTimeout(() => this.playMove(), 120);
    },

    // Victory/Defeat chord chime for checkmate
    playCheckmate() {
        if (this.muted) return;
        try {
            const ctx = getAudioContext();
            if (ctx) {
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime + idx * 0.08);
                    osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
                });
            }
        } catch (e) {}
    },

    playStart() {
        this.playMove();
    },

    playEnd() {
        this.playCapture();
    }
};
