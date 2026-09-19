import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays } from '../services/firebase';

interface Game2048Props {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface HistoryState {
  board: number[][];
  score: number;
}

const TILE_COLORS: Record<number, { bg: string; text: string; glow?: string }> = {
  2: { bg: '#27272a', text: '#e4e4e7' },
  4: { bg: '#3f3f46', text: '#fafafa' },
  8: { bg: '#ea580c', text: '#ffffff', glow: 'rgba(234, 88, 12, 0.4)' },
  16: { bg: '#f97316', text: '#ffffff', glow: 'rgba(249, 115, 22, 0.5)' },
  32: { bg: '#ef4444', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.5)' },
  64: { bg: '#dc2626', text: '#ffffff', glow: 'rgba(220, 38, 38, 0.6)' },
  128: { bg: '#eab308', text: '#ffffff', glow: 'rgba(234, 179, 8, 0.6)' },
  256: { bg: '#f59e0b', text: '#ffffff', glow: 'rgba(245, 158, 11, 0.7)' },
  512: { bg: '#10b981', text: '#ffffff', glow: 'rgba(16, 185, 129, 0.7)' },
  1024: { bg: '#06b6d4', text: '#ffffff', glow: 'rgba(6, 182, 212, 0.8)' },
  2048: { bg: '#8b5cf6', text: '#ffffff', glow: 'rgba(139, 92, 246, 0.9)' },
  4096: { bg: '#ec4899', text: '#ffffff', glow: 'rgba(236, 72, 153, 0.9)' },
  8192: { bg: '#f43f5e', text: '#ffffff', glow: 'rgba(244, 63, 94, 1.0)' },
};

export default function Game2048({ onBackToHub }: Game2048Props) {
  const [gridSize, setGridSize] = useState<number>(4);
  const [board, setBoard] = useState<number[][]>(() => createEmptyBoard(4));
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

  function createEmptyBoard(size: number): number[][] {
    return Array(size).fill(0).map(() => Array(size).fill(0));
  }

  const spawnRandomTile = useCallback((currentBoard: number[][]): number[][] => {
    const emptyCells: { r: number; c: number }[] = [];
    currentBoard.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val === 0) emptyCells.push({ r, c });
      });
    });

    if (emptyCells.length === 0) return currentBoard;

    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newBoard = currentBoard.map(row => [...row]);
    newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  }, []);

  const initGame = useCallback((size = gridSize) => {
    let newBoard = createEmptyBoard(size);
    newBoard = spawnRandomTile(newBoard);
    newBoard = spawnRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setHasWon(false);
    setContinuePlaying(false);
    setHistory([]);
  }, [gridSize, spawnRandomTile]);

  useEffect(() => {
    initGame(gridSize);
  }, [gridSize, initGame]);

  const checkGameOver = (currentBoard: number[][]): boolean => {
    const size = currentBoard.length;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (currentBoard[r][c] === 0) return false;
        if (c < size - 1 && currentBoard[r][c] === currentBoard[r][c + 1]) return false;
        if (r < size - 1 && currentBoard[r][c] === currentBoard[r + 1][c]) return false;
      }
    }
    return true;
  };

  const move = useCallback((direction: Direction) => {
    if (gameOver) return;

    let changed = false;
    let gainedScore = 0;
    const size = board.length;
    const newBoard = board.map(row => [...row]);

    const rotateLeft = (mat: number[][]) => {
      const res = createEmptyBoard(size);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          res[size - 1 - c][r] = mat[r][c];
        }
      }
      return res;
    };

    const rotateRight = (mat: number[][]) => {
      const res = createEmptyBoard(size);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          res[c][size - 1 - r] = mat[r][c];
        }
      }
      return res;
    };

    let working = newBoard;
    if (direction === 'UP') working = rotateLeft(working);
    else if (direction === 'RIGHT') working = rotateLeft(rotateLeft(working));
    else if (direction === 'DOWN') working = rotateRight(working);

    // Slide and merge left
    for (let r = 0; r < size; r++) {
      const row = working[r].filter(v => v !== 0);
      const merged: number[] = [];
      let c = 0;
      while (c < row.length) {
        if (c < row.length - 1 && row[c] === row[c + 1]) {
          const val = row[c] * 2;
          merged.push(val);
          gainedScore += val;
          if (val === 2048 && !hasWon && !continuePlaying) {
            setHasWon(true);
            audioService.playSound('success');
          }
          c += 2;
        } else {
          merged.push(row[c]);
          c += 1;
        }
      }
      while (merged.length < size) {
        merged.push(0);
      }
      for (let i = 0; i < size; i++) {
        if (working[r][i] !== merged[i]) changed = true;
        working[r][i] = merged[i];
      }
    }

    // Rotate back
    if (direction === 'UP') working = rotateRight(working);
    else if (direction === 'RIGHT') working = rotateRight(rotateRight(working));
    else if (direction === 'DOWN') working = rotateLeft(working);

    if (changed) {
      audioService.playSound('tile_click');
      // Save history for Undo
      setHistory(prev => [...prev.slice(-10), { board, score }]);

      const spawned = spawnRandomTile(working);
      const newScore = score + gainedScore;
      setBoard(spawned);
      setScore(newScore);

      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('game2048_high_score', String(newScore));
      }

      if (checkGameOver(spawned)) {
        audioService.playSound('failure');
        setGameOver(true);
      }
    }
  }, [board, continuePlaying, gameOver, hasWon, highScore, score, spawnRandomTile]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setBoard(last.board);
    setScore(last.score);
    setGameOver(false);
    setHistory(prev => prev.slice(0, -1));
    audioService.playSound('button_click');
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
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
  }, [move]);

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

    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      move(dy > 0 ? 'DOWN' : 'UP');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#07090e] text-white select-none overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between p-3 sm:p-4 bg-[#0d111a] border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm font-bold transition-all text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <span>←</span>
            <span>Hub</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔢</span>
            <h1 className="text-base sm:text-lg font-bold text-amber-400 tracking-wide">2048</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="text-right">
            <div className="text-[10px] text-neutral-400 uppercase">Score</div>
            <div className="text-sm sm:text-lg font-extrabold text-amber-400">{score}</div>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] text-neutral-400 uppercase">Best</div>
            <div className="text-sm sm:text-lg font-extrabold text-cyan-400">{highScore}</div>
          </div>
        </div>
      </header>

      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#0b0e14] border-b border-neutral-800 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span>Grid:</span>
          <button
            onClick={() => setGridSize(3)}
            className={`px-2 py-0.5 rounded ${gridSize === 3 ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'hover:bg-neutral-800'}`}
          >
            3x3
          </button>
          <button
            onClick={() => setGridSize(4)}
            className={`px-2 py-0.5 rounded ${gridSize === 4 ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'hover:bg-neutral-800'}`}
          >
            4x4
          </button>
          <button
            onClick={() => setGridSize(5)}
            className={`px-2 py-0.5 rounded ${gridSize === 5 ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'hover:bg-neutral-800'}`}
          >
            5x5
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`px-3 py-1 rounded font-medium transition-all ${history.length > 0 ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
          >
            ↶ Undo ({history.length})
          </button>
          <button
            onClick={() => initGame(gridSize)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded cursor-pointer"
          >
            New Game
          </button>
        </div>
      </div>

      {/* Main Board Area */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 flex flex-col items-center justify-center p-3 relative touch-none"
      >
        <div className="relative bg-[#18181b] p-3 sm:p-4 rounded-2xl shadow-2xl border-2 border-neutral-800">
          <div
            className="grid gap-2 sm:gap-3"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              width: gridSize === 3 ? '270px' : gridSize === 4 ? '320px' : '360px',
              height: gridSize === 3 ? '270px' : gridSize === 4 ? '320px' : '360px',
            }}
          >
            {board.map((row, r) =>
              row.map((val, c) => {
                const tileStyle = TILE_COLORS[val] || { bg: '#ec4899', text: '#ffffff' };
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`rounded-xl flex items-center justify-center font-black transition-all duration-100 select-none ${
                      val === 0 ? 'bg-neutral-900/60' : ''
                    }`}
                    style={{
                      backgroundColor: val > 0 ? tileStyle.bg : undefined,
                      color: val > 0 ? tileStyle.text : 'transparent',
                      boxShadow: tileStyle.glow ? `0 0 16px ${tileStyle.glow}` : undefined,
                      fontSize: val > 512 ? '18px' : val > 64 ? '22px' : '26px'
                    }}
                  >
                    {val > 0 ? val : ''}
                  </div>
                );
              })
            )}
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
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl"
                >
                  Keep Playing
                </button>
                <button
                  onClick={() => initGame(gridSize)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl"
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
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl shadow-lg transition-transform hover:scale-105"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* On-screen Directional controls for touch/mobile */}
        <div className="mt-4 flex flex-col items-center gap-1.5 sm:hidden">
          <button
            onClick={() => move('UP')}
            className="w-14 h-11 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 active:scale-95"
          >
            ▲
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => move('LEFT')}
              className="w-14 h-11 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 active:scale-95"
            >
              ◀
            </button>
            <button
              onClick={() => move('DOWN')}
              className="w-14 h-11 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 active:scale-95"
            >
              ▼
            </button>
            <button
              onClick={() => move('RIGHT')}
              className="w-14 h-11 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 active:scale-95"
            >
              ▶
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-neutral-500 text-center">
          Use Arrow Keys, WASD, or Swipe on Mobile. Press [Z] to Undo.
        </p>
      </div>
    </div>
  );
}
