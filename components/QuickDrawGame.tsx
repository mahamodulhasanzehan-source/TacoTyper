import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';
import { GunslingerCharacter } from './quickdraw/GunslingerCharacter';

interface QuickDrawProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Difficulty = 'easy' | 'medium' | 'hard';
type DuelState = 'idle' | 'ready' | 'steady' | 'fire' | 'round_over' | 'match_over';

export default function QuickDrawGame({ onBackToHub }: QuickDrawProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [state, setState] = useState<DuelState>('idle');
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [roundWinner, setRoundWinner] = useState<'player' | 'bot' | 'foul' | null>(null);
  const [roundMessage, setRoundMessage] = useState('Step into the street and tap DRAW to face the Outlaw.');
  const [playerReaction, setPlayerReaction] = useState<number | null>(null);
  const [botReaction, setBotReaction] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  const fireTimestampRef = useRef<number | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const botFiredRef = useRef(false);
  const playerFiredRef = useRef(false);

  useEffect(() => {
    incrementGamePlays('quick_draw');
    return () => clearAllTimeouts();
  }, []);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  };

  const getBotReactionTime = useCallback((diff: Difficulty): { time: number; falseStart: boolean } => {
    if (diff === 'easy') {
      const falseStart = Math.random() < 0.18;
      const time = Math.floor(360 + Math.random() * 90);
      return { time, falseStart };
    } else if (diff === 'medium') {
      const time = Math.floor(250 + Math.random() * 60);
      return { time, falseStart: false };
    } else {
      const time = Math.floor(170 + Math.random() * 40);
      return { time, falseStart: false };
    }
  }, []);

  const startRound = useCallback(() => {
    clearAllTimeouts();
    botFiredRef.current = false;
    playerFiredRef.current = false;
    fireTimestampRef.current = null;
    setFlash(false);
    setRoundWinner(null);
    setPlayerReaction(null);
    setBotReaction(null);
    setRoundMessage('Hands by your holsters...');
    setState('ready');
    audioService.playSound('tile_click');

    const t1 = setTimeout(() => {
      setState('steady');
      audioService.playSound('tile_click');
      setRoundMessage('Wait for the FIRE signal...');

      const delay = 2000 + Math.random() * 3200;
      const botConfig = getBotReactionTime(difficulty);

      // Chance for bot false start on easy
      if (botConfig.falseStart) {
        const falseStartTime = Math.max(800, delay - (150 + Math.random() * 350));
        const tBotFoul = setTimeout(() => {
          if (fireTimestampRef.current !== null || playerFiredRef.current) return;
          botFiredRef.current = true;
          setRoundWinner('player');
          setRoundMessage('FOUL! Outlaw drew too early and forfeited the round!');
          audioService.playSound('success');
          setPlayerScore(p => {
            const next = p + 1;
            if (next >= 3) setState('match_over');
            else setState('round_over');
            return next;
          });
        }, falseStartTime);
        timeoutsRef.current.push(tBotFoul);
      }

      const tFire = setTimeout(() => {
        if (botFiredRef.current || playerFiredRef.current) return;
        fireTimestampRef.current = performance.now();
        setState('fire');
        setFlash(true);
        audioService.playSound('mine_explode');
        setTimeout(() => setFlash(false), 220);

        const botLatency = botConfig.time;
        const tBot = setTimeout(() => {
          if (botFiredRef.current || playerFiredRef.current) return;
          botFiredRef.current = true;
          setBotReaction(botLatency);
          setRoundWinner('bot');
          setRoundMessage(`OUTDRAWN! The Outlaw fired in ${botLatency}ms.`);
          audioService.playSound('failure');
          setBotScore(b => {
            const next = b + 1;
            if (next >= 3) setState('match_over');
            else setState('round_over');
            return next;
          });
        }, botLatency);
        timeoutsRef.current.push(tBot);
      }, delay);

      timeoutsRef.current.push(tFire);
    }, 1200);

    timeoutsRef.current.push(t1);
  }, [difficulty, getBotReactionTime]);

  const handleShoot = useCallback(() => {
    if (state === 'idle' || state === 'round_over' || state === 'match_over') return;

    if (state === 'ready' || state === 'steady') {
      clearAllTimeouts();
      playerFiredRef.current = true;
      setRoundWinner('foul');
      setRoundMessage('FALSE START! You drew before the signal. Round lost!');
      audioService.playSound('wrong_answer');
      setBotScore(b => {
        const next = b + 1;
        if (next >= 3) setState('match_over');
        else setState('round_over');
        return next;
      });
      return;
    }

    if (state === 'fire') {
      if (playerFiredRef.current || botFiredRef.current) return;
      playerFiredRef.current = true;
      clearAllTimeouts();

      const elapsed = Math.round(performance.now() - (fireTimestampRef.current || performance.now()));
      setPlayerReaction(elapsed);

      const botTarget = getBotReactionTime(difficulty).time;
      setBotReaction(botTarget);

      if (elapsed < botTarget) {
        setRoundWinner('player');
        setRoundMessage(`BULLSEYE! You drew first in ${elapsed}ms (Bot: ${botTarget}ms)!`);
        audioService.playSound('success');
        setPlayerScore(p => {
          const next = p + 1;
          if (next >= 3) setState('match_over');
          else setState('round_over');
          return next;
        });
      } else {
        setRoundWinner('bot');
        setRoundMessage(`OUTDRAWN! You drew in ${elapsed}ms, but bot was ${botTarget}ms.`);
        audioService.playSound('failure');
        setBotScore(b => {
          const next = b + 1;
          if (next >= 3) setState('match_over');
          else setState('round_over');
          return next;
        });
      }
    }
  }, [state, difficulty, getBotReactionTime]);

  // Spacebar controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (state === 'idle' || state === 'round_over') startRound();
        else handleShoot();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [state, startRound, handleShoot]);

  const resetMatch = () => {
    clearAllTimeouts();
    setPlayerScore(0);
    setBotScore(0);
    setRoundWinner(null);
    setState('idle');
    setRoundMessage('Step into the street and tap START DUEL.');
  };

  return (
    <div
      onClick={handleShoot}
      className={`w-full h-screen flex flex-col bg-[#120a05] text-white select-none overflow-hidden font-sans transition-colors duration-150 ${
        flash ? 'bg-amber-100' : ''
      }`}
    >
      <header
        className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 border-b border-neutral-800 z-20 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHub}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-amber-500">QUICK DRAW</h1>
            <span className="text-[9px] text-neutral-400 font-mono hidden sm:inline">WESTERN REACTION STANDOFF</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                disabled={state === 'ready' || state === 'steady' || state === 'fire'}
                onClick={() => setDifficulty(d)}
                className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded capitalize transition-all ${
                  difficulty === d
                    ? 'bg-amber-500 text-black shadow font-bold'
                    : 'text-neutral-400 hover:text-white disabled:opacity-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={resetMatch}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Duel Rounds Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-neutral-950/90 border-b border-neutral-900 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
          <span className="text-sky-400 font-bold">YOU: {playerScore} / 3</span>
        </div>
        <div className="text-[10px] sm:text-xs text-amber-400 font-bold tracking-wide">
          {state === 'ready' && 'READY...'}
          {state === 'steady' && 'STEADY...'}
          {state === 'fire' && '⚡ FIRE! ⚡'}
          {state === 'idle' && 'STANDBY'}
          {state === 'round_over' && 'ROUND OVER'}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-rose-400 font-bold">OUTLAW: {botScore} / 3</span>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
        </div>
      </div>

      {/* Duel Scene Viewport */}
      <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 relative overflow-hidden bg-gradient-to-b from-[#2a1306] via-[#1c0c04] to-[#0d0502]">
        {/* Western Saloon & Desert Background Silhouette */}
        <div className="absolute inset-x-0 bottom-16 sm:bottom-20 h-28 pointer-events-none opacity-20 flex justify-between items-end px-8">
          <span className="text-5xl sm:text-6xl">🌵</span>
          <span className="text-7xl sm:text-8xl">🏠</span>
          <span className="text-5xl sm:text-6xl">🌵</span>
        </div>

        {/* Center Signal Announcement */}
        <div className="text-center z-10 my-2">
          {state === 'fire' ? (
            <div className="text-5xl sm:text-7xl font-black text-amber-400 tracking-widest animate-bounce drop-shadow-[0_0_25px_rgba(251,191,36,0.9)]">
              FIRE!
            </div>
          ) : (
            <div className="text-xs sm:text-sm font-mono text-neutral-300 max-w-md bg-black/40 px-3 py-1.5 rounded-full border border-neutral-800">
              {roundMessage}
            </div>
          )}
        </div>

        {/* Gunslingers Standoff Stage */}
        <div className="w-full max-w-2xl flex items-center justify-around sm:justify-between px-2 sm:px-12 my-auto z-10">
          {/* Player Gunslinger (Left) */}
          <GunslingerCharacter
            isPlayer={true}
            state={state}
            winner={roundWinner}
            reactionTime={playerReaction}
          />

          {/* VS Badge */}
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono opacity-60">
              VS
            </span>
          </div>

          {/* Outlaw Bot Gunslinger (Right) */}
          <GunslingerCharacter
            isPlayer={false}
            state={state}
            winner={roundWinner}
            reactionTime={botReaction}
          />
        </div>

        {/* Primary Interactive Action Button */}
        <div className="w-full max-w-sm flex justify-center z-20 mb-2">
          {state === 'idle' || state === 'round_over' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                startRound();
              }}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-black text-base uppercase tracking-widest rounded-2xl shadow-[0_4px_20px_rgba(245,158,11,0.5)] active:scale-95 transition-all cursor-pointer"
            >
              {state === 'round_over' ? 'Next Duel Round' : 'Start Standoff'}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShoot();
              }}
              className={`w-full py-4 font-black text-base uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer ${
                state === 'fire'
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.8)]'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
              }`}
            >
              {state === 'fire' ? '💥 DRAW & FIRE!' : 'POISE HAND (TAP ON FIRE)'}
            </button>
          )}
        </div>

        {/* Match Finished Modal */}
        {state === 'match_over' && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-30 p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-4xl mb-2">{playerScore >= 3 ? '🏆' : '💀'}</div>
              <h2 className={`text-2xl font-black mb-1 ${playerScore >= 3 ? 'text-amber-400' : 'text-rose-500'}`}>
                {playerScore >= 3 ? 'FASTEST GUN IN THE WEST!' : 'OUTGUNNED!'}
              </h2>
              <p className="text-sm text-neutral-400 mb-6">
                {playerScore >= 3
                  ? `You won 3 rounds on ${difficulty.toUpperCase()} difficulty!`
                  : `Outlaw Black-Bart defeated you 3 to ${playerScore}.`}
              </p>
              <button
                onClick={resetMatch}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Play New Match
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="py-1 px-2 text-center text-[10px] text-neutral-500 border-t border-neutral-900 bg-neutral-950/60 shrink-0">
        Spacebar, Left Click, or Screen Tap to shoot • False start fouls trigger round loss
      </footer>
    </div>
  );
}
