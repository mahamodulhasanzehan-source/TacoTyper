import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';

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
  const [roundMessage, setRoundMessage] = useState('');
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
    setRoundMessage('');
    setState('ready');
    audioService.playSound('tile_click');

    const t1 = setTimeout(() => {
      setState('steady');
      audioService.playSound('tile_click');

      const delay = 2000 + Math.random() * 3500;
      const botConfig = getBotReactionTime(difficulty);

      if (botConfig.falseStart) {
        const falseStartTime = Math.max(800, delay - (150 + Math.random() * 350));
        const tBotFoul = setTimeout(() => {
          if (fireTimestampRef.current !== null || playerFiredRef.current) return;
          botFiredRef.current = true;
          setRoundWinner('player');
          setRoundMessage('BOT DRAWN TOO EARLY! False start foul.');
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
        setTimeout(() => setFlash(false), 200);

        const botLatency = botConfig.time;
        const tBot = setTimeout(() => {
          if (botFiredRef.current || playerFiredRef.current) return;
          botFiredRef.current = true;
          setBotReaction(botLatency);
          setRoundWinner('bot');
          setRoundMessage(`Outdrawn! Bot shot in ${botLatency}ms.`);
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
      setRoundMessage('MISFIRE! Drawn before FIRE signal. Foul forfeited.');
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
        setRoundMessage(`Bullseye! Quickest draw (${elapsed}ms vs ${botTarget}ms).`);
        audioService.playSound('success');
        setPlayerScore(p => {
          const next = p + 1;
          if (next >= 3) setState('match_over');
          else setState('round_over');
          return next;
        });
      } else {
        setRoundWinner('bot');
        setRoundMessage(`Outdrawn! (${elapsed}ms vs Bot ${botTarget}ms).`);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleShoot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShoot]);

  const resetMatch = () => {
    clearAllTimeouts();
    setPlayerScore(0);
    setBotScore(0);
    setRoundWinner(null);
    setPlayerReaction(null);
    setBotReaction(null);
    setRoundMessage('');
    setState('idle');
  };

  return (
    <div
      className={`w-full h-screen flex flex-col bg-[#0b0c10] text-white select-none overflow-hidden font-sans transition-colors duration-100 ${
        flash ? 'bg-amber-100 text-black' : ''
      }`}
      onPointerDown={handleShoot}
    >
      <header className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onBackToHub(); }}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-base font-black tracking-wide text-amber-400">QUICK DRAW</h1>
            <span className="text-[10px] text-neutral-400 font-mono">STANDOFF DUEL (FIRST TO 3)</span>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); resetMatch(); }}
                className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-all ${
                  difficulty === d
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={resetMatch}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Duel Scoreboard */}
      <div className="flex items-center justify-around py-4 bg-neutral-950/60 border-b border-neutral-900 px-4">
        <div className="text-center">
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">You (Cowboy)</div>
          <div className="text-3xl font-black font-mono text-white mt-1">{playerScore}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            {playerReaction !== null ? `${playerReaction}ms` : '—'}
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-amber-400 font-bold">
          Rounds: {playerScore} - {botScore}
        </div>

        <div className="text-center">
          <div className="text-xs text-red-400 font-bold uppercase tracking-wider">Sheriff Bot ({difficulty})</div>
          <div className="text-3xl font-black font-mono text-white mt-1">{botScore}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            {botReaction !== null ? `${botReaction}ms` : '—'}
          </div>
        </div>
      </div>

      {/* Main Arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
        {state === 'idle' && (
          <div className="max-w-md bg-neutral-900/90 border border-neutral-800 p-8 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">🤠⚡🤖</div>
            <h2 className="text-2xl font-black text-amber-400 mb-2">High Noon Standoff</h2>
            <p className="text-sm text-neutral-300 mb-6 leading-relaxed">
              Wait for the <strong>READY...</strong> and <strong>STEADY...</strong> countdown.<br />
              When <strong className="text-red-400">FIRE!</strong> flashes, tap or press <kbd className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-amber-300 font-mono">SPACE</kbd> immediately.<br />
              <span className="text-red-400 text-xs font-semibold block mt-2">⚠️ Drawing before FIRE is an immediate false start foul!</span>
            </p>
            <button
              onClick={startRound}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-base tracking-wider uppercase shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Draw Your Weapon
            </button>
          </div>
        )}

        {(state === 'ready' || state === 'steady') && (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="text-6xl font-black font-mono tracking-widest text-neutral-400">
              {state === 'ready' ? 'READY...' : 'STEADY...'}
            </div>
            <p className="text-sm text-neutral-500 font-semibold tracking-wider uppercase">
              Keep your finger on the holster... Don't flinch!
            </p>
          </div>
        )}

        {state === 'fire' && (
          <div className="flex flex-col items-center gap-4 animate-bounce">
            <div className="text-7xl sm:text-9xl font-black font-mono tracking-tighter text-red-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.9)]">
              FIRE!
            </div>
            <div className="text-base text-amber-400 font-bold uppercase tracking-widest">
              TAP SCREEN OR HIT SPACE!
            </div>
          </div>
        )}

        {(state === 'round_over' || state === 'match_over') && (
          <div className="max-w-md bg-neutral-900/95 border border-neutral-800 p-8 rounded-2xl shadow-2xl z-30" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-3">
              {roundWinner === 'player' ? '🏆' : roundWinner === 'foul' ? '⚠️' : '💀'}
            </div>
            <h2 className={`text-2xl font-black mb-2 ${roundWinner === 'player' ? 'text-emerald-400' : 'text-red-400'}`}>
              {state === 'match_over'
                ? (playerScore >= 3 ? 'MATCH VICTORY!' : 'MATCH DEFEAT')
                : (roundWinner === 'player' ? 'ROUND WON' : 'ROUND LOST')}
            </h2>
            <p className="text-sm text-neutral-300 font-medium mb-6">
              {roundMessage}
            </p>

            <button
              onClick={state === 'match_over' ? resetMatch : startRound}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-base tracking-wider uppercase shadow-lg transition-all"
            >
              {state === 'match_over' ? 'New Match' : 'Next Round'}
            </button>
          </div>
        )}
      </div>

      <footer className="p-3 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950/40">
        Controls: Spacebar, Left Click, or Screen Tap • Difficulty: Easy (360-450ms), Medium (250-310ms), Hard (170-210ms)
      </footer>
    </div>
  );
}
