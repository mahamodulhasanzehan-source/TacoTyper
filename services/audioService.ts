
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

  playSound(type: 'type' | 'hit' | 'rotten_penalty' | 'powerup' | 'fiesta' | 'trap_avoid' | 'mine_click' | 'mine_flag' | 'mine_explode' | 'mine_win') {
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
    // --- Minesweeper Sounds ---
    else if (type === 'mine_click') {
        // High pitched short "blip"
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(800, now); 
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.1, now); 
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now+0.05);
    } else if (type === 'mine_flag') {
        // Lower pitched "thud"
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now+0.1);
    } else if (type === 'mine_explode') {
        // Noise simulation using sawtooth with rapid frequency drop
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now); osc.stop(now+0.5);
    } else if (type === 'mine_win') {
        // Victory arpeggio
        const playNote = (freq: number, start: number, dur: number) => {
            const o = this.audioCtx!.createOscillator();
            const g = this.audioCtx!.createGain();
            o.type = 'square';
            o.frequency.value = freq;
            o.connect(g);
            g.connect(this.audioCtx!.destination);
            g.gain.value = 0.1;
            g.gain.linearRampToValueAtTime(0, start + dur);
            o.start(start);
            o.stop(start + dur);
        };
        playNote(523.25, now, 0.1); // C5
        playNote(659.25, now + 0.1, 0.1); // E5
        playNote(783.99, now + 0.2, 0.1); // G5
        playNote(1046.50, now + 0.3, 0.4); // C6
    }
  }
}

export const audioService = new AudioService();
