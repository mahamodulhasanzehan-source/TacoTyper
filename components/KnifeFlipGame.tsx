import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';

interface KnifeFlipProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

interface EmbeddedKnife {
  id: number;
  angle: number; // Angle relative to target rotation (degrees)
}

export default function KnifeFlipGame({ onBackToHub }: KnifeFlipProps) {
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('knife_flip_high') || '0', 10);
  });
  const [knivesLeft, setKnivesLeft] = useState(7);
  const [isGameOver, setIsGameOver] = useState(false);
  const [stageCleared, setStageCleared] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Target physics & rotation
  const targetAngle = useRef(0);
  const targetSpeed = useRef(1.8);
  const speedTimer = useRef(0);
  const embeddedKnives = useRef<EmbeddedKnife[]>([]);

  // Thrown knife state
  const activeKnife = useRef<{ x?: number; y: number; isFlying: boolean; isDeflecting: boolean; vx?: number; vy?: number } | null>(null);

  useEffect(() => {
    incrementGamePlays('knife_flip');
  }, []);

  const initStage = useCallback((stg: number) => {
    const quota = Math.min(12, 6 + Math.floor(stg * 0.8));
    setKnivesLeft(quota);
    setStageCleared(false);
    setIsGameOver(false);
    activeKnife.current = null;

    // Obstacle knives pre-embedded on target based on stage
    const obstacles: EmbeddedKnife[] = [];
    const obstacleCount = Math.min(4, Math.floor((stg - 1) / 2));
    for (let i = 0; i < obstacleCount; i++) {
      obstacles.push({
        id: Math.random(),
        angle: (360 / obstacleCount) * i + (Math.random() * 20 - 10)
      });
    }
    embeddedKnives.current = obstacles;
    targetSpeed.current = (stg % 2 === 0 ? -1 : 1) * (1.8 + Math.min(stg * 0.25, 2.5));
  }, []);

  const resetGame = () => {
    setScore(0);
    setStage(1);
    initStage(1);
  };

  const handleThrow = useCallback(() => {
    if (isGameOver || stageCleared || (activeKnife.current && activeKnife.current.isFlying)) return;
    if (knivesLeft <= 0) return;

    activeKnife.current = {
      y: 420, // bottom spawn
      isFlying: true,
      isDeflecting: false
    };
    audioService.playSound('piece_drop');
  }, [isGameOver, stageCleared, knivesLeft]);

  // Main 60fps game canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    initStage(stage);

    const targetCenter = { x: 200, y: 160 };
    const targetRadius = 55;
    const knifeLength = 50;

    let lastNow = performance.now();

    const render = (now: number) => {
      const dt = (now - lastNow) / 1000;
      lastNow = now;

      // Update target rotation with periodic speed changes and direction reversals
      speedTimer.current += dt;
      if (speedTimer.current > 2.5) {
        speedTimer.current = 0;
        // Direction change or speed burst
        const mult = Math.random() < 0.35 ? -1 : 1;
        targetSpeed.current = mult * (1.6 + Math.random() * 2.2);
      }
      targetAngle.current = (targetAngle.current + targetSpeed.current) % 360;

      // Update flying knife
      if (activeKnife.current) {
        if (activeKnife.current.isFlying && !activeKnife.current.isDeflecting) {
          activeKnife.current.y -= 750 * dt; // speed up

          // Check if blade tip reaches target boundary
          if (activeKnife.current.y <= targetCenter.y + targetRadius) {
            // Impact test!
            // The blade strikes the target at the bottom, which is 90 degrees in standard coordinate space
            const impactAngleOnTarget = (90 - targetAngle.current + 360) % 360;

            // Check collision with existing knives (angular threshold ~14 degrees)
            let collided = false;
            for (const k of embeddedKnives.current) {
              const diff = Math.abs(((k.angle - impactAngleOnTarget + 180 + 360) % 360) - 180);
              if (diff < 15) {
                collided = true;
                break;
              }
            }

            if (collided) {
              // Knife deflects and game over
              activeKnife.current.isDeflecting = true;
              activeKnife.current.vx = (Math.random() - 0.5) * 300;
              activeKnife.current.vy = 400;
              audioService.playSound('rotten_penalty');
              setIsGameOver(true);
            } else {
              // Successfully embedded
              embeddedKnives.current.push({
                id: Math.random(),
                angle: impactAngleOnTarget
              });
              activeKnife.current = null;
              audioService.playSound('hit');

              setScore(prev => {
                const nextScore = prev + 1;
                setHighScore(h => {
                  if (nextScore > h) {
                    localStorage.setItem('knife_flip_high', String(nextScore));
                    return nextScore;
                  }
                  return h;
                });
                return nextScore;
              });

              setKnivesLeft(prev => {
                const remaining = prev - 1;
                if (remaining <= 0) {
                  setStageCleared(true);
                  audioService.playSound('success');
                  setTimeout(() => {
                    setStage(s => {
                      const nextS = s + 1;
                      initStage(nextS);
                      return nextS;
                    });
                  }, 1200);
                }
                return remaining;
              });
            }
          }
        } else if (activeKnife.current.isDeflecting) {
          activeKnife.current.y += (activeKnife.current.vy || 400) * dt;
          if (activeKnife.current.vx) {
            activeKnife.current.x = (activeKnife.current.x || targetCenter.x) + activeKnife.current.vx * dt;
          }
        }
      }

      // --- Draw Scene ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background subtle circular radial gradient
      const bgGrad = ctx.createRadialGradient(200, 160, 20, 200, 160, 240);
      bgGrad.addColorStop(0, '#131826');
      bgGrad.addColorStop(1, '#080a10');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Rotating Target & Embedded Knives
      ctx.save();
      ctx.translate(targetCenter.x, targetCenter.y);
      ctx.rotate((targetAngle.current * Math.PI) / 180);

      // Draw embedded knives rotating with log
      embeddedKnives.current.forEach(knife => {
        ctx.save();
        ctx.rotate((knife.angle * Math.PI) / 180);

        // Blade pointing inwards into wood
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-3, targetRadius - 4, 6, 26);

        // Silver blade tip
        ctx.beginPath();
        ctx.moveTo(-3, targetRadius - 4);
        ctx.lineTo(0, targetRadius - 12);
        ctx.lineTo(3, targetRadius - 4);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();

        // Handle / Hilt
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.roundRect(-4.5, targetRadius + 22, 9, 20, 2);
        ctx.fill();

        ctx.restore();
      });

      // Target Wooden Log
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
      ctx.fill();

      // Log inner tree rings
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, targetRadius - 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, targetRadius - 26, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Draw Ready Knife (at bottom or in flight)
      if (activeKnife.current) {
        const kX = activeKnife.current.x || targetCenter.x;
        const kY = activeKnife.current.y;

        ctx.save();
        ctx.translate(kX, kY);
        if (activeKnife.current.isDeflecting) {
          ctx.rotate(Math.PI / 4);
        }

        // Blade pointing up
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(0, -knifeLength);
        ctx.lineTo(-4, -14);
        ctx.lineTo(4, -14);
        ctx.closePath();
        ctx.fill();

        // Handle
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.roundRect(-4.5, -14, 9, 26, 2);
        ctx.fill();

        ctx.restore();
      } else if (knivesLeft > 0 && !isGameOver && !stageCleared) {
        // Static knife resting ready to launch
        ctx.save();
        ctx.translate(targetCenter.x, 420);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(0, -knifeLength);
        ctx.lineTo(-4, -14);
        ctx.lineTo(4, -14);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.roundRect(-4.5, -14, 9, 26, 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [stage, initStage, knivesLeft, isGameOver, stageCleared]);

  // Spacebar key binding
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleThrow();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleThrow]);

  return (
    <div
      className="w-full h-screen flex flex-col bg-[#08090e] text-white select-none overflow-hidden font-sans"
      onPointerDown={handleThrow}
    >
      <header className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 z-20" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-base font-black tracking-wide text-pink-400">KNIFE FLIP</h1>
            <span className="text-[10px] text-neutral-400 font-mono">TARGET DART PRECISION</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">STAGE</span>
            <span className="text-sm font-black text-amber-400 font-mono">LEVEL {stage}</span>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">SCORE</span>
            <span className="text-sm font-black text-pink-400 font-mono">{score}</span>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">HIGH</span>
            <span className="text-sm font-black text-emerald-400 font-mono">{highScore}</span>
          </div>
        </div>
      </header>

      {/* Main Canvas Playing Field */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={500}
          className="rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-neutral-800 touch-none max-w-full max-h-full cursor-crosshair"
        />

        {/* Remaining Knives Ammo Bar */}
        <div className="absolute left-6 bottom-8 flex flex-col-reverse gap-1.5 z-10" onClick={e => e.stopPropagation()}>
          {Array.from({ length: knivesLeft }).map((_, i) => (
            <div key={i} className="w-2.5 h-6 bg-rose-500 rounded-sm shadow-md border border-rose-400/50" />
          ))}
        </div>

        {/* Stage Clear Banner */}
        {stageCleared && (
          <div className="absolute top-1/4 px-6 py-2 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-lg tracking-widest uppercase animate-bounce shadow-2xl">
            STAGE {stage} CLEARED! 🎯
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-30 p-4" onClick={e => e.stopPropagation()}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-5xl mb-2">💥</div>
              <h2 className="text-2xl font-black text-rose-400 mb-1">KNIFE DEFLECTION!</h2>
              <p className="text-sm text-neutral-400 mb-4">
                You hit an existing blade hilt on Stage {stage}.
              </p>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 mb-6 flex justify-around">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Total Hits</span>
                  <span className="text-xl font-black text-white">{score}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Best Run</span>
                  <span className="text-xl font-black text-amber-400">{highScore}</span>
                </div>
              </div>
              <button
                onClick={resetGame}
                className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="p-3 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950/40">
        Controls: Spacebar, Left Click, or Screen Tap anywhere to launch blade • Embed all knives without hitting existing hilts!
      </footer>
    </div>
  );
}
