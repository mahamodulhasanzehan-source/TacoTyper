import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays } from '../services/firebase';

interface BrickBreakerProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isFireball: boolean;
  stuckToPaddle?: boolean;
  stuckOffsetX?: number;
}

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  type: 'normal' | 'armored' | 'tnt' | 'steel' | 'powerup';
  color: string;
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: 'multiball' | 'wide' | 'laser' | 'fireball' | 'sticky' | 'life';
}

interface Laser {
  x: number;
  y: number;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
}

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 540;

export default function BrickBreakerGame({ onBackToHub }: BrickBreakerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('brick_breaker_high_score') || '0', 10);
  });
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover' | 'levelwin'>('ready');
  const [activeBuffs, setActiveBuffs] = useState<string[]>([]);

  // State in refs for smooth animation loop
  const paddleRef = useRef({
    x: CANVAS_WIDTH / 2 - 45,
    y: CANVAS_HEIGHT - 32,
    w: 90,
    h: 12,
    baseW: 90,
    isSticky: false,
    hasLaser: false,
    laserUntil: 0,
    wideUntil: 0,
    stickyUntil: 0
  });

  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ left: boolean; right: boolean; space: boolean }>({ left: false, right: false, space: false });
  const lastLaserShotRef = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    incrementGamePlays('brick_breaker');
  }, []);

  const createLevel = useCallback((lvl: number): Brick[] => {
    const bricks: Brick[] = [];
    const rows = Math.min(8, 4 + lvl);
    const cols = 8;
    const padding = 6;
    const topOffset = 50;
    const brickW = (CANVAS_WIDTH - padding * (cols + 1)) / cols;
    const brickH = 18;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = padding + c * (brickW + padding);
        const by = topOffset + r * (brickH + padding);

        let type: Brick['type'] = 'normal';
        let hp = 1;
        let color = '#38bdf8';

        if (r === 0) {
          color = '#f43f5e';
          hp = 1;
        } else if (r === 1) {
          color = '#fb923c';
          hp = 1;
        } else if (r === 2) {
          color = '#facc15';
          hp = 1;
        } else if (r === 3) {
          color = '#4ade80';
          hp = 1;
        } else {
          color = '#818cf8';
          hp = 1;
        }

        // Add special brick types
        if ((r + c + lvl) % 9 === 0) {
          type = 'tnt';
          color = '#ef4444';
          hp = 1;
        } else if ((r * c + lvl) % 11 === 0 && lvl > 1) {
          type = 'armored';
          color = '#94a3b8';
          hp = 2;
        } else if (Math.random() < 0.2) {
          type = 'powerup';
          color = '#a855f7';
          hp = 1;
        }

        bricks.push({
          x: bx,
          y: by,
          w: brickW,
          h: brickH,
          hp,
          maxHp: hp,
          type,
          color
        });
      }
    }
    return bricks;
  }, []);

  const resetPaddleAndBall = useCallback(() => {
    paddleRef.current.x = CANVAS_WIDTH / 2 - paddleRef.current.w / 2;
    ballsRef.current = [
      {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 44,
        vx: 3.5 * (Math.random() > 0.5 ? 1 : -1),
        vy: -4.5,
        radius: 6,
        isFireball: false,
        stuckToPaddle: true,
        stuckOffsetX: 0
      }
    ];
    lasersRef.current = [];
    powerUpsRef.current = [];
  }, []);

  const startLevel = useCallback((lvl: number) => {
    bricksRef.current = createLevel(lvl);
    resetPaddleAndBall();
    setGameState('ready');
  }, [createLevel, resetPaddleAndBall]);

  const restartFullGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setLevel(1);
    setLives(3);
    paddleRef.current.w = paddleRef.current.baseW;
    paddleRef.current.hasLaser = false;
    paddleRef.current.isSticky = false;
    setActiveBuffs([]);
    startLevel(1);
  }, [startLevel]);

  // Initial Level Setup
  useEffect(() => {
    startLevel(level);
  }, [level, startLevel]);

  const addParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1
      });
    }
  };

  const triggerTNTExplosion = (targetIdx: number) => {
    const tnt = bricksRef.current[targetIdx];
    if (!tnt) return;
    audioService.playSound('mine_explode');
    addParticles(tnt.x + tnt.w / 2, tnt.y + tnt.h / 2, '#f97316', 24);

    const radius = 60;
    bricksRef.current.forEach((b) => {
      const dist = Math.hypot(b.x + b.w / 2 - (tnt.x + tnt.w / 2), b.y + b.h / 2 - (tnt.y + tnt.h / 2));
      if (dist <= radius && b.type !== 'steel') {
        b.hp = 0;
      }
    });
  };

  const spawnPowerUp = (x: number, y: number) => {
    const types: PowerUp['type'][] = ['multiball', 'wide', 'laser', 'fireball', 'sticky', 'life'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUpsRef.current.push({
      x,
      y,
      vy: 2.2,
      type
    });
  };

  const applyPowerUp = (type: PowerUp['type']) => {
    audioService.playSound('powerup');
    const now = Date.now();

    if (type === 'multiball') {
      const newBalls: Ball[] = [];
      ballsRef.current.forEach(b => {
        newBalls.push(
          { ...b, vx: b.vx * 0.9 - 1.5, vy: b.vy },
          { ...b, vx: b.vx * 0.9 + 1.5, vy: b.vy }
        );
      });
      ballsRef.current.push(...newBalls);
    } else if (type === 'wide') {
      paddleRef.current.w = 140;
      paddleRef.current.wideUntil = now + 12000;
    } else if (type === 'laser') {
      paddleRef.current.hasLaser = true;
      paddleRef.current.laserUntil = now + 10000;
    } else if (type === 'fireball') {
      ballsRef.current.forEach(b => (b.isFireball = true));
      setTimeout(() => {
        ballsRef.current.forEach(b => (b.isFireball = false));
      }, 8000);
    } else if (type === 'sticky') {
      paddleRef.current.isSticky = true;
      paddleRef.current.stickyUntil = now + 12000;
    } else if (type === 'life') {
      setLives(l => Math.min(5, l + 1));
    }
  };

  // Main Game Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const paddle = paddleRef.current;
      const now = Date.now();

      // Check Powerup Timers
      if (paddle.wideUntil && now > paddle.wideUntil) {
        paddle.w = paddle.baseW;
        paddle.wideUntil = 0;
      }
      if (paddle.laserUntil && now > paddle.laserUntil) {
        paddle.hasLaser = false;
        paddle.laserUntil = 0;
      }
      if (paddle.stickyUntil && now > paddle.stickyUntil) {
        paddle.isSticky = false;
        paddle.stickyUntil = 0;
      }

      // Paddle Keyboard movement
      if (keysRef.current.left) paddle.x -= 6.5;
      if (keysRef.current.right) paddle.x += 6.5;
      paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - paddle.w, paddle.x));

      // Laser shooting
      if (paddle.hasLaser && (keysRef.current.space || keysRef.current.left || keysRef.current.right)) {
        if (now - lastLaserShotRef.current > 280) {
          lastLaserShotRef.current = now;
          lasersRef.current.push(
            { x: paddle.x + 8, y: paddle.y, vy: -7 },
            { x: paddle.x + paddle.w - 8, y: paddle.y, vy: -7 }
          );
          audioService.playSound('type');
        }
      }

      // Update Lasers
      lasersRef.current.forEach((laser, lIdx) => {
        laser.y += laser.vy;
        if (laser.y < 0) {
          lasersRef.current.splice(lIdx, 1);
        } else {
          // Check collision with bricks
          bricksRef.current.forEach((b, bIdx) => {
            if (b.hp > 0 && laser.x > b.x && laser.x < b.x + b.w && laser.y > b.y && laser.y < b.y + b.h) {
              lasersRef.current.splice(lIdx, 1);
              if (b.type !== 'steel') {
                b.hp -= 1;
                addParticles(laser.x, laser.y, '#f43f5e', 4);
                if (b.hp <= 0) {
                  scoreRef.current += 15;
                  setScore(scoreRef.current);
                  if (b.type === 'tnt') triggerTNTExplosion(bIdx);
                }
              }
            }
          });
        }
      });

      // Update PowerUps
      powerUpsRef.current.forEach((p, pIdx) => {
        p.y += p.vy;
        // Collision with paddle
        if (
          p.y + 10 >= paddle.y &&
          p.y <= paddle.y + paddle.h &&
          p.x >= paddle.x &&
          p.x <= paddle.x + paddle.w
        ) {
          applyPowerUp(p.type);
          powerUpsRef.current.splice(pIdx, 1);
        } else if (p.y > CANVAS_HEIGHT) {
          powerUpsRef.current.splice(pIdx, 1);
        }
      });

      // Update Balls
      if (gameState === 'playing') {
        ballsRef.current.forEach((ball, bIdx) => {
          if (ball.stuckToPaddle) {
            ball.x = paddle.x + paddle.w / 2 + (ball.stuckOffsetX || 0);
            ball.y = paddle.y - ball.radius;
            return;
          }

          ball.x += ball.vx;
          ball.y += ball.vy;

          // Wall bounces
          if (ball.x - ball.radius <= 0) {
            ball.x = ball.radius;
            ball.vx = Math.abs(ball.vx);
            audioService.playSound('tile_click');
          } else if (ball.x + ball.radius >= CANVAS_WIDTH) {
            ball.x = CANVAS_WIDTH - ball.radius;
            ball.vx = -Math.abs(ball.vx);
            audioService.playSound('tile_click');
          }
          if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = Math.abs(ball.vy);
            audioService.playSound('tile_click');
          }

          // Paddle collision
          if (
            ball.y + ball.radius >= paddle.y &&
            ball.y - ball.radius <= paddle.y + paddle.h &&
            ball.x >= paddle.x &&
            ball.x <= paddle.x + paddle.w &&
            ball.vy > 0
          ) {
            if (paddle.isSticky) {
              ball.stuckToPaddle = true;
              ball.stuckOffsetX = ball.x - (paddle.x + paddle.w / 2);
            } else {
              // Calculate reflection angle based on hit position
              const hitOffset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1 to 1
              const maxAngle = (Math.PI / 3); // 60 degrees max
              const angle = hitOffset * maxAngle;
              const speed = Math.hypot(ball.vx, ball.vy);
              ball.vx = speed * Math.sin(angle);
              ball.vy = -Math.abs(speed * Math.cos(angle));
              audioService.playSound('tictac_move');
              addParticles(ball.x, paddle.y, '#38bdf8', 6);
            }
          }

          // Brick collisions
          bricksRef.current.forEach((brick, idx) => {
            if (brick.hp <= 0) return;

            if (
              ball.x + ball.radius > brick.x &&
              ball.x - ball.radius < brick.x + brick.w &&
              ball.y + ball.radius > brick.y &&
              ball.y - ball.radius < brick.y + brick.h
            ) {
              if (!ball.isFireball) {
                // Determine bounce axis
                const prevX = ball.x - ball.vx;
                const prevY = ball.y - ball.vy;
                if (prevX <= brick.x || prevX >= brick.x + brick.w) {
                  ball.vx *= -1;
                } else {
                  ball.vy *= -1;
                }
              }

              if (brick.type !== 'steel') {
                brick.hp -= 1;
                audioService.playSound('hit');
                addParticles(ball.x, ball.y, brick.color, 8);

                if (brick.hp <= 0) {
                  scoreRef.current += 20;
                  setScore(scoreRef.current);

                  if (scoreRef.current > highScore) {
                    setHighScore(scoreRef.current);
                    localStorage.setItem('brick_breaker_high_score', String(scoreRef.current));
                  }

                  if (brick.type === 'tnt') {
                    triggerTNTExplosion(idx);
                  } else if (brick.type === 'powerup' || Math.random() < 0.2) {
                    spawnPowerUp(brick.x + brick.w / 2, brick.y + brick.h / 2);
                  }
                }
              } else {
                audioService.playSound('tile_click');
              }
            }
          });

          // Ball drops below screen
          if (ball.y - ball.radius > CANVAS_HEIGHT) {
            ballsRef.current.splice(bIdx, 1);
          }
        });

        // If all balls lost
        if (ballsRef.current.length === 0) {
          audioService.playSound('failure');
          if (lives > 1) {
            setLives(l => l - 1);
            resetPaddleAndBall();
            setGameState('ready');
          } else {
            setLives(0);
            setGameState('gameover');
          }
        }

        // Check if all destroyable bricks cleared
        const remaining = bricksRef.current.filter(b => b.hp > 0 && b.type !== 'steel');
        if (remaining.length === 0) {
          audioService.playSound('success');
          setGameState('levelwin');
        }
      }

      // RENDER
      ctx.fillStyle = '#080a10';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Grid Background lines
      ctx.strokeStyle = '#1e293b20';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
      }

      // Draw Bricks
      bricksRef.current.forEach(brick => {
        if (brick.hp <= 0) return;
        ctx.save();
        ctx.fillStyle = brick.color;
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 3);
        ctx.fill();

        // Brick detail
        if (brick.type === 'tnt') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('TNT', brick.x + brick.w / 2, brick.y + brick.h / 2 + 3);
        } else if (brick.type === 'steel') {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(brick.x + 2, brick.y + 2, brick.w - 4, brick.h - 4);
        } else if (brick.type === 'powerup') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('★', brick.x + brick.w / 2, brick.y + brick.h / 2 + 3);
        } else if (brick.maxHp > 1) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${brick.hp}`, brick.x + brick.w / 2, brick.y + brick.h / 2 + 3);
        }
        ctx.restore();
      });

      // Draw Lasers
      lasersRef.current.forEach(laser => {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillRect(laser.x - 1.5, laser.y, 3, 10);
        ctx.restore();
      });

      // Draw PowerUps
      powerUpsRef.current.forEach(p => {
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons: Record<string, string> = {
          multiball: '⚾',
          wide: '↔️',
          laser: '🔫',
          fireball: '🔥',
          sticky: '🧲',
          life: '❤️'
        };
        ctx.fillText(icons[p.type] || '★', p.x, p.y);
        ctx.restore();
      });

      // Draw Paddle
      ctx.save();
      ctx.fillStyle = paddle.hasLaser ? '#ef4444' : paddle.isSticky ? '#a855f7' : '#38bdf8';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
      ctx.fill();
      ctx.restore();

      // Draw Balls
      ballsRef.current.forEach(ball => {
        ctx.save();
        ctx.fillStyle = ball.isFireball ? '#f97316' : '#ffffff';
        ctx.shadowColor = ball.isFireball ? '#ea580c' : '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Particles
      particlesRef.current.forEach((pt, pIdx) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;
        if (pt.alpha <= 0) {
          particlesRef.current.splice(pIdx, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.fillRect(pt.x, pt.y, 2.5, 2.5);
          ctx.restore();
        }
      });

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, highScore, lives]);

  // Touch & Mouse movement controls
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const clientX = e.clientX - rect.left;
    const targetX = clientX * scaleX - paddleRef.current.w / 2;
    paddleRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - paddleRef.current.w, targetX));
  };

  const handlePointerDown = () => {
    if (gameState === 'ready') {
      ballsRef.current.forEach(b => (b.stuckToPaddle = false));
      setGameState('playing');
      audioService.playSound('tictac_move');
    } else if (gameState === 'playing') {
      // Launch any stuck balls
      ballsRef.current.forEach(b => {
        if (b.stuckToPaddle) {
          b.stuckToPaddle = false;
          b.vx = 4 * (Math.random() > 0.5 ? 1 : -1);
          b.vy = -4.5;
        }
      });
    }
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) keysRef.current.left = true;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) keysRef.current.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        keysRef.current.space = true;
        handlePointerDown();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) keysRef.current.left = false;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) keysRef.current.right = false;
      if (e.key === ' ') keysRef.current.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

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
            <span className="text-xl">🧱</span>
            <h1 className="text-base sm:text-lg font-bold text-amber-400 tracking-wide">Brick Breaker</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="text-right">
            <div className="text-[10px] text-neutral-400 uppercase">Lives</div>
            <div className="text-sm sm:text-base font-bold text-red-400">
              {'❤️'.repeat(lives) || '💀'}
            </div>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] text-neutral-400 uppercase">Level</div>
            <div className="text-sm sm:text-base font-bold text-cyan-400">{level}</div>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] text-neutral-400 uppercase">Score</div>
            <div className="text-sm sm:text-base font-extrabold text-amber-400">{score}</div>
          </div>
        </div>
      </header>

      {/* Play Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 relative">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-800 bg-black">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            className="w-[300px] h-[338px] sm:w-[400px] sm:h-[450px] md:w-[480px] md:h-[540px] block cursor-crosshair touch-none"
          />

          {/* Ready / Start Overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
              <div className="bg-neutral-900/90 border border-neutral-700 px-6 py-3 rounded-2xl shadow-xl animate-pulse">
                <p className="text-sm sm:text-base font-bold text-cyan-300">Tap / Click or Space to Launch Ball</p>
                <p className="text-xs text-neutral-400 mt-1">Move mouse, touch, or use [A]/[D] or Arrow keys</p>
              </div>
            </div>
          )}

          {/* Level Complete Overlay */}
          {gameState === 'levelwin' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
              <span className="text-4xl mb-2">🎉</span>
              <h2 className="text-2xl font-black text-emerald-400 mb-1">STAGE CLEARED!</h2>
              <p className="text-sm text-neutral-300 mb-4">Level {level} completed with {score} pts!</p>
              <button
                onClick={() => {
                  setLevel(l => l + 1);
                  startLevel(level + 1);
                }}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                Next Stage →
              </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
              <span className="text-4xl mb-2">💥</span>
              <h2 className="text-2xl font-black text-red-500 mb-1">GAME OVER</h2>
              <p className="text-sm text-neutral-300 mb-4">Final Score: <span className="font-bold text-amber-400">{score}</span></p>
              <button
                onClick={restartFullGame}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Power-up Legend */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-neutral-400">
          <span>⚾ Multiball</span>
          <span>•</span>
          <span>↔️ Wide Paddle</span>
          <span>•</span>
          <span>🔥 Fireball</span>
          <span>•</span>
          <span>🔫 Laser Cannons</span>
          <span>•</span>
          <span>🧲 Sticky</span>
        </div>
      </div>
    </div>
  );
}
