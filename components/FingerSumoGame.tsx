import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays, saveLeaderboardScore } from '../services/firebase';
import { audioService } from '../services/audioService';

interface FingerSumoProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export default function FingerSumoGame({ onBackToHub, user, username }: FingerSumoProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [position, setPosition] = useState(0); // -100 (Bot Ringout) to +100 (Player Ringout)
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [roundWinner, setRoundWinner] = useState<'player' | 'bot' | null>(null);
  const [matchWinner, setMatchWinner] = useState<'player' | 'bot' | null>(null);
  const [playerTapsCount, setPlayerTapsCount] = useState(0);

  const matchStartTimeRef = useRef(Date.now());
  const totalMatchTapsRef = useRef(0);
  const isMatchActiveRef = useRef(isMatchActive);
  isMatchActiveRef.current = isMatchActive;

  useEffect(() => {
    incrementGamePlays('finger_sumo');
  }, []);

  const resetRound = useCallback(() => {
    setPosition(0);
    setRoundWinner(null);
    setIsMatchActive(true);
    isMatchActiveRef.current = true;
    setPlayerTapsCount(0);
  }, []);

  const startNewMatch = useCallback(() => {
    setPlayerScore(0);
    setBotScore(0);
    setMatchWinner(null);
    setPosition(0);
    setRoundWinner(null);
    setIsMatchActive(false);
    isMatchActiveRef.current = false;
    setPlayerTapsCount(0);
    matchStartTimeRef.current = Date.now();
    totalMatchTapsRef.current = 0;
  }, []);

  // Player tap handler
  const handlePlayerTap = useCallback(() => {
    if (matchWinner) return;

    if (!isMatchActiveRef.current) {
      if (roundWinner) {
        resetRound();
        return;
      }
      // Start match on first tap
      setIsMatchActive(true);
      isMatchActiveRef.current = true;
      if (playerScore === 0 && botScore === 0) {
        matchStartTimeRef.current = Date.now();
        totalMatchTapsRef.current = 0;
      }
    }

    audioService.playSound('tile_click');
    setPlayerTapsCount(c => c + 1);
    totalMatchTapsRef.current += 1;

    // Player pushes towards bot side (- direction)
    const pushForce = 3.8;
    setPosition(p => {
      const next = p - pushForce;
      if (next <= -95) {
        // Player pushed Bot completely out of ring!
        audioService.playSound('success');
        setIsMatchActive(false);
        isMatchActiveRef.current = false;
        setRoundWinner('player');
        setPlayerScore(ps => {
          const nextScore = ps + 1;
          if (nextScore >= 3) {
            setMatchWinner('player');
            const durationSec = Math.max(1, (Date.now() - matchStartTimeRef.current) / 1000);
            const avgCPS = parseFloat((totalMatchTapsRef.current / durationSec).toFixed(1));
            if (user && (difficulty === 'medium' || difficulty === 'hard')) {
              saveLeaderboardScore(
                user,
                username || user.displayName || 'Sumo Champion',
                avgCPS,
                'Sumo CPS Master',
                { mistakes: 0, timeTaken: Math.round(durationSec), ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: avgCPS, levelReached: 1 },
                `fingersumo-${difficulty}`
              );
            }
          }
          return nextScore;
        });
        return -100;
      }
      return next;
    });
  }, [matchWinner, roundWinner, resetRound, playerScore, botScore, difficulty, user, username]);

  // Spacebar controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayerTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayerTap]);

  // Bot Auto-Tapping Loop (Realistic human-like pacing)
  useEffect(() => {
    if (!isMatchActive) return;

    // Realistic bot intervals and forces:
    // Easy: ~2.4 taps/sec, gentle force
    // Medium: ~3.4 taps/sec with human fatigue micro-pauses (easily beatable with normal single-finger tapping)
    // Hard: ~5.0 taps/sec, brisk competitor
    let botIntervalMs = 290;
    let pushForceBase = 2.8;

    if (difficulty === 'easy') {
      botIntervalMs = 420;
      pushForceBase = 2.4;
    } else if (difficulty === 'hard') {
      botIntervalMs = 195;
      pushForceBase = 3.3;
    }

    let botTapCounter = 0;
    const interval = setInterval(() => {
      if (!isMatchActiveRef.current) return;
      botTapCounter++;

      // Natural human micro-pauses
      if (difficulty === 'medium' && botTapCounter % 10 === 0 && Math.random() < 0.5) {
        return;
      }
      if (difficulty === 'easy' && Math.random() < 0.3) {
        return;
      }

      const botPushForce = pushForceBase + (Math.random() * 0.4 - 0.2);

      setPosition(p => {
        const next = p + botPushForce;
        if (next >= 95) {
          // Bot pushed player out of ring!
          audioService.playSound('failure');
          setIsMatchActive(false);
          isMatchActiveRef.current = false;
          setRoundWinner('bot');
          setBotScore(bs => {
            const nextScore = bs + 1;
            if (nextScore >= 3) setMatchWinner('bot');
            return nextScore;
          });
          return 100;
        }
        return next;
      });
    }, botIntervalMs);

    return () => clearInterval(interval);
  }, [isMatchActive, difficulty]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#08080c] text-white select-none overflow-hidden font-sans">
      <header className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 border-b border-neutral-800 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHub}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-amber-400">FINGER SUMO</h1>
            <span className="text-[9px] text-neutral-400 font-mono hidden sm:inline">DOHYO RING TUG-OF-WAR</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Difficulty Switcher */}
          <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                disabled={isMatchActive}
                onClick={() => setDifficulty(d)}
                className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded capitalize transition-all ${
                  difficulty === d
                    ? 'bg-amber-500 text-black shadow font-bold'
                    : 'text-neutral-400 hover:text-white disabled:opacity-40'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={startNewMatch}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Rounds Score Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-neutral-950/90 border-b border-neutral-900 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-cyan-400 font-bold">YOU: {playerScore} / 3</span>
        </div>
        <div className="text-[10px] sm:text-xs text-neutral-400 font-bold uppercase tracking-wider">
          {!isMatchActive && !roundWinner && !matchWinner
            ? 'CHOOSE DIFFICULTY & START'
            : isMatchActive
            ? 'TAP RAPIDLY TO PUSH'
            : 'ROUND FINISHED'}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-rose-400 font-bold">BOT: {botScore} / 3</span>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
        </div>
      </div>

      {/* Sumo Arena Stage */}
      <div className="flex-1 flex flex-col items-center justify-between p-3 sm:p-6 max-w-lg mx-auto w-full relative">
        {/* Opponent Bot Card (Top) */}
        <div className="w-full bg-neutral-900/80 border border-neutral-800 p-3 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-xl">
              👺
            </div>
            <div>
              <div className="text-xs font-bold text-rose-400 uppercase tracking-wide">Grand Yokozuna Bot</div>
              <div className="text-[10px] text-neutral-400 font-mono capitalize">
                Level: <span className="text-amber-400 font-bold">{difficulty}</span> AI
              </div>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-[9px] text-neutral-500 uppercase block">Rounds</span>
            <span className="text-sm font-black text-rose-400">{botScore}</span>
          </div>
        </div>

        {/* Circular Sumo Dohyo Ring & Power Meter */}
        <div className="my-auto w-full flex flex-col items-center justify-center py-2">
          {/* Authentic Sand Dohyo Graphic */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-[#3b2413] border-[6px] border-[#a16207] shadow-[0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden">
            {/* Inner Ring Texture */}
            <div className="absolute inset-2 rounded-full border-4 border-dashed border-[#d97706]/40" />
            <div className="absolute inset-10 rounded-full border border-[#f59e0b]/20" />
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />

            {/* Center Separation Line */}
            <div className="absolute w-0.5 h-full bg-[#d97706]/30" />

            {/* Wrestling Wrestlers Avatar in the Ring */}
            <div
              className="absolute flex items-center justify-center transition-all duration-75 text-3xl sm:text-4xl"
              style={{
                transform: `translateX(${position * 0.9}px)`
              }}
            >
              <div className="relative flex items-center -space-x-2 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                <span className="transform -scale-x-100">🤼</span>
              </div>
            </div>

            {/* Danger Zones */}
            <div className="absolute left-1 top-0 bottom-0 w-8 bg-rose-600/20 rounded-l-full flex items-center justify-center">
              <span className="text-[9px] text-rose-300 font-bold uppercase rotate-90">OUT</span>
            </div>
            <div className="absolute right-1 top-0 bottom-0 w-8 bg-cyan-600/20 rounded-r-full flex items-center justify-center">
              <span className="text-[9px] text-cyan-300 font-bold uppercase -rotate-90">OUT</span>
            </div>
          </div>

          {/* Dohyo Pressure Gauge */}
          <div className="w-full max-w-xs mt-4">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1">
              <span className="text-cyan-400 font-bold">YOU PUSHING</span>
              <span className="text-rose-400 font-bold">BOT PUSHING</span>
            </div>
            <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-neutral-800 flex">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-rose-500 rounded-full transition-all duration-75"
                style={{
                  width: `${Math.max(5, Math.min(95, ((100 - position) / 200) * 100))}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Pre-Match Difficulty Selector Overlay / Banner when match hasn't started */}
        {!isMatchActive && playerScore === 0 && botScore === 0 && !roundWinner && !matchWinner && (
          <div className="w-full bg-neutral-900/95 border border-neutral-800 p-4 rounded-2xl mb-3 flex flex-col items-center text-center">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2 font-bold">
              Select Difficulty Before Entering Dohyo:
            </span>
            <div className="grid grid-cols-3 gap-2 w-full max-w-xs mb-3">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`py-2 px-1 text-xs font-black rounded-xl uppercase transition-all ${
                    difficulty === d
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-neutral-400">
              {difficulty === 'easy' && 'Casual pace (~2.4 taps/s) • Relaxed match'}
              {difficulty === 'medium' && 'Realistic human pace (~3.4 taps/s) • Win with a steady single finger!'}
              {difficulty === 'hard' && 'Brisk tournament master (~5.0 taps/s) • Fast twitch challenge!'}
            </span>
          </div>
        )}

        {/* Player Tap Area (Giant responsive push button) */}
        <div className="w-full flex flex-col items-center">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              handlePlayerTap();
            }}
            disabled={!!matchWinner}
            className="w-full py-6 sm:py-8 bg-gradient-to-b from-cyan-500 to-cyan-700 hover:from-cyan-400 hover:to-cyan-600 active:from-cyan-600 active:to-cyan-800 disabled:opacity-40 text-black font-black text-lg sm:text-xl tracking-widest uppercase rounded-2xl shadow-[0_8px_25px_rgba(6,182,212,0.4)] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer touch-manipulation"
          >
            <span>{isMatchActive ? '💥 PUSH!' : roundWinner ? '👉 NEXT ROUND' : '💥 START MATCH'}</span>
            <span className="text-[10px] font-mono tracking-normal text-cyan-950 font-bold">
              {isMatchActive
                ? `TAP RAPIDLY • ${playerTapsCount} TAPS (OR PRESS SPACE)`
                : roundWinner
                ? 'TAP TO START NEXT ROUND'
                : 'TAP HERE OR PRESS SPACE TO BEGIN'}
            </span>
          </button>
        </div>

        {/* Round Over Modal */}
        {roundWinner && !matchWinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-30 p-4">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-xs w-full text-center shadow-2xl">
              <div className="text-4xl mb-2">{roundWinner === 'player' ? '🎉' : '💥'}</div>
              <h3 className={`text-xl font-black mb-1 ${roundWinner === 'player' ? 'text-cyan-400' : 'text-rose-500'}`}>
                {roundWinner === 'player' ? 'YORIKIRI! ROUND WON' : 'PUSHED OUT OF RING!'}
              </h3>
              <p className="text-xs text-neutral-400 mb-4">
                {roundWinner === 'player'
                  ? 'Yokozuna bot was forced beyond the straw bales!'
                  : 'You lost your balance and stepped out.'}
              </p>
              <button
                onClick={resetRound}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
              >
                Next Round
              </button>
            </div>
          </div>
        )}

        {/* Match Finished Modal */}
        {matchWinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-30 p-4">
            <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-4xl mb-2">{matchWinner === 'player' ? '🏆' : '💀'}</div>
              <h2 className={`text-2xl font-black mb-1 ${matchWinner === 'player' ? 'text-amber-400' : 'text-rose-500'}`}>
                {matchWinner === 'player' ? 'GRAND CHAMPION!' : 'DEFEATED!'}
              </h2>
              <p className="text-sm text-neutral-400 mb-4">
                {matchWinner === 'player'
                  ? `You won 3 rounds against the ${difficulty.toUpperCase()} AI bot!`
                  : `Bot conquered the tournament 3 to ${playerScore}.`}
              </p>
              <button
                onClick={startNewMatch}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Play New Match
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="py-1 px-2 text-center text-[10px] text-neutral-500 border-t border-neutral-900 bg-neutral-950/60 shrink-0">
        Rapid tap speed wins • Push your opponent out of the straw ring!
      </footer>
    </div>
  );
}
