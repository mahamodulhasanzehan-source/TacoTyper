import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';
import {
  Ship,
  SHIPS_CONFIG,
  generateRandomFleet,
  getBotShot
} from './battleship/battleshipLogic';
import { ShipSilhouette } from './battleship/ShipSilhouette';

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
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<number | null>(null);
  const [botShots, setBotShots] = useState<{ [idx: number]: 'hit' | 'miss' }>({});

  // Bot Fleet
  const [botShips, setBotShips] = useState<Ship[]>(generateRandomFleet);
  const [playerShots, setPlayerShots] = useState<{ [idx: number]: 'hit' | 'miss' }>({});

  // Combat State
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [combatLog, setCombatLog] = useState('Position your fleet or tap a ship to rotate/relocate, then launch!');
  const [winner, setWinner] = useState<'player' | 'bot' | null>(null);
  const [botQueue, setBotQueue] = useState<number[]>([]);

  useEffect(() => {
    incrementGamePlays('battleship');
  }, []);

  const randomizePlayerFleet = () => {
    setPlayerShips(generateRandomFleet());
    setSelectedShipId(null);
    audioService.playSound('tile_click');
  };

  // Helper: determine if ship is horizontal
  const isShipHorizontal = (ship: Ship) => {
    if (ship.cells.length <= 1) return true;
    return ship.cells[1] - ship.cells[0] === 1;
  };

  // Validate placement of a ship with given size & orientation starting at cellIndex
  const canPlaceShipAt = (
    shipId: string,
    startIdx: number,
    horizontal: boolean,
    ships: Ship[]
  ): number[] | null => {
    const config = SHIPS_CONFIG.find(s => s.id === shipId);
    if (!config) return null;
    const size = config.size;

    const startR = Math.floor(startIdx / 10);
    const startC = startIdx % 10;
    const cells: number[] = [];

    for (let i = 0; i < size; i++) {
      const nr = horizontal ? startR : startR + i;
      const nc = horizontal ? startC + i : startC;
      if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) return null;
      cells.push(nr * 10 + nc);
    }

    // Check collision with other ships (ignoring the moving ship itself)
    const occupiedByOthers = new Set<number>();
    ships.forEach(s => {
      if (s.id !== shipId) {
        s.cells.forEach(c => occupiedByOthers.add(c));
      }
    });

    for (const c of cells) {
      if (occupiedByOthers.has(c)) return null;
    }

    return cells;
  };

  // Rotate ship on tap
  const rotateShip = (shipId: string) => {
    if (phase !== 'placement') return;
    const target = playerShips.find(s => s.id === shipId);
    if (!target) return;

    const currentHoriz = isShipHorizontal(target);
    const newHoriz = !currentHoriz;
    const startIdx = target.cells[0];

    const newCells = canPlaceShipAt(shipId, startIdx, newHoriz, playerShips);
    if (newCells) {
      setPlayerShips(prev =>
        prev.map(s => (s.id === shipId ? { ...s, cells: newCells } : s))
      );
      audioService.playSound('tile_click');
      setCombatLog(`Rotated ${target.name} to ${newHoriz ? 'horizontal' : 'vertical'}.`);
    } else {
      audioService.playSound('word_invalid');
      setCombatLog(`Cannot rotate ${target.name} here (wall collision or obstruction).`);
    }
  };

  // Drag-and-drop relocation handlers
  const handleShipDragStart = (e: React.DragEvent, shipId: string) => {
    if (phase !== 'placement') return;
    e.dataTransfer.setData('text/plain', shipId);
    setDraggedShipId(shipId);
    setSelectedShipId(shipId);
  };

  const handleCellDragOver = (e: React.DragEvent, idx: number) => {
    if (phase !== 'placement') return;
    e.preventDefault();
    setHoverCell(idx);
  };

  const handleCellDrop = (e: React.DragEvent, idx: number) => {
    if (phase !== 'placement') return;
    e.preventDefault();
    const shipId = e.dataTransfer.getData('text/plain') || draggedShipId;
    setHoverCell(null);
    setDraggedShipId(null);
    if (!shipId) return;

    const target = playerShips.find(s => s.id === shipId);
    if (!target) return;

    const currentHoriz = isShipHorizontal(target);
    const newCells = canPlaceShipAt(shipId, idx, currentHoriz, playerShips);
    if (newCells) {
      setPlayerShips(prev =>
        prev.map(s => (s.id === shipId ? { ...s, cells: newCells } : s))
      );
      audioService.playSound('piece_drop');
      setCombatLog(`Repositioned ${target.name} to coordinates.`);
    } else {
      audioService.playSound('word_invalid');
    }
  };

  // Direct cell tap placement when a ship is selected in placement mode
  const handlePlayerCellClick = (idx: number) => {
    if (phase !== 'placement') return;

    // If tapped on an existing ship, select it or rotate it
    const existing = playerShips.find(s => s.cells.includes(idx));
    if (existing) {
      if (selectedShipId === existing.id) {
        rotateShip(existing.id);
      } else {
        setSelectedShipId(existing.id);
        audioService.playSound('tile_click');
        setCombatLog(`Selected ${existing.name}. Tap it again to rotate, or tap empty cell to move.`);
      }
      return;
    }

    // If an existing ship is selected and we tap an empty cell, relocate it there!
    if (selectedShipId) {
      const target = playerShips.find(s => s.id === selectedShipId);
      if (target) {
        const currentHoriz = isShipHorizontal(target);
        const newCells = canPlaceShipAt(selectedShipId, idx, currentHoriz, playerShips);
        if (newCells) {
          setPlayerShips(prev =>
            prev.map(s => (s.id === selectedShipId ? { ...s, cells: newCells } : s))
          );
          audioService.playSound('piece_drop');
          setCombatLog(`Relocated ${target.name}.`);
        } else {
          audioService.playSound('word_invalid');
          setCombatLog(`Invalid placement for ${target.name} at selected grid.`);
        }
      }
    }
  };

  const startCombat = () => {
    setBotShips(generateRandomFleet());
    setPlayerShots({});
    setBotShots({});
    setBotQueue([]);
    setWinner(null);
    setIsPlayerTurn(true);
    setSelectedShipId(null);
    setPhase('combat');
    setCombatLog('Artillery radar online. Select target coordinates in enemy waters!');
    audioService.playSound('success');
  };

  // Player Fires at Bot Grid
  const handlePlayerFire = useCallback((idx: number) => {
    if (phase !== 'combat' || !isPlayerTurn || playerShots[idx]) return;

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

    const newShots = { ...playerShots, [idx]: (isHit ? 'hit' : 'miss') as 'hit' | 'miss' };
    setPlayerShots(newShots);
    setBotShips(updatedBotShips);

    if (isHit) {
      audioService.playSound('mine_explode');
      const sunkShip = updatedBotShips.find(s => s.name === hitShipName && s.hits.length === s.size);
      if (sunkShip) {
        audioService.playSound('success');
        setCombatLog(`WARSHIP SUNK! Enemy ${hitShipName} destroyed!`);
      } else {
        setCombatLog(`DIRECT HIT on enemy vessel at [${String.fromCharCode(65 + Math.floor(idx / 10))}${idx % 10 + 1}]!`);
      }
    } else {
      audioService.playSound('piece_land');
      setCombatLog(`Splash! Torpedo missed at [${String.fromCharCode(65 + Math.floor(idx / 10))}${idx % 10 + 1}].`);
    }

    // Check Victory
    const allBotSunk = updatedBotShips.every(s => s.hits.length === s.size);
    if (allBotSunk) {
      setWinner('player');
      setPhase('game_over');
      audioService.playSound('success');
      return;
    }

    setIsPlayerTurn(false);
  }, [phase, isPlayerTurn, playerShots, botShips]);

  // Bot Turn Automation
  useEffect(() => {
    if (phase !== 'combat' || isPlayerTurn || winner) return;

    const timer = setTimeout(() => {
      const { shotIdx, newQueue } = getBotShot(botShots, playerShips, difficulty, botQueue);
      setBotQueue(newQueue);

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

      const newBotShots = { ...botShots, [shotIdx]: (isHit ? 'hit' : 'miss') as 'hit' | 'miss' };
      setBotShots(newBotShots);
      setPlayerShips(updatedPlayerShips);

      if (isHit) {
        audioService.playSound('mine_explode');
        const sunk = updatedPlayerShips.find(s => s.name === hitShipName && s.hits.length === s.size);
        if (sunk) {
          audioService.playSound('wrong_answer');
          setCombatLog(`ALERT: Your ${hitShipName} was sunk by enemy counter-battery!`);
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

    return () => clearTimeout(timer);
  }, [phase, isPlayerTurn, winner, botShots, playerShips, difficulty, botQueue]);

  const botSunkCount = useMemo(() => botShips.filter(s => s.hits.length === s.size).length, [botShips]);
  const playerSunkCount = useMemo(() => playerShips.filter(s => s.hits.length === s.size).length, [playerShips]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#05070d] text-white select-none overflow-hidden font-sans">
      {/* Top Navbar */}
      <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-neutral-900/90 border-b border-neutral-800 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHub}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-sky-400">BATTLESHIP</h1>
            <span className="text-[9px] sm:text-[10px] text-neutral-400 font-mono hidden sm:inline">NAVAL TACTICAL RADAR</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Difficulty Segment */}
          <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                disabled={phase === 'combat'}
                onClick={() => setDifficulty(d)}
                className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded capitalize transition-all ${
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
            <div className="flex items-center gap-1.5">
              <button
                onClick={randomizePlayerFleet}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-[11px] sm:text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
              >
                🔀 Randomize
              </button>
              <button
                onClick={startCombat}
                className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-black font-black text-[11px] sm:text-xs rounded-lg shadow uppercase tracking-wide"
              >
                🚀 Launch Battle
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setPhase('placement'); setWinner(null); }}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-[11px] sm:text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
            >
              Surrender
            </button>
          )}
        </div>
      </header>

      {/* Radar Briefing & Turn Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-950/90 border-b border-neutral-900 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2 truncate pr-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isPlayerTurn ? 'bg-sky-400 animate-ping' : 'bg-rose-500'}`} />
          <span className="text-neutral-300 truncate text-[11px] sm:text-xs">{combatLog}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-neutral-400 shrink-0">
          <span>Enemy: <strong className="text-sky-400">{botSunkCount}/5</strong></span>
          <span>Yours: <strong className="text-rose-400">{playerSunkCount}/5</strong></span>
        </div>
      </div>

      {/* Naval Grids Container - Scaled for desktop & mobile */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-2 sm:p-4 gap-3 sm:gap-6 overflow-y-auto">
        {/* Enemy Radar Grid (Targeting in Combat Mode) */}
        {phase !== 'placement' && (
          <div className="flex flex-col items-center">
            <div className="text-[11px] sm:text-xs font-mono font-bold text-sky-400 mb-1 flex items-center gap-1.5">
              <span>🎯 ENEMY WATERS (RADAR)</span>
              {isPlayerTurn && <span className="text-amber-400 text-[10px] animate-pulse">[FIRE READY]</span>}
            </div>

            <div className="relative p-1.5 sm:p-2 bg-neutral-950 rounded-xl border border-sky-950 shadow-2xl">
              <div className="grid grid-cols-10 grid-rows-10 gap-0.5 sm:gap-1 bg-[#06101e] p-1 rounded-lg w-[min(88vw,310px)] h-[min(88vw,310px)] sm:w-[320px] sm:h-[320px] relative">
                {/* Sunk Enemy Ship Silhouettes Overlay */}
                {botShips
                  .filter(ship => ship.hits.length === ship.size)
                  .map(ship => {
                    const isHoriz = isShipHorizontal(ship);
                    const firstCell = Math.min(...ship.cells);
                    const r = Math.floor(firstCell / 10);
                    const c = firstCell % 10;
                    const cellPercent = 10;
                    const top = `${r * cellPercent}%`;
                    const left = `${c * cellPercent}%`;
                    const width = isHoriz ? `${ship.size * cellPercent}%` : `${cellPercent}%`;
                    const height = isHoriz ? `${cellPercent}%` : `${ship.size * cellPercent}%`;

                    return (
                      <div
                        key={`enemy-sunk-${ship.id}`}
                        style={{
                          position: 'absolute',
                          top,
                          left,
                          width,
                          height,
                          zIndex: 15,
                          pointerEvents: 'none'
                        }}
                        className="p-0.5 flex items-center justify-center animate-fade-in"
                      >
                        <div className="w-full h-full rounded border-2 border-rose-500 bg-rose-950/90 shadow-[0_0_16px_rgba(244,63,94,0.8)] flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
                          <ShipSilhouette
                            id={ship.id}
                            horizontal={isHoriz}
                            className="w-full h-full p-0.5 opacity-95 filter drop-shadow-[0_0_6px_rgba(244,63,94,1)]"
                          />
                          <div className="absolute inset-0 bg-red-600/20 pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}

                {Array.from({ length: 100 }).map((_, idx) => {
                  const shot = playerShots[idx];
                  const hitShip = shot === 'hit';
                  const belongsToSunkShip = botShips.some(s => s.cells.includes(idx) && s.hits.length === s.size);

                  return (
                    <button
                      key={`enemy-${idx}`}
                      disabled={!isPlayerTurn || !!shot || phase !== 'combat'}
                      onClick={() => handlePlayerFire(idx)}
                      className={`w-full h-full rounded-[2px] transition-all flex items-center justify-center relative cursor-crosshair disabled:cursor-default ${
                        belongsToSunkShip
                          ? 'bg-rose-950/60 border border-rose-900/60'
                          : shot === 'hit'
                          ? 'bg-rose-600/90 text-white font-black shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                          : shot === 'miss'
                          ? 'bg-slate-800/80 text-sky-300'
                          : 'bg-sky-950/40 hover:bg-sky-700/50 border border-sky-900/30'
                      }`}
                    >
                      {shot === 'hit' && !belongsToSunkShip && <span className="text-[10px] sm:text-xs">💥</span>}
                      {shot === 'miss' && <span className="w-1.5 h-1.5 rounded-full bg-sky-400/60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Player Grid (Placement & Defense) */}
        <div className="flex flex-col items-center">
          <div className="text-[11px] sm:text-xs font-mono font-bold text-neutral-300 mb-1 flex items-center justify-between w-full px-1">
            <span>🛡️ YOUR FLEET DEFENSE</span>
            {phase === 'placement' && (
              <span className="text-sky-400 text-[10px]">Drag or tap ships to arrange</span>
            )}
          </div>

          <div className="relative p-1.5 sm:p-2 bg-neutral-950 rounded-xl border border-neutral-800 shadow-2xl">
            <div className="grid grid-cols-10 grid-rows-10 gap-0.5 sm:gap-1 bg-[#090d16] p-1 rounded-lg w-[min(88vw,310px)] h-[min(88vw,310px)] sm:w-[320px] sm:h-[320px] relative">
              {/* Ship Silhouettes Overlay */}
              {playerShips.map(ship => {
                const isHoriz = isShipHorizontal(ship);
                const firstCell = ship.cells[0];
                const r = Math.floor(firstCell / 10);
                const c = firstCell % 10;
                const isSelected = selectedShipId === ship.id;
                const isSunk = ship.hits.length === ship.size;

                // Calculate CSS positioning matching grid cells
                const cellPercent = 10;
                const top = `${r * cellPercent}%`;
                const left = `${c * cellPercent}%`;
                const width = isHoriz ? `${ship.size * cellPercent}%` : `${cellPercent}%`;
                const height = isHoriz ? `${cellPercent}%` : `${ship.size * cellPercent}%`;

                return (
                  <div
                    key={`ship-overlay-${ship.id}`}
                    draggable={phase === 'placement'}
                    onDragStart={e => handleShipDragStart(e, ship.id)}
                    onClick={() => {
                      if (phase === 'placement') {
                        if (selectedShipId === ship.id) rotateShip(ship.id);
                        else {
                          setSelectedShipId(ship.id);
                          audioService.playSound('tile_click');
                        }
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top,
                      left,
                      width,
                      height,
                      zIndex: isSelected ? 15 : 10
                    }}
                    className={`p-0.5 flex items-center justify-center transition-all ${
                      phase === 'placement' ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : ''
                    }`}
                  >
                    <div
                      className={`w-full h-full rounded border flex items-center justify-center relative overflow-hidden transition-all ${
                        isSunk
                          ? 'border-rose-600 bg-rose-950/40 opacity-70'
                          : isSelected
                          ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                          : 'border-sky-500/70 bg-sky-950/40 shadow-sm'
                      }`}
                    >
                      <ShipSilhouette id={ship.id} horizontal={isHoriz} className="w-full h-full p-0.5" />
                    </div>
                  </div>
                );
              })}

              {/* Grid Cells (for drag-drop targets and hit/miss indicators) */}
              {Array.from({ length: 100 }).map((_, idx) => {
                const shot = botShots[idx];
                const isHovered = hoverCell === idx && phase === 'placement';

                return (
                  <div
                    key={`player-cell-${idx}`}
                    onDragOver={e => handleCellDragOver(e, idx)}
                    onDrop={e => handleCellDrop(e, idx)}
                    onClick={() => handlePlayerCellClick(idx)}
                    className={`w-full h-full rounded-[2px] transition-colors relative flex items-center justify-center ${
                      isHovered
                        ? 'bg-sky-400/30 border border-sky-300'
                        : 'bg-neutral-900/30 border border-neutral-800/30'
                    }`}
                  >
                    {/* Shell impacts */}
                    {shot === 'hit' && (
                      <span className="relative z-20 text-[10px] sm:text-xs">💥</span>
                    )}
                    {shot === 'miss' && (
                      <span className="relative z-20 w-1.5 h-1.5 rounded-full bg-slate-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Ship Selector Tray (Placement Mode) */}
          {phase === 'placement' && (
            <div className="w-full max-w-[320px] mt-2 p-1.5 bg-neutral-950/80 rounded-xl border border-neutral-800 flex items-center justify-between text-[10px] font-mono">
              {SHIPS_CONFIG.map(cfg => {
                const ship = playerShips.find(s => s.id === cfg.id);
                const isSelected = selectedShipId === cfg.id;
                return (
                  <button
                    key={cfg.id}
                    onClick={() => {
                      setSelectedShipId(cfg.id);
                      audioService.playSound('tile_click');
                      setCombatLog(`Selected ${cfg.name} (${cfg.size} cells). Tap grid to place, or tap again to rotate.`);
                    }}
                    className={`px-1.5 py-1 rounded transition-all flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? 'bg-sky-500 text-black font-bold'
                        : 'text-neutral-400 hover:text-white bg-neutral-900'
                    }`}
                  >
                    <span>{cfg.name.slice(0, 4)}</span>
                    <span className="text-[9px] opacity-75">{cfg.size}■</span>
                  </button>
                );
              })}
              {selectedShipId && (
                <button
                  onClick={() => rotateShip(selectedShipId)}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded shadow text-[10px]"
                >
                  🔄 Rotate
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Game Over Modal */}
      {phase === 'game_over' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-30 p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-2">{winner === 'player' ? '🏆' : '💀'}</div>
            <h2 className={`text-2xl font-black mb-1 ${winner === 'player' ? 'text-sky-400' : 'text-rose-500'}`}>
              {winner === 'player' ? 'NAVAL VICTORY!' : 'FLEET DESTROYED!'}
            </h2>
            <p className="text-sm text-neutral-400 mb-6">
              {winner === 'player'
                ? `You decimated the enemy fleet on ${difficulty.toUpperCase()} difficulty!`
                : `Enemy artillery sank all 5 of your combat vessels.`}
            </p>
            <button
              onClick={() => {
                setPhase('placement');
                setWinner(null);
                setPlayerShips(generateRandomFleet());
              }}
              className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
