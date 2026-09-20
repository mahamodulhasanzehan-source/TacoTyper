import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays } from '../services/firebase';

interface SimonGameProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

export type SimonColor = 'green' | 'red' | 'yellow' | 'blue';

interface ColorDef {
  id: SimonColor;
  name: string;
  freq: number;
  baseColor: string;
  activeColor: string;
  glowColor: string;
  borderClass: string;
}

const COLOR_DEFS: Record<SimonColor, ColorDef> = {
  green: {
    id: 'green',
    name: 'Green',
    freq: 415.3, // G#4
    baseColor: '#15803d',
    activeColor: '#4ade80',
    glowColor: 'rgba(74, 222, 128, 0.8)',
    borderClass: 'border-green-400'
  },
  red: {
    id: 'red',
    name: 'Red',
    freq: 311.13, // D#4
    baseColor: '#b91c1c',
    activeColor: '#f87171',
    glowColor: 'rgba(248, 113, 113, 0.8)',
    borderClass: 'border-red-400'
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow',
    freq: 247.94, // B3
    baseColor: '#a16207',
    activeColor: '#fde047',
    glowColor: 'rgba(253, 224, 71, 0.8)',
    borderClass: 'border-yellow-400'
  },
  blue: {
    id: 'blue',
    name: 'Blue',
    freq: 207.65, // G#3
    baseColor: '#1d4ed8',
    activeColor: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.8)',
    borderClass: 'border-blue-400'
  }
};

const COLOR_KEYS: SimonColor[] = ['green', 'red', 'yellow', 'blue'];

export default function SimonGame({ onBackToHub }: SimonGameProps) {
  const [sequence, setSequence] = useState<SimonColor[]>([]);
  const [playerStep, setPlayerStep] = useState(0);
  const [activeButton, setActiveButton] = useState<SimonColor | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'showing' | 'player' | 'success' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('simon_high_score') || '0', 10);
  });
  const [statusText, setStatusText] = useState('PRESS START');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    incrementGamePlays('simon');
    return () => {
      clearAllTimeouts();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  };

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playTone = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch {
      // Audio fallback
    }
  };

  const playBuzzer = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.6);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch {}
  };

  const playVictory = () => {
    if (!soundEnabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const t = setTimeout(() => {
        playTone(freq, 0.15, 'triangle');
      }, idx * 100);
      timeoutsRef.current.push(t);
    });
  };

  const flashColor = useCallback((color: SimonColor, duration = 350) => {
    setActiveButton(color);
    playTone(COLOR_DEFS[color].freq, duration / 1000);

    const t = setTimeout(() => {
      setActiveButton(null);
    }, duration);
    timeoutsRef.current.push(t);
  }, [soundEnabled]);

  const playSequence = useCallback((seq: SimonColor[]) => {
    setGameState('showing');
    setStatusText('WATCH...');
    clearAllTimeouts();

    // Speed up slightly as sequence grows
    const speed = Math.max(260, 600 - seq.length * 25);
    const pause = Math.max(120, 250 - seq.length * 10);

    seq.forEach((color, index) => {
      const t = setTimeout(() => {
        flashColor(color, speed);

        // When sequence finishes playing, pass control to player
        if (index === seq.length - 1) {
          const endT = setTimeout(() => {
            setGameState('player');
            setPlayerStep(0);
            setStatusText('YOUR TURN');
          }, speed + 150);
          timeoutsRef.current.push(endT);
        }
      }, index * (speed + pause) + 500);
      timeoutsRef.current.push(t);
    });
  }, [flashColor]);

  const startNewGame = () => {
    clearAllTimeouts();
    initAudio();
    const firstColor = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    const newSeq = [firstColor];
    setSequence(newSeq);
    setScore(0);
    setPlayerStep(0);
    playSequence(newSeq);
  };

  const handleColorClick = (color: SimonColor) => {
    if (gameState !== 'player') return;

    // Flash clicked color and sound immediately
    flashColor(color, 250);

    // Check if correct
    if (sequence[playerStep] === color) {
      const nextStep = playerStep + 1;
      if (nextStep === sequence.length) {
        // Round completed successfully!
        const nextScore = sequence.length;
        setScore(nextScore);
        if (nextScore > highScore) {
          setHighScore(nextScore);
          localStorage.setItem('simon_high_score', nextScore.toString());
        }

        setGameState('success');
        setStatusText('PERFECT! ⭐');
        playVictory();

        // Add next random color and play
        const nextColor = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
        const nextSeq = [...sequence, nextColor];
        setSequence(nextSeq);

        const nextRoundTimeout = setTimeout(() => {
          playSequence(nextSeq);
        }, 1100);
        timeoutsRef.current.push(nextRoundTimeout);
      } else {
        setPlayerStep(nextStep);
      }
    } else {
      // Wrong move - Game Over
      playBuzzer();
      setGameState('gameover');
      setStatusText('GAME OVER!');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#07090e] text-white select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[#0b0e17] border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm font-bold transition-all text-neutral-300 hover:text-white flex items-center gap-1.5 border border-neutral-700 active:scale-95 shadow-md cursor-pointer"
          >
            <span>←</span>
            <span>Hub</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">⭕</span>
            <h1 className="text-sm sm:text-base font-black text-amber-400 tracking-wide uppercase">Simon</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs rounded-lg text-neutral-300 transition-colors cursor-pointer"
            title="Toggle Sound"
          >
            {soundEnabled ? '🔊 Sound ON' : '🔇 Muted'}
          </button>
          <div className="text-right">
            <div className="text-[10px] sm:text-xs text-neutral-400 uppercase font-semibold">Score</div>
            <div className="text-sm sm:text-lg font-black text-emerald-400 font-mono">{score}</div>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] sm:text-xs text-neutral-400 uppercase font-semibold">High</div>
            <div className="text-sm sm:text-lg font-black text-amber-400 font-mono">{highScore}</div>
          </div>
        </div>
      </header>

      {/* Main Console Play Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 min-h-0 relative">
        {/* Status Indicator Banner */}
        <div className="mb-3 sm:mb-5 px-5 py-1.5 rounded-full bg-[#111522] border border-neutral-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.6)] text-center flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            gameState === 'showing' ? 'bg-amber-400 animate-ping' :
            gameState === 'player' ? 'bg-sky-400 animate-pulse' :
            gameState === 'success' ? 'bg-emerald-400' :
            gameState === 'gameover' ? 'bg-red-500' : 'bg-neutral-600'
          }`} />
          <span className={`text-xs sm:text-sm font-black tracking-widest uppercase font-mono ${
            gameState === 'gameover' ? 'text-red-400' :
            gameState === 'success' ? 'text-emerald-400' :
            gameState === 'showing' ? 'text-amber-300' :
            gameState === 'player' ? 'text-sky-300' :
            'text-neutral-300'
          }`}>
            {statusText}
          </span>
        </div>

        {/* Outer Heavy Arcade Rim */}
        <div className="relative aspect-square w-full max-w-[min(88vw,440px,calc(100vh-230px))] rounded-full bg-gradient-to-b from-[#2a2f3d] via-[#151922] to-[#0a0c10] p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.2)] border-2 border-neutral-700/60 flex items-center justify-center">
          
          {/* Inner Recessed Bezel Ring */}
          <div className="relative w-full h-full rounded-full bg-[#0a0c12] p-2.5 sm:p-3 shadow-[inset_0_8px_20px_rgba(0,0,0,0.95)] border-4 border-[#121620] flex items-center justify-center">

            {/* 4 Simon Quadrant Pads */}
            <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 w-full h-full rounded-full overflow-hidden p-1 touch-manipulation">
              
              {/* GREEN (Top-Left) */}
              <button
                onPointerDown={(e) => { e.preventDefault(); handleColorClick('green'); }}
                disabled={gameState === 'showing'}
                className={`w-full h-full rounded-tl-full transition-all duration-100 cursor-pointer outline-none relative overflow-hidden select-none touch-none ${
                  activeButton === 'green'
                    ? 'scale-[0.98] brightness-125'
                    : 'hover:brightness-110 active:scale-[0.97]'
                }`}
                style={{
                  background: activeButton === 'green'
                    ? 'radial-gradient(circle at 35% 35%, #86efac 0%, #22c55e 50%, #15803d 100%)'
                    : 'radial-gradient(circle at 35% 35%, #16a34a 0%, #15803d 60%, #14532d 100%)',
                  boxShadow: activeButton === 'green'
                    ? 'inset 0 0 30px #ffffff, 0 0 45px rgba(34, 197, 94, 0.9), inset 0 4px 10px rgba(255,255,255,0.6)'
                    : 'inset 0 6px 12px rgba(255,255,255,0.2), inset 0 -6px 12px rgba(0,0,0,0.7), 0 4px 10px rgba(0,0,0,0.5)',
                  border: '2px solid rgba(255,255,255,0.1)'
                }}
                aria-label="Green pad"
              >
                {/* 3D Curved Lens Specular Sheen */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/40 pointer-events-none rounded-tl-full" />
              </button>

              {/* RED (Top-Right) */}
              <button
                onPointerDown={(e) => { e.preventDefault(); handleColorClick('red'); }}
                disabled={gameState === 'showing'}
                className={`w-full h-full rounded-tr-full transition-all duration-100 cursor-pointer outline-none relative overflow-hidden select-none touch-none ${
                  activeButton === 'red'
                    ? 'scale-[0.98] brightness-125'
                    : 'hover:brightness-110 active:scale-[0.97]'
                }`}
                style={{
                  background: activeButton === 'red'
                    ? 'radial-gradient(circle at 65% 35%, #fca5a5 0%, #ef4444 50%, #b91c1c 100%)'
                    : 'radial-gradient(circle at 65% 35%, #dc2626 0%, #b91c1c 60%, #7f1d1d 100%)',
                  boxShadow: activeButton === 'red'
                    ? 'inset 0 0 30px #ffffff, 0 0 45px rgba(239, 68, 68, 0.9), inset 0 4px 10px rgba(255,255,255,0.6)'
                    : 'inset 0 6px 12px rgba(255,255,255,0.2), inset 0 -6px 12px rgba(0,0,0,0.7), 0 4px 10px rgba(0,0,0,0.5)',
                  border: '2px solid rgba(255,255,255,0.1)'
                }}
                aria-label="Red pad"
              >
                <div className="absolute inset-0 bg-gradient-to-bl from-white/30 via-transparent to-black/40 pointer-events-none rounded-tr-full" />
              </button>

              {/* YELLOW (Bottom-Left) */}
              <button
                onPointerDown={(e) => { e.preventDefault(); handleColorClick('yellow'); }}
                disabled={gameState === 'showing'}
                className={`w-full h-full rounded-bl-full transition-all duration-100 cursor-pointer outline-none relative overflow-hidden select-none touch-none ${
                  activeButton === 'yellow'
                    ? 'scale-[0.98] brightness-125'
                    : 'hover:brightness-110 active:scale-[0.97]'
                }`}
                style={{
                  background: activeButton === 'yellow'
                    ? 'radial-gradient(circle at 35% 65%, #fef08a 0%, #eab308 50%, #a16207 100%)'
                    : 'radial-gradient(circle at 35% 65%, #ca8a04 0%, #a16207 60%, #713f12 100%)',
                  boxShadow: activeButton === 'yellow'
                    ? 'inset 0 0 30px #ffffff, 0 0 45px rgba(234, 179, 8, 0.9), inset 0 4px 10px rgba(255,255,255,0.6)'
                    : 'inset 0 6px 12px rgba(255,255,255,0.2), inset 0 -6px 12px rgba(0,0,0,0.7), 0 4px 10px rgba(0,0,0,0.5)',
                  border: '2px solid rgba(255,255,255,0.1)'
                }}
                aria-label="Yellow pad"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-black/40 pointer-events-none rounded-bl-full" />
              </button>

              {/* BLUE (Bottom-Right) */}
              <button
                onPointerDown={(e) => { e.preventDefault(); handleColorClick('blue'); }}
                disabled={gameState === 'showing'}
                className={`w-full h-full rounded-br-full transition-all duration-100 cursor-pointer outline-none relative overflow-hidden select-none touch-none ${
                  activeButton === 'blue'
                    ? 'scale-[0.98] brightness-125'
                    : 'hover:brightness-110 active:scale-[0.97]'
                }`}
                style={{
                  background: activeButton === 'blue'
                    ? 'radial-gradient(circle at 65% 65%, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)'
                    : 'radial-gradient(circle at 65% 65%, #2563eb 0%, #1d4ed8 60%, #1e3a8a 100%)',
                  boxShadow: activeButton === 'blue'
                    ? 'inset 0 0 30px #ffffff, 0 0 45px rgba(59, 130, 246, 0.9), inset 0 4px 10px rgba(255,255,255,0.6)'
                    : 'inset 0 6px 12px rgba(255,255,255,0.2), inset 0 -6px 12px rgba(0,0,0,0.7), 0 4px 10px rgba(0,0,0,0.5)',
                  border: '2px solid rgba(255,255,255,0.1)'
                }}
                aria-label="Blue pad"
              >
                <div className="absolute inset-0 bg-gradient-to-tl from-white/30 via-transparent to-black/40 pointer-events-none rounded-br-full" />
              </button>
            </div>

            {/* Center Chrome Display Console */}
            <div className="absolute w-[40%] h-[40%] rounded-full bg-gradient-to-b from-[#1c2230] via-[#0e121a] to-[#080a0f] border-4 sm:border-[6px] border-[#222836] shadow-[0_12px_28px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.15)] flex flex-col items-center justify-center p-2 text-center pointer-events-auto z-20">
              
              {/* Metallic Brand Header */}
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] sm:text-xs font-black tracking-[0.25em] text-neutral-300 uppercase">
                  SIMON
                </span>
              </div>

              {/* Digital LCD Counter */}
              <div className="px-3 py-0.5 bg-[#05070a] rounded border border-neutral-700/80 shadow-inner mb-1.5">
                <div className="text-sm sm:text-lg font-black font-mono text-emerald-400 tracking-wider leading-tight">
                  {score > 0 ? `LVL ${String(score).padStart(2, '0')}` : '--'}
                </div>
              </div>

              {/* Central Tactile Action Button */}
              {(gameState === 'idle' || gameState === 'gameover') ? (
                <button
                  onClick={startNewGame}
                  className="px-3.5 py-1 bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 active:scale-95 text-black font-black text-[10px] sm:text-xs rounded-full uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(245,158,11,0.4)] border border-amber-300 cursor-pointer"
                >
                  {gameState === 'gameover' ? 'RETRY' : 'START'}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>PLAYING</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions footer */}
        <p className="mt-4 text-[11px] sm:text-xs text-neutral-400 text-center max-w-sm">
          Listen to the sequence and watch the pads ignite. Repeat the pattern perfectly as each round adds another step!
        </p>
      </div>
    </div>
  );
}
