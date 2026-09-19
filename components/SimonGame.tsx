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
    <div className="flex flex-col h-full w-full bg-[#080a10] text-white select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-3 bg-[#0e111a] border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm font-bold transition-all text-neutral-300 hover:text-white flex items-center gap-1.5 border border-neutral-700 active:scale-95 shadow-md cursor-pointer"
          >
            <span>←</span>
            <span>Hub</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔴</span>
            <h1 className="text-sm sm:text-base font-black text-amber-400 tracking-wide">Simon</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs rounded-lg text-neutral-300 transition-colors cursor-pointer"
            title="Toggle Sound"
          >
            {soundEnabled ? '🔊 Sound: ON' : '🔇 Muted'}
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
        <div className="mb-4 sm:mb-6 px-5 py-1.5 rounded-full bg-[#121624] border border-neutral-700/80 shadow-lg text-center">
          <span className={`text-xs sm:text-sm font-black tracking-wider uppercase font-mono ${
            gameState === 'gameover' ? 'text-red-400' :
            gameState === 'success' ? 'text-emerald-400' :
            gameState === 'showing' ? 'text-amber-400' :
            gameState === 'player' ? 'text-sky-400 animate-pulse' :
            'text-neutral-300'
          }`}>
            {statusText}
          </span>
        </div>

        {/* Circular Simon Console */}
        <div className="relative aspect-square w-full max-w-[min(88vw,420px,calc(100vh-230px))] rounded-full bg-[#161a26] p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 sm:border-[6px] border-neutral-800 flex items-center justify-center">
          
          {/* 4 Simon Pads in a 2x2 Grid */}
          <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 w-full h-full rounded-full overflow-hidden p-1">
            
            {/* GREEN (Top-Left) */}
            <button
              onClick={() => handleColorClick('green')}
              disabled={gameState === 'showing'}
              className={`w-full h-full rounded-tl-full transition-all duration-100 cursor-pointer active:scale-95 outline-none relative ${
                activeButton === 'green'
                  ? 'brightness-150 shadow-[0_0_35px_rgba(74,222,128,1)]'
                  : 'hover:brightness-110'
              }`}
              style={{
                backgroundColor: activeButton === 'green' ? COLOR_DEFS.green.activeColor : COLOR_DEFS.green.baseColor,
                boxShadow: activeButton === 'green' ? `inset 0 0 20px #fff, 0 0 35px ${COLOR_DEFS.green.glowColor}` : 'inset 0 0 15px rgba(0,0,0,0.4)'
              }}
              aria-label="Green pad"
            />

            {/* RED (Top-Right) */}
            <button
              onClick={() => handleColorClick('red')}
              disabled={gameState === 'showing'}
              className={`w-full h-full rounded-tr-full transition-all duration-100 cursor-pointer active:scale-95 outline-none relative ${
                activeButton === 'red'
                  ? 'brightness-150 shadow-[0_0_35px_rgba(248,113,113,1)]'
                  : 'hover:brightness-110'
              }`}
              style={{
                backgroundColor: activeButton === 'red' ? COLOR_DEFS.red.activeColor : COLOR_DEFS.red.baseColor,
                boxShadow: activeButton === 'red' ? `inset 0 0 20px #fff, 0 0 35px ${COLOR_DEFS.red.glowColor}` : 'inset 0 0 15px rgba(0,0,0,0.4)'
              }}
              aria-label="Red pad"
            />

            {/* YELLOW (Bottom-Left) */}
            <button
              onClick={() => handleColorClick('yellow')}
              disabled={gameState === 'showing'}
              className={`w-full h-full rounded-bl-full transition-all duration-100 cursor-pointer active:scale-95 outline-none relative ${
                activeButton === 'yellow'
                  ? 'brightness-150 shadow-[0_0_35px_rgba(253,224,71,1)]'
                  : 'hover:brightness-110'
              }`}
              style={{
                backgroundColor: activeButton === 'yellow' ? COLOR_DEFS.yellow.activeColor : COLOR_DEFS.yellow.baseColor,
                boxShadow: activeButton === 'yellow' ? `inset 0 0 20px #fff, 0 0 35px ${COLOR_DEFS.yellow.glowColor}` : 'inset 0 0 15px rgba(0,0,0,0.4)'
              }}
              aria-label="Yellow pad"
            />

            {/* BLUE (Bottom-Right) */}
            <button
              onClick={() => handleColorClick('blue')}
              disabled={gameState === 'showing'}
              className={`w-full h-full rounded-br-full transition-all duration-100 cursor-pointer active:scale-95 outline-none relative ${
                activeButton === 'blue'
                  ? 'brightness-150 shadow-[0_0_35px_rgba(96,165,250,1)]'
                  : 'hover:brightness-110'
              }`}
              style={{
                backgroundColor: activeButton === 'blue' ? COLOR_DEFS.blue.activeColor : COLOR_DEFS.blue.baseColor,
                boxShadow: activeButton === 'blue' ? `inset 0 0 20px #fff, 0 0 35px ${COLOR_DEFS.blue.glowColor}` : 'inset 0 0 15px rgba(0,0,0,0.4)'
              }}
              aria-label="Blue pad"
            />
          </div>

          {/* Center Hub Display */}
          <div className="absolute w-[38%] h-[38%] rounded-full bg-[#10131d] border-4 sm:border-[5px] border-neutral-800 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center p-2 text-center pointer-events-auto z-20">
            <h2 className="text-[11px] sm:text-xs font-black tracking-widest text-neutral-300 uppercase mb-0.5">
              SIMON
            </h2>
            <div className="text-base sm:text-xl font-black font-mono text-white leading-none mb-1">
              {score > 0 ? `Lvl ${score}` : '--'}
            </div>

            {(gameState === 'idle' || gameState === 'gameover') ? (
              <button
                onClick={startNewGame}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-[10px] sm:text-xs rounded-full uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                {gameState === 'gameover' ? 'RETRY' : 'START'}
              </button>
            ) : (
              <div className="flex items-center gap-1 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions strip */}
        <p className="mt-4 text-[11px] sm:text-xs text-neutral-400 text-center max-w-sm">
          Listen to the melody and watch the colors flash. Repeat the exact sequence as it grows!
        </p>
      </div>
    </div>
  );
}
