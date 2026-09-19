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
  type: 'normal' | 'steel' | 'powerup' | 'tnt';
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

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

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

  // State in refs for high frame-rate precision
  const paddleRef = useRef({
    x: CANVAS_WIDTH / 2 - 50,
    y: CANVAS_HEIGHT - 28,
    w: 100,
    h: 12,
    baseW: 100,
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
    const cols = 14;
    const padding = 4;
    const topOffset = 36;
    const brickW = (CANVAS_WIDTH - padding * (cols + 1)) / cols;
    const brickH = 15;

    // Classic arcade palette (Taito / Atari Arkanoid pure retro vibes)
    const retroRowColors = [
      '#e52521', // Arcade Red
      '#f36c21', // Arcade Orange
      '#fac915', // Arcade Gold Yellow
      '#43b649', // Arcade Green
      '#008fd3', // Arcade Azure Blue
      '#994cb2', // Arcade Purple
      '#e6007e', // Arcade Hot Pink
      '#00c2cb'  // Arcade Cyan
    ];

    // Curated classic retro arcade layouts based on stage:
    // Level 1: Classic Pyramid & Layered Arkanoid wall
    // Level 2: Space Invader / Castle Battlement Pattern
    // Level 3: Diamond Citadel with Steel Core
    // Level 4: Space Fortress with Power-up Pockets and TNT mines
    // Level 5+: Procedural geometric retro mosaic
    const stagePattern = (lvl - 1) % 5;

    if (stagePattern === 0) {
      // Stage 1: Classic Arkanoid 6-tier wall with corner cuts and gold powerups
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Pyramid slight trimming on top rows
          if (r === 0 && (c < 2 || c > cols - 3)) continue;
          if (r === 1 && (c === 0 || c === cols - 1)) continue;

          const bx = padding + c * (brickW + padding);
          const by = topOffset + r * (brickH + padding);
          let type: Brick['type'] = 'normal';
          let hp = 1;
          let color = retroRowColors[r % retroRowColors.length];

          if ((r === 2 && (c === 3 || c === 10)) || (r === 4 && (c === 6 || c === 7))) {
            type = 'powerup';
            color = '#fac915';
          }

          bricks.push({ x: bx, y: by, w: brickW, h: brickH, hp, maxHp: hp, type, color });
        }
      }
    } else if (stagePattern === 1) {
      // Stage 2: Castle Battlements with TNT explosive points
      const rows = 7;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Crenellations (turrets)
          if (r === 0 && c % 2 !== 0) continue;
          if (r === 3 && (c === 6 || c === 7)) continue; // Gate opening

          const bx = padding + c * (brickW + padding);
          const by = topOffset + r * (brickH + padding);
          let type: Brick['type'] = 'normal';
          let hp = r === 1 ? 2 : 1;
          let color = hp === 2 ? '#a1a1aa' : retroRowColors[r % retroRowColors.length];

          if (r === 4 && (c === 2 || c === 11)) {
            type = 'tnt';
            color = '#f97316';
          } else if (r === 2 && (c === 0 || c === cols - 1)) {
            type = 'powerup';
            color = '#fac915';
          }

          bricks.push({ x: bx, y: by, w: brickW, h: brickH, hp, maxHp: hp, type, color });
        }
      }
    } else if (stagePattern === 2) {
      // Stage 3: Diamond Geometric Core with Steel barrier supports
      const rows = 8;
      const centerC = (cols - 1) / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const distC = Math.abs(c - centerC);
          // Diamond silhouette
          if (r < 4 && distC > r + 3) continue;
          if (r >= 4 && distC > (7 - r) + 3) continue;

          const bx = padding + c * (brickW + padding);
          const by = topOffset + r * (brickH + padding);
          let type: Brick['type'] = 'normal';
          let hp = 1;
          let color = retroRowColors[r % retroRowColors.length];

          // Steel anchors on side wings
          if ((r === 3 || r === 4) && (c === 1 || c === cols - 2)) {
            type = 'steel';
            hp = 999;
            color = '#52525b';
          } else if (r === 3 && (c === 6 || c === 7)) {
            type = 'tnt';
            color = '#f97316';
          } else if (r === 0 || r === 7) {
            type = 'powerup';
            color = '#fac915';
          }

          bricks.push({ x: bx, y: by, w: brickW, h: brickH, hp, maxHp: hp, type, color });
        }
      }
    } else if (stagePattern === 3) {
      // Stage 4: Space Invader pixel alien formation
      // 8x12 grid pattern
      const alien = [
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0]
      ];
      for (let r = 0; r < alien.length; r++) {
        for (let c = 0; c < cols; c++) {
          if (!alien[r][c]) continue;
          const bx = padding + c * (brickW + padding);
          const by = topOffset + r * (brickH + padding);
          let type: Brick['type'] = 'normal';
          let hp = (r === 2 || r === 4) ? 2 : 1;
          let color = hp === 2 ? '#facc15' : retroRowColors[r % retroRowColors.length];

          if (r === 4 && (c === 6 || c === 7)) {
            type = 'powerup';
            color = '#00c2cb';
          } else if (r === 5 && (c === 2 || c === 11)) {
            type = 'tnt';
            color = '#f97316';
          }

          bricks.push({ x: bx, y: by, w: brickW, h: brickH, hp, maxHp: hp, type, color });
        }
      }
    } else {
      // Stage 5+: Fortress with reinforced steel columns and alternating power grids
      const rows = 8;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r % 2 === 1 && (c === 3 || c === 10)) {
            // Steel pylons
            const bx = padding + c * (brickW + padding);
            const by = topOffset + r * (brickH + padding);
            bricks.push({ x: bx, y: by, w: brickW, h: brickH, hp: 999, maxHp: 999, type: 'steel', color: '#52525b' });
            continue;
          }

          const bx = padding + c * (brickW + padding);
          const by = topOffset + r * (brickH + padding);
          let type: Brick['type'] = 'normal';
          let hp = (r === 0 || r === 1) ? 2 : 1;
          let color = hp === 2 ? '#94a3b8' : retroRowColors[r % retroRowColors.length];

          if ((r === 2 && (c === 0 || c === cols - 1)) || (r === 6 && (c === 6 || c === 7))) {
            type = 'powerup';
            color = '#fac915';
          } else if (r === 4 && (c === 1 || c === cols - 2)) {
            type = 'tnt';
            color = '#f97316';
          }

          bricks.push({ x: bx, y: by, w: brickW, h: brickH, hp, maxHp: hp, type, color });
        }
      }
    }

    return bricks;
  }, []);

  const resetPaddleAndBall = useCallback(() => {
    paddleRef.current.x = CANVAS_WIDTH / 2 - paddleRef.current.w / 2;
    // Adjusted initial speed: comfortable, playable, smooth (reduced by 30%)
    ballsRef.current = [
      {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 40,
        vx: 1.55 * (Math.random() > 0.5 ? 1 : -1),
        vy: -2.25,
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

  const addParticles = (x: number, y: number, color: string, count = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2.5;
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
    addParticles(tnt.x + tnt.w / 2, tnt.y + tnt.h / 2, '#f97316', 22);

    const radius = 70;
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
      vy: 1.8,
      type
    });
  };

  const applyPowerUp = (type: PowerUp['type']) => {
    audioService.playSound('powerup');
    const paddle = paddleRef.current;
    const now = Date.now();

    if (type === 'multiball') {
      const existing = [...ballsRef.current];
      existing.forEach(b => {
        ballsRef.current.push(
          { ...b, vx: b.vx * 0.9 + 1.2, vy: b.vy * 0.9 - 0.5, stuckToPaddle: false },
          { ...b, vx: b.vx * 0.9 - 1.2, vy: b.vy * 0.9 - 0.5, stuckToPaddle: false }
        );
      });
    } else if (type === 'wide') {
      paddle.w = Math.min(CANVAS_WIDTH * 0.45, paddle.baseW * 1.5);
      paddle.wideUntil = now + 12000;
    } else if (type === 'laser') {
      paddle.hasLaser = true;
      paddle.laserUntil = now + 10000;
    } else if (type === 'fireball') {
      ballsRef.current.forEach(b => (b.isFireball = true));
    } else if (type === 'sticky') {
      paddle.isSticky = true;
      paddle.stickyUntil = now + 14000;
    } else if (type === 'life') {
      setLives(l => Math.min(5, l + 1));
    }

    // Refresh active buffs display
    const buffs: string[] = [];
    if (paddle.wideUntil > now) buffs.push('Wide');
    if (paddle.laserUntil > now) buffs.push('Laser');
    if (paddle.stickyUntil > now) buffs.push('Sticky');
    if (ballsRef.current.some(b => b.isFireball)) buffs.push('Fireball');
    setActiveBuffs(buffs);
  };

  // Main 60fps Game Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = Date.now();
      const paddle = paddleRef.current;

      // Buff expirations
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

      // Keyboard Paddle Movement
      const moveSpeed = 6.5;
      if (keysRef.current.left) {
        paddle.x = Math.max(0, paddle.x - moveSpeed);
      }
      if (keysRef.current.right) {
        paddle.x = Math.min(CANVAS_WIDTH - paddle.w, paddle.x + moveSpeed);
      }

      // Laser Auto-firing if enabled
      if (paddle.hasLaser && gameState === 'playing' && now - lastLaserShotRef.current > 400) {
        lasersRef.current.push(
          { x: paddle.x + 8, y: paddle.y - 4, vy: -7 },
          { x: paddle.x + paddle.w - 8, y: paddle.y - 4, vy: -7 }
        );
        lastLaserShotRef.current = now;
        audioService.playSound('tile_click');
      }

      // Update Lasers
      lasersRef.current.forEach((laser, lIdx) => {
        laser.y += laser.vy;
        if (laser.y < 0) {
          lasersRef.current.splice(lIdx, 1);
        } else {
          bricksRef.current.forEach((b, bIdx) => {
            if (b.hp > 0 && laser.x >= b.x && laser.x <= b.x + b.w && laser.y >= b.y && laser.y <= b.y + b.h) {
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
              const hitOffset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
              const maxAngle = Math.PI / 3;
              const angle = hitOffset * maxAngle;
              const speed = Math.hypot(ball.vx, ball.vy);
              ball.vx = speed * Math.sin(angle);
              ball.vy = -Math.abs(speed * Math.cos(angle));
              audioService.playSound('tictac_move');
              addParticles(ball.x, paddle.y, '#38bdf8', 6);
            }
          }

          // Brick collisions
          bricksRef.current.forEach((brick, brickIdx) => {
            if (brick.hp <= 0) return;

            const bLeft = brick.x;
            const bRight = brick.x + brick.w;
            const bTop = brick.y;
            const bBottom = brick.y + brick.h;

            if (
              ball.x + ball.radius >= bLeft &&
              ball.x - ball.radius <= bRight &&
              ball.y + ball.radius >= bTop &&
              ball.y - ball.radius <= bBottom
            ) {
              if (ball.isFireball) {
                if (brick.type !== 'steel') brick.hp = 0;
              } else {
                const prevX = ball.x - ball.vx;
                const prevY = ball.y - ball.vy;

                if (prevX + ball.radius <= bLeft || prevX - ball.radius >= bRight) {
                  ball.vx = -ball.vx;
                } else {
                  ball.vy = -ball.vy;
                }

                if (brick.type !== 'steel') {
                  brick.hp -= 1;
                }
              }

              audioService.playSound('tile_click');
              addParticles(ball.x, ball.y, brick.color, 7);

              if (brick.hp <= 0) {
                const earned = brick.type === 'powerup' ? 25 : 10 * level;
                scoreRef.current += earned;
                setScore(scoreRef.current);
                if (scoreRef.current > highScore) {
                  setHighScore(scoreRef.current);
                  localStorage.setItem('brick_breaker_high_score', scoreRef.current.toString());
                }

                if (brick.type === 'powerup' || Math.random() < 0.15) {
                  spawnPowerUp(brick.x + brick.w / 2, brick.y + brick.h / 2);
                } else if (brick.type === 'tnt') {
                  triggerTNTExplosion(brickIdx);
                }
              }
            }
          });

          // Ball fallen past bottom
          if (ball.y - ball.radius > CANVAS_HEIGHT) {
            ballsRef.current.splice(bIdx, 1);
          }
        });

        // Check if all balls are lost
        if (ballsRef.current.length === 0) {
          const newLives = lives - 1;
          setLives(newLives);
          audioService.playSound('button_click');

          if (newLives <= 0) {
            setGameState('gameover');
          } else {
            resetPaddleAndBall();
            setGameState('ready');
          }
        }

        // Check if stage is cleared
        const remainingDestructible = bricksRef.current.filter(b => b.hp > 0 && b.type !== 'steel');
        if (remainingDestructible.length === 0) {
          setGameState('levelwin');
          audioService.playSound('mine_win');
        }
      }

      // ================= DRAWING SECTION =================
      // Pure Retro Arcade cabinet screen (Deep slate-black with subtle arcade scanlines)
      ctx.fillStyle = '#08080c';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Retro arcade side borders & ceiling bezel
      ctx.fillStyle = '#181824';
      ctx.fillRect(0, 0, 3, CANVAS_HEIGHT);
      ctx.fillRect(CANVAS_WIDTH - 3, 0, 3, CANVAS_HEIGHT);
      ctx.fillRect(0, 0, CANVAS_WIDTH, 4);

      // Subtle retro horizontal scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        ctx.fillRect(0, y, CANVAS_WIDTH, 1.5);
      }

      // Classic Bricks Rendering
      bricksRef.current.forEach(brick => {
        if (brick.hp <= 0) return;
        ctx.save();

        // Retro block rendering: crisp beveled arcade look with top-left highlight and bottom-right shadow
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);

        // Crisp light bevel on top and left edge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(brick.x, brick.y, brick.w, 2);
        ctx.fillRect(brick.x, brick.y, 2, brick.h);

        // Crisp dark shadow on bottom and right edge
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(brick.x, brick.y + brick.h - 2, brick.w, 2);
        ctx.fillRect(brick.x + brick.w - 2, brick.y, 2, brick.h);

        // Brick detail / type styling
        if (brick.type === 'tnt') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('TNT', brick.x + brick.w / 2, brick.y + brick.h / 2);
        } else if (brick.type === 'steel') {
          // Classic steel plate cross pattern
          ctx.strokeStyle = '#27272a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(brick.x + 3, brick.y + 3);
          ctx.lineTo(brick.x + brick.w - 3, brick.y + brick.h - 3);
          ctx.moveTo(brick.x + brick.w - 3, brick.y + 3);
          ctx.lineTo(brick.x + 3, brick.y + brick.h - 3);
          ctx.stroke();
        } else if (brick.type === 'powerup') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('★', brick.x + brick.w / 2, brick.y + brick.h / 2);
        } else if (brick.maxHp > 1) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`x${brick.hp}`, brick.x + brick.w / 2, brick.y + brick.h / 2);
        }

        ctx.restore();
      });

      // Draw Lasers
      lasersRef.current.forEach(laser => {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(laser.x - 2, laser.y, 4, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(laser.x - 1, laser.y, 2, 8);
        ctx.restore();
      });

      // Draw PowerUps (Retro Capsule shape)
      powerUpsRef.current.forEach(p => {
        ctx.save();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.roundRect(p.x - 10, p.y - 6, 20, 12, 6);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 8px monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const powerLabels: Record<string, string> = {
          multiball: '3B',
          wide: 'WD',
          laser: 'LS',
          fireball: 'FB',
          sticky: 'ST',
          life: '+1'
        };
        ctx.fillText(powerLabels[p.type] || 'UP', p.x, p.y);
        ctx.restore();
      });

      // Draw Paddle (Pure Retro Vaus / Arkanoid style)
      ctx.save();
      const paddleBaseColor = paddle.hasLaser ? '#dc2626' : paddle.isSticky ? '#9333ea' : '#e2e8f0';
      ctx.fillStyle = paddleBaseColor;
      ctx.beginPath();
      ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 3);
      ctx.fill();

      // Metallic highlight band
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(paddle.x + 3, paddle.y + 1, paddle.w - 6, 3);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(paddle.x + 3, paddle.y + paddle.h - 3, paddle.w - 6, 2);

      // Red central reflector on paddle
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(paddle.x + paddle.w / 2 - 8, paddle.y + 2, 16, paddle.h - 4);
      ctx.restore();

      // Draw Balls (Classic solid white/yellow sphere with crisp bevel)
      ballsRef.current.forEach(ball => {
        ctx.save();
        ctx.fillStyle = ball.isFireball ? '#f97316' : '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ball.isFireball ? '#ea580c' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });

      // Draw Particles
      particlesRef.current.forEach((pt, pIdx) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.04;
        if (pt.alpha <= 0) {
          particlesRef.current.splice(pIdx, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.fillRect(pt.x, pt.y, 3, 3);
          ctx.restore();
        }
      });

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, highScore, level, lives]);

  // Touch & Pointer Movement
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
      ballsRef.current.forEach(b => {
        if (b.stuckToPaddle) {
          b.stuckToPaddle = false;
          b.vx = 2.6 * (Math.random() > 0.5 ? 1 : -1);
          b.vy = -3.2;
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
      if (e.key === ' ' || e.key === 'ArrowUp') keysRef.current.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  return (
    <div className="flex flex-col h-full w-full bg-[#05070d] text-white select-none overflow-hidden font-sans">
      {/* Header */}
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
            <span className="text-lg">🧱</span>
            <h1 className="text-sm sm:text-base font-black text-amber-400 tracking-wide">Brick Breaker</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-neutral-400">Lives:</span>
            <span className="text-red-400 font-black text-sm">{'❤️'.repeat(Math.max(0, lives))}</span>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Stage</div>
            <div className="text-xs sm:text-sm font-black text-cyan-400 font-mono">{level}</div>
          </div>
          <div className="text-right border-l border-neutral-800 pl-3">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Score</div>
            <div className="text-xs sm:text-sm font-black text-amber-400 font-mono">{score}</div>
          </div>
        </div>
      </header>

      {/* Buffs Strip */}
      {activeBuffs.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-4 py-1 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-300 font-bold shrink-0">
          <span>Active Buffs:</span>
          {activeBuffs.map(b => (
            <span key={b} className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Main Play Area with Responsive Full Sizing */}
      <div className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2 md:p-3 min-h-0 relative w-full h-full overflow-hidden">
        <div className="relative w-full h-full max-w-[min(98vw,calc((100vh-120px)*1.333))] max-h-[calc(100vh-120px)] aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border border-neutral-800 bg-[#08080c] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            className="w-full h-full object-contain block cursor-crosshair touch-none select-none"
          />

          {/* Ready / Start Overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
              <div className="bg-neutral-900/90 border border-neutral-700 px-6 py-3.5 rounded-2xl shadow-xl animate-pulse">
                <p className="text-sm sm:text-base font-black text-cyan-300">Tap / Click or Space to Launch Ball</p>
                <p className="text-xs text-neutral-400 mt-1">Move mouse, touch, or use [A]/[D] / Arrow keys</p>
              </div>
            </div>
          )}

          {/* Level Complete Overlay */}
          {gameState === 'levelwin' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
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
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
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

        {/* Mobile On-Screen Controls */}
        <div className="mt-3 flex items-center justify-center gap-4 sm:hidden shrink-0">
          <button
            onPointerDown={() => { keysRef.current.left = true; }}
            onPointerUp={() => { keysRef.current.left = false; }}
            className="w-16 h-11 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 shadow select-none"
          >
            ◀
          </button>
          <button
            onClick={handlePointerDown}
            className="px-6 h-11 bg-amber-500 active:bg-amber-400 text-black rounded-xl text-xs font-black flex items-center justify-center shadow select-none"
          >
            LAUNCH
          </button>
          <button
            onPointerDown={() => { keysRef.current.right = true; }}
            onPointerUp={() => { keysRef.current.right = false; }}
            className="w-16 h-11 bg-neutral-800 active:bg-amber-500 active:text-black rounded-xl text-lg font-bold flex items-center justify-center border border-neutral-700 shadow select-none"
          >
            ▶
          </button>
        </div>

        {/* Power-up Legend */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 text-[11px] text-neutral-400">
          <span>⚾ Multiball</span>
          <span>↔️ Wide</span>
          <span>🔫 Laser</span>
          <span>🔥 Fireball</span>
          <span>🧲 Sticky</span>
          <span>❤️ +Life</span>
        </div>
      </div>
    </div>
  );
}
