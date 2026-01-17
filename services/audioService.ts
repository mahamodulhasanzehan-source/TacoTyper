class AudioService {
  private audioCtx: AudioContext | null = null;

  private init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSound(type: 'type' | 'hit' | 'rotten_penalty' | 'powerup' | 'fiesta' | 'trap_avoid') {
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (type === 'type') {
        osc.type = 'square'; osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.05, now); osc.start(now); osc.stop(now+0.05);
    } else if (type === 'hit') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now+0.1);
        gain.gain.setValueAtTime(0.1, now); osc.start(now); osc.stop(now+0.15);
    } else if (type === 'rotten_penalty') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
        gain.gain.setValueAtTime(0.2, now); osc.start(now); osc.stop(now+0.3);
    } else if (type === 'powerup') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.linearRampToValueAtTime(1500, now+0.3);
        gain.gain.setValueAtTime(0.2, now); osc.start(now); osc.stop(now+0.3);
    } else if (type === 'fiesta') {
        osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(600, now+0.2);
        gain.gain.setValueAtTime(0.1, now); osc.start(now); osc.stop(now+0.2);
    } else if (type === 'trap_avoid') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(200, now);
        gain.gain.setValueAtTime(0.1, now); osc.start(now); osc.stop(now+0.1);
    }
  }
}

export const audioService = new AudioService();