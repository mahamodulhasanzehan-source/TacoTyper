import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays } from '../services/firebase';

interface FlappyFlyerProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

const CANVAS_WIDTH = 380;
const CANVAS_HEIGHT = 520;
const GRAVITY = 0.38;
const JUMP_FORCE = -6.8;
const PIPE_WIDTH = 54;
const PIPE_GAP = 125;
const PIPE_SPEED = 2.4;

export default function FlappyFlyerGame({ onBackToHub }: FlappyFlyerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('flappy_flyer_high_score') || '0', 10);
  });
  const [gameState, setGameState] = useState<'ready' | 'flying' | 'dead'>('ready');
  const [skin, setSkin] = useState<'bird' | 'drone' | 'phoenix'>('bird');

  const birdRef = useRef({
    x: 75,
    y: CANVAS_HEIGHT / 2 - 20,
    vy: 0,
    radius: 14,
    rotation: 0
  });

  const pipesRef = useRef<Pipe[]>([]);
  const cloudsRef = useRef<Cloud[]>([
    { x: 40, y: 60, scale: 0.8, speed: 0.4 },
    { x: 200, y: 110, scale: 1.2, speed: 0.6 },
    { x: 320, y: 40, scale: 0.6, speed: 0.3 }
  ]);
  const scoreRef = useRef(0);
  const lastPipeSpawnRef = useRef(0);

  useEffect(() => {
    incrementGamePlays('flappy_flyer');
  }, []);

  const resetGame = useCallback(() => {
    birdRef.current = {
      x: 75,
      y: CANVAS_HEIGHT / 2 - 20,
      vy: 0,
      radius: 14,
      rotation: 0
    };
    pipesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    setGameState('ready');
  }, []);

  const handleFlap = useCallback(() => {
    if (gameState === 'dead') {
      resetGame();
      return;
    }

    if (gameState === 'ready') {
      setGameState('flying');
      birdRef.current.vy = JUMP_FORCE;
      audioService.playSound('type');
      return;
    }

    birdRef.current.vy = JUMP_FORCE;
    audioService.playSound('type');
  }, [gameState, resetGame]);

  const spawnPipe = useCallback(() => {
    const minHeight = 50;
    const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight - 60; // 60px ground buffer
    const topHeight = Math.floor(minHeight + Math.random() * (maxHeight - minHeight));
    const bottomHeight = CANVAS_HEIGHT - topHeight - PIPE_GAP - 50; // ground is 50px

    pipesRef.current.push({
      x: CANVAS_WIDTH + 10,
      topHeight,
      bottomHeight,
      passed: false
    });
  }, []);

  // Main Physics & Render Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bird = birdRef.current;

      // Update Clouds
      cloudsRef.current.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x < -100) cloud.x = CANVAS_WIDTH + 50;
      });

      if (gameState === 'flying') {
        // Physics update
        bird.vy += GRAVITY;
        bird.y += bird.vy;

        // Rotation
        bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (bird.vy / 10)));

        // Spawn Pipes
        const now = Date.now();
        if (now - lastPipeSpawnRef.current > 1650) {
          lastPipeSpawnRef.current = now;
          spawnPipe();
        }

        // Update Pipes
        pipesRef.current.forEach((pipe, idx) => {
          pipe.x -= PIPE_SPEED;

          // Check score pass
          if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
            pipe.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            audioService.playSound('success');

            if (scoreRef.current > highScore) {
              setHighScore(scoreRef.current);
              localStorage.setItem('flappy_flyer_high_score', String(scoreRef.current));
            }
          }

          // Pipe collision
          const inPipeX = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + PIPE_WIDTH;
          const hitTopPipe = bird.y - bird.radius < pipe.topHeight;
          const hitBottomPipe = bird.y + bird.radius > CANVAS_HEIGHT - 50 - pipe.bottomHeight;

          if (inPipeX && (hitTopPipe || hitBottomPipe)) {
            audioService.playSound('failure');
            setGameState('dead');
          }

          // Remove off-screen pipes
          if (pipe.x + PIPE_WIDTH < -20) {
            pipesRef.current.splice(idx, 1);
          }
        });

        // Floor / Ceiling collision
        if (bird.y + bird.radius >= CANVAS_HEIGHT - 50) {
          bird.y = CANVAS_HEIGHT - 50 - bird.radius;
          audioService.playSound('failure');
          setGameState('dead');
        } else if (bird.y - bird.radius <= 0) {
          bird.y = bird.radius;
          bird.vy = 0;
        }
      }

      // RENDER
      // Sky background gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.65, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Clouds
      cloudsRef.current.forEach(c => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 20 * c.scale, 0, Math.PI * 2);
        ctx.arc(c.x + 18 * c.scale, c.y - 6 * c.scale, 25 * c.scale, 0, Math.PI * 2);
        ctx.arc(c.x + 36 * c.scale, c.y, 20 * c.scale, 0, Math.PI * 2);
        ctx.fill();
      });

      // Pipes
      pipesRef.current.forEach(p => {
        ctx.save();
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 3;

        // Top pipe
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        // Top pipe cap
        ctx.fillRect(p.x - 4, p.topHeight - 18, PIPE_WIDTH + 8, 18);
        ctx.strokeRect(p.x - 4, p.topHeight - 18, PIPE_WIDTH + 8, 18);

        // Bottom pipe
        const bY = CANVAS_HEIGHT - 50 - p.bottomHeight;
        ctx.fillRect(p.x, bY, PIPE_WIDTH, p.bottomHeight);
        ctx.strokeRect(p.x, bY, PIPE_WIDTH, p.bottomHeight);
        // Bottom pipe cap
        ctx.fillRect(p.x - 4, bY, PIPE_WIDTH + 8, 18);
        ctx.strokeRect(p.x - 4, bY, PIPE_WIDTH + 8, 18);

        ctx.restore();
      });

      // Ground
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 14);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, CANVAS_HEIGHT - 36, CANVAS_WIDTH, 36);

      // Bird / Character
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.rotation);

      if (skin === 'bird') {
        // Body
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(5, -4, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(6.5, -4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(8, -1);
        ctx.lineTo(16, 2);
        ctx.lineTo(8, 5);
        ctx.closePath();
        ctx.fill();

        // Wing
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.ellipse(-4, 2, 6, 4, Math.sin(Date.now() / 80) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (skin === 'drone') {
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(-12, -8, 24, 16);
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(-4, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, highScore, skin, spawnPipe]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ([' ', 'ArrowUp', 'Enter'].includes(e.key)) {
        e.preventDefault();
        handleFlap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlap]);

  const getMedal = (pts: number) => {
    if (pts >= 100) return { icon: '💎', name: 'Platinum Pilot' };
    if (pts >= 50) return { icon: '🥇', name: 'Gold Ace' };
    if (pts >= 25) return { icon: '🥈', name: 'Silver Aviator' };
    if (pts >= 10) return { icon: '🥉', name: 'Bronze Flyer' };
    return null;
  };

  const medal = getMedal(score);

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
            <span className="text-xl">🕊️</span>
            <h1 className="text-base sm:text-lg font-bold text-cyan-400 tracking-wide">Flappy Flyer</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-neutral-400 uppercase">Score</div>
            <div className="text-base sm:text-xl font-extrabold text-cyan-400">{score}</div>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] text-neutral-400 uppercase">Best</div>
            <div className="text-base sm:text-xl font-extrabold text-amber-400">{highScore}</div>
          </div>
        </div>
      </header>

      {/* Play Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 relative">
        {/* Character Skin Selector */}
        <div className="mb-2 flex items-center gap-2 text-xs bg-neutral-900/80 px-3 py-1.5 rounded-full border border-neutral-800">
          <span className="text-neutral-400">Skin:</span>
          <button
            onClick={() => setSkin('bird')}
            className={`px-2 py-0.5 rounded ${skin === 'bird' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-neutral-400'}`}
          >
            🐤 Bird
          </button>
          <button
            onClick={() => setSkin('drone')}
            className={`px-2 py-0.5 rounded ${skin === 'drone' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-neutral-400'}`}
          >
            🛸 Drone
          </button>
          <button
            onClick={() => setSkin('phoenix')}
            className={`px-2 py-0.5 rounded ${skin === 'phoenix' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-neutral-400'}`}
          >
            🔥 Phoenix
          </button>
        </div>

        <div
          onClick={handleFlap}
          className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-800 bg-sky-900 cursor-pointer touch-none"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-[290px] h-[396px] sm:w-[340px] sm:h-[465px] md:w-[380px] md:h-[520px] block"
          />

          {/* Start Screen */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
              <div className="bg-neutral-900/90 border border-neutral-700 px-6 py-4 rounded-2xl shadow-xl animate-bounce">
                <span className="text-3xl block mb-1">👆</span>
                <p className="text-sm font-bold text-cyan-300">Tap / Click or Space to Fly</p>
                <p className="text-xs text-neutral-400 mt-1">Navigate through the green pipes</p>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === 'dead' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
              <span className="text-4xl mb-2">💥</span>
              <h2 className="text-2xl font-black text-red-500 mb-1">GAME OVER</h2>
              
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 my-3 w-48 shadow-lg">
                <div className="text-xs text-neutral-400">Score</div>
                <div className="text-2xl font-black text-cyan-400">{score}</div>
                {medal && (
                  <div className="mt-2 text-xs font-bold text-amber-300 flex items-center justify-center gap-1">
                    <span>{medal.icon}</span>
                    <span>{medal.name}</span>
                  </div>
                )}
              </div>

              <button
                onClick={resetGame}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                Fly Again
              </button>
            </div>
          )}
        </div>

        {/* Milestone Medal Checklist */}
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-neutral-400">
          <span className={score >= 10 ? 'text-amber-400 font-bold' : ''}>🥉 10</span>
          <span className={score >= 25 ? 'text-slate-300 font-bold' : ''}>🥈 25</span>
          <span className={score >= 50 ? 'text-yellow-400 font-bold' : ''}>🥇 50</span>
          <span className={score >= 100 ? 'text-cyan-300 font-bold' : ''}>💎 100</span>
        </div>
      </div>
    </div>
  );
}
