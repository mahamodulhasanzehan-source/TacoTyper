import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays, saveLeaderboardScore } from '../services/firebase';
import { audioService } from '../services/audioService';
import { isMobileDevice } from '../utils/device';
import { GameLeaderboardSidebar, MobileLeaderboardButton } from './GameLeaderboardSidebar';

interface ReactionTimeProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type TestState = 'idle' | 'waiting' | 'ready' | 'result' | 'early';

export default function ReactionTimeGame({ onBackToHub, user, username }: ReactionTimeProps) {
  const [state, setState] = useState<TestState>('idle');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [bestReaction, setBestReaction] = useState<number | null>(() => {
    const saved = localStorage.getItem('reaction_time_best');
    return saved ? parseInt(saved, 10) : null;
  });
  const [history, setHistory] = useState<number[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

  const [liveMs, setLiveMs] = useState(0);
  const liveAnimRef = useRef<number | null>(null);
  const greenTimestampRef = useRef<number | null>(null);
  const timerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (state === 'ready') {
      const updateLive = () => {
        if (greenTimestampRef.current) {
          setLiveMs(Math.round(performance.now() - greenTimestampRef.current));
        }
        liveAnimRef.current = requestAnimationFrame(updateLive);
      };
      liveAnimRef.current = requestAnimationFrame(updateLive);
    } else {
      if (liveAnimRef.current) {
        cancelAnimationFrame(liveAnimRef.current);
        liveAnimRef.current = null;
      }
      if (state === 'waiting' || state === 'idle') {
        setLiveMs(0);
      }
    }
    return () => {
      if (liveAnimRef.current) {
        cancelAnimationFrame(liveAnimRef.current);
        liveAnimRef.current = null;
      }
    };
  }, [state]);

  useEffect(() => {
    incrementGamePlays('reaction_time');
    return () => {
      if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
      if (liveAnimRef.current) cancelAnimationFrame(liveAnimRef.current);
    };
  }, []);

  const clearTimer = () => {
    if (timerTimeoutRef.current) {
      clearTimeout(timerTimeoutRef.current);
      timerTimeoutRef.current = null;
    }
    if (liveAnimRef.current) {
      cancelAnimationFrame(liveAnimRef.current);
      liveAnimRef.current = null;
    }
  };

  const startTest = useCallback(() => {
    clearTimer();
    setLiveMs(0);
    setState('waiting');
    setReactionTime(null);
    audioService.playSound('tile_click');

    // Random delay between 1800ms and 4500ms
    const randomDelay = 1800 + Math.random() * 2700;

    timerTimeoutRef.current = setTimeout(() => {
      greenTimestampRef.current = performance.now();
      setState('ready');
      audioService.playSound('mine_explode');
    }, randomDelay);
  }, []);

  const handleClick = useCallback(() => {
    if (state === 'idle') {
      startTest();
      return;
    }

    if (state === 'waiting') {
      clearTimer();
      setState('early');
      audioService.playSound('wrong_answer');
      return;
    }

    if (state === 'ready') {
      const now = performance.now();
      const elapsed = Math.round(now - (greenTimestampRef.current || now));
      setReactionTime(elapsed);
      setState('result');
      audioService.playSound('correct_answer');

      setHistory(prev => [elapsed, ...prev].slice(0, 10));

      setBestReaction(prev => {
        if (prev === null || elapsed < prev) {
          localStorage.setItem('reaction_time_best', String(elapsed));
          return elapsed;
        }
        return prev;
      });

      // Save to Firebase reaction_time leaderboard
      saveLeaderboardScore(
        user,
        username || user?.displayName || 'Speedster',
        elapsed,
        `${elapsed}ms Reflex`,
        { mistakes: 0, timeTaken: Math.round(elapsed / 1000), ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: elapsed, levelReached: 1 },
        'reaction_time'
      );
      return;
    }

    if (state === 'early' || state === 'result') {
      startTest();
    }
  }, [state, startTest, user, username]);

  // Spacebar support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClick]);

  const getRating = (ms: number) => {
    if (ms < 185) return { title: '⚡ INHUMAN REFLEXES!', color: 'text-yellow-300' };
    if (ms < 225) return { title: '🔥 LIGHTNING FAST!', color: 'text-emerald-400' };
    if (ms < 275) return { title: '⚡ EXCELLENT SPEED!', color: 'text-cyan-400' };
    if (ms < 330) return { title: '👍 AVERAGE RESPONSE', color: 'text-sky-300' };
    return { title: '🐢 A BIT SLOW - TRY AGAIN!', color: 'text-rose-400' };
  };

  const averageMs = history.length > 0
    ? Math.round(history.reduce((a, b) => a + b, 0) / history.length)
    : null;

  return (
    <div
      onClick={handleClick}
      className={`w-full h-full flex flex-row text-white select-none overflow-hidden font-sans cursor-pointer transition-colors duration-150 ${
        state === 'ready'
          ? 'bg-[#15803d]'
          : state === 'waiting'
          ? 'bg-[#991b1b]'
          : state === 'early'
          ? 'bg-[#7f1d1d]'
          : 'bg-[#090d16]'
      }`}
    >
      <div className="flex-1 h-full flex flex-col justify-between relative overflow-hidden min-w-0">
        {/* Header Bar */}
        <header
          className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-neutral-900/90 border-b border-neutral-800 z-20 shrink-0 backdrop-blur-md w-full overflow-hidden gap-1.5 sm:gap-3"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0">
            <button
              onClick={onBackToHub}
              className="px-2 sm:px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300 transition-transform active:scale-95 whitespace-nowrap shrink-0"
            >
              ← <span className="hidden sm:inline">Hub</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-black tracking-wide text-emerald-400 truncate">
                REACTION TIME
              </h1>
              <span className="text-[9px] text-neutral-400 font-mono hidden md:inline">
                CLASSIC GREEN SCREEN REFLEX TEST
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 text-xs font-mono font-bold bg-neutral-950 px-2 sm:px-2.5 py-1 rounded-lg border border-neutral-800 whitespace-nowrap shrink-0">
              <span className="text-neutral-400 text-[9px] sm:text-[10px]">BEST:</span>
              <span className="text-emerald-400">{bestReaction !== null ? `${bestReaction}ms` : '--'}</span>
            </div>

            <button
              onClick={() => {
                clearTimer();
                setState('idle');
                setReactionTime(null);
              }}
              className="p-1 sm:px-2.5 sm:py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300 active:scale-95 transition-transform whitespace-nowrap"
            >
              <span className="hidden sm:inline">Reset</span>
              <span className="sm:hidden">↺</span>
            </button>

            {isMobile && (
              <MobileLeaderboardButton onClick={() => setShowMobileLeaderboard(true)} />
            )}
          </div>
        </header>

        {/* Central Display Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center relative z-10">
          {state === 'idle' && (
            <div className="flex flex-col items-center gap-3 animate-fade-in max-w-md">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)] mb-2">
                <span className="text-4xl sm:text-5xl">⚡</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-wider">
                Reaction Time Test
              </h2>
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                When the red screen turns <strong className="text-emerald-400 font-black">GREEN</strong>, click or tap as quickly as you can.
              </p>
              <div className="mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-transform hover:scale-105 active:scale-95">
                Click Anywhere To Start
              </div>
            </div>
          )}

          {state === 'waiting' && (
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <div className="text-4xl sm:text-6xl mb-2">🔴</div>
              <h2 className="text-3xl sm:text-6xl font-black text-white tracking-widest uppercase">
                Wait For Green...
              </h2>
              <p className="text-xs sm:text-sm text-red-200/80 font-mono">
                Do not click yet
              </p>
            </div>
          )}

          {state === 'ready' && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-5xl sm:text-7xl mb-1 animate-pulse">🟢</div>
              <h2 className="text-5xl sm:text-7xl font-black text-white tracking-widest drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                CLICK!
              </h2>
              {/* MS timer in the middle of the screen */}
              <div className="my-2 text-6xl sm:text-8xl font-black font-mono text-yellow-300 drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] tracking-tight">
                {liveMs} <span className="text-3xl sm:text-4xl text-emerald-100">ms</span>
              </div>
              <p className="text-sm sm:text-base text-green-100 font-bold tracking-wide">
                Tap anywhere as fast as you can!
              </p>
            </div>
          )}

          {state === 'early' && (
            <div className="flex flex-col items-center gap-3 animate-shake max-w-sm">
              <div className="text-5xl sm:text-6xl mb-1">⚠️</div>
              <h2 className="text-3xl sm:text-5xl font-black text-amber-300 tracking-wide uppercase">
                Too Early!
              </h2>
              <p className="text-sm sm:text-base text-neutral-200">
                You clicked before the screen turned green.
              </p>
              <div className="mt-2 px-5 py-2.5 bg-neutral-900/90 border border-neutral-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl">
                Click anywhere to try again
              </div>
            </div>
          )}

          {state === 'result' && reactionTime !== null && (
            <div className="flex flex-col items-center gap-4 animate-fade-in max-w-md w-full">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                ⚡
              </div>

              {/* Huge Timer in Center */}
              <div className="flex flex-col items-center">
                <div className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-yellow-300 font-mono tracking-tight drop-shadow-[0_4px_20px_rgba(34,197,94,0.4)]">
                  {reactionTime} <span className="text-3xl sm:text-4xl text-emerald-400">ms</span>
                </div>
                <div className={`text-base sm:text-xl font-black tracking-wide mt-1 ${getRating(reactionTime).color}`}>
                  {getRating(reactionTime).title}
                </div>
              </div>

              {/* Stats Card */}
              <div className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 flex justify-around shadow-xl">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Session Best</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {bestReaction ? `${bestReaction}ms` : '--'}
                  </span>
                </div>
                <div className="h-8 w-px bg-neutral-800 my-auto"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Avg (Last {history.length})</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">
                    {averageMs ? `${averageMs}ms` : '--'}
                  </span>
                </div>
                <div className="h-8 w-px bg-neutral-800 my-auto"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Tries</span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {history.length}
                  </span>
                </div>
              </div>

              <div className="text-xs text-neutral-400 font-semibold tracking-wider uppercase animate-pulse">
                Click anywhere to test again
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <footer className="py-1 px-2 text-center text-[10px] text-neutral-500 border-t border-neutral-900 bg-neutral-950/60 shrink-0">
          Left Click, Screen Tap, or Spacebar to react • Ranked on global leaderboard by fastest reaction (lowest ms)
        </footer>
      </div>

      <GameLeaderboardSidebar
        mode="reaction_time"
        title="Fastest Reflexes"
        scoreLabel="MS"
        storageKey="reaction_time_leaderboard_collapsed"
        isMobile={isMobile}
        showMobileLeaderboard={showMobileLeaderboard}
        onCloseMobileLeaderboard={() => setShowMobileLeaderboard(false)}
      />
    </div>
  );
}
