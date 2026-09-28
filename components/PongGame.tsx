import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays, saveLeaderboardScore } from '../services/firebase';
import { audioService } from '../services/audioService';
import { isMobileDevice } from '../utils/device';
import { GameLeaderboardSidebar, MobileLeaderboardButton } from './GameLeaderboardSidebar';

interface PongGameProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export default function PongGame({ onBackToHub, user, username }: PongGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [matchWinner, setMatchWinner] = useState<'player' | 'bot' | null>(null);
  const [streak, setStreak] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMatchEnd = useCallback((winner: 'player' | 'bot') => {
    setMatchWinner(winner);
    setIsPlaying(false);
    if (winner === 'player') {
      if (difficulty === 'medium' || difficulty === 'hard') {
        setStreak(prev => {
          const next = prev + 1;
          saveLeaderboardScore(
            user,
            username || user?.displayName || 'Pong Ace',
            next,
            `${difficulty.toUpperCase()} Pong Master`,
            { mistakes: 0, timeTaken: 0, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: next, levelReached: next },
            `pong-${difficulty}`
          );
          return next;
        });
      }
    } else {
      setStreak(0);
    }
  }, [difficulty, user, username]);

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

        // AI Bot logic
        let targetBotY = h / 2;
        let botSpeed = 260; // Easy

        if (difficulty === 'medium') {
          botSpeed = 360;
          targetBotY = ball.current.vx > 0 ? ball.current.y : h / 2;
        } else if (difficulty === 'hard') {
          botSpeed = 480;
          targetBotY = predictBallLanding(ball.current.x, ball.current.y, ball.current.vx, ball.current.vy, w - 24, h);
        } else {
          targetBotY = ball.current.vx > 0 ? ball.current.y + (Math.sin(now / 300) * 45) : h / 2;
        }

        const diffY = targetBotY - bY.current;
        if (Math.abs(diffY) > 8) {
          bY.current += Math.sign(diffY) * Math.min(Math.abs(diffY), botSpeed * dt);
        }
        bY.current = Math.max(paddleH / 2, Math.min(h - paddleH / 2, bY.current));

        // Ball physics
        const b = ball.current;
        b.x += b.vx * (b.speed * 60) * dt;
        b.y += b.vy * (b.speed * 60) * dt;

        // Top/Bottom bounce
        if (b.y - b.radius <= 0) {
          b.y = b.radius;
          b.vy = Math.abs(b.vy);
          audioService.playSound('tile_click');
        } else if (b.y + b.radius >= h) {
          b.y = h - b.radius;
          b.vy = -Math.abs(b.vy);
          audioService.playSound('tile_click');
        }

        // Left paddle (Player) collision
        const pLeft = 24;
        const pRight = 24 + paddleW;
        const pTop = pY.current - paddleH / 2;
        const pBottom = pY.current + paddleH / 2;

        if (b.x - b.radius <= pRight && b.x + b.radius >= pLeft && b.y >= pTop && b.y <= pBottom && b.vx < 0) {
          const hitOffset = (b.y - pY.current) / (paddleH / 2);
          const maxAngle = Math.PI / 3.2; // 56 deg
          const bounceAngle = hitOffset * maxAngle;

          b.speed = Math.min(6.5, b.speed + 0.18);
          b.vx = Math.abs(Math.cos(bounceAngle));
          b.vy = Math.sin(bounceAngle);
          b.x = pRight + b.radius;
          audioService.playSound('tile_click');
        }

        // Right paddle (Bot) collision
        const bLeft = w - 24 - paddleW;
        const bRight = w - 24;
        const bTop = bY.current - paddleH / 2;
        const bBottom = bY.current + paddleH / 2;

        if (b.x + b.radius >= bLeft && b.x - b.radius <= bRight && b.y >= bTop && b.y <= bBottom && b.vx > 0) {
          const hitOffset = (b.y - bY.current) / (paddleH / 2);
          const maxAngle = Math.PI / 3.2;
          const bounceAngle = hitOffset * maxAngle;

          b.speed = Math.min(6.5, b.speed + 0.18);
          b.vx = -Math.abs(Math.cos(bounceAngle));
          b.vy = Math.sin(bounceAngle);
          b.x = bLeft - b.radius;
          audioService.playSound('tile_click');
        }

        // Scoring
        if (b.x < 0) {
          // Bot scored
          audioService.playSound('wrong_answer');
          setBotScore(s => {
            const next = s + 1;
            if (next >= 7) handleMatchEnd('bot');
            else resetBall(true);
            return next;
          });
        } else if (b.x > w) {
          // Player scored
          audioService.playSound('success');
          setPlayerScore(s => {
            const next = s + 1;
            if (next >= 7) handleMatchEnd('player');
            else resetBall(false);
            return next;
          });
        }
      }

      // Render Scene
      ctx.clearRect(0, 0, w, h);

      // Court background lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer boundaries
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.strokeRect(1, 1, w - 2, h - 2);

      // Player Paddle (Left - Cyan)
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.roundRect(24, pY.current - paddleH / 2, paddleW, paddleH, 6);
      ctx.fill();

      // Bot Paddle (Right - Rose)
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.roundRect(w - 24 - paddleW, bY.current - paddleH / 2, paddleW, paddleH, 6);
      ctx.fill();

      // Glowing Ball
      if (isPlaying) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.current.x, ball.current.y, ball.current.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [difficulty, handleMatchEnd, isPlaying, matchWinner, predictBallLanding, resetBall]);

  // Window Resize Listener for Canvas resolution
  useEffect(() => {
    const handleResize = () => {
      const el = containerRef.current;
      const cvs = canvasRef.current;
      if (!el || !cvs) return;
      cvs.width = el.clientWidth;
      cvs.height = el.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        keysPressed.current[e.code] = true;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
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
    <div className="w-full h-full flex flex-row bg-[#05070d] text-white select-none overflow-hidden font-sans">
      <div className="flex-1 h-full flex flex-col relative overflow-hidden min-w-0">
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
                  onClick={() => {
                    if (d !== difficulty) setStreak(0);
                    setDifficulty(d);
                  }}
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

            {isMobile && (
              <MobileLeaderboardButton onClick={() => setShowMobileLeaderboard(true)} />
            )}
          </div>
        </header>

        {/* Score Header Bar */}
        <div className="flex items-center justify-between px-6 py-1.5 bg-neutral-950/80 border-b border-neutral-900 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-cyan-400 font-bold">YOU: {playerScore}</span>
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center gap-3">
            <span>Target: 7 Points</span>
            <span className="text-cyan-400 font-bold">🔥 Streak: {streak}</span>
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

      <GameLeaderboardSidebar
        mode={`pong-${difficulty === 'easy' ? 'medium' : difficulty}`}
        allowedModes={['pong-medium', 'pong-hard']}
        tabLabels={{
          'pong-medium': 'MED',
          'pong-hard': 'HARD'
        }}
        title="Pong Masters"
        scoreLabel="STREAK"
        storageKey="pong_leaderboard_collapsed"
        isMobile={isMobile}
        showMobileLeaderboard={showMobileLeaderboard}
        onCloseMobileLeaderboard={() => setShowMobileLeaderboard(false)}
      />
    </div>
  );
}
