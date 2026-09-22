import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';

interface KnifeThrowProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

interface EmbeddedKnife {
  id: number;
  angle: number; // Angle in degrees relative to log rotation (0 = pointing straight down when targetAngle is 0)
}

interface FlyingKnife {
  x: number;
  y: number; // Tip Y position of the knife
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  isDeflecting: boolean;
}

// Unified Knife Model Constants
const KNIFE = {
  bladeLength: 36,     // Tip to crossguard (y=0 to y=36)
  bladeWidth: 4.5,     // Half width
  guardWidth: 8,       // Half width (+/- 8)
  guardHeight: 4,      // y=36 to y=40
  handleWidth: 4,      // Half width (+/- 4)
  handleHeight: 20,    // y=40 to y=60
  pommelRadius: 3.5,   // Center at y=63.5
  embedDepth: 12       // Penetration depth into log bark
};
const TOTAL_KNIFE_LENGTH = KNIFE.bladeLength + KNIFE.guardHeight + KNIFE.handleHeight + KNIFE.pommelRadius * 2; // ~67px
const COLLISION_ANGLE_THRESHOLD = 7.0; // Degrees angular clearance required to avoid hitting an existing knife

// Standardized single knife renderer for 100% visual consistency across all states
function drawKnifeShape(ctx: CanvasRenderingContext2D, alpha: number = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // 1. Pointed Blade (Polished Two-Tone Steel)
  // Shadowed blade half
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(0, 0); // Tip
  ctx.lineTo(-KNIFE.bladeWidth, KNIFE.bladeLength);
  ctx.lineTo(0, KNIFE.bladeLength);
  ctx.closePath();
  ctx.fill();

  // Highlighted blade half
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(0, 0); // Tip
  ctx.lineTo(KNIFE.bladeWidth, KNIFE.bladeLength);
  ctx.lineTo(0, KNIFE.bladeLength);
  ctx.closePath();
  ctx.fill();

  // Center blade ridge
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, KNIFE.bladeLength);
  ctx.stroke();

  // 2. Metallic Crossguard
  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-KNIFE.guardWidth, KNIFE.bladeLength, KNIFE.guardWidth * 2, KNIFE.guardHeight, 1.5);
  ctx.fill();
  ctx.stroke();

  // 3. Ergonomic Crimson Handle
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.roundRect(-KNIFE.handleWidth, KNIFE.bladeLength + KNIFE.guardHeight, KNIFE.handleWidth * 2, KNIFE.handleHeight, 2);
  ctx.fill();

  // Handle grip ribbing rings
  ctx.strokeStyle = '#9f1239';
  ctx.lineWidth = 1.2;
  const handleStart = KNIFE.bladeLength + KNIFE.guardHeight;
  for (let y = handleStart + 4; y < handleStart + KNIFE.handleHeight - 2; y += 4.2) {
    ctx.beginPath();
    ctx.moveTo(-KNIFE.handleWidth + 1, y);
    ctx.lineTo(KNIFE.handleWidth - 1, y);
    ctx.stroke();
  }

  // 4. Brass Pommel
  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, handleStart + KNIFE.handleHeight + KNIFE.pommelRadius - 0.5, KNIFE.pommelRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export default function KnifeFlipGame({ onBackToHub }: KnifeThrowProps) {
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('knife_throw_high') || localStorage.getItem('knife_flip_high') || '0', 10);
  });
  const [knivesLeft, setKnivesLeft] = useState(7);
  const [isGameOver, setIsGameOver] = useState(false);
  const [stageCleared, setStageCleared] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Target log rotation & smooth physics
  const targetAngle = useRef(0);
  const currentSpeed = useRef(1.4);
  const desiredSpeed = useRef(1.4);
  const speedTimer = useRef(0);
  const embeddedKnives = useRef<EmbeddedKnife[]>([]);
  const logPunch = useRef(0); // Subtle recoil on knife impact

  // Knife in flight & input buffer for rapid tapping
  const flyingKnife = useRef<FlyingKnife | null>(null);
  const throwBuffered = useRef(false);
  const knivesLeftRef = useRef(knivesLeft);
  knivesLeftRef.current = knivesLeft;
  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;
  const stageClearedRef = useRef(stageCleared);
  stageClearedRef.current = stageCleared;

  // Particle impacts (sparks & wood splinters)
  const particles = useRef<Array<{ x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; maxLife: number }>>([]);

  useEffect(() => {
    incrementGamePlays('knife_flip');
  }, []);

  const initStage = useCallback((stg: number) => {
    const quota = Math.min(10, 6 + Math.floor(stg * 0.7));
    setKnivesLeft(quota);
    knivesLeftRef.current = quota;
    setStageCleared(false);
    stageClearedRef.current = false;
    setIsGameOver(false);
    isGameOverRef.current = false;
    flyingKnife.current = null;
    throwBuffered.current = false;
    particles.current = [];
    logPunch.current = 0;

    // Generate pre-embedded obstacle knives
    const obstacles: EmbeddedKnife[] = [];
    const obstacleCount = Math.min(4, Math.floor((stg - 1) / 2));
    for (let i = 0; i < obstacleCount; i++) {
      let ang = (360 / Math.max(1, obstacleCount)) * i + (Math.random() * 20 - 10);
      ang = (ang % 360 + 360) % 360;
      if (Math.min(ang, 360 - ang) < 22) {
        ang = (ang + 35) % 360;
      }
      obstacles.push({ id: Math.random(), angle: ang });
    }
    embeddedKnives.current = obstacles;

    const baseDir = stg % 2 === 0 ? -1 : 1;
    const baseRate = 1.3 + Math.min(stg * 0.1, 1.1);
    desiredSpeed.current = baseDir * baseRate;
    currentSpeed.current = baseDir * baseRate;
    speedTimer.current = 0;
  }, []);

  useEffect(() => {
    initStage(stage);
  }, [stage, initStage]);

  const resetGame = () => {
    setScore(0);
    setStage(1);
    initStage(1);
  };

  // Immediate launch action
  const launchKnife = useCallback(() => {
    if (isGameOverRef.current || stageClearedRef.current) return;
    if (knivesLeftRef.current <= 0) return;

    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 400;
    const h = canvas ? canvas.height : 600;

    // Deduct one knife immediately
    knivesLeftRef.current = Math.max(0, knivesLeftRef.current - 1);
    setKnivesLeft(knivesLeftRef.current);

    // Responsive layout calibration: consistent travel distance across phone and desktop
    const targetRadius = Math.min(65, w * 0.18);
    const playDistance = Math.min(300, Math.max(220, h * 0.46));
    const targetCenterY = Math.max(120, (h - playDistance) * 0.42);
    const readyY = targetCenterY + playDistance;
    const woodSurfaceY = targetCenterY + targetRadius - KNIFE.embedDepth;
    const travelDist = readyY - woodSurfaceY;

    // Fixed, lightning-fast flight time (95ms) for identical speed & reaction on phone & desktop
    const FLIGHT_TIME = 0.095;
    const vy = -travelDist / FLIGHT_TIME;

    flyingKnife.current = {
      x: w / 2,
      y: readyY,
      vx: 0,
      vy,
      rotation: 0,
      rotSpeed: 0,
      isDeflecting: false
    };

    audioService.playSound('piece_drop');
  }, []);

  // Rapid-response tap handler with input buffering
  const handleThrow = useCallback(() => {
    if (isGameOverRef.current || stageClearedRef.current) return;
    if (knivesLeftRef.current <= 0) return;

    // If a knife is currently in flight, buffer this tap so it launches immediately on impact
    if (flyingKnife.current !== null && !flyingKnife.current.isDeflecting) {
      throwBuffered.current = true;
      return;
    }

    launchKnife();
  }, [launchKnife]);

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastNow = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 0.04);
      lastNow = now;

      const w = canvas.width;
      const h = canvas.height;
      const targetRadius = Math.min(65, w * 0.18);

      // Calibrated play distance and target center
      const playDistance = Math.min(300, Math.max(220, h * 0.46));
      const baseY = Math.max(120, (h - playDistance) * 0.42);
      if (logPunch.current > 0) {
        logPunch.current = Math.max(0, logPunch.current - dt * 25);
      }
      const targetCenter = { x: w / 2, y: baseY - logPunch.current };
      const readyY = baseY + playDistance;

      // Smooth log rotation & speed modulation
      speedTimer.current += dt;
      if (speedTimer.current > 3.2) {
        speedTimer.current = 0;
        const dir = Math.random() < 0.35 ? -1 : 1;
        const speedMagnitude = 1.2 + Math.random() * 1.2;
        desiredSpeed.current = dir * speedMagnitude;
      }
      currentSpeed.current += (desiredSpeed.current - currentSpeed.current) * Math.min(1, dt * 3.0);
      targetAngle.current = (targetAngle.current + currentSpeed.current * (dt * 60)) % 360;

      // Update flying knife
      if (flyingKnife.current) {
        const k = flyingKnife.current;
        if (!k.isDeflecting) {
          k.y += k.vy * dt;

          const pommelContactY = targetCenter.y + targetRadius + (TOTAL_KNIFE_LENGTH - KNIFE.embedDepth - 14);
          const woodSurfaceY = targetCenter.y + targetRadius - KNIFE.embedDepth;

          // Check collision with existing embedded knives along 6 o'clock path
          if (k.y <= pommelContactY) {
            let hitObstacle = false;
            let obstacleDiff = 0;

            for (const ek of embeddedKnives.current) {
              const worldAngle = ((targetAngle.current + ek.angle) % 360 + 360) % 360;
              const diff = Math.min(worldAngle, 360 - worldAngle);

              if (diff < COLLISION_ANGLE_THRESHOLD) {
                hitObstacle = true;
                obstacleDiff = (worldAngle > 180 ? -(360 - worldAngle) : worldAngle);
                break;
              }
            }

            if (hitObstacle) {
              // CLASH! Blade tip strikes metal handle of stuck knife!
              k.isDeflecting = true;
              throwBuffered.current = false; // Cancel buffered throw on loss
              k.y = pommelContactY;
              const bounceDir = obstacleDiff >= 0 ? 1 : -1;
              k.vx = bounceDir * (220 + Math.random() * 120);
              k.vy = 400 + Math.random() * 100;
              k.rotSpeed = bounceDir * (14 + Math.random() * 6);

              audioService.playSound('knife_deflect');
              isGameOverRef.current = true;

              for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 120 + Math.random() * 300;
                particles.current.push({
                  x: k.x,
                  y: pommelContactY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed + 60,
                  color: Math.random() < 0.3 ? '#ffffff' : '#fbbf24',
                  size: 2 + Math.random() * 2,
                  life: 0.55,
                  maxLife: 0.55
                });
              }

              setTimeout(() => {
                setIsGameOver(true);
              }, 700);
            } else if (k.y <= woodSurfaceY) {
              // EMBEDDED! Knife cleanly penetrates the wooden log!
              k.y = woodSurfaceY;
              const impactAngle = (360 - (targetAngle.current % 360)) % 360;
              embeddedKnives.current.push({
                id: Math.random(),
                angle: impactAngle
              });
              flyingKnife.current = null;

              audioService.playSound('knife_hit');
              logPunch.current = 3.5;

              for (let i = 0; i < 12; i++) {
                particles.current.push({
                  x: targetCenter.x,
                  y: targetCenter.y + targetRadius,
                  vx: (Math.random() - 0.5) * 180,
                  vy: Math.random() * 140 + 40,
                  color: Math.random() < 0.5 ? '#92400e' : '#d97706',
                  size: 2.5 + Math.random() * 2,
                  life: 0.45,
                  maxLife: 0.45
                });
              }

              // Update Score
              setScore(prev => {
                const nextScore = prev + 1;
                setHighScore(h => {
                  if (nextScore > h) {
                    localStorage.setItem('knife_throw_high', String(nextScore));
                    return nextScore;
                  }
                  return h;
                });
                return nextScore;
              });

              // Check stage clear
              if (knivesLeftRef.current <= 0) {
                setStageCleared(true);
                stageClearedRef.current = true;
                throwBuffered.current = false;
                audioService.playSound('success');
                setTimeout(() => {
                  setStage(s => s + 1);
                }, 1000);
              } else if (throwBuffered.current) {
                // If user buffered a tap while knife was travelling, fire it instantly!
                throwBuffered.current = false;
                launchKnife();
              }
            }
          }
        } else {
          // Deflecting knife tumbling under gravity
          k.vy += 950 * dt;
          k.x += k.vx * dt;
          k.y += k.vy * dt;
          k.rotation += k.rotSpeed * dt;
        }
      }

      // Update Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt;
        p.life -= dt;
        if (p.life <= 0) particles.current.splice(i, 1);
      }

      // --- Render Canvas Scene ---
      ctx.clearRect(0, 0, w, h);

      // Radial background glow
      const bgGrad = ctx.createRadialGradient(targetCenter.x, targetCenter.y, 20, targetCenter.x, targetCenter.y, h * 0.85);
      bgGrad.addColorStop(0, '#131d2e');
      bgGrad.addColorStop(1, '#06080e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw Rotating Log & Embedded Knives
      ctx.save();
      ctx.translate(targetCenter.x, targetCenter.y);
      ctx.rotate((targetAngle.current * Math.PI) / 180);

      embeddedKnives.current.forEach(knife => {
        ctx.save();
        ctx.rotate((knife.angle * Math.PI) / 180);
        ctx.translate(0, targetRadius - KNIFE.embedDepth);
        drawKnifeShape(ctx);
        ctx.restore();
      });

      // Realistic Wooden Log Trunk
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer Rough Bark Ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Annual Growth Rings
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, targetRadius - 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, targetRadius - 30, 0, Math.PI * 2);
      ctx.stroke();

      // Tree Core Center
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Render Active Flying / Deflecting Knife
      if (flyingKnife.current) {
        const k = flyingKnife.current;
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(k.rotation);

        if (k.isDeflecting) {
          ctx.translate(0, -TOTAL_KNIFE_LENGTH / 2);
        }
        drawKnifeShape(ctx);
        ctx.restore();
      } else if (knivesLeft > 0 && !isGameOver && !stageCleared) {
        // Ready knife on launcher platform (positioned at calibrated readyY)
        ctx.save();
        ctx.translate(targetCenter.x, readyY);
        drawKnifeShape(ctx);
        ctx.restore();
      }

      // Draw Sparks & Wood Splinters
      particles.current.forEach(p => {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [launchKnife, knivesLeft, isGameOver, stageCleared]);

  // Dynamic canvas sizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard controls (Space)
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
      className="w-full h-screen flex flex-col bg-[#06080e] text-white select-none overflow-hidden font-sans touch-none"
      onPointerDown={(e) => {
        if (e.button === 0) handleThrow();
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 border-b border-neutral-800 z-20 shrink-0"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHub}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-rose-400">KNIFE THROW</h1>
            <span className="text-[9px] text-neutral-400 font-mono hidden sm:inline">TARGET LOG PRECISION</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right font-mono">
            <span className="text-[9px] text-neutral-400 uppercase font-semibold block">STAGE</span>
            <span className="text-sm font-black text-rose-400">{stage}</span>
          </div>
          <div className="text-right font-mono">
            <span className="text-[9px] text-neutral-400 uppercase font-semibold block">SCORE</span>
            <span className="text-sm font-black text-white">{score}</span>
          </div>
          <div className="text-right font-mono hidden xs:block">
            <span className="text-[9px] text-neutral-400 uppercase font-semibold block">HIGH</span>
            <span className="text-sm font-black text-emerald-400">{highScore}</span>
          </div>
          <button
            onClick={resetGame}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative overflow-hidden flex items-center justify-center cursor-pointer touch-none"
        onMouseDown={(e) => {
          if (e.button === 0) {
            e.preventDefault();
            handleThrow();
          }
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleThrow();
          }}
          className="w-full h-full block cursor-pointer touch-none"
        />

        {/* Left Knives Supply Indicator */}
        <div className="absolute left-4 bottom-8 flex flex-col-reverse gap-1.5 z-10 pointer-events-none">
          {Array.from({ length: knivesLeft }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs">🗡️</span>
            </div>
          ))}
        </div>

        {/* Stage Clear Banner */}
        {stageCleared && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20 pointer-events-none animate-fade-in">
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-wider uppercase block animate-bounce">
                STAGE CLEARED!
              </span>
              <span className="text-xs sm:text-sm text-neutral-300 font-mono">Advancing to Stage {stage + 1}...</span>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-30 p-4 animate-fade-in"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-4xl mb-2">💥🗡️</div>
              <h2 className="text-2xl font-black text-rose-500 mb-1">KNIFE DEFLECTED!</h2>
              <p className="text-sm text-neutral-400 mb-4">
                You struck an existing blade on the rotating log.
              </p>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 mb-6 flex justify-around font-mono">
                <div>
                  <span className="text-xs text-neutral-400 uppercase font-semibold block">Score</span>
                  <span className="text-xl font-black text-rose-400">{score}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 uppercase font-semibold block">Stage</span>
                  <span className="text-xl font-black text-white">{stage}</span>
                </div>
              </div>
              <button
                onClick={resetGame}
                className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-white font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="py-1 px-2 text-center text-[10px] text-neutral-500 border-t border-neutral-900 bg-neutral-950/60 shrink-0">
        Tap screen, click mouse, or press Spacebar to throw • Don't hit existing knives!
      </footer>
    </div>
  );
}
