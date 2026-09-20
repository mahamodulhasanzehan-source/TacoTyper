
export type SoundType = 
  | 'type' | 'hit' | 'rotten_penalty' | 'powerup' | 'fiesta' | 'trap_avoid'
  | 'mine_click' | 'mine_flag' | 'mine_explode' | 'mine_win'
  | 'tile_click' | 'piece_drop' | 'piece_land' | 'tictac_move'
  | 'success' | 'failure' | 'button_click' | 'word_valid' | 'word_invalid'
  | 'correct_answer' | 'wrong_answer'
  | 'knife_hit' | 'knife_deflect';

class AudioService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  private init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  playSound(type: SoundType) {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    // Helper for filtered noise (landing/thump)
    const playThump = (freq: number, decay: number, gainVal: number) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + decay);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(now);
      osc.stop(now + decay);
    };

    if (type === 'type') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.04, now); osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now+0.05);
    } else if (type === 'hit') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now+0.1);
        gain.gain.setValueAtTime(0.08, now); osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now+0.15);
    } else if (type === 'rotten_penalty') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
        gain.gain.setValueAtTime(0.15, now); osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now+0.3);
    } else if (type === 'powerup') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.linearRampToValueAtTime(1500, now+0.3);
        gain.gain.setValueAtTime(0.15, now); osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now+0.3);
    } else if (type === 'fiesta') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(600, now+0.2);
        gain.gain.setValueAtTime(0.08, now); osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now+0.2);
    } else if (type === 'trap_avoid') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(200, now);
        gain.gain.setValueAtTime(0.08, now); osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now+0.1);
    } 
    // --- Minesweeper Sounds ---
    else if (type === 'mine_click' || type === 'tile_click') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(850, now); 
        osc.frequency.exponentialRampToValueAtTime(1300, now + 0.04);
        gain.gain.setValueAtTime(0.06, now); 
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now+0.04);
    } else if (type === 'mine_flag') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now+0.08);
    } else if (type === 'mine_explode') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now+0.4);
    } else if (type === 'mine_win' || type === 'success') {
        const playNote = (freq: number, start: number, dur: number) => {
            const o = this.audioCtx!.createOscillator();
            const g = this.audioCtx!.createGain();
            o.type = 'sine';
            o.frequency.value = freq;
            o.connect(g);
            g.connect(this.audioCtx!.destination);
            g.gain.setValueAtTime(0.08, start);
            g.gain.exponentialRampToValueAtTime(0.001, start + dur);
            o.start(start);
            o.stop(start + dur);
        };
        playNote(523.25, now, 0.12); // C5
        playNote(659.25, now + 0.08, 0.12); // E5
        playNote(783.99, now + 0.16, 0.15); // G5
        playNote(1046.50, now + 0.24, 0.35); // C6
    }
    // --- Connect 4 & Board Game Sounds ---
    else if (type === 'piece_drop') {
        // Subtle whoosh/slide
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now + 0.18);
    } else if (type === 'piece_land') {
        // Realistic plastic/wood impact thud
        playThump(160, 0.14, 0.15);
    } else if (type === 'tictac_move') {
        // Soft tactile placement
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.07);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now + 0.07);
    } else if (type === 'button_click') {
        // Very subtle UI tap
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now + 0.03);
    } else if (type === 'word_valid' || type === 'correct_answer') {
        // Gentle affirmative ding
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'word_invalid' || type === 'failure' || type === 'wrong_answer') {
        // Gentle soft error buzz (low-pitch non-jarring)
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'knife_hit') {
        // Meaty wooden chop / thud sound
        const snap = this.audioCtx.createOscillator();
        const snapGain = this.audioCtx.createGain();
        snap.type = 'triangle';
        snap.frequency.setValueAtTime(800, now);
        snap.frequency.exponentialRampToValueAtTime(120, now + 0.05);
        snapGain.gain.setValueAtTime(0.18, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        snap.connect(snapGain);
        snapGain.connect(this.audioCtx.destination);
        snap.start(now);
        snap.stop(now + 0.05);

        // Low wooden resonance body
        playThump(220, 0.12, 0.22);
    } else if (type === 'knife_deflect') {
        // Metallic ricochet blade clash & ringing resonance
        const ping1 = this.audioCtx.createOscillator();
        const ping2 = this.audioCtx.createOscillator();
        const metalGain = this.audioCtx.createGain();
        
        ping1.type = 'sine';
        ping2.type = 'triangle';
        ping1.frequency.setValueAtTime(2400, now);
        ping2.frequency.setValueAtTime(3600, now);
        
        metalGain.gain.setValueAtTime(0.2, now);
        metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        ping1.connect(metalGain);
        ping2.connect(metalGain);
        metalGain.connect(this.audioCtx.destination);
        
        ping1.start(now);
        ping2.start(now);
        ping1.stop(now + 0.35);
        ping2.stop(now + 0.35);
    }
  }
}

export const audioService = new AudioService();

