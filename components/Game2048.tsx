import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays } from '../services/firebase';

interface Game2048Props {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Tile {
  id: number;
  val: number;
  r: number;
  c: number;
  merged?: boolean;
  isNew?: boolean;
}

interface HistoryState {
  tiles: Tile[];
  score: number;
}

let nextTileId = 1;

// Wide gradient colors spanning the spectrum
const TILE_COLORS: Record<number, { bg: string; text: string; glow?: string }> = {
  2: { bg: '#e0f2fe', text: '#0369a1' }, // Ice Blue
  4: { bg: '#bae6fd', text: '#0284c7' }, // Soft Sky
  8: { bg: '#fed7aa', text: '#c2410c' }, // Warm Apricot
  16: { bg: '#fb923c', text: '#ffffff', glow: 'rgba(251, 146, 60, 0.45)' }, // Tangerine
  32: { bg: '#f87171', text: '#ffffff', glow: 'rgba(248, 113, 113, 0.5)' }, // Coral Red
  64: { bg: '#ef4444', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.6)' }, // Vivid Crimson
  128: { bg: '#facc15', text: '#713f12', glow: 'rgba(250, 204, 21, 0.65)' }, // Radiant Gold
  256: { bg: '#4ade80', text: '#064e3b', glow: 'rgba(74, 222, 128, 0.7)' }, // Emerald
  512: { bg: '#22d3ee', text: '#083344', glow: 'rgba(34, 211, 238, 0.75)' }, // Electric Cyan
  1024: { bg: '#818cf8', text: '#ffffff', glow: 'rgba(129, 140, 248, 0.8)' }, // Royal Indigo
  2048: { bg: '#a855f7', text: '#ffffff', glow: 'rgba(168, 85, 247, 0.9)' }, // Amethyst Purple
  4096: { bg: '#ec4899', text: '#ffffff', glow: 'rgba(236, 72, 153, 0.9)' }, // Neon Magenta
  8192: { bg: '#f43f5e', text: '#ffffff', glow: 'rgba(244, 63, 94, 1.0)' }, // Ruby Flame
  16384: { bg: '#14b8a6', text: '#ffffff', glow: 'rgba(20, 184, 166, 1.0)' }, // Starlight Teal
};

export default function Game2048({ onBackToHub }: Game2048Props) {
  const [gridSize, setGridSize] = useState<number>(4);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('game2048_high_score') || '0', 10);
  });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [continuePlaying, setContinuePlaying] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryState[]>([]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    incrementGamePlays('game_2048');
  }, []);

  const spawnRandomTile = useCallback((currentTiles: Tile[], size = gridSize): Tile[] => {
    const occupied = new Set(currentTiles.map(t => `${t.r},${t.c}`));
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!occupied.has(`${r},${c}`)) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length === 0) return currentTiles;

    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const newTile: Tile = {
      id: nextTileId++,
      val,
      r,
      c,
      isNew: true
    };
    return [...currentTiles, newTile];
  }, [gridSize]);

  const initGame = useCallback((size = gridSize) => {
    let initialTiles: Tile[] = [];
    initialTiles = spawnRandomTile(initialTiles, size);
    initialTiles = spawnRandomTile(initialTiles, size);
    setTiles(initialTiles);
    setScore(0);
    setGameOver(false);
    setHasWon(false);
    setContinuePlaying(false);
    setHistory([]);
  }, [gridSize, spawnRandomTile]);

  useEffect(() => {
    initGame(gridSize);
  }, [gridSize, initGame]);

  const checkGameOver = (currentTiles: Tile[], size = gridSize): boolean => {
    if (currentTiles.length < size * size) return false;
    const grid: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
    currentTiles.forEach(t => {
      grid[t.r][t.c] = t.val;
    });

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) return false;
        if (c < size - 1 && grid[r][c] === grid[r][c + 1]) return false;
        if (r < size - 1 && grid[r][c] === grid[r + 1][c]) return false;
      }
    }
    return true;
  };

  const move = useCallback((direction: Direction) => {
    if (gameOver) return;

    let changed = false;
    let gainedScore = 0;
    const size = gridSize;

    // Map current tiles onto grid
    const grid: (Tile | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
    tiles.forEach(t => {
      grid[t.r][t.c] = { ...t, merged: false, isNew: false };
    });

    const isHorizontal = direction === 'LEFT' || direction === 'RIGHT';
    const isForward = direction === 'RIGHT' || direction === 'DOWN';

    const newTilesList: Tile[] = [];

    for (let line = 0; line < size; line++) {
      const lineTiles: Tile[] = [];
      for (let i = 0; i < size; i++) {
        const r = isHorizontal ? line : (isForward ? size - 1 - i : i);
        const c = isHorizontal ? (isForward ? size - 1 - i : i) : line;
        const item = grid[r][c];
        if (item) lineTiles.push(item);
      }

      const mergedLine: Tile[] = [];
      let i = 0;
      while (i < lineTiles.length) {
        const current = lineTiles[i];
        if (i + 1 < lineTiles.length && lineTiles[i].val === lineTiles[i + 1].val) {
          const newVal = current.val * 2;
          gainedScore += newVal;
          if (newVal === 2048 && !hasWon && !continuePlaying) {
            setHasWon(true);
            audioService.playSound('mine_win');
          }
          mergedLine.push({
            id: current.id,
            val: newVal,
            r: 0,
            c: 0,
            merged: true
          });
          i += 2;
          changed = true;
        } else {
          mergedLine.push({
            ...current,
            merged: false
          });
          i += 1;
        }
      }

      mergedLine.forEach((t, idx) => {
        const targetPos = isForward ? size - 1 - idx : idx;
        const newR = isHorizontal ? line : targetPos;
        const newC = isHorizontal ? targetPos : line;

        if (t.r !== newR || t.c !== newC) {
          changed = true;
        }
        t.r = newR;
        t.c = newC;
        newTilesList.push(t);
      });
    }

    if (changed) {
      setHistory(prev => [
        ...prev.slice(-15),
        { tiles: tiles.map(t => ({ ...t })), score }
      ]);

      const spawned = spawnRandomTile(newTilesList, size);
      setTiles(spawned);

      const nextScore = score + gainedScore;
      setScore(nextScore);
      if (nextScore > highScore) {
        setHighScore(nextScore);
        localStorage.setItem('game2048_high_score', nextScore.toString());
      }

      if (gainedScore > 0) {
        audioService.playSound('powerup');
      } else {
        audioService.playSound('tile_click');
      }

      if (checkGameOver(spawned, size)) {
        setGameOver(true);
        audioService.playSound('button_click');
      }
    }
  }, [continuePlaying, gameOver, gridSize, hasWon, highScore, score, spawnRandomTile, tiles]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setTiles(last.tiles);
    setScore(last.score);
    setGameOver(false);
    setHistory(prev => prev.slice(0, -1));
    audioService.playSound('button_click');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') move('UP');
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') move('DOWN');
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move('LEFT');
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move('RIGHT');
      else if (e.key === 'z' || e.key === 'Z') handleUndo();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, move]);

  // Touch Swipe Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      move(dy > 0 ? 'DOWN' : 'UP');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#07090e] text-white select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-3 sm:px-5 sm:py-3 bg-[#0d111a] border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm font-bold transition-all text-neutral-300 hover:text-white flex items-center gap-1.5 border border-neutral-700 active:scale-95 shadow-md cursor-pointer"
          >
            <span>←</span>
            <span>Hub</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔢</span>
            <h1 className="text-base sm:text-lg font-black text-amber-400 tracking-wide">2048</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="text-right">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Score</div>
            <div className="text-sm sm:text-lg font-black text-amber-400 font-mono">{score}</div>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Best</div>
            <div className="text-sm sm:text-lg font-black text-cyan-400 font-mono">{highScore}</div>
          </div>
        </div>
      </header>

      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-[#0a0d14] border-b border-neutral-800 text-xs text-neutral-400 shrink-0">
        <div className="flex items-center gap-2">
          <span>Grid:</span>
          <button
            onClick={() => setGridSize(3)}
            className={`px-2 py-0.5 rounded font-bold transition-all ${gridSize === 3 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-neutral-800'}`}
          >
            3x3
          </button>
          <button
            onClick={() => setGridSize(4)}
            className={`px-2 py-0.5 rounded font-bold transition-all ${gridSize === 4 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-neutral-800'}`}
          >
            4x4
          </button>
          <button
            onClick={() => setGridSize(5)}
            className={`px-2 py-0.5 rounded font-bold transition-all ${gridSize === 5 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-neutral-800'}`}
          >
            5x5
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`px-2.5 py-1 rounded font-bold transition-all border ${
              history.length > 0
                ? 'bg-neutral-900 border-neutral-700 hover:bg-neutral-800 text-neutral-200 cursor-pointer'
                : 'opacity-40 border-transparent cursor-not-allowed text-neutral-500'
            }`}
          >
            ↶ Undo ({history.length})
          </button>
          <button
            onClick={() => initGame(gridSize)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-lg shadow cursor-pointer transition-transform active:scale-95"
          >
            New Game
          </button>
        </div>
      </div>

      {/* Main Board Area with Non-resizing Rigid Boxy Grid and Smooth Sliding Tiles */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 min-h-0 relative select-none">
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative aspect-square w-full max-w-[min(90vw,400px,calc(100vh-230px))] max-h-[min(90vw,400px,calc(100vh-230px))] bg-[#12151f] p-2.5 sm:p-3.5 rounded-2xl shadow-2xl border-2 sm:border-3 border-neutral-800 flex items-center justify-center touch-none overflow-hidden"
        >
          {/* Background Grid Slots (Static cells that never resize) */}
          <div
            className="grid gap-2 sm:gap-2.5 w-full h-full aspect-square"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`
            }}
          >
            {Array.from({ length: gridSize * gridSize }).map((_, i) => (
              <div
                key={`bg-cell-${i}`}
                className="w-full h-full rounded-lg sm:rounded-xl bg-neutral-900/60"
              />
            ))}
          </div>

          {/* Sliding Animated Tiles Layer */}
          <div className="absolute inset-2.5 sm:inset-3.5 pointer-events-none">
            {tiles.map(tile => {
              const tileStyle = TILE_COLORS[tile.val] || { bg: '#a855f7', text: '#ffffff' };
              const percent = 100 / gridSize;

              return (
                <div
                  key={tile.id}
                  className="absolute p-1 sm:p-1.5 transition-all duration-150 ease-out"
                  style={{
                    width: `${percent}%`,
                    height: `${percent}%`,
                    transform: `translate(${tile.c * 100}%, ${tile.r * 100}%)`,
                  }}
                >
                  <div
                    className={`w-full h-full rounded-lg sm:rounded-xl flex items-center justify-center font-black select-none leading-none shadow-md ${
                      tile.merged ? 'animate-tile-merge' : tile.isNew ? 'animate-tile-pop' : ''
                    }`}
                    style={{
                      backgroundColor: tileStyle.bg,
                      color: tileStyle.text,
                      boxShadow: tileStyle.glow ? `0 0 16px ${tileStyle.glow}` : undefined,
                      fontSize: tile.val >= 1024 ? '1.15rem' : tile.val >= 128 ? '1.35rem' : '1.65rem'
                    }}
                  >
                    {tile.val}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Win Dialog */}
          {hasWon && !continuePlaying && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-2xl text-center z-30 animate-fade-in">
              <span className="text-4xl mb-2">🏆</span>
              <h2 className="text-2xl font-black text-amber-400 mb-1">YOU REACHED 2048!</h2>
              <p className="text-sm text-neutral-300 mb-4">Legendary tile unlocked!</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setContinuePlaying(true)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Keep Playing
                </button>
                <button
                  onClick={() => initGame(gridSize)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl cursor-pointer"
                >
                  New Game
                </button>
              </div>
            </div>
          )}

          {/* Game Over Dialog */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-2xl text-center z-30 animate-fade-in">
              <span className="text-4xl mb-2">💥</span>
              <h2 className="text-2xl font-black text-red-500 mb-1">NO MORE MOVES</h2>
              <p className="text-sm text-neutral-300 mb-4">Final Score: <span className="font-bold text-amber-400">{score}</span></p>
              <button
                onClick={() => initGame(gridSize)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Mobile/Touch Directional Controls */}
        <div className="mt-3 flex flex-col items-center gap-1.5 sm:hidden shrink-0">
          <button
            onClick={() => move('UP')}
            className="w-14 h-10 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 active:scale-95 shadow cursor-pointer"
          >
            ▲
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => move('LEFT')}
              className="w-14 h-10 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 active:scale-95 shadow cursor-pointer"
            >
              ◀
            </button>
            <button
              onClick={() => move('DOWN')}
              className="w-14 h-10 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 active:scale-95 shadow cursor-pointer"
            >
              ▼
            </button>
            <button
              onClick={() => move('RIGHT')}
              className="w-14 h-10 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 active:scale-95 shadow cursor-pointer"
            >
              ▶
            </button>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-neutral-500 text-center hidden sm:block">
          Use Arrow Keys, WASD, or Swipe on Touchscreen. Press [Z] to Undo.
        </p>
      </div>
    </div>
  );
}
