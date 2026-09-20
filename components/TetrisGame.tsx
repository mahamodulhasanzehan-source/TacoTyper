import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';
import {
  Tetromino,
  getRandomTetromino,
  rotateMatrix,
  checkCollision
} from './tetris/tetrisConstants';

interface TetrisProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

export default function TetrisGame({ onBackToHub }: TetrisProps) {
  const [board, setBoard] = useState<(string | null)[][]>(() =>
    Array(20).fill(null).map(() => Array(10).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Tetromino>(getRandomTetromino);
  const [piecePos, setPiecePos] = useState({ x: 3, y: 0 });
  const [nextPiece, setNextPiece] = useState<Tetromino>(getRandomTetromino);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('tetris_high') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const boardRef = useRef(board);
  boardRef.current = board;
  const currentPieceRef = useRef(currentPiece);
  currentPieceRef.current = currentPiece;
  const piecePosRef = useRef(piecePos);
  piecePosRef.current = piecePos;
  const nextPieceRef = useRef(nextPiece);
  nextPieceRef.current = nextPiece;
  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Swipe & Touch Tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchMovedRef = useRef<boolean>(false);

  useEffect(() => {
    incrementGamePlays('tetris');
  }, []);

  const resetGame = useCallback(() => {
    setBoard(Array(20).fill(null).map(() => Array(10).fill(null)));
    const first = getRandomTetromino();
    const second = getRandomTetromino();
    setCurrentPiece(first);
    setPiecePos({ x: 3, y: 0 });
    setNextPiece(second);
    setScore(0);
    setLines(0);
    setLevel(1);
    setIsGameOver(false);
    setIsPaused(false);
  }, []);

  // Lock piece and clear lines
  const lockPiece = useCallback(() => {
    const cur = currentPieceRef.current;
    const pos = piecePosRef.current;
    const curBoard = boardRef.current.map(row => [...row]);

    // Stamp piece onto board
    for (let r = 0; r < cur.shape.length; r++) {
      for (let c = 0; c < cur.shape[r].length; c++) {
        if (cur.shape[r][c] !== 0) {
          const bY = pos.y + r;
          const bX = pos.x + c;
          if (bY >= 0 && bY < 20 && bX >= 0 && bX < 10) {
            curBoard[bY][bX] = cur.color;
          }
        }
      }
    }

    // Line clears
    let clearedCount = 0;
    const nextBoard = curBoard.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) clearedCount++;
      return !isFull;
    });

    while (nextBoard.length < 20) {
      nextBoard.unshift(Array(10).fill(null));
    }

    if (clearedCount > 0) {
      const lineScores = [0, 100, 300, 500, 800];
      const addedScore = (lineScores[clearedCount] || 1000) * level;
      setScore(s => {
        const next = s + addedScore;
        setHighScore(h => {
          if (next > h) {
            localStorage.setItem('tetris_high', String(next));
            return next;
          }
          return h;
        });
        return next;
      });

      setLines(l => {
        const nextL = l + clearedCount;
        setLevel(Math.floor(nextL / 10) + 1);
        return nextL;
      });

      if (clearedCount === 4) {
        audioService.playSound('success');
      } else {
        audioService.playSound('word_valid');
      }
    } else {
      audioService.playSound('piece_land');
    }

    // Spawn next piece
    const next = nextPieceRef.current;
    const following = getRandomTetromino();
    const spawnPos = { x: 3, y: 0 };

    if (checkCollision(next.shape, spawnPos.x, spawnPos.y, nextBoard)) {
      setBoard(nextBoard);
      setIsGameOver(true);
      audioService.playSound('failure');
      return;
    }

    setBoard(nextBoard);
    setCurrentPiece(next);
    setPiecePos(spawnPos);
    setNextPiece(following);
  }, [level]);

  // Movement primitives
  const moveLeft = useCallback(() => {
    if (isGameOverRef.current || isPausedRef.current) return;
    const cur = currentPieceRef.current;
    const pos = piecePosRef.current;
    if (!checkCollision(cur.shape, pos.x - 1, pos.y, boardRef.current)) {
      setPiecePos({ x: pos.x - 1, y: pos.y });
      audioService.playSound('tile_click');
    }
  }, []);

  const moveRight = useCallback(() => {
    if (isGameOverRef.current || isPausedRef.current) return;
    const cur = currentPieceRef.current;
    const pos = piecePosRef.current;
    if (!checkCollision(cur.shape, pos.x + 1, pos.y, boardRef.current)) {
      setPiecePos({ x: pos.x + 1, y: pos.y });
      audioService.playSound('tile_click');
    }
  }, []);

  const rotate = useCallback(() => {
    if (isGameOverRef.current || isPausedRef.current) return;
    const cur = currentPieceRef.current;
    const pos = piecePosRef.current;
    const rotated = rotateMatrix(cur.shape);

    let kick = 0;
    if (checkCollision(rotated, pos.x, pos.y, boardRef.current)) {
      if (!checkCollision(rotated, pos.x - 1, pos.y, boardRef.current)) kick = -1;
      else if (!checkCollision(rotated, pos.x + 1, pos.y, boardRef.current)) kick = 1;
      else if (!checkCollision(rotated, pos.x - 2, pos.y, boardRef.current)) kick = -2;
      else if (!checkCollision(rotated, pos.x + 2, pos.y, boardRef.current)) kick = 2;
      else return;
    }

    setCurrentPiece({ ...cur, shape: rotated });
    setPiecePos({ x: pos.x + kick, y: pos.y });
    audioService.playSound('piece_drop');
  }, []);

  const softDrop = useCallback(() => {
    if (isGameOverRef.current || isPausedRef.current) return;
    const cur = currentPieceRef.current;
    const pos = piecePosRef.current;
    if (!checkCollision(cur.shape, pos.x, pos.y + 1, boardRef.current)) {
      setPiecePos({ x: pos.x, y: pos.y + 1 });
      setScore(s => s + 1);
    } else {
      lockPiece();
    }
  }, [lockPiece]);

  const hardDrop = useCallback(() => {
    if (isGameOverRef.current || isPausedRef.current) return;
    const cur = currentPieceRef.current;
    let newY = piecePosRef.current.y;
    while (!checkCollision(cur.shape, piecePosRef.current.x, newY + 1, boardRef.current)) {
      newY++;
    }
    const dropDistance = newY - piecePosRef.current.y;
    setScore(s => s + dropDistance * 2);
    piecePosRef.current.y = newY;
    setPiecePos(p => ({ ...p, y: newY }));
    lockPiece();
  }, [lockPiece]);

  // Ghost landing position
  const ghostY = React.useMemo(() => {
    let gy = piecePos.y;
    while (!checkCollision(currentPiece.shape, piecePos.x, gy + 1, board)) {
      gy++;
    }
    return gy;
  }, [currentPiece, piecePos, board]);

  // Gravity ticker loop
  useEffect(() => {
    if (isGameOver || isPaused) return;
    const speed = Math.max(120, 800 - (level - 1) * 65);
    const interval = setInterval(() => {
      softDrop();
    }, speed);
    return () => clearInterval(interval);
  }, [level, isGameOver, isPaused, softDrop]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveLeft();
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') moveRight();
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') rotate();
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') softDrop();
      else if (e.code === 'Space') hardDrop();
      else if (e.code === 'KeyP') setIsPaused(p => !p);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveLeft, moveRight, rotate, softDrop, hardDrop]);

  // Touch Swipe & Tap Controls
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() };
    touchMovedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    const thresholdX = 28;
    const thresholdY = 32;

    if (Math.abs(dx) > thresholdX && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) moveRight();
      else moveLeft();
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() };
      touchMovedRef.current = true;
    } else if (dy > thresholdY) {
      softDrop();
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() };
      touchMovedRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    // If it was a quick tap without significant drag, trigger rotation!
    if (touchStartRef.current && !touchMovedRef.current) {
      rotate();
    }
    touchStartRef.current = null;
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#05060a] text-white select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 border-b border-neutral-800 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHub}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-purple-400">TETRIS</h1>
            <span className="text-[9px] text-neutral-400 font-mono hidden sm:inline">10X20 MATRIX</span>
          </div>
        </div>

        {/* Compact stats pill in header for phones */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div>
            <span className="text-[10px] text-neutral-400 uppercase mr-1">Score</span>
            <span className="font-black text-purple-400">{score}</span>
          </div>
          <div className="hidden xs:block">
            <span className="text-[10px] text-neutral-400 uppercase mr-1">Lvl</span>
            <span className="font-bold text-amber-400">{level}</span>
          </div>
          <div className="hidden xs:block">
            <span className="text-[10px] text-neutral-400 uppercase mr-1">High</span>
            <span className="font-bold text-emerald-400">{highScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPaused(p => !p)}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={resetGame}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main Playing Area: Flex-1, scales to fill available viewport */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 gap-3 sm:gap-6 overflow-hidden">
        {/* 10x20 Matrix - auto-calculated to take max available vertical & horizontal space */}
        <div
          className="relative p-1.5 sm:p-2 bg-neutral-950 rounded-2xl border-2 border-neutral-800 shadow-2xl flex items-center justify-center cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={rotate}
        >
          {/* Matrix aspect ratio 10:20 (1:2) */}
          <div
            className="grid grid-cols-10 grid-rows-20 gap-[1.5px] sm:gap-1 bg-[#0a0d17] p-1 rounded-xl"
            style={{
              height: 'calc(100vh - 140px)',
              maxHeight: '680px',
              width: 'calc((100vh - 140px) / 2)',
              maxWidth: '340px',
              minHeight: '380px',
              minWidth: '190px'
            }}
          >
            {Array.from({ length: 20 }).map((_, r) =>
              Array.from({ length: 10 }).map((_, c) => {
                let cellColor = board[r][c];

                // Active piece
                const pr = r - piecePos.y;
                const pc = c - piecePos.x;
                if (
                  pr >= 0 &&
                  pr < currentPiece.shape.length &&
                  pc >= 0 &&
                  pc < currentPiece.shape[pr].length &&
                  currentPiece.shape[pr][pc] !== 0
                ) {
                  cellColor = currentPiece.color;
                }

                // Ghost piece projection
                const gr = r - ghostY;
                let isGhost = false;
                if (
                  !cellColor &&
                  gr >= 0 &&
                  gr < currentPiece.shape.length &&
                  pc >= 0 &&
                  pc < currentPiece.shape[gr].length &&
                  currentPiece.shape[gr][pc] !== 0
                ) {
                  isGhost = true;
                }

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`w-full h-full rounded-[2px] transition-colors duration-75 ${
                      cellColor
                        ? 'border border-white/20 shadow-sm'
                        : isGhost
                        ? 'border border-dashed border-cyan-400/40 bg-cyan-950/20'
                        : 'bg-neutral-900/30'
                    }`}
                    style={{
                      backgroundColor: cellColor || undefined
                    }}
                  />
                );
              })
            )}
          </div>

          {/* Pause Overlay */}
          {isPaused && !isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 rounded-2xl backdrop-blur-sm z-30">
              <span className="text-xl font-black text-amber-400 tracking-widest uppercase">PAUSED</span>
            </div>
          )}
        </div>

        {/* Compact Right Sidebar: Next block & mobile touch helpers */}
        <div className="flex flex-col gap-2.5 shrink-0">
          {/* Next Piece Card (Compact) */}
          <div className="bg-neutral-900/90 border border-neutral-800 p-2 sm:p-2.5 rounded-xl flex flex-col items-center">
            <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider mb-1">NEXT</span>
            <div className="grid grid-cols-4 grid-rows-4 gap-0.5 w-12 h-12 items-center justify-center">
              {Array.from({ length: 4 }).map((_, r) =>
                Array.from({ length: 4 }).map((_, c) => {
                  const hasBlock =
                    r < nextPiece.shape.length &&
                    c < nextPiece.shape[r].length &&
                    nextPiece.shape[r][c] !== 0;
                  return (
                    <div
                      key={`next-${r}-${c}`}
                      className="w-2.5 h-2.5 rounded-[1px]"
                      style={{
                        backgroundColor: hasBlock ? nextPiece.color : 'transparent'
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Score, Lines, Level details */}
          <div className="bg-neutral-900/90 border border-neutral-800 p-2 sm:p-2.5 rounded-xl flex flex-col gap-1.5 font-mono min-w-[76px] sm:min-w-[90px]">
            <div>
              <span className="text-[9px] text-neutral-400 uppercase font-bold block">LINES</span>
              <span className="text-xs sm:text-sm font-bold text-white">{lines}</span>
            </div>
            <div>
              <span className="text-[9px] text-neutral-400 uppercase font-bold block">LEVEL</span>
              <span className="text-xs sm:text-sm font-bold text-amber-400">{level}</span>
            </div>
          </div>

          {/* Hard Drop Button */}
          <button
            onPointerDown={(e) => { e.preventDefault(); hardDrop(); }}
            className="w-full py-2.5 px-1 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md active:scale-95"
          >
            ⚡ DROP
          </button>

          {/* Quick Rotate Button for Mobile */}
          <button
            onPointerDown={(e) => { e.preventDefault(); rotate(); }}
            className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-cyan-300 font-bold text-[11px] rounded-xl border border-neutral-700 active:scale-95"
          >
            🔄 ROTATE
          </button>
        </div>

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-30 p-4">
            <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-4xl mb-2">🧱💥</div>
              <h2 className="text-2xl font-black text-rose-400 mb-1">LOCK OUT!</h2>
              <p className="text-xs sm:text-sm text-neutral-400 mb-4">
                Pieces stacked to the top of the matrix.
              </p>
              <div className="bg-neutral-950 p-3 sm:p-4 rounded-xl border border-neutral-800 mb-4 flex justify-around">
                <div>
                  <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Score</span>
                  <span className="text-lg sm:text-xl font-black text-purple-400">{score}</span>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Lines</span>
                  <span className="text-lg sm:text-xl font-black text-white">{lines}</span>
                </div>
              </div>
              <button
                onClick={resetGame}
                className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="py-1 px-2 text-center text-[10px] text-neutral-500 border-t border-neutral-900 bg-neutral-950/60 shrink-0">
        Swipe Left/Right: Move • Swipe Down: Soft drop • Tap Grid: Rotate • Space: Hard Drop
      </footer>
    </div>
  );
}
