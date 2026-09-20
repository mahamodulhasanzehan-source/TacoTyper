import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';

interface PongGameProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export default function PongGame({ onBackToHub }: PongGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [matchWinner, setMatchWinner] = useState<'player' | 'bot' | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animIdRef = useRef<number | null>(null);

  // Physics state stored in refs for 60fps canvas loop
  const pY = useRef(200);
  const pVel = useRef(0);
  const bY = useRef(200);
  const ball = useRef({
    x: 400,
    y: 250,
    vx: -5,
    vy: 2,
    speed: 5,
    radius: 7
  });

  const keysPressed = useRef<{ [k: string]: boolean }>({});
  const isDragging = useRef(false);

  useEffect(() => {
    incrementGamePlays('pong');
  }, []);

  const resetBall = useCallback((towardsPlayer: boolean) => {
    const canvas = canvasRef.current;
    const w = canvas?.width || 800;
    const h = canvas?.height || 500;
    const initialSpeed = 5.5;
    const angle = (Math.random() * 0.8 - 0.4); // slightly randomized launch angle

    ball.current = {
      x: w / 2,
      y: h / 2,
      vx: (towardsPlayer ? -1 : 1) * initialSpeed * Math.cos(angle),
      vy: initialSpeed * Math.sin(angle),
      speed: initialSpeed,
      radius: 8
    };
  }, []);

  const startMatch = useCallback(() => {
    setPlayerScore(0);
    setBotScore(0);
    setMatchWinner(null);
    setIsPlaying(true);
    resetBall(true);
  }, [resetBall]);

  // Wall rebound vector prediction for Hard Bot
  const predictBallLanding = useCallback((bX: number, bYPos: number, bVx: number, bVy: number, targetX: number, courtH: number) => {
    if (bVx <= 0) return courtH / 2; // ball moving away, return to center
    let simX = bX;
    let simY = bYPos;
    let simVy = bVy;

    while (simX < targetX) {
      simX += bVx;
      simY += simVy;
      if (simY <= 10) {
        simY = 10;
        simVy = -simVy;
      } else if (simY >= courtH - 10) {
        simY = courtH - 10;
        simVy = -simVy;
      }
    }
    return simY;
  }, []);

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const w = canvas.width;
      const h = canvas.height;
      const paddleH = 75;
      const paddleW = 12;

      if (isPlaying && !matchWinner) {
        // --- 1. Player Movement ---
        let desiredVel = 0;
        if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) desiredVel = -400;
        if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) desiredVel = 400;

        if (desiredVel !== 0) {
          pVel.current = desiredVel;
          pY.current += desiredVel * dt;
        } else if (!isDragging.current) {
          pVel.current *= 0.85; // spin decay
        }
        pY.current = Math.max(paddleH / 2, Math.min(h - paddleH / 2, pY.current));

        // --- 2. Bot Movement ---
        let targetY = h / 2;
        let botSpeed = 250;

        if (difficulty === 'easy') {
          botSpeed = 190;
          // intentional positional error margin (+/- 45px)
          targetY = ball.current.y + Math.sin(now * 0.003) * 45;
        } else if (difficulty === 'medium') {
          botSpeed = 340;
          // tracks ball directly with tiny reaction lag
          targetY = ball.current.y;
        } else {
          // hard: predicts wall rebound vectors and positions ahead
          botSpeed = 480;
          const predicted = predictBallLanding(ball.current.x, ball.current.y, ball.current.vx, ball.current.vy, w - 30, h);
          targetY = predicted;
        }

        const diff = targetY - bY.current;
        if (Math.abs(diff) > 4) {
          bY.current += Math.sign(diff) * Math.min(botSpeed * dt, Math.abs(diff));
        }
        bY.current = Math.max(paddleH / 2, Math.min(h - paddleH / 2, bY.current));

        // --- 3. Ball Physics ---
        ball.current.x += ball.current.vx;
        ball.current.y += ball.current.vy;

        // Top / Bottom wall bounce
        if (ball.current.y - ball.current.radius <= 0) {
          ball.current.y = ball.current.radius;
          ball.current.vy = Math.abs(ball.current.vy);
          audioService.playSound('tile_click');
        } else if (ball.current.y + ball.current.radius >= h) {
          ball.current.y = h - ball.current.radius;
          ball.current.vy = -Math.abs(ball.current.vy);
          audioService.playSound('tile_click');
        }

        // --- 4. Paddle Collisions ---
        const playerPaddleX = 25;
        const botPaddleX = w - 25 - paddleW;

        // Player Paddle Deflection
        if (
          ball.current.vx < 0 &&
          ball.current.x - ball.current.radius <= playerPaddleX + paddleW &&
          ball.current.x + ball.current.radius >= playerPaddleX &&
          ball.current.y >= pY.current - paddleH / 2 &&
          ball.current.y <= pY.current + paddleH / 2
        ) {
          const contactOffset = (ball.current.y - pY.current) / (paddleH / 2); // -1 (top) to +1 (bottom)
          const maxAngle = (Math.PI / 180) * 60; // +/- 60 deg
          const bounceAngle = contactOffset * maxAngle;

          // Increase speed by 5% per paddle hit, capped at 16
          const newSpeed = Math.min(16, ball.current.speed * 1.05);
          ball.current.speed = newSpeed;

          // Apply paddle spin
          const spinEffect = (pVel.current / 400) * 1.5;

          ball.current.vx = Math.abs(newSpeed * Math.cos(bounceAngle));
          ball.current.vy = newSpeed * Math.sin(bounceAngle) + spinEffect;
          ball.current.x = playerPaddleX + paddleW + ball.current.radius;
          audioService.playSound('piece_drop');
        }

        // Bot Paddle Deflection
        if (
          ball.current.vx > 0 &&
          ball.current.x + ball.current.radius >= botPaddleX &&
          ball.current.x - ball.current.radius <= botPaddleX + paddleW &&
          ball.current.y >= bY.current - paddleH / 2 &&
          ball.current.y <= bY.current + paddleH / 2
        ) {
          const contactOffset = (ball.current.y - bY.current) / (paddleH / 2);
          const maxAngle = (Math.PI / 180) * 60;
          const bounceAngle = contactOffset * maxAngle;

          const newSpeed = Math.min(16, ball.current.speed * 1.05);
          ball.current.speed = newSpeed;

          ball.current.vx = -Math.abs(newSpeed * Math.cos(bounceAngle));
          ball.current.vy = newSpeed * Math.sin(bounceAngle);
          ball.current.x = botPaddleX - ball.current.radius;
          audioService.playSound('piece_land');
        }

        // --- 5. Scoring ---
        if (ball.current.x < 0) {
          // Bot scores
          audioService.playSound('failure');
          setBotScore(b => {
            const next = b + 1;
            if (next >= 7) {
              setMatchWinner('bot');
            } else {
              resetBall(true);
            }
            return next;
          });
        } else if (ball.current.x > w) {
          // Player scores
          audioService.playSound('success');
          setPlayerScore(p => {
            const next = p + 1;
            if (next >= 7) {
              setMatchWinner('player');
            } else {
              resetBall(false);
            }
            return next;
          });
        }
      }

      // --- 6. Render Frame ---
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);

      // Court boundaries & center line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 10);
      ctx.lineTo(w / 2, h - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Paddles
      // Player (Cyan)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(25, pY.current - paddleH / 2, paddleW, paddleH, 5);
      ctx.fill();

      // Bot (Rose)
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
      ctx.beginPath();
      ctx.roundRect(w - 25 - paddleW, bY.current - paddleH / 2, paddleW, paddleH, 5);
      ctx.fill();

      // Draw Ball (White with motion glow)
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, ball.current.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [isPlaying, matchWinner, difficulty, predictBallLanding, resetBall]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const targetW = Math.min(800, Math.floor(rect.width));
      const targetH = Math.min(500, Math.floor(rect.height));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Keyboard bindings
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
        keysPressed.current[e.code] = true;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (keysPressed.current[e.code]) {
        delete keysPressed.current[e.code];
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Touch / Pointer drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    updatePaddleFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging.current) {
      updatePaddleFromPointer(e);
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const updatePaddleFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    pVel.current = (touchY - pY.current) * 10;
    pY.current = touchY;
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#08090d] text-white select-none overflow-hidden font-sans">
      <header className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-base font-black tracking-wide text-cyan-400">PONG 2D</h1>
            <span className="text-[10px] text-neutral-400 font-mono">FIRST TO 7 • TABLE TENNIS</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                disabled={isPlaying}
                onClick={() => setDifficulty(d)}
                className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-all ${
                  difficulty === d
                    ? 'bg-cyan-500 text-black shadow font-bold'
                    : 'text-neutral-400 hover:text-white disabled:opacity-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={startMatch}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            {isPlaying ? 'Restart' : 'Play'}
          </button>
        </div>
      </header>

      {/* Score Header */}
      <div className="flex items-center justify-center gap-12 py-2 bg-neutral-950/60 border-b border-neutral-900 font-mono">
        <div className="text-center">
          <span className="text-[11px] text-cyan-400 font-bold block">YOU</span>
          <span className="text-3xl font-black text-white">{playerScore}</span>
        </div>
        <div className="text-neutral-600 text-2xl font-black">:</div>
        <div className="text-center">
          <span className="text-[11px] text-rose-400 font-bold block">BOT ({difficulty.toUpperCase()})</span>
          <span className="text-3xl font-black text-white">{botScore}</span>
        </div>
      </div>

      {/* Canvas Court Container */}
      <div ref={containerRef} className="flex-1 w-full flex items-center justify-center p-3 relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="rounded-xl shadow-2xl border border-neutral-800 max-w-full max-h-full touch-none cursor-ns-resize"
        />

        {/* Start / Game Over Modal Overlay */}
        {(!isPlaying || matchWinner) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30 p-4">
            <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-4xl mb-2">{matchWinner === 'player' ? '🏆' : matchWinner === 'bot' ? '💀' : '🏓'}</div>
              <h2 className="text-xl font-black text-cyan-400 mb-2">
                {matchWinner === 'player' ? 'VICTORY! (7 POINTS)' : matchWinner === 'bot' ? 'DEFEAT! BOT REACHED 7' : 'Table Tennis Pong'}
              </h2>
              <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                Use <strong>W / S</strong> or <strong>Up / Down</strong> keys, or drag vertically on touch screen. Center hits bounce straight, edge hits deflect at sharp angles up to 60°!
              </p>
              <button
                onClick={startMatch}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                {matchWinner ? 'Play Again' : 'Start Game'}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="p-2.5 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950/40">
        Controls: W / S keys, Up / Down Arrows, or Touch & Drag vertically • Ball speed accelerates 5% with each paddle hit!
      </footer>
    </div>
  );
}
