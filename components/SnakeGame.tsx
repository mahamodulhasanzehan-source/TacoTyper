import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays, saveLeaderboardScore } from '../services/firebase';

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

export default function SnakeGame({ onBackToHub, user, username }: SnakeGameProps) {
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
  const maxLengthRef = useRef<number>(3);

  useEffect(() => {
    if (!gameOver) return;
    const finalLength = maxLengthRef.current;
    if (finalLength > 3) {
      saveLeaderboardScore(
        user,
        username || user?.displayName || 'Snake Charmer',
        finalLength,
        'Length Master',
        { mistakes: 0, timeTaken: 0, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: finalLength, levelReached: speedLevel },
        'snake'
      );
    }
  }, [gameOver, speedLevel, user, username]);
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
    maxLengthRef.current = 3;
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
    if (newSnake.length > maxLengthRef.current) {
      maxLengthRef.current = newSnake.length;
    }
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

          // High-Contrast Dark Gaming Arena Grid
          const cellDarkA = '#0a0e1a';
          const cellDarkB = '#0f172a';
          const gridLineColor = '#1e293b';

          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              ctx.fillStyle = (r + c) % 2 === 0 ? cellDarkA : cellDarkB;
              ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
          }

          // Subtle grid cell borders
          ctx.strokeStyle = gridLineColor;
          ctx.lineWidth = 0.5;
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

          // Outer arena perimeter glow
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(1, 1, w - 2, h - 2);

          // Snacks
          const drawSnack = (snack: Snack) => {
            const sx = snack.x * cellSize + cellSize / 2;
            const sy = snack.y * cellSize + cellSize / 2;
            const radius = cellSize * 0.44;

            ctx.save();
            if (snack.type === 'apple') {
              // Juicy Neon Red Apple with Stem & Leaf
              ctx.shadowColor = 'rgba(244, 63, 94, 0.7)';
              ctx.shadowBlur = 10;

              // Apple body
              ctx.fillStyle = '#f43f5e';
              ctx.beginPath();
              ctx.arc(sx - radius * 0.25, sy, radius * 0.75, 0, Math.PI * 2);
              ctx.arc(sx + radius * 0.25, sy, radius * 0.75, 0, Math.PI * 2);
              ctx.fill();

              // Apple shine highlight
              ctx.shadowBlur = 0;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
              ctx.beginPath();
              ctx.arc(sx - radius * 0.3, sy - radius * 0.3, radius * 0.28, 0, Math.PI * 2);
              ctx.fill();

              // Stem
              ctx.strokeStyle = '#d97706';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(sx, sy - radius * 0.5);
              ctx.quadraticCurveTo(sx + 2, sy - radius * 0.95, sx + 4, sy - radius * 1.05);
              ctx.stroke();

              // Little Green Leaf
              ctx.fillStyle = '#4ade80';
              ctx.beginPath();
              ctx.ellipse(sx + 4, sy - radius * 0.85, 4, 2, Math.PI / 4, 0, Math.PI * 2);
              ctx.fill();
            } else if (snack.type === 'speed') {
              ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
              ctx.shadowBlur = 12;
              ctx.fillStyle = '#0284c7';
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#ffffff';
              ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⚡', sx, sy);
            } else if (snack.type === 'slow') {
              ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
              ctx.shadowBlur = 12;
              ctx.fillStyle = '#9333ea';
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#ffffff';
              ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⏱️', sx, sy);
            } else if (snack.type === 'star') {
              ctx.shadowColor = 'rgba(250, 204, 21, 0.9)';
              ctx.shadowBlur = 14;
              ctx.fillStyle = '#eab308';
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#ffffff';
              ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⭐', sx, sy);
            } else if (snack.type === 'ghost') {
              ctx.shadowColor = 'rgba(236, 72, 153, 0.9)';
              ctx.shadowBlur = 14;
              ctx.fillStyle = '#ec4899';
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
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

          // Snake Body - High-Contrast Vivid Emerald-to-Teal Glowing Body
          const isGhost = Date.now() < ghostUntilRef.current;
          const snake = snakeRef.current;

          // Pass 1: Draw continuous connected body segments (from tail to head)
          for (let i = snake.length - 1; i >= 0; i--) {
            const part = snake[i];
            const px = part.x * cellSize + cellSize / 2;
            const py = part.y * cellSize + cellSize / 2;

            // Progressive taper ratio: 1.0 at head down to 0.65 at tail
            const progress = snake.length > 1 ? i / (snake.length - 1) : 0;
            const radius = (cellSize * 0.46) * (1 - progress * 0.35);

            ctx.save();

            // Segment color interpolating smoothly along body
            let segColor: string;
            if (isGhost) {
              segColor = `hsl(${320 + progress * 40}, 95%, ${65 - progress * 15}%)`;
            } else {
              // Vibrant Electric Emerald to Cyan
              segColor = `hsl(${160 - progress * 40}, 100%, ${50 + progress * 8}%)`;
            }

            ctx.fillStyle = segColor;

            // If not at head, connect smoothly to next segment (i-1) if adjacent
            if (i > 0) {
              const prev = snake[i - 1];
              const ppx = prev.x * cellSize + cellSize / 2;
              const ppy = prev.y * cellSize + cellSize / 2;

              // Check if not wrapped across screen border
              if (Math.abs(prev.x - part.x) <= 1 && Math.abs(prev.y - part.y) <= 1) {
                const prevRadius = (cellSize * 0.46) * (1 - ((i - 1) / (snake.length - 1 || 1)) * 0.35);
                ctx.strokeStyle = segColor;
                ctx.lineWidth = (radius + prevRadius);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(ppx, ppy);
                ctx.stroke();
              }
            }

            // Draw rounded segment body node with subtle crisp border
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Bright 3D spine highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.beginPath();
            ctx.arc(px - radius * 0.25, py - radius * 0.25, radius * 0.32, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }

          // Pass 2: Draw Cute Head Details (eyes & tongue)
          if (snake.length > 0) {
            const head = snake[0];
            const hx = head.x * cellSize + cellSize / 2;
            const hy = head.y * cellSize + cellSize / 2;
            const headRadius = cellSize * 0.46;

            ctx.save();

            // Big expressive cartoon eyes positioned based on direction
            const eyeRadius = cellSize * 0.16;
            let eye1X = hx - cellSize * 0.18;
            let eye1Y = hy - cellSize * 0.18;
            let eye2X = hx + cellSize * 0.18;
            let eye2Y = hy - cellSize * 0.18;
            let pDx = 0;
            let pDy = 0;

            if (dirRef.current === 'RIGHT') {
              eye1X = hx + cellSize * 0.15; eye1Y = hy - cellSize * 0.18;
              eye2X = hx + cellSize * 0.15; eye2Y = hy + cellSize * 0.18;
              pDx = 1.2;
            } else if (dirRef.current === 'LEFT') {
              eye1X = hx - cellSize * 0.15; eye1Y = hy - cellSize * 0.18;
              eye2X = hx - cellSize * 0.15; eye2Y = hy + cellSize * 0.18;
              pDx = -1.2;
            } else if (dirRef.current === 'UP') {
              eye1X = hx - cellSize * 0.18; eye1Y = hy - cellSize * 0.15;
              eye2X = hx + cellSize * 0.18; eye2Y = hy - cellSize * 0.15;
              pDy = -1.2;
            } else {
              eye1X = hx - cellSize * 0.18; eye1Y = hy + cellSize * 0.15;
              eye2X = hx + cellSize * 0.18; eye2Y = hy + cellSize * 0.15;
              pDy = 1.2;
            }

            // Eye whites
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
            ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Eye pupils
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(eye1X + pDx, eye1Y + pDy, eyeRadius * 0.58, 0, Math.PI * 2);
            ctx.arc(eye2X + pDx, eye2Y + pDy, eyeRadius * 0.58, 0, Math.PI * 2);
            ctx.fill();

            // Eye gleam highlights
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eye1X + pDx - 0.7, eye1Y + pDy - 0.7, eyeRadius * 0.24, 0, Math.PI * 2);
            ctx.arc(eye2X + pDx - 0.7, eye2Y + pDy - 0.7, eyeRadius * 0.24, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }

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

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    const threshold = 12; // Ultra responsive threshold
    if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
      const current = dirRef.current;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && current !== 'LEFT') nextDirRef.current = 'RIGHT';
        else if (dx < 0 && current !== 'RIGHT') nextDirRef.current = 'LEFT';
      } else {
        if (dy > 0 && current !== 'UP') nextDirRef.current = 'DOWN';
        else if (dy < 0 && current !== 'DOWN') nextDirRef.current = 'UP';
      }
      // Re-anchor touch start to enable smooth continuous steering without finger lifting
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const handleDpad = (dir: Direction) => {
    const current = dirRef.current;
    if (dir === 'UP' && current !== 'DOWN') nextDirRef.current = 'UP';
    if (dir === 'DOWN' && current !== 'UP') nextDirRef.current = 'DOWN';
    if (dir === 'LEFT' && current !== 'RIGHT') nextDirRef.current = 'LEFT';
    if (dir === 'RIGHT' && current !== 'LEFT') nextDirRef.current = 'RIGHT';
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#06080d] text-white select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-[#0b0e17] border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm font-bold transition-all text-neutral-300 hover:text-white flex items-center gap-1.5 border border-neutral-700 active:scale-95 shadow-md cursor-pointer"
          >
            <span>←</span>
            <span>Hub</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🐍</span>
            <h1 className="text-sm sm:text-base font-black text-emerald-400 tracking-wide">Snake</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-right">
            <div className="text-[10px] sm:text-xs text-neutral-400 uppercase font-semibold">Score</div>
            <div className="text-sm sm:text-lg font-black text-emerald-400 font-mono">{score}</div>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] sm:text-xs text-neutral-400 uppercase font-semibold">High</div>
            <div className="text-sm sm:text-lg font-black text-amber-400 font-mono">{highScore}</div>
          </div>
        </div>
      </header>

      {/* Control / Config Strip */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-[#090c13] border-b border-neutral-800 text-xs text-neutral-400 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-neutral-400">Classic Arcade Mode</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setWallWrap(!wallWrap)}
            className={`px-2.5 py-1 rounded font-bold transition-colors border ${
              wallWrap ? 'bg-blue-600/30 text-blue-300 border-blue-500/50' : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800 cursor-pointer'
            }`}
          >
            {wallWrap ? '🔄 Wrap: ON' : '🧱 Solid Walls'}
          </button>
          <button
            onClick={() => setIsPaused(p => !p)}
            className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded font-bold cursor-pointer"
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      {/* Main Play Area with Responsive Sizing */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 min-h-0 relative select-none">
        {activeEffect && (
          <div className="absolute top-4 z-20 px-3 py-1 bg-neutral-900/90 border border-amber-500/50 rounded-full text-xs font-bold text-amber-300 shadow-lg animate-bounce">
            {activeEffect}
          </div>
        )}

        {/* Canvas Game Frame */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-emerald-800/80 bg-[#070a13] flex items-center justify-center touch-none ring-2 ring-emerald-500/30"
        >
          <canvas
            ref={canvasRef}
            width={440}
            height={440}
            className="w-full max-w-[min(92vw,540px,calc(100vh-240px))] aspect-square block touch-none select-none"
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

        {/* Mobile On-Screen D-Pad with Zero-Latency Pointer Events */}
        <div className="mt-4 flex flex-col items-center gap-1.5 sm:hidden touch-manipulation">
          <button
            onPointerDown={(e) => { e.preventDefault(); handleDpad('UP'); }}
            className="w-14 h-12 bg-neutral-800 active:bg-emerald-600 rounded-xl text-lg font-bold flex items-center justify-center shadow border border-neutral-700 active:scale-95 touch-none"
          >
            ▲
          </button>
          <div className="flex gap-4">
            <button
              onPointerDown={(e) => { e.preventDefault(); handleDpad('LEFT'); }}
              className="w-14 h-12 bg-neutral-800 active:bg-emerald-600 rounded-xl text-lg font-bold flex items-center justify-center shadow border border-neutral-700 active:scale-95 touch-none"
            >
              ◀
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); handleDpad('DOWN'); }}
              className="w-14 h-12 bg-neutral-800 active:bg-emerald-600 rounded-xl text-lg font-bold flex items-center justify-center shadow border border-neutral-700 active:scale-95 touch-none"
            >
              ▼
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); handleDpad('RIGHT'); }}
              className="w-14 h-12 bg-neutral-800 active:bg-emerald-600 rounded-xl text-lg font-bold flex items-center justify-center shadow border border-neutral-700 active:scale-95 touch-none"
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
