import React, { useState, useEffect, useRef, useCallback } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';

interface TowerStackerProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface Debris {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  vy: number;
  vx: number;
  rotation: number;
  vRot: number;
}

const COLORS = [
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b',
  '#10b981', '#14b8a6'
];

export default function TowerStackerGame({ onBackToHub }: TowerStackerProps) {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('tower_stacker_high') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboText, setComboText] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Tower state
  const stack = useRef<Block[]>([]);
  const debrisList = useRef<Debris[]>([]);
  const currentBlock = useRef<{
    x: number;
    width: number;
    speed: number;
    direction: number;
  } | null>(null);
  const cameraY = useRef(0);
  const consecutivePerfects = useRef(0);
  const isPlaying = useRef(true);

  useEffect(() => {
    incrementGamePlays('tower_stacker');
  }, []);

  const initGame = useCallback(() => {
    const baseW = 160;
    const blockH = 24;
    const courtW = 400;
    const startY = 480;

    stack.current = [
      {
        x: (courtW - baseW) / 2,
        y: startY,
        width: baseW,
        height: blockH,
        color: COLORS[0]
      }
    ];

    debrisList.current = [];
    currentBlock.current = {
      x: 0,
      width: baseW,
      speed: 3.2,
      direction: 1
    };
    cameraY.current = 0;
    consecutivePerfects.current = 0;
    isPlaying.current = true;

    setScore(0);
    setCombo(0);
    setComboText(null);
    setIsGameOver(false);
  }, []);

  const handleDrop = useCallback(() => {
    if (!isPlaying.current || !currentBlock.current) return;

    const blockH = 24;
    const courtW = 400;
    const topBlock = stack.current[stack.current.length - 1];
    const active = currentBlock.current;
    const targetY = topBlock.y - blockH;
    const floorIndex = stack.current.length;
    const blockColor = COLORS[floorIndex % COLORS.length];

    const diff = active.x - topBlock.x;
    const tolerance = 3.5; // Perfect threshold

    if (Math.abs(diff) <= tolerance) {
      // --- PERFECT PLACEMENT BONUS ---
      consecutivePerfects.current += 1;
      setCombo(consecutivePerfects.current);
      setComboText(`PERFECT! x${consecutivePerfects.current}`);
      audioService.playSound('success');

      // Expand block if 3 or more consecutive perfect drops
      let newW = topBlock.width;
      if (consecutivePerfects.current >= 3) {
        newW = Math.min(180, topBlock.width + 6);
      }

      const placed: Block = {
        x: topBlock.x,
        y: targetY,
        width: newW,
        height: blockH,
        color: blockColor
      };
      stack.current.push(placed);
    } else if (active.x + active.width > topBlock.x && active.x < topBlock.x + topBlock.width) {
      // --- OVERHANG SLICE ---
      consecutivePerfects.current = 0;
      setCombo(0);
      setComboText(null);
      audioService.playSound('piece_drop');

      let newX = active.x;
      let newW = active.width;

      if (diff > 0) {
        // Overhang to the right
        newX = active.x;
        newW = (topBlock.x + topBlock.width) - active.x;

        // Debris falling on right
        const debrisW = active.x + active.width - (topBlock.x + topBlock.width);
        debrisList.current.push({
          x: topBlock.x + topBlock.width,
          y: targetY,
          width: debrisW,
          height: blockH,
          color: blockColor,
          vy: 0,
          vx: 1.5,
          rotation: 0,
          vRot: 0.08
        });
      } else {
        // Overhang to the left
        newX = topBlock.x;
        newW = active.x + active.width - topBlock.x;

        // Debris falling on left
        const debrisW = topBlock.x - active.x;
        debrisList.current.push({
          x: active.x,
          y: targetY,
          width: debrisW,
          height: blockH,
          color: blockColor,
          vy: 0,
          vx: -1.5,
          rotation: 0,
          vRot: -0.08
        });
      }

      stack.current.push({
        x: newX,
        y: targetY,
        width: newW,
        height: blockH,
        color: blockColor
      });
    } else {
      // --- COMPLETE MISS -> GAME OVER ---
      isPlaying.current = false;
      setIsGameOver(true);
      audioService.playSound('failure');

      // Drop entire block as debris
      debrisList.current.push({
        x: active.x,
        y: targetY,
        width: active.width,
        height: blockH,
        color: blockColor,
        vy: 0,
        vx: active.direction * 2,
        rotation: 0,
        vRot: active.direction * 0.1
      });
      currentBlock.current = null;
      return;
    }

    const currentScore = stack.current.length - 1;
    setScore(currentScore);
    setHighScore(prev => {
      if (currentScore > prev) {
        localStorage.setItem('tower_stacker_high', String(currentScore));
        return currentScore;
      }
      return prev;
    });

    // Spawn next active block with increased speed
    const lastPlaced = stack.current[stack.current.length - 1];
    const newSpeed = 3.2 + Math.min(stack.current.length * 0.12, 5.5);
    const startDirection = stack.current.length % 2 === 0 ? 1 : -1;
    const startX = startDirection === 1 ? -lastPlaced.width : courtW;

    currentBlock.current = {
      x: startX,
      width: lastPlaced.width,
      speed: newSpeed,
      direction: startDirection
    };
  }, []);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    initGame();

    const courtW = 400;
    const courtH = 550;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Update sliding active block
      if (currentBlock.current && isPlaying.current) {
        currentBlock.current.x += currentBlock.current.direction * currentBlock.current.speed * (dt * 60);

        if (currentBlock.current.x + currentBlock.current.width >= courtW) {
          currentBlock.current.direction = -1;
        } else if (currentBlock.current.x <= 0) {
          currentBlock.current.direction = 1;
        }
      }

      // Smooth camera follow as tower ascends
      if (stack.current.length > 4) {
        const topY = stack.current[stack.current.length - 1].y;
        const targetCamY = (courtH - 220) - topY;
        cameraY.current += (targetCamY - cameraY.current) * 0.1;
      }

      // Update falling debris physics
      debrisList.current.forEach(d => {
        d.vy += 650 * dt; // gravity
        d.y += d.vy * dt;
        d.x += d.vx;
        d.rotation += d.vRot;
      });
      debrisList.current = debrisList.current.filter(d => d.y < courtH + 300);

      // --- Draw Canvas ---
      ctx.clearRect(0, 0, courtW, courtH);

      // Deep dark city night background
      const grad = ctx.createLinearGradient(0, 0, 0, courtH);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, courtW, courtH);

      ctx.save();
      ctx.translate(0, cameraY.current);

      // Draw Tower Stack
      stack.current.forEach((b, idx) => {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = idx === stack.current.length - 1 ? 12 : 3;

        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.width, b.height, 4);
        ctx.fill();

        // Floor bevel highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(b.x, b.y, b.width, 3);
      });

      // Draw Debris
      debrisList.current.forEach(d => {
        ctx.save();
        ctx.translate(d.x + d.width / 2, d.y + d.height / 2);
        ctx.rotate(d.rotation);
        ctx.fillStyle = d.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-d.width / 2, -d.height / 2, d.width, d.height);
        ctx.restore();
      });

      // Draw Active Sliding Block
      if (currentBlock.current && isPlaying.current) {
        const top = stack.current[stack.current.length - 1];
        const nextY = top.y - 24;
        const color = COLORS[stack.current.length % COLORS.length];

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(currentBlock.current.x, nextY, currentBlock.current.width, 24, 4);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(currentBlock.current.x, nextY, currentBlock.current.width, 3);
      }

      ctx.restore();

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [initGame]);

  // Spacebar binding
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleDrop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDrop]);

  return (
    <div
      className="w-full h-screen flex flex-col bg-[#07090e] text-white select-none overflow-hidden font-sans"
      onPointerDown={handleDrop}
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
            <h1 className="text-base font-black tracking-wide text-cyan-400">TOWER STACKER</h1>
            <span className="text-[10px] text-neutral-400 font-mono">TIMING & OVERHANG TRUNCATION</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">FLOORS</span>
            <span className="text-xl font-black text-cyan-400 font-mono">{score}</span>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">RECORD</span>
            <span className="text-xl font-black text-amber-400 font-mono">{highScore}</span>
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={550}
          className="rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-neutral-800 touch-none max-w-full max-h-full cursor-pointer"
        />

        {/* Combo / Perfect Announcement */}
        {comboText && !isGameOver && (
          <div className="absolute top-1/4 px-6 py-2 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-sm tracking-widest uppercase animate-bounce shadow-2xl">
            {comboText}
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 p-4" onClick={e => e.stopPropagation()}>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-5xl mb-2">🏢💥</div>
              <h2 className="text-2xl font-black text-rose-400 mb-1">TOWER COLLAPSED!</h2>
              <p className="text-sm text-neutral-400 mb-4">
                The active floor completely missed the base.
              </p>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 mb-6 flex justify-around">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Floors Built</span>
                  <span className="text-2xl font-black text-cyan-400">{score}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Record Height</span>
                  <span className="text-2xl font-black text-amber-400">{highScore}</span>
                </div>
              </div>
              <button
                onClick={initGame}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Build Again
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="p-3 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950/40">
        Controls: Spacebar, Left Click, or Screen Tap anywhere to drop active floor • Perfect drops (±3.5px) expand block width!
      </footer>
    </div>
  );
}
