import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';

interface FingerSumoProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export default function FingerSumoGame({ onBackToHub }: FingerSumoProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gauge, setGauge] = useState(0); // -100 (Player wins) to +100 (Bot wins)
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSurge, setIsSurge] = useState(false);
  const [winner, setWinner] = useState<'player' | 'bot' | 'draw' | null>(null);
  const [playerCPS, setPlayerCPS] = useState(0);

  const gaugeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isSurgeRef = useRef(false);
  const playerTapTimesRef = useRef<number[]>([]);
  const lastKeyTimeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    incrementGamePlays('finger_sumo');
  }, []);

  const finishGame = useCallback((res: 'player' | 'bot' | 'draw') => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setWinner(res);
    if (res === 'player') audioService.playSound('success');
    else if (res === 'bot') audioService.playSound('failure');
    else audioService.playSound('tile_click');
  }, []);

  // Main game physics loop & timer
  useEffect(() => {
    if (!isPlaying) return;

    isPlayingRef.current = true;
    gaugeRef.current = 0;
    setGauge(0);
    setTimeLeft(30);
    setWinner(null);
    playerTapTimesRef.current = [];

    // Drift physics & boundary check
    const physicsInterval = setInterval(() => {
      if (!isPlayingRef.current) return;

      // Natural center drift (towards 0 by 0.35 per tick)
      if (gaugeRef.current > 0) {
        gaugeRef.current = Math.max(0, gaugeRef.current - 0.35);
      } else if (gaugeRef.current < 0) {
        gaugeRef.current = Math.min(0, gaugeRef.current + 0.35);
      }

      // Check win bounds
      if (gaugeRef.current <= -100) {
        gaugeRef.current = -100;
        setGauge(-100);
        finishGame('player');
        return;
      }
      if (gaugeRef.current >= 100) {
        gaugeRef.current = 100;
        setGauge(100);
        finishGame('bot');
        return;
      }

      setGauge(gaugeRef.current);

      // Clean CPS tracking older than 1 sec
      const now = performance.now();
      playerTapTimesRef.current = playerTapTimesRef.current.filter(t => now - t < 1000);
      setPlayerCPS(playerTapTimesRef.current.length);
    }, 50);

    // 30s countdown timer
    const timerInterval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerInterval);
          if (gaugeRef.current < 0) finishGame('player');
          else if (gaugeRef.current > 0) finishGame('bot');
          else finishGame('draw');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Periodic surge windows: triggers every 5-8s for 1.2s
    let surgeTimeout: NodeJS.Timeout;
    const scheduleSurge = () => {
      const waitTime = 4000 + Math.random() * 4000;
      surgeTimeout = setTimeout(() => {
        if (!isPlayingRef.current) return;
        setIsSurge(true);
        isSurgeRef.current = true;
        audioService.playSound('powerup');

        setTimeout(() => {
          setIsSurge(false);
          isSurgeRef.current = false;
          if (isPlayingRef.current) scheduleSurge();
        }, 1200);
      }, waitTime);
    };
    scheduleSurge();

    // Bot tapping simulator
    const botInterval = setInterval(() => {
      if (!isPlayingRef.current) return;

      // CPS targets based on difficulty
      let targetCPS = 5;
      let pauseChance = 0;
      if (difficulty === 'easy') {
        targetCPS = 4.5 + Math.random() * 1.5;
        pauseChance = 0.25;
      } else if (difficulty === 'medium') {
        targetCPS = 7.5 + Math.random() * 1.5;
        pauseChance = 0.05;
      } else {
        targetCPS = isSurgeRef.current ? 12.5 : 10.5;
        pauseChance = 0;
      }

      if (Math.random() < pauseChance) return;

      const pushPower = isSurgeRef.current && difficulty === 'hard' ? 3.5 : 1.4;
      const botImpact = (targetCPS / 10) * pushPower;
      gaugeRef.current = Math.min(100, gaugeRef.current + botImpact);
    }, 100);

    return () => {
      clearInterval(physicsInterval);
      clearInterval(timerInterval);
      clearInterval(botInterval);
      clearTimeout(surgeTimeout);
    };
  }, [isPlaying, difficulty, finishGame]);

  const handlePlayerTap = useCallback(() => {
    if (!isPlayingRef.current) return;

    const now = performance.now();
    playerTapTimesRef.current.push(now);

    const multiplier = isSurgeRef.current ? 2.5 : 1.0;
    const pushImpulse = 2.4 * multiplier;

    gaugeRef.current = Math.max(-100, gaugeRef.current - pushImpulse);
    setGauge(gaugeRef.current);
    audioService.playSound(isSurgeRef.current ? 'fiesta' : 'tictac_move');

    if (gaugeRef.current <= -100) {
      gaugeRef.current = -100;
      finishGame('player');
    }
  }, [finishGame]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyA') {
        e.preventDefault();
        const now = performance.now();
        // Prevent key repeat holding
        if (lastKeyTimeRef.current[e.code] && now - lastKeyTimeRef.current[e.code] < 70) {
          return;
        }
        lastKeyTimeRef.current[e.code] = now;
        handlePlayerTap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePlayerTap]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#0a0c10] text-white select-none overflow-hidden font-sans">
      <header className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-base font-black tracking-wide text-rose-400">FINGER SUMO</h1>
            <span className="text-[10px] text-neutral-400 font-mono">TUG OF WAR • 30S SHOWDOWN</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                disabled={isPlaying}
                onClick={() => setDifficulty(d)}
                className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-all ${
                  difficulty === d
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-neutral-400 hover:text-white disabled:opacity-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs font-bold text-amber-400">
            ⏱️ {timeLeft}s
          </div>
        </div>
      </header>

      {/* Main Arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full">
        {/* Surge Indicator Alert */}
        <div className={`transition-all duration-200 mb-6 px-6 py-2 rounded-full border text-xs sm:text-sm font-black tracking-widest uppercase flex items-center gap-2 ${
          isSurge
            ? 'bg-amber-500/20 border-amber-400 text-amber-300 scale-110 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-pulse'
            : 'bg-neutral-900/60 border-neutral-800 text-neutral-500'
        }`}>
          <span>⚡</span>
          <span>{isSurge ? 'GOLDEN SURGE ACTIVE: 2.5X PUSH POWER!' : 'Surge Standby'}</span>
          <span>⚡</span>
        </div>

        {/* Central Tension Track */}
        <div className="w-full bg-neutral-950 p-4 sm:p-6 rounded-2xl border border-neutral-800 shadow-2xl relative">
          <div className="flex justify-between items-center text-xs font-mono font-bold mb-2">
            <span className="text-cyan-400">YOU (GOAL: -100)</span>
            <span className="text-neutral-400">TENSION GAUGE: {Math.round(gauge)}</span>
            <span className="text-rose-400">BOT ({difficulty.toUpperCase()})</span>
          </div>

          {/* Meter Track */}
          <div className="w-full h-8 sm:h-10 bg-neutral-900 rounded-xl overflow-hidden relative flex items-center border border-neutral-800">
            {/* Center Deadzone Marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/30 -translate-x-1/2 z-10" />

            {/* Left Push Zone (Cyan) */}
            <div
              className="absolute right-1/2 top-0 bottom-0 bg-gradient-to-l from-cyan-500 to-sky-600 transition-all duration-75"
              style={{ width: `${Math.max(0, -gauge / 2)}%` }}
            />

            {/* Right Push Zone (Rose) */}
            <div
              className="absolute left-1/2 top-0 bottom-0 bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-75"
              style={{ width: `${Math.max(0, gauge / 2)}%` }}
            />

            {/* Sumo Marker Knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-6 h-10 rounded-lg bg-amber-400 border-2 border-white shadow-[0_0_15px_rgba(251,191,36,0.8)] z-20 transition-all duration-75 flex items-center justify-center text-[10px] text-black font-black"
              style={{ left: `calc(${50 + gauge / 2}% - 12px)` }}
            >
              ||
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] text-neutral-400 mt-3 font-mono">
            <span>Taps / Sec: <strong className="text-cyan-400 font-bold">{playerCPS} CPS</strong></span>
            <span>Natural Center Drift: Active</span>
          </div>
        </div>

        {/* Action Button for Touch / Click */}
        <div className="mt-8 w-full flex flex-col items-center">
          {!isPlaying ? (
            <button
              onClick={() => setIsPlaying(true)}
              className="w-full max-w-sm py-4 bg-rose-500 hover:bg-rose-400 text-white font-black text-lg tracking-wider rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase"
            >
              {winner ? 'Rematch!' : 'Start Sumo Match'}
            </button>
          ) : (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                handlePlayerTap();
              }}
              className={`w-full max-w-md h-32 sm:h-36 rounded-3xl font-black text-2xl tracking-widest uppercase transition-transform select-none touch-manipulation cursor-pointer border-4 ${
                isSurge
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 shadow-[0_0_35px_rgba(245,158,11,0.8)] active:scale-90'
                  : 'bg-gradient-to-r from-rose-600 to-red-500 text-white border-rose-300 shadow-[0_8px_25px_rgba(225,29,72,0.5)] active:scale-95'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span>TAP RAPIDLY!</span>
                <span className="text-xs font-medium tracking-normal opacity-80">
                  (Or smash Spacebar / A key)
                </span>
              </div>
            </button>
          )}

          {winner && !isPlaying && (
            <div className="mt-4 text-center">
              <span className={`text-lg font-black ${
                winner === 'player' ? 'text-emerald-400' : winner === 'bot' ? 'text-rose-400' : 'text-neutral-300'
              }`}>
                {winner === 'player' ? '🎉 YOU WIN THE SUMO MATCH!' : winner === 'bot' ? '💀 BOT WINS THE TUG!' : '🤝 STALEMATE DRAW!'}
              </span>
            </div>
          )}
        </div>
      </div>

      <footer className="p-3 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950/40">
        Push boundary to ±100 to win immediately, or hold the advantage when the 30-second timer runs out.
      </footer>
    </div>
  );
}
