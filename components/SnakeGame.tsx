import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays } from '../services/firebase';

interface SnakeGameProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Theme = 'neon' | 'retro' | 'cyber';
type SnackType = 'apple' | 'speed' | 'slow' | 'star' | 'ghost';

interface Point {
  x: number;
  y: number;
}

interface Snack {
  x: number;
  y: number;
  type: SnackType;
  expiresAt?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
}

const GRID_SIZE = 22;

export default function SnakeGame({ onBackToHub }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snake_high_score') || '0', 10);
  });
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(1);
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('neon');
  const [wallWrap, setWallWrap] = useState(false);
  
  // Game logic state in refs for 60fps / interval precision
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const dirRef = useRef<Direction>('RIGHT');
  const nextDirRef = useRef<Direction>('RIGHT');
  const snackRef = useRef<Snack>({ x: 15, y: 10, type: 'apple' });
  const bonusSnackRef = useRef<Snack | null>(null);
  const ghostUntilRef = useRef<number>(0);
  const speedMultRef = useRef<number>(1);
  const particlesRef = useRef<Particle[]>([]);
  const lastTickRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    incrementGamePlays('snake');
  }, []);

  const spawnSnack = useCallback((type?: SnackType): Snack => {
    const snake = snakeRef.current;
    let x = 0;
    let y = 0;
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
      x = Math.floor(Math.random() * GRID_SIZE);
      y = Math.floor(Math.random() * GRID_SIZE);
      valid = !snake.some(s => s.x === x && s.y === y);
      attempts++;
    }

    if (!type) {
      const rand = Math.random();
      if (rand < 0.65) type = 'apple';
      else if (rand < 0.78) type = 'speed';
      else if (rand < 0.88) type = 'slow';
      else if (rand < 0.95) type = 'star';
      else type = 'ghost';
    }

    return {
      x,
      y,
      type,
      expiresAt: type !== 'apple' ? Date.now() + 10000 : undefined
    };
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    snackRef.current = { x: 16, y: 10, type: 'apple' };
    bonusSnackRef.current = null;
    ghostUntilRef.current = 0;
    speedMultRef.current = 1;
    particlesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setActiveEffect(null);
    setSpeedLevel(1);
    lastTickRef.current = performance.now();
  }, []);

  const addExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.2;
      const speed = 1.5 + Math.random() * 3;
      particlesRef.current.push({
        x: x * 20 + 10,
        y: y * 20 + 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        life: 1
      });
    }
  };

  const handleSnackEaten = (snack: Snack) => {
    audioService.playSound('success');
    let pts = 10;
    let color = '#22c55e';

    if (snack.type === 'apple') {
      pts = 10;
      color = '#ef4444';
    } else if (snack.type === 'speed') {
      pts = 25;
      color = '#38bdf8';
      speedMultRef.current = 1.5;
      setActiveEffect('⚡ SPEED SURGE');
      setTimeout(() => {
        speedMultRef.current = 1;
        setActiveEffect(null);
      }, 5000);
    } else if (snack.type === 'slow') {
      pts = 20;
      color = '#a855f7';
      speedMultRef.current = 0.7;
      setActiveEffect('⏱️ SLOW MOTION');
      setTimeout(() => {
        speedMultRef.current = 1;
        setActiveEffect(null);
      }, 6000);
    } else if (snack.type === 'star') {
      pts = 50;
      color = '#eab308';
      setActiveEffect('⭐ BONUS +50');
      setTimeout(() => setActiveEffect(null), 2500);
    } else if (snack.type === 'ghost') {
      pts = 30;
      color = '#ec4899';
      ghostUntilRef.current = Date.now() + 6000;
      setActiveEffect('👻 GHOST PASS-THROUGH');
      setTimeout(() => setActiveEffect(null), 6000);
    }

    addExplosion(snack.x, snack.y, color);

    const newScore = scoreRef.current + pts;
    scoreRef.current = newScore;
    setScore(newScore);

    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('snake_high_score', String(newScore));
    }

    setSpeedLevel(Math.min(10, 1 + Math.floor(snakeRef.current.length / 4)));

    // Spawn bonus snack occasionally
    if (!bonusSnackRef.current && Math.random() < 0.4) {
      bonusSnackRef.current = spawnSnack();
    }
  };

  // Main game tick
  const updateGame = useCallback(() => {
    if (gameOver || isPaused) return;

    dirRef.current = nextDirRef.current;
    const head = { ...snakeRef.current[0] };

    if (dirRef.current === 'UP') head.y -= 1;
    else if (dirRef.current === 'DOWN') head.y += 1;
    else if (dirRef.current === 'LEFT') head.x -= 1;
    else if (dirRef.current === 'RIGHT') head.x += 1;

    // Wall logic
    if (wallWrap) {
      if (head.x < 0) head.x = GRID_SIZE - 1;
      else if (head.x >= GRID_SIZE) head.x = 0;
      if (head.y < 0) head.y = GRID_SIZE - 1;
      else if (head.y >= GRID_SIZE) head.y = 0;
    } else {
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        audioService.playSound('failure');
        setGameOver(true);
        return;
      }
    }

    // Tail collision
    const isGhost = Date.now() < ghostUntilRef.current;
    if (!isGhost) {
      const hitSelf = snakeRef.current.some(part => part.x === head.x && part.y === head.y);
      if (hitSelf) {
        audioService.playSound('failure');
        setGameOver(true);
        return;
      }
    }

    const newSnake = [head, ...snakeRef.current];

    // Check snack collision
    let eaten = false;
    if (head.x === snackRef.current.x && head.y === snackRef.current.y) {
      handleSnackEaten(snackRef.current);
      snackRef.current = spawnSnack('apple');
      eaten = true;
    } else if (bonusSnackRef.current && head.x === bonusSnackRef.current.x && head.y === bonusSnackRef.current.y) {
      handleSnackEaten(bonusSnackRef.current);
      bonusSnackRef.current = null;
      eaten = true;
    }

    if (!eaten) {
      newSnake.pop();
    }

    // Check bonus snack expiry
    if (bonusSnackRef.current?.expiresAt && Date.now() > bonusSnackRef.current.expiresAt) {
      bonusSnackRef.current = null;
    }

    snakeRef.current = newSnake;
  }, [gameOver, isPaused, wallWrap, spawnSnack, highScore]);

  // Main Loop
  useEffect(() => {
    let animId: number;

    const render = (time: number) => {
      // Calculate interval based on snake length and speed multiplier
      const baseMs = Math.max(60, 140 - speedLevel * 8);
      const interval = baseMs / speedMultRef.current;

      if (time - lastTickRef.current >= interval) {
        updateGame();
        lastTickRef.current = time;
      }

      // Draw canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const cellSize = w / GRID_SIZE;

          // Background
          if (theme === 'neon') {
            ctx.fillStyle = '#090a0f';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#1e293b22';
          } else if (theme === 'retro') {
            ctx.fillStyle = '#8b956d';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#9ca67e';
          } else {
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#27272a33';
          }

          // Grid lines
          ctx.lineWidth = 1;
          for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(w, i * cellSize);
            ctx.stroke();
          }

          // Snacks
          const drawSnack = (snack: Snack) => {
            const sx = snack.x * cellSize + cellSize / 2;
            const sy = snack.y * cellSize + cellSize / 2;
            const radius = cellSize * 0.42;

            ctx.save();
            if (snack.type === 'apple') {
              ctx.fillStyle = theme === 'retro' ? '#2f3b1f' : '#ef4444';
              ctx.shadowColor = theme === 'neon' ? '#ef4444' : 'transparent';
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();
            } else if (snack.type === 'speed') {
              ctx.fillStyle = '#38bdf8';
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 12;
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⚡', sx, sy);
            } else if (snack.type === 'slow') {
              ctx.fillStyle = '#a855f7';
              ctx.shadowColor = '#a855f7';
              ctx.shadowBlur = 12;
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⏱️', sx, sy);
            } else if (snack.type === 'star') {
              ctx.fillStyle = '#eab308';
              ctx.shadowColor = '#eab308';
              ctx.shadowBlur = 14;
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⭐', sx, sy);
            } else if (snack.type === 'ghost') {
              ctx.fillStyle = '#ec4899';
              ctx.shadowColor = '#ec4899';
              ctx.shadowBlur = 14;
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('👻', sx, sy);
            }
            ctx.restore();
          };

          drawSnack(snackRef.current);
          if (bonusSnackRef.current) drawSnack(bonusSnackRef.current);

          // Snake Body
          const isGhost = Date.now() < ghostUntilRef.current;
          const snake = snakeRef.current;

          snake.forEach((part, index) => {
            const px = part.x * cellSize;
            const py = part.y * cellSize;
            const pad = 1.5;

            ctx.save();
            if (index === 0) {
              // Head
              ctx.fillStyle = theme === 'retro' ? '#1f2910' : isGhost ? '#ec4899' : '#22c55e';
              ctx.shadowColor = theme === 'neon' ? (isGhost ? '#ec4899' : '#22c55e') : 'transparent';
              ctx.shadowBlur = 12;
              ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);

              // Eyes
              ctx.fillStyle = '#ffffff';
              const eyeSize = cellSize * 0.2;
              if (dirRef.current === 'RIGHT') {
                ctx.fillRect(px + cellSize * 0.65, py + cellSize * 0.2, eyeSize, eyeSize);
                ctx.fillRect(px + cellSize * 0.65, py + cellSize * 0.6, eyeSize, eyeSize);
              } else if (dirRef.current === 'LEFT') {
                ctx.fillRect(px + cellSize * 0.15, py + cellSize * 0.2, eyeSize, eyeSize);
                ctx.fillRect(px + cellSize * 0.15, py + cellSize * 0.6, eyeSize, eyeSize);
              } else if (dirRef.current === 'UP') {
                ctx.fillRect(px + cellSize * 0.2, py + cellSize * 0.15, eyeSize, eyeSize);
                ctx.fillRect(px + cellSize * 0.6, py + cellSize * 0.15, eyeSize, eyeSize);
              } else {
                ctx.fillRect(px + cellSize * 0.2, py + cellSize * 0.65, eyeSize, eyeSize);
                ctx.fillRect(px + cellSize * 0.6, py + cellSize * 0.65, eyeSize, eyeSize);
              }
            } else {
              // Body segment
              const grad = 1 - (index / snake.length) * 0.45;
              if (theme === 'retro') {
                ctx.fillStyle = '#313e20';
              } else if (theme === 'cyber') {
                ctx.fillStyle = isGhost ? `rgba(236, 72, 153, ${grad})` : `rgba(6, 182, 212, ${grad})`;
              } else {
                ctx.fillStyle = isGhost ? `rgba(236, 72, 153, ${grad})` : `rgba(34, 197, 94, ${grad})`;
              }
              ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);
            }
            ctx.restore();
          });

          // Particles
          particlesRef.current.forEach((p, idx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.025;
            if (p.alpha <= 0) {
              particlesRef.current.splice(idx, 1);
            } else {
              ctx.save();
              ctx.globalAlpha = p.alpha;
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x * (w / 440), p.y * (h / 440), 2.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          });
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [updateGame, speedLevel, theme]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        setIsPaused(prev => !prev);
        return;
      }

      const current = dirRef.current;
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && current !== 'DOWN') {
        nextDirRef.current = 'UP';
      } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && current !== 'UP') {
        nextDirRef.current = 'DOWN';
      } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && current !== 'RIGHT') {
        nextDirRef.current = 'LEFT';
      } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && current !== 'LEFT') {
        nextDirRef.current = 'RIGHT';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDpad = (dir: Direction) => {
    const current = dirRef.current;
    if (dir === 'UP' && current !== 'DOWN') nextDirRef.current = 'UP';
    if (dir === 'DOWN' && current !== 'UP') nextDirRef.current = 'DOWN';
    if (dir === 'LEFT' && current !== 'RIGHT') nextDirRef.current = 'LEFT';
    if (dir === 'RIGHT' && current !== 'LEFT') nextDirRef.current = 'RIGHT';
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#07090e] text-white select-none overflow-y-auto">
      {/* Top Header Bar */}
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
            <span className="text-xl">🐍</span>
            <h1 className="text-base sm:text-lg font-bold text-emerald-400 tracking-wide">Neon Snake</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right">
            <div className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-wider">Score</div>
            <div className="text-base sm:text-xl font-extrabold text-emerald-400">{score}</div>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-wider">High</div>
            <div className="text-base sm:text-xl font-extrabold text-amber-400">{highScore}</div>
          </div>
        </div>
      </header>

      {/* Control / Config Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#0b0e14] border-b border-neutral-800 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span>Theme:</span>
          <button
            onClick={() => setTheme('neon')}
            className={`px-2 py-0.5 rounded ${theme === 'neon' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'hover:bg-neutral-800'}`}
          >
            Neon
          </button>
          <button
            onClick={() => setTheme('cyber')}
            className={`px-2 py-0.5 rounded ${theme === 'cyber' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'hover:bg-neutral-800'}`}
          >
            Cyber
          </button>
          <button
            onClick={() => setTheme('retro')}
            className={`px-2 py-0.5 rounded ${theme === 'retro' ? 'bg-lime-500/20 text-lime-300 border border-lime-500/40' : 'hover:bg-neutral-800'}`}
          >
            Retro
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setWallWrap(!wallWrap)}
            className={`px-2 py-1 rounded transition-colors ${wallWrap ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' : 'bg-neutral-800 text-neutral-300'}`}
          >
            {wallWrap ? '🔄 Wrap: ON' : '🧱 Solid Walls'}
          </button>
          <button
            onClick={() => setIsPaused(p => !p)}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-medium"
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 relative">
        {activeEffect && (
          <div className="absolute top-6 z-20 px-3 py-1 bg-neutral-900/90 border border-amber-500/50 rounded-full text-xs font-bold text-amber-300 shadow-lg animate-bounce">
            {activeEffect}
          </div>
        )}

        {/* Canvas Game Frame */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-800 bg-black flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={440}
            height={440}
            className="w-[290px] h-[290px] sm:w-[380px] sm:h-[380px] md:w-[440px] md:h-[440px] block"
          />

          {/* Game Over Modal Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-30">
              <span className="text-4xl mb-2">💥</span>
              <h2 className="text-2xl font-black text-red-500 mb-1">GAME OVER</h2>
              <p className="text-sm text-neutral-300 mb-4">
                Score: <span className="font-bold text-emerald-400">{score}</span>
              </p>
              <button
                onClick={resetGame}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                Play Again
              </button>
            </div>
          )}

          {/* Pause Modal Overlay */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-6 text-center z-30">
              <h2 className="text-xl font-bold text-amber-400 mb-3">GAME PAUSED</h2>
              <button
                onClick={() => setIsPaused(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg shadow cursor-pointer"
              >
                Resume Game
              </button>
            </div>
          )}
        </div>

        {/* Mobile On-Screen D-Pad */}
        <div className="mt-4 flex flex-col items-center gap-1.5 sm:hidden">
          <button
            onClick={() => handleDpad('UP')}
            className="w-14 h-12 bg-neutral-800 active:bg-emerald-600 rounded-xl text-lg font-bold flex items-center justify-center shadow border border-neutral-700 active:scale-95"
          >
            ▲
          </button>
          <div className="flex gap-4">
            <button
              onClick={() => handleDpad('LEFT')}
              className="w-14 h-12 bg-neutral-800 active:bg-emerald-600 rounded-xl text-lg font-bold flex items-center justify-center shadow border border-neutral-700 active:scale-95"
            >
              ◀
            </button>
            <button
              onClick={() => handleDpad('DOWN')}
              className="w-14 h-12 bg-neutral-800 active:bg-emerald-600 rounded-xl text-lg font-bold flex items-center justify-center shadow border border-neutral-700 active:scale-95"
            >
              ▼
            </button>
            <button
              onClick={() => handleDpad('RIGHT')}
              className="w-14 h-12 bg-neutral-800 active:bg-emerald-600 rounded-xl text-lg font-bold flex items-center justify-center shadow border border-neutral-700 active:scale-95"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Snack Guide Footer */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">🍎 Apple (+10)</span>
          <span className="flex items-center gap-1">⚡ Surge (+25)</span>
          <span className="flex items-center gap-1">⏱️ Slow (+20)</span>
          <span className="flex items-center gap-1">⭐ Star (+50)</span>
          <span className="flex items-center gap-1">👻 Ghost (+30)</span>
        </div>
      </div>
    </div>
  );
}
