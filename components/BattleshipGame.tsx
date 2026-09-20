import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';
import {
  Ship,
  generateRandomFleet,
  getBotShot,
  getAdjacentCells
} from './battleship/battleshipLogic';

interface BattleshipProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Difficulty = 'easy' | 'medium' | 'hard';
type Phase = 'placement' | 'combat' | 'game_over';

export default function BattleshipGame({ onBackToHub }: BattleshipProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [phase, setPhase] = useState<Phase>('placement');

  // Player Fleet
  const [playerShips, setPlayerShips] = useState<Ship[]>(generateRandomFleet);
  const [botShots, setBotShots] = useState<{ [idx: number]: 'hit' | 'miss' }>({});

  // Bot Fleet
  const [botShips, setBotShips] = useState<Ship[]>(generateRandomFleet);
  const [playerShots, setPlayerShots] = useState<{ [idx: number]: 'hit' | 'miss' }>({});

  // Combat State
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [combatLog, setCombatLog] = useState('Position your fleet and launch the naval offensive.');
  const [winner, setWinner] = useState<'player' | 'bot' | null>(null);
  const [botQueue, setBotQueue] = useState<number[]>([]);

  useEffect(() => {
    incrementGamePlays('battleship');
  }, []);

  const randomizePlayerFleet = () => {
    setPlayerShips(generateRandomFleet());
    audioService.playSound('tile_click');
  };

  const startCombat = () => {
    setBotShips(generateRandomFleet());
    setPlayerShots({});
    setBotShots({});
    setBotQueue([]);
    setWinner(null);
    setIsPlayerTurn(true);
    setPhase('combat');
    setCombatLog('Artillery radar online. Select target coordinates in enemy waters!');
    audioService.playSound('success');
  };

  // Player Fires at Bot Grid
  const handlePlayerFire = useCallback((idx: number) => {
    if (phase !== 'combat' || !isPlayerTurn || playerShots[idx]) return;

    // Check hit
    let isHit = false;
    let hitShipName = '';
    const updatedBotShips = botShips.map(ship => {
      if (ship.cells.includes(idx)) {
        isHit = true;
        hitShipName = ship.name;
        return { ...ship, hits: [...ship.hits, idx] };
      }
      return ship;
    });

    const newPlayerShots = {
      ...playerShots,
      [idx]: isHit ? ('hit' as const) : ('miss' as const)
    };
    setPlayerShots(newPlayerShots);
    setBotShips(updatedBotShips);

    if (isHit) {
      audioService.playSound('mine_explode');
      const ship = updatedBotShips.find(s => s.name === hitShipName);
      if (ship && ship.hits.length === ship.size) {
        setCombatLog(`DIRECT HIT! You SUNK the enemy ${hitShipName}!`);
        audioService.playSound('success');
      } else {
        setCombatLog(`DIRECT HIT on enemy vessel at [${String.fromCharCode(65 + Math.floor(idx / 10))}${idx % 10 + 1}]!`);
      }
    } else {
      audioService.playSound('piece_land');
      setCombatLog(`Splash! Torpedo missed at [${String.fromCharCode(65 + Math.floor(idx / 10))}${idx % 10 + 1}].`);
    }

    // Check victory
    const allBotSunk = updatedBotShips.every(s => s.hits.length === s.size);
    if (allBotSunk) {
      setWinner('player');
      setPhase('game_over');
      audioService.playSound('success');
      return;
    }

    // Pass turn to bot
    setIsPlayerTurn(false);
  }, [phase, isPlayerTurn, playerShots, botShips]);

  // Bot Turn Automation
  useEffect(() => {
    if (phase !== 'combat' || isPlayerTurn || winner) return;

    const botTimer = setTimeout(() => {
      const { shotIdx, newQueue } = getBotShot(botShots, playerShips, difficulty, botQueue);

      let isHit = false;
      let hitShipName = '';
      const updatedPlayerShips = playerShips.map(ship => {
        if (ship.cells.includes(shotIdx)) {
          isHit = true;
          hitShipName = ship.name;
          return { ...ship, hits: [...ship.hits, shotIdx] };
        }
        return ship;
      });

      const nextBotShots = {
        ...botShots,
        [shotIdx]: isHit ? ('hit' as const) : ('miss' as const)
      };
      setBotShots(nextBotShots);
      setPlayerShips(updatedPlayerShips);

      // On hit, add adjacent unvisited cells to target queue for Medium / Hard
      let updatedQueue = newQueue;
      if (isHit && difficulty !== 'easy') {
        const adj = getAdjacentCells(shotIdx).filter(c => !nextBotShots[c]);
        updatedQueue = [...updatedQueue, ...adj];
      }
      setBotQueue(updatedQueue);

      if (isHit) {
        audioService.playSound('mine_explode');
        const ship = updatedPlayerShips.find(s => s.name === hitShipName);
        if (ship && ship.hits.length === ship.size) {
          setCombatLog(`WARNING! Enemy artillery SUNK your ${hitShipName}!`);
          audioService.playSound('failure');
        } else {
          setCombatLog(`Enemy shell struck your ${hitShipName}!`);
        }
      } else {
        audioService.playSound('piece_land');
      }

      // Check player defeat
      const allPlayerSunk = updatedPlayerShips.every(s => s.hits.length === s.size);
      if (allPlayerSunk) {
        setWinner('bot');
        setPhase('game_over');
        audioService.playSound('failure');
        return;
      }

      setIsPlayerTurn(true);
    }, 700);

    return () => clearTimeout(botTimer);
  }, [phase, isPlayerTurn, winner, botShots, playerShips, difficulty, botQueue]);

  // Sunk counts
  const botSunkCount = useMemo(() => botShips.filter(s => s.hits.length === s.size).length, [botShips]);
  const playerSunkCount = useMemo(() => playerShips.filter(s => s.hits.length === s.size).length, [playerShips]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#050b14] text-white select-none overflow-hidden font-sans">
      <header className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-base font-black tracking-wide text-sky-400">BATTLESHIP</h1>
            <span className="text-[10px] text-neutral-400 font-mono">10X10 NAVAL RADAR ARTILLERY</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                disabled={phase === 'combat'}
                onClick={() => setDifficulty(d)}
                className={`px-2 py-1 text-xs font-bold rounded capitalize transition-all ${
                  difficulty === d
                    ? 'bg-sky-500 text-black shadow'
                    : 'text-neutral-400 hover:text-white disabled:opacity-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {phase === 'placement' ? (
            <>
              <button
                onClick={randomizePlayerFleet}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
              >
                Randomize
              </button>
              <button
                onClick={startCombat}
                className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-black font-black text-xs rounded-lg shadow uppercase tracking-wide"
              >
                Launch Battle
              </button>
            </>
          ) : (
            <button
              onClick={() => { setPhase('placement'); setWinner(null); }}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
            >
              Surrender
            </button>
          )}
        </div>
      </header>

      {/* Radar Briefing & Turn Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-950/80 border-b border-neutral-900 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPlayerTurn ? 'bg-sky-400 animate-ping' : 'bg-rose-500'}`} />
          <span className="text-neutral-300 font-bold">{combatLog}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-neutral-400">
          <span>Enemy Sunk: <strong className="text-sky-400">{botSunkCount}/5</strong></span>
          <span>Your Sunk: <strong className="text-rose-400">{playerSunkCount}/5</strong></span>
        </div>
      </div>

      {/* Naval Grids Container */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-around p-3 gap-4 overflow-y-auto">
        {/* Enemy Radar Grid (Targeting) */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-mono font-bold text-sky-400 mb-1 flex items-center gap-2">
            <span>🎯 ENEMY WATERS (CLICK TO STRIKE)</span>
            {!isPlayerTurn && phase === 'combat' && (
              <span className="text-neutral-400 text-[10px] animate-pulse">(ENEMY FIRING...)</span>
            )}
          </div>

          <div className="w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] bg-[#031526] p-2 rounded-xl border-2 border-sky-900 shadow-2xl grid grid-cols-10 grid-rows-10 gap-0.5">
            {Array.from({ length: 100 }).map((_, idx) => {
              const shot = playerShots[idx];
              return (
                <button
                  key={idx}
                  onClick={() => handlePlayerFire(idx)}
                  disabled={phase !== 'combat' || !isPlayerTurn || !!shot}
                  className={`w-full h-full rounded-[2px] transition-all flex items-center justify-center text-xs ${
                    shot === 'hit'
                      ? 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.8)] text-white font-bold'
                      : shot === 'miss'
                      ? 'bg-sky-950/80 text-sky-400/70 font-mono'
                      : 'bg-sky-950/40 hover:bg-sky-700/50 cursor-crosshair border border-sky-900/30'
                  }`}
                >
                  {shot === 'hit' ? '💥' : shot === 'miss' ? '•' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Player Fleet Grid */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-mono font-bold text-emerald-400 mb-1">
            🛡️ YOUR FLEET FORMATION
          </div>

          <div className="w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] bg-[#07191e] p-2 rounded-xl border-2 border-emerald-900/80 shadow-2xl grid grid-cols-10 grid-rows-10 gap-0.5">
            {Array.from({ length: 100 }).map((_, idx) => {
              const ship = playerShips.find(s => s.cells.includes(idx));
              const botShot = botShots[idx];

              let bgClass = 'bg-[#0b242b]/40 border border-emerald-950/30';
              if (botShot === 'hit') bgClass = 'bg-rose-600 text-white shadow';
              else if (botShot === 'miss') bgClass = 'bg-neutral-800 text-neutral-400';
              else if (ship) bgClass = 'bg-teal-700 border border-teal-500/70 shadow-sm';

              return (
                <div
                  key={idx}
                  className={`w-full h-full rounded-[2px] flex items-center justify-center text-xs ${bgClass}`}
                >
                  {botShot === 'hit' ? '🔥' : botShot === 'miss' ? '💧' : ship ? '■' : ''}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {winner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-3">{winner === 'player' ? '🎖️' : '🌊'}</div>
            <h2 className={`text-2xl font-black mb-1 ${winner === 'player' ? 'text-sky-400' : 'text-rose-400'}`}>
              {winner === 'player' ? 'NAVAL VICTORY!' : 'FLEET DESTROYED!'}
            </h2>
            <p className="text-sm text-neutral-300 mb-6">
              {winner === 'player'
                ? 'All 5 enemy warships sunk. The ocean is secured!'
                : 'All your warships have been sunk by enemy fire.'}
            </p>
            <button
              onClick={() => { setPhase('placement'); setWinner(null); }}
              className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <footer className="p-2.5 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950/40">
        10x10 Tactical Grid • Fleet: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2) • First to sink all 5 wins!
      </footer>
    </div>
  );
}
