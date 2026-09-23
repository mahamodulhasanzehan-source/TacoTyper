import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays, saveLeaderboardScore } from '../services/firebase';

export interface FruitDef {
    id: number;
    name: string;
    emoji: string;
    radius: number;
    score: number;
    color: string;
    accentColor: string;
}

export const FRUIT_TYPES: FruitDef[] = [
    { id: 0, name: 'Cherry', emoji: '🍒', radius: 18, score: 2, color: '#e11d48', accentColor: '#9f1239' },
    { id: 1, name: 'Strawberry', emoji: '🍓', radius: 25, score: 4, color: '#f43f5e', accentColor: '#be123c' },
    { id: 2, name: 'Grape', emoji: '🍇', radius: 33, score: 6, color: '#9333ea', accentColor: '#6b21a8' },
    { id: 3, name: 'Dekopon', emoji: '🍊', radius: 42, score: 10, color: '#f97316', accentColor: '#c2410c' },
    { id: 4, name: 'Persimmon', emoji: '🍅', radius: 52, score: 15, color: '#ea580c', accentColor: '#9a3412' },
    { id: 5, name: 'Apple', emoji: '🍎', radius: 63, score: 21, color: '#dc2626', accentColor: '#991b1b' },
    { id: 6, name: 'Pear', emoji: '🍐', radius: 75, score: 28, color: '#84cc16', accentColor: '#4d7c0f' },
    { id: 7, name: 'Peach', emoji: '🍑', radius: 88, score: 36, color: '#fb7185', accentColor: '#e11d48' },
    { id: 8, name: 'Pineapple', emoji: '🍍', radius: 102, score: 45, color: '#eab308', accentColor: '#a16207' },
    { id: 9, name: 'Melon', emoji: '🍈', radius: 118, score: 55, color: '#22c55e', accentColor: '#15803d' },
    { id: 10, name: 'Watermelon', emoji: '🍉', radius: 136, score: 70, color: '#16a34a', accentColor: '#14532d' },
];

export const FruitSVG: React.FC<{ tier: number; size?: number; className?: string }> = ({ tier, size, className = '' }) => {
    const fruit = FRUIT_TYPES[Math.min(tier, FRUIT_TYPES.length - 1)];
    const s = size || fruit.radius * 2;
    const fontSize = Math.max(14, Math.round(s * 0.95));

    return (
        <div 
            className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
            style={{ 
                width: `${s}px`, 
                height: `${s}px`,
            }}
        >
            <span 
                style={{ fontSize: `${fontSize}px`, lineHeight: 1 }} 
                className="drop-shadow-sm select-none pointer-events-none"
            >
                {fruit.emoji}
            </span>
        </div>
    );
};

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    radius: number;
    alpha: number;
}

interface PhysicsFruit {
    id: number;
    tier: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    settledTimer: number;
}

interface FruitMergeGameProps {
    onBackToHub: () => void;
    user?: any;
    username?: string | null;
}

export default function FruitMergeGame({ onBackToHub, user, username }: FruitMergeGameProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Gameplay states
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        return parseInt(localStorage.getItem('suika_high_score') || '0', 10);
    });
    const [currentTier, setCurrentTier] = useState(0);
    const [nextTier, setNextTier] = useState(1);
    const [canDrop, setCanDrop] = useState(true);
    const [dropX, setDropX] = useState(220); // Center of 440 wide canvas
    const [gameOver, setGameOver] = useState(false);
    const [dangerTimer, setDangerTimer] = useState(0); // in ms
    const [isPointerDown, setIsPointerDown] = useState(false);

    useEffect(() => {
        if (!gameOver) return;
        if (scoreRef.current > 0) {
            saveLeaderboardScore(
                user,
                username || user?.displayName || 'Fruit Master',
                scoreRef.current,
                'Suika Legend',
                { mistakes: 0, timeTaken: 0, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: scoreRef.current, levelReached: 1 },
                'fruit_merge'
            );
        }
    }, [gameOver, user, username]);

    // Physics constants (Logical canvas coordinates 440 x 640)
    const LOGICAL_WIDTH = 440;
    const LOGICAL_HEIGHT = 640;
    const DANGER_Y = 120;
    const SPAWN_Y = 60;

    const fruitsRef = useRef<PhysicsFruit[]>([]);
    const nextFruitIdRef = useRef(1);
    const particlesRef = useRef<Particle[]>([]);
    const scoreRef = useRef(0);
    const gameOverRef = useRef(false);
    const dangerTimeRef = useRef(0);
    const canDropRef = useRef(true);

    const getRandomInitialTier = () => {
        // Only drop smaller fruits (Cherry, Strawberry, Grape, Dekopon)
        return Math.floor(Math.random() * 4);
    };

    useEffect(() => {
        incrementGamePlays('fruit_merge');
        setCurrentTier(getRandomInitialTier());
        setNextTier(getRandomInitialTier());
    }, []);

    // Resize canvas to match display container while maintaining logical 440x640 ratio
    const updateCanvasScale = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        // Container aspect ratio fits smoothly into available space
        canvas.width = LOGICAL_WIDTH;
        canvas.height = LOGICAL_HEIGHT;
    }, []);

    useEffect(() => {
        updateCanvasScale();
        window.addEventListener('resize', updateCanvasScale);
        return () => window.removeEventListener('resize', updateCanvasScale);
    }, [updateCanvasScale]);

    const spawnMergeJuice = (x: number, y: number, color: string) => {
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            particlesRef.current.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                color,
                radius: 3 + Math.random() * 5,
                alpha: 1
            });
        }
    };

    const handleDrop = useCallback(() => {
        if (!canDropRef.current || gameOverRef.current) return;

        canDropRef.current = false;
        setCanDrop(false);

        const fruitDef = FRUIT_TYPES[currentTier];
        const clampedX = Math.max(fruitDef.radius + 6, Math.min(LOGICAL_WIDTH - fruitDef.radius - 6, dropX));

        const newFruit: PhysicsFruit = {
            id: nextFruitIdRef.current++,
            tier: currentTier,
            x: clampedX,
            y: SPAWN_Y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 3,
            r: fruitDef.radius,
            settledTimer: 0
        };

        fruitsRef.current.push(newFruit);
        audioService.playSound('piece_drop');

        // Prepare next fruit
        setCurrentTier(nextTier);
        setNextTier(getRandomInitialTier());

        // Cooldown
        setTimeout(() => {
            if (!gameOverRef.current) {
                canDropRef.current = true;
                setCanDrop(true);
            }
        }, 550);
    }, [currentTier, nextTier, dropX]);

    const resetGame = () => {
        fruitsRef.current = [];
        particlesRef.current = [];
        scoreRef.current = 0;
        dangerTimeRef.current = 0;
        gameOverRef.current = false;
        canDropRef.current = true;
        setScore(0);
        setDangerTimer(0);
        setGameOver(false);
        setCanDrop(true);
        setCurrentTier(getRandomInitialTier());
        setNextTier(getRandomInitialTier());
    };

    // Main 60fps Physics & Render Loop
    useEffect(() => {
        let animationFrameId: number;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const GRAVITY = 0.32;
        const RESTITUTION = 0.22;
        const FRICTION_WALL = 0.96;
        const FRICTION_FLOOR = 0.94;
        const SUB_STEPS = 8;

        let lastTimestamp = performance.now();

        const tick = (now: number) => {
            const dt = Math.min((now - lastTimestamp) / 1000, 0.05);
            lastTimestamp = now;

            if (!gameOverRef.current) {
                // Physics Sub-stepping for rock-solid circular collisions
                const stepDt = dt / SUB_STEPS;
                const fruits = fruitsRef.current;

                for (let step = 0; step < SUB_STEPS; step++) {
                    // 1. Integrate motion
                    for (let i = 0; i < fruits.length; i++) {
                        const f = fruits[i];
                        f.vy += GRAVITY * (dt * 60 / SUB_STEPS);
                        f.x += f.vx * (dt * 60 / SUB_STEPS);
                        f.y += f.vy * (dt * 60 / SUB_STEPS);

                        // Wall constraints
                        if (f.x - f.r < 0) {
                            f.x = f.r;
                            f.vx = -f.vx * RESTITUTION;
                            f.vy *= FRICTION_WALL;
                        } else if (f.x + f.r > LOGICAL_WIDTH) {
                            f.x = LOGICAL_WIDTH - f.r;
                            f.vx = -f.vx * RESTITUTION;
                            f.vy *= FRICTION_WALL;
                        }

                        // Floor constraint
                        if (f.y + f.r > LOGICAL_HEIGHT) {
                            f.y = LOGICAL_HEIGHT - f.r;
                            f.vy = -f.vy * RESTITUTION;
                            f.vx *= FRICTION_FLOOR;
                        }
                    }

                    // 2. Circle-to-Circle collision & Merge resolution
                    const toRemove = new Set<number>();
                    const toAdd: PhysicsFruit[] = [];

                    for (let i = 0; i < fruits.length; i++) {
                        for (let j = i + 1; j < fruits.length; j++) {
                            const f1 = fruits[i];
                            const f2 = fruits[j];

                            if (toRemove.has(f1.id) || toRemove.has(f2.id)) continue;

                            const dx = f2.x - f1.x;
                            const dy = f2.y - f1.y;
                            const dist = Math.hypot(dx, dy);
                            const minDist = f1.r + f2.r;

                            if (dist < minDist && dist > 0.001) {
                                // Check if they can merge!
                                if (f1.tier === f2.tier && f1.tier < FRUIT_TYPES.length - 1) {
                                    toRemove.add(f1.id);
                                    toRemove.add(f2.id);

                                    const nextTierIdx = f1.tier + 1;
                                    const nextDef = FRUIT_TYPES[nextTierIdx];
                                    const midX = (f1.x + f2.x) / 2;
                                    const midY = (f1.y + f2.y) / 2;

                                    toAdd.push({
                                        id: nextFruitIdRef.current++,
                                        tier: nextTierIdx,
                                        x: midX,
                                        y: midY,
                                        vx: (f1.vx + f2.vx) * 0.4,
                                        vy: (f1.vy + f2.vy) * 0.4 - 1.5,
                                        r: nextDef.radius,
                                        settledTimer: 0
                                    });

                                    spawnMergeJuice(midX, midY, nextDef.color);
                                    if (nextTierIdx >= 10) {
                                        audioService.playSound('success');
                                    } else if (nextTierIdx >= 5) {
                                        audioService.playSound('powerup');
                                    } else {
                                        audioService.playSound('piece_land');
                                    }

                                    // Increase score
                                    scoreRef.current += nextDef.score;
                                    setScore(scoreRef.current);
                                    setHighScore(prev => {
                                        const newHigh = Math.max(prev, scoreRef.current);
                                        localStorage.setItem('suika_high_score', String(newHigh));
                                        return newHigh;
                                    });
                                } else {
                                    // Elastic collision response
                                    const nx = dx / dist;
                                    const ny = dy / dist;
                                    const overlap = minDist - dist;

                                    // Position correction
                                    f1.x -= nx * (overlap * 0.5);
                                    f1.y -= ny * (overlap * 0.5);
                                    f2.x += nx * (overlap * 0.5);
                                    f2.y += ny * (overlap * 0.5);

                                    // Relative velocity
                                    const kx = f1.vx - f2.vx;
                                    const ky = f1.vy - f2.vy;
                                    const p = 2 * (nx * kx + ny * ky) / 2;

                                    f1.vx -= p * 0.5 * nx * (1 + RESTITUTION);
                                    f1.vy -= p * 0.5 * ny * (1 + RESTITUTION);
                                    f2.vx += p * 0.5 * nx * (1 + RESTITUTION);
                                    f2.vy += p * 0.5 * ny * (1 + RESTITUTION);
                                }
                            }
                        }
                    }

                    if (toRemove.size > 0) {
                        fruitsRef.current = fruits.filter(f => !toRemove.has(f.id)).concat(toAdd);
                    }
                }

                // Check Danger Line Condition
                let isAboveDanger = false;
                for (const f of fruitsRef.current) {
                    // If a settled or slowly moving fruit is above danger line
                    if (f.y - f.r < DANGER_Y && Math.abs(f.vy) < 0.4 && f.y > SPAWN_Y + 15) {
                        isAboveDanger = true;
                        break;
                    }
                }

                if (isAboveDanger) {
                    dangerTimeRef.current += dt * 1000;
                    setDangerTimer(dangerTimeRef.current);
                    if (dangerTimeRef.current >= 3000) {
                        gameOverRef.current = true;
                        setGameOver(true);
                        audioService.playSound('failure');
                    }
                } else {
                    if (dangerTimeRef.current > 0) {
                        dangerTimeRef.current = Math.max(0, dangerTimeRef.current - dt * 2000);
                        setDangerTimer(dangerTimeRef.current);
                    }
                }
            }

            // Render on Canvas
            ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

            // 1. Background Grid & Box
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

            // Container Borders
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 4;
            ctx.strokeRect(2, 2, LOGICAL_WIDTH - 4, LOGICAL_HEIGHT - 4);

            // 2. Danger line
            ctx.save();
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = dangerTimeRef.current > 0 ? '#ef4444' : '#52525b';
            ctx.lineWidth = dangerTimeRef.current > 0 ? 3 : 1.5;
            ctx.beginPath();
            ctx.moveTo(0, DANGER_Y);
            ctx.lineTo(LOGICAL_WIDTH, DANGER_Y);
            ctx.stroke();

            // Danger Label
            ctx.fillStyle = dangerTimeRef.current > 0 ? '#ef4444' : '#71717a';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(
                dangerTimeRef.current > 0 ? `DANGER! OVERFLOW IN ${(Math.max(0, 3 - dangerTimeRef.current / 1000)).toFixed(1)}s` : 'DEADLINE',
                12,
                DANGER_Y - 8
            );
            ctx.restore();

            // 3. Aiming Guide Line (when dropping)
            if (canDropRef.current && !gameOverRef.current) {
                ctx.save();
                ctx.setLineDash([4, 6]);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(dropX, SPAWN_Y);
                ctx.lineTo(dropX, LOGICAL_HEIGHT);
                ctx.stroke();
                ctx.restore();
            }

            // 4. Draw Fruits (Invisible circular hitbox matching emoji visual size, no surrounding circle)
            for (const f of fruitsRef.current) {
                ctx.save();
                ctx.translate(f.x, f.y);
                drawFruitEmoji(ctx, f.tier, f.r);
                ctx.restore();
            }

            // 5. Draw Active Dropper Fruit at Top
            if (canDropRef.current && !gameOverRef.current) {
                const activeDef = FRUIT_TYPES[currentTier];
                ctx.save();
                ctx.translate(dropX, SPAWN_Y);
                drawFruitEmoji(ctx, currentTier, activeDef.radius);
                ctx.restore();
            }

            // 6. Draw Juice Splatter Particles
            const aliveParticles: Particle[] = [];
            for (const p of particlesRef.current) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.2;
                p.alpha -= 0.025;

                if (p.alpha > 0) {
                    ctx.save();
                    ctx.globalAlpha = p.alpha;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    aliveParticles.push(p);
                }
            }
            particlesRef.current = aliveParticles;

            animationFrameId = requestAnimationFrame(tick);
        };

        animationFrameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationFrameId);
    }, [currentTier, dropX]);

    // Canvas fruit emoji rendering matching the invisible circular physics hitbox exactly
    const drawFruitEmoji = (ctx: CanvasRenderingContext2D, tier: number, r: number) => {
        const def = FRUIT_TYPES[tier];
        if (!def) return;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Size emoji so its glyph boundary matches the physics circle (diameter 2*r) exactly
        const fontSize = Math.max(16, Math.round(r * 2.05));
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillText(def.emoji, 0, 0);
        ctx.restore();
    };

    // Pointer movement & drop coordinate handling
    const updatePointerX = (clientX: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = LOGICAL_WIDTH / rect.width;
        const relativeX = (clientX - rect.left) * scaleX;
        const activeRadius = FRUIT_TYPES[currentTier].radius;
        const clamped = Math.max(activeRadius + 8, Math.min(LOGICAL_WIDTH - activeRadius - 8, relativeX));
        setDropX(clamped);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsPointerDown(true);
        updatePointerX(e.clientX);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isPointerDown || !('ontouchstart' in window)) {
            updatePointerX(e.clientX);
        }
    };

    const handlePointerUp = () => {
        if (isPointerDown) {
            setIsPointerDown(false);
            handleDrop();
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#09090b] text-white font-sans select-none overflow-hidden relative">
            {/* Top Bar - Pinned at top */}
            <div className="flex justify-between items-center w-full px-3 sm:px-6 py-2 border-b border-neutral-800/80 bg-black/60 backdrop-blur-md shrink-0 z-20">
                <button
                    onClick={onBackToHub}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-full text-xs sm:text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-md"
                    title="Back to Hub"
                >
                    <span>⬅️</span>
                    <span className="hidden sm:inline">Hub</span>
                </button>

                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-center">
                        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-400 font-mono">Score</div>
                        <div className="text-lg sm:text-2xl font-black text-amber-400 font-mono leading-none">{score}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-400 font-mono">Best</div>
                        <div className="text-lg sm:text-2xl font-black text-emerald-400 font-mono leading-none">{highScore}</div>
                    </div>
                </div>

                {/* Next Fruit Preview */}
                <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800 px-3 py-1 rounded-2xl">
                    <div className="text-[10px] sm:text-xs text-neutral-400 font-mono uppercase">Next:</div>
                    <FruitSVG tier={nextTier} size={28} />
                </div>
            </div>

            {/* Game Main Area - Responsive Center with side panels on landscape */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-2 sm:p-4 gap-3 md:gap-6 overflow-hidden min-h-0">
                
                {/* Canvas Game Container */}
                <div 
                    ref={containerRef}
                    className="relative flex items-center justify-center max-h-full aspect-[440/640] h-full max-w-[440px] rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-800 bg-black cursor-crosshair touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={() => setIsPointerDown(false)}
                >
                    <canvas 
                        ref={canvasRef} 
                        className="w-full h-full block"
                    />

                    {/* Danger Overflow Notification Banner */}
                    {dangerTimer > 500 && !gameOver && (
                        <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-600/90 text-white font-mono text-xs font-black rounded-full animate-pulse shadow-lg pointer-events-none z-10 border border-red-400">
                            ⚠️ DANGER OVERFLOW!
                        </div>
                    )}

                    {/* Game Over Screen Modal */}
                    {gameOver && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-30">
                            <div className="text-5xl mb-2">🍉</div>
                            <h2 className="text-2xl sm:text-3xl font-black text-amber-400 mb-1 font-mono">GAME OVER</h2>
                            <p className="text-sm text-neutral-400 mb-4">The fruits spilled over the deadline!</p>
                            
                            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 w-full max-w-xs mb-6">
                                <div className="text-xs text-neutral-400 uppercase font-mono">Final Score</div>
                                <div className="text-3xl font-black text-amber-400 font-mono">{score}</div>
                                {score >= highScore && score > 0 && (
                                    <div className="text-xs text-emerald-400 font-bold mt-1 animate-bounce">🏆 NEW HIGH SCORE!</div>
                                )}
                            </div>

                            <button
                                onClick={resetGame}
                                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                            >
                                Play Again 🔄
                            </button>
                        </div>
                    )}
                </div>

                {/* Fruit Evolution Hierarchy Sidebar / Bottom bar */}
                <div className="flex md:flex-col items-center justify-center gap-1.5 md:gap-2 p-2 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl shrink-0 overflow-x-auto max-w-full custom-scrollbar">
                    <div className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest hidden md:block text-center mb-1">
                        Evolution
                    </div>
                    {FRUIT_TYPES.map((fruit, idx) => (
                        <div key={fruit.id} className="flex md:flex-row items-center gap-1 shrink-0" title={`${fruit.name} (+${fruit.score} pts)`}>
                            <div className="relative group">
                                <FruitSVG tier={idx} size={24} />
                            </div>
                            {idx < FRUIT_TYPES.length - 1 && (
                                <span className="text-[10px] text-neutral-600 select-none">
                                    <span className="hidden md:inline">↓</span>
                                    <span className="md:hidden">→</span>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
