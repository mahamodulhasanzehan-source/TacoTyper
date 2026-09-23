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

  // Physics state stored in refs
  const pY = useRef(250);
  const pVel = useRef(0);
  const bY = useRef(250);
  const ball = useRef({
    x: 400,
    y: 250,
    vx: -2.8,
    vy: 1.2,
    speed: 3.0, // gentler, comfortable initial speed
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
    const initialSpeed = 3.2; // comfortable, slow initial speed
    const angle = (Math.random() * 0.7 - 0.35); // shallow launch angle

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
    if (bVx <= 0) return courtH / 2;
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
      const paddleH = Math.max(64, h * 0.22);
      const paddleW = 12;

      if (isPlaying && !matchWinner) {
        // Keyboard controls
        const speed = 480;
        if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) {
          pVel.current = -speed;
        } else if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) {
          pVel.current = speed;
        } else if (!isDragging.current) {
          pVel.current *= 0.8;
        }

        pY.current += pVel.current * dt;
        pY.current = Math.max(paddleH / 2, Math.min(h - paddleH / 2, pY.current));

        // Bot AI
        let botSpeed = 240;
        let targetY = ball.current.y;

        if (difficulty === 'easy') {
          botSpeed = 190;
          targetY = ball.current.y + (Math.sin(now / 300) * 40);
        } else if (difficulty === 'medium') {
          botSpeed = 270;
          targetY = ball.current.y;
        } else {
          botSpeed = 360;
          targetY = predictBallLanding(ball.current.x, ball.current.y, ball.current.vx, ball.current.vy, w - 30, h);
        }

        const diff = targetY - bY.current;
        if (Math.abs(diff) > 4) {
          bY.current += Math.sign(diff) * Math.min(botSpeed * dt, Math.abs(diff));
        }
        bY.current = Math.max(paddleH / 2, Math.min(h - paddleH / 2, bY.current));

        // Ball movement
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

        // Paddle collisions
        const playerPaddleX = 25;
        const botPaddleX = w - 25 - paddleW;

        // Player Deflection
        if (
          ball.current.vx < 0 &&
          ball.current.x - ball.current.radius <= playerPaddleX + paddleW &&
          ball.current.x + ball.current.radius >= playerPaddleX &&
          ball.current.y >= pY.current - paddleH / 2 &&
          ball.current.y <= pY.current + paddleH / 2
        ) {
          const contactOffset = (ball.current.y - pY.current) / (paddleH / 2);
          const maxAngle = (Math.PI / 180) * 58;
          let bounceAngle = contactOffset * maxAngle;

          // Relative paddle vs ball vertical direction:
          // Moving same direction -> faster, moving opposite -> slower
          let speedMultiplier = 1.035; // base gentle volley increment
          const paddleMoving = Math.abs(pVel.current) > 30;
          const sameDirection = paddleMoving && Math.sign(pVel.current) === Math.sign(ball.current.vy);
          const oppositeDirection = paddleMoving && Math.sign(pVel.current) === -Math.sign(ball.current.vy);

          if (sameDirection) {
            speedMultiplier = 1.14;
          } else if (oppositeDirection) {
            speedMultiplier = 0.86;
          }

          let newSpeed = ball.current.speed * speedMultiplier;
          newSpeed = Math.max(3.8, Math.min(10.5, newSpeed));
          ball.current.speed = newSpeed;

          // Non-looping & spin dynamics:
          // Prevent strictly horizontal ping-pong trapping
          if (Math.abs(bounceAngle) < 0.08 && !paddleMoving) {
            bounceAngle = (Math.random() > 0.5 ? 1 : -1) * 0.15;
          }
          // Subtle micro-variation to avoid exact repeating trajectories
          bounceAngle += (Math.random() - 0.5) * 0.04;

          const spinEffect = (pVel.current / 450) * 1.2;
          ball.current.vx = Math.abs(newSpeed * Math.cos(bounceAngle));
          ball.current.vy = newSpeed * Math.sin(bounceAngle) + spinEffect;
          ball.current.x = playerPaddleX + paddleW + ball.current.radius;
          audioService.playSound('piece_drop');
        }

        // Bot Deflection
        if (
          ball.current.vx > 0 &&
          ball.current.x + ball.current.radius >= botPaddleX &&
          ball.current.x - ball.current.radius <= botPaddleX + paddleW &&
          ball.current.y >= bY.current - paddleH / 2 &&
          ball.current.y <= bY.current + paddleH / 2
        ) {
          const contactOffset = (ball.current.y - bY.current) / (paddleH / 2);
          const maxAngle = (Math.PI / 180) * 58;
          let bounceAngle = contactOffset * maxAngle;

          // Non-looping anti-lock
          if (Math.abs(bounceAngle) < 0.08) {
            bounceAngle = (Math.random() > 0.5 ? 1 : -1) * 0.15;
          }
          bounceAngle += (Math.random() - 0.5) * 0.04;

          const newSpeed = Math.min(10.0, Math.max(3.8, ball.current.speed * 1.035));
          ball.current.speed = newSpeed;

          ball.current.vx = -Math.abs(newSpeed * Math.cos(bounceAngle));
          ball.current.vy = newSpeed * Math.sin(bounceAngle);
          ball.current.x = botPaddleX - ball.current.radius;
          audioService.playSound('piece_land');
        }

        // Scoring
        if (ball.current.x < 0) {
          audioService.playSound('failure');
          setBotScore(b => {
            const next = b + 1;
            if (next >= 7) setMatchWinner('bot');
            else resetBall(true);
            return next;
          });
        } else if (ball.current.x > w) {
          audioService.playSound('success');
          setPlayerScore(p => {
            const next = p + 1;
            if (next >= 7) setMatchWinner('player');
            else resetBall(false);
            return next;
          });
        }
      }

      // Render Court
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);

      // Court boundary
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      // Center divider line
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 8);
      ctx.lineTo(w / 2, h - 8);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Scores watermark
      ctx.font = 'bold 64px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.textAlign = 'center';
      ctx.fillText(String(playerScore), w / 4, h / 2 + 20);
      ctx.fillText(String(botScore), (3 * w) / 4, h / 2 + 20);

      // Player Paddle (Cyan)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(25, pY.current - paddleH / 2, paddleW, paddleH, 4);
      ctx.fill();

      // Bot Paddle (Rose)
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(w - 25 - paddleW, bY.current - paddleH / 2, paddleW, paddleH, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
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
  }, [isPlaying, matchWinner, difficulty, resetBall, playerScore, botScore, predictBallLanding]);

  // Responsive Canvas resizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const targetW = container.clientWidth;
      const targetH = container.clientHeight;

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

  // Keyboard controls
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

  // Dedicated Mobile & Desktop Touch Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePaddleFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging.current) {
      updatePaddleFromPointer(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const updatePaddleFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    pVel.current = (touchY - pY.current) * 8;
    pY.current = touchY;
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#05070d] text-white select-none overflow-hidden font-sans">
      <header className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 border-b border-neutral-800 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHub}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-cyan-400">PONG 2D</h1>
            <span className="text-[9px] text-neutral-400 font-mono hidden sm:inline">FIRST TO 7 • TABLE TENNIS</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                disabled={isPlaying}
                onClick={() => setDifficulty(d)}
                className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded capitalize transition-all ${
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
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            {isPlaying ? 'Restart' : 'Play'}
          </button>
        </div>
      </header>

      {/* Score Header Bar */}
      <div className="flex items-center justify-between px-6 py-1.5 bg-neutral-950/80 border-b border-neutral-900 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-cyan-400 font-bold">YOU: {playerScore}</span>
        </div>
        <div className="text-[11px] text-neutral-400">
          Target: 7 Points
        </div>
        <div className="flex items-center gap-2">
          <span className="text-rose-400 font-bold">BOT: {botScore}</span>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
        </div>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="flex-1 w-full relative overflow-hidden flex items-center justify-center touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block cursor-ns-resize touch-none"
        />

        {/* Start Game Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-4xl mb-2">🏓</div>
              <h2 className="text-2xl font-black text-cyan-400 mb-2">PONG SHOWDOWN</h2>
              <p className="text-xs text-neutral-400 mb-6">
                Drag on the screen or use W/S / Arrow keys to slide your paddle.
              </p>
              <button
                onClick={startMatch}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Start Match
              </button>
            </div>
          </div>
        )}

        {/* Match Finished Modal */}
        {matchWinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-30 p-4">
            <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-4xl mb-2">{matchWinner === 'player' ? '🏆' : '💀'}</div>
              <h2 className={`text-2xl font-black mb-1 ${matchWinner === 'player' ? 'text-cyan-400' : 'text-rose-500'}`}>
                {matchWinner === 'player' ? 'VICTORY!' : 'DEFEATED!'}
              </h2>
              <p className="text-sm text-neutral-400 mb-4">
                {matchWinner === 'player'
                  ? `You outmatched the ${difficulty.toUpperCase()} AI bot!`
                  : `The ${difficulty.toUpperCase()} bot scored 7 points.`}
              </p>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 mb-6 flex justify-around font-mono">
                <div>
                  <span className="text-xs text-neutral-400 uppercase font-semibold block">You</span>
                  <span className="text-2xl font-black text-cyan-400">{playerScore}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 uppercase font-semibold block">Bot</span>
                  <span className="text-2xl font-black text-rose-500">{botScore}</span>
                </div>
              </div>
              <button
                onClick={startMatch}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="py-1 px-2 text-center text-[10px] text-neutral-500 border-t border-neutral-900 bg-neutral-950/60 shrink-0">
        Controls: Drag vertically anywhere on screen • W/S or Arrow Keys
      </footer>
    </div>
  );
}
