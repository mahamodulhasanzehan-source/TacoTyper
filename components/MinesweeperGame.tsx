import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { isMobileDevice } from '../utils/device';
import { audioService } from '../services/audioService';
import { GameLeaderboardSidebar, MobileLeaderboardButton } from './GameLeaderboardSidebar';
import { useSettings } from '../contexts/SettingsContext';

interface MinesweeperGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

type Difficulty = 'beginner' | 'intermediate' | 'expert';

interface Cell {
    x: number;
    y: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
}

const CONFIG = {
    beginner: { rows: 9, cols: 9, mines: 10, name: 'Beginner' },
    intermediate: { rows: 14, cols: 14, mines: 32, name: 'Intermediate' },
    expert: { rows: 16, cols: 24, mines: 64, name: 'Expert' }
};

const NUMBER_COLORS = [
    '',
    '#38bdf8', // 1: Blue
    '#4ade80', // 2: Green
    '#f87171', // 3: Red
    '#c084fc', // 4: Purple
    '#fb923c', // 5: Orange
    '#22d3ee', // 6: Cyan
    '#f472b6', // 7: Pink
    '#e2e8f0', // 8: Gray-white
];

export default function MinesweeperGame({ user, onBackToHub, username }: MinesweeperGameProps) {
    const { settings } = useSettings();
    const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'won' | 'lost'>('menu');
    const [minesLeft, setMinesLeft] = useState(10);
    const [timer, setTimer] = useState(0);
    const [firstClick, setFirstClick] = useState(true);
    const [touchMode, setTouchMode] = useState<'dig' | 'flag'>('dig');
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
    const [boardMountKey, setBoardMountKey] = useState(0);

    const boardContainerRef = useRef<HTMLDivElement>(null);
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

    const timerRef = useRef<number | null>(null);
    const longPressTimer = useRef<number | null>(null);

    const displayableName = username || user.displayName || 'Player';

    useEffect(() => {
        setIsMobile(isMobileDevice());
        const handleResize = () => setIsMobile(isMobileDevice());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Monitor board container size to auto-resize grid dynamically
    useLayoutEffect(() => {
        const updateDims = () => {
            if (boardContainerRef.current) {
                const rect = boardContainerRef.current.getBoundingClientRect();
                setContainerDimensions({ width: rect.width, height: rect.height });
            }
        };
        updateDims();
        const observer = new ResizeObserver(updateDims);
        if (boardContainerRef.current) {
            observer.observe(boardContainerRef.current);
        }
        window.addEventListener('resize', updateDims);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateDims);
        };
    }, [gameState, difficulty]);

    useEffect(() => {
        if (gameState === 'playing') {
            timerRef.current = window.setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState]);

    const initBoard = (diff: Difficulty) => {
        const { rows, cols, mines } = CONFIG[diff];
        const newGrid: Cell[][] = [];
        for (let r = 0; r < rows; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < cols; c++) {
                row.push({
                    x: c,
                    y: r,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0
                });
            }
            newGrid.push(row);
        }
        setDifficulty(diff);
        setGrid(newGrid);
        setMinesLeft(mines);
        setTimer(0);
        setFirstClick(true);
        setGameState('playing');
        setBoardMountKey(prev => prev + 1);
        incrementGamePlays('minesweeper');
    };

    const placeMines = (clickedR: number, clickedC: number) => {
        const { rows, cols, mines } = CONFIG[difficulty];
        const newGrid = [...grid];
        let placed = 0;
        
        while (placed < mines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            
            if (Math.abs(r - clickedR) <= 1 && Math.abs(c - clickedC) <= 1) continue;
            if (newGrid[r][c].isMine) continue;

            newGrid[r][c].isMine = true;
            placed++;
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!newGrid[r][c].isMine) {
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newGrid[nr][nc].isMine) {
                                count++;
                            }
                        }
                    }
                    newGrid[r][c].neighborMines = count;
                }
            }
        }
        setGrid(newGrid);
        return newGrid;
    };

    const revealCell = (r: number, c: number, currentGrid: Cell[][]) => {
        const { rows, cols } = CONFIG[difficulty];
        if (r < 0 || r >= rows || c < 0 || c >= cols) return;
        if (currentGrid[r][c].isRevealed || currentGrid[r][c].isFlagged) return;

        currentGrid[r][c].isRevealed = true;

        if (currentGrid[r][c].neighborMines === 0 && !currentGrid[r][c].isMine) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    revealCell(r + dr, c + dc, currentGrid);
                }
            }
        }
    };

    const handleDig = (r: number, c: number) => {
        if (gameState !== 'playing' || grid[r][c].isFlagged || grid[r][c].isRevealed) return;

        let currentGrid = [...grid];
        if (firstClick) {
            currentGrid = placeMines(r, c);
            setFirstClick(false);
        }

        if (currentGrid[r][c].isMine) {
            audioService.playSound('wrong_answer');
            if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
            
            currentGrid[r][c].isRevealed = true;
            currentGrid.forEach(row => row.forEach(cell => {
                if (cell.isMine) cell.isRevealed = true;
            }));
            setGrid(currentGrid);
            setGameState('lost');
            return;
        }

        audioService.playSound('tile_click');
        revealCell(r, c, currentGrid);
        setGrid([...currentGrid]);

        let unrevealedSafe = 0;
        currentGrid.forEach(row => row.forEach(cell => {
            if (!cell.isMine && !cell.isRevealed) unrevealedSafe++;
        }));

        if (unrevealedSafe === 0) {
            audioService.playSound('correct_answer');
            setGameState('won');
            saveLeaderboardScore(
                user, displayableName, timer, `${CONFIG[difficulty].name} Master`, 
                { mistakes: 0, timeTaken: timer, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: Math.max(10, 500 - timer), levelReached: 1 }, 
                `minesweeper-${difficulty}`
            );
        }
    };

    const handleFlag = (r: number, c: number) => {
        if (gameState !== 'playing' || grid[r][c].isRevealed) return;

        audioService.playSound('button_click');
        const newGrid = [...grid];
        const newFlagState = !newGrid[r][c].isFlagged;
        newGrid[r][c].isFlagged = newFlagState;
        setGrid(newGrid);
        setMinesLeft(prev => newFlagState ? prev - 1 : prev + 1);
        if (navigator.vibrate) navigator.vibrate(40);
    };

    const handleCellClick = (r: number, c: number) => {
        if (touchMode === 'flag') {
            handleFlag(r, c);
        } else {
            handleDig(r, c);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, r: number, c: number) => {
        e.preventDefault();
        handleFlag(r, c);
    };

    const handleTouchStart = (r: number, c: number) => {
        longPressTimer.current = window.setTimeout(() => {
            handleFlag(r, c);
            longPressTimer.current = null;
        }, 450);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    // Responsive Cell Size Calculation to guarantee 100% fit on any screen without scroll
    const { rows, cols } = CONFIG[difficulty];
    const gridGap = difficulty === 'expert' ? 1.5 : 2;
    const paddingX = 16;
    const paddingY = 16;
    const availW = Math.max(80, (containerDimensions.width || 600) - paddingX);
    const availH = Math.max(80, (containerDimensions.height || 450) - paddingY);

    const cellFromW = Math.floor((availW - (cols - 1) * gridGap) / cols);
    const cellFromH = Math.floor((availH - (rows - 1) * gridGap) / rows);
    const dynamicCellSize = Math.max(16, Math.min(cellFromW, cellFromH, difficulty === 'expert' ? 36 : 46));
    const dynamicFontSize = Math.max(9, Math.floor(dynamicCellSize * 0.54));

    // Animation Duration from Settings Context (Default 0.5s)
    const animSpeed = settings.reducedMotion ? 0 : (settings.animDuration !== undefined ? settings.animDuration : 0.5);

    return (
        <div className="flex flex-row w-full h-screen bg-[#07090e] text-white relative overflow-hidden select-none font-sans">
            <style>{`
                @keyframes msTileFlyIn {
                    0% {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.65);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>

            <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden relative">
                {/* Compact, Uncluttered Top Bar & HUD */}
                <header className="flex items-center justify-between px-2 sm:px-3 py-1.5 bg-neutral-900/95 border-b border-neutral-800 shrink-0 z-20 gap-1 sm:gap-2 h-11 sm:h-12 w-full overflow-hidden">
                    {/* Left: Hub Navigation & Game Title */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0">
                        <button 
                            onClick={() => {
                                audioService.playSound('button_click');
                                onBackToHub();
                            }} 
                            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-bold text-neutral-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                            title="Back to Hub"
                        >
                            <span>⬅️</span>
                            <span className="hidden min-[380px]:inline">Hub</span>
                        </button>
                        <div className="font-black text-xs sm:text-base tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-500 whitespace-nowrap truncate min-w-0">
                            <span className="hidden md:inline">MINESWEEPER</span>
                            <span className="md:hidden">MINES</span>
                        </div>
                    </div>

                    {/* Center: In-game Retro Digital Status HUD */}
                    {gameState !== 'menu' && (
                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            {/* Mine Counter */}
                            <div className="bg-neutral-950 px-2 py-0.5 rounded-lg border border-neutral-800 font-mono text-red-500 font-black text-xs sm:text-sm flex items-center gap-1 shadow-inner">
                                <span className="text-xs">💣</span>
                                <span>{String(Math.max(0, minesLeft)).padStart(3, '0')}</span>
                            </div>

                            {/* Reset Smiley */}
                            <button
                                onClick={() => {
                                    audioService.playSound('button_click');
                                    initBoard(difficulty);
                                }}
                                className="text-lg sm:text-xl p-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-transform active:scale-90 cursor-pointer"
                                title="Reset Board"
                            >
                                {gameState === 'playing' ? '🙂' : gameState === 'won' ? '😎' : '💥'}
                            </button>

                            {/* Timer */}
                            <div className="bg-neutral-950 px-2 py-0.5 rounded-lg border border-neutral-800 font-mono text-amber-400 font-black text-xs sm:text-sm flex items-center gap-1 shadow-inner">
                                <span className="text-xs">⏱️</span>
                                <span>{String(Math.min(999, timer)).padStart(3, '0')}</span>
                            </div>
                        </div>
                    )}

                    {/* Right: Quick Difficulty Switcher, Touch Mode Toggle & Mobile Leaderboard */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {gameState !== 'menu' && (
                            <>
                                {/* Fast Difficulty Switcher */}
                                <div className="hidden md:flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px] font-bold">
                                    {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
                                        <button
                                            key={d}
                                            onClick={() => initBoard(d)}
                                            className={`px-2 py-0.5 rounded uppercase transition-colors ${
                                                difficulty === d 
                                                    ? 'bg-neutral-800 text-amber-400 shadow-sm' 
                                                    : 'text-neutral-400 hover:text-white'
                                            }`}
                                        >
                                            {d.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>

                                {/* Dig / Flag Mode Switcher (Great for touch/mobile) */}
                                <button
                                    onClick={() => {
                                        audioService.playSound('button_click');
                                        setTouchMode(prev => prev === 'dig' ? 'flag' : 'dig');
                                    }}
                                    className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                                        touchMode === 'flag'
                                            ? 'bg-red-600/30 border-red-500 text-red-300'
                                            : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                                    }`}
                                    title="Toggle Dig / Flag Mode"
                                >
                                    <span>{touchMode === 'flag' ? '🚩' : '⛏️'}</span>
                                    <span className="hidden sm:inline">{touchMode === 'flag' ? 'Flag' : 'Dig'}</span>
                                </button>

                                <button 
                                    onClick={() => setGameState('menu')}
                                    className="px-1.5 sm:px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                                >
                                    Menu
                                </button>
                            </>
                        )}
                        {isMobile && (
                            <MobileLeaderboardButton onClick={() => setShowMobileLeaderboard(true)} />
                        )}
                    </div>
                </header>

                {/* Main Content Area: Fits 100% of Viewport Without Scrollbars */}
                <div 
                    ref={boardContainerRef} 
                    className="flex-1 w-full min-h-0 flex items-center justify-center p-2 overflow-hidden relative"
                >
                    {gameState === 'menu' ? (
                        <div className="bg-neutral-900/90 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-fade-in flex flex-col items-center z-10">
                            <div className="text-4xl mb-3 animate-bounce">💣</div>
                            <h2 className="text-xl font-black mb-1 text-red-400">Minefield Sector</h2>
                            <p className="text-neutral-400 text-xs mb-5">Uncover safe zones without detonating hidden explosives.</p>

                            <div className="flex flex-col gap-2.5 w-full mb-4">
                                {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => {
                                            audioService.playSound('button_click');
                                            initBoard(d);
                                        }}
                                        className="group p-3 bg-neutral-950 border border-neutral-800 hover:border-red-500 rounded-xl transition-all text-left flex justify-between items-center active:scale-98"
                                    >
                                        <div>
                                            <div className="font-black text-white text-sm group-hover:text-red-400 transition-colors">
                                                {CONFIG[d].name}
                                            </div>
                                            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                                                {CONFIG[d].rows}x{CONFIG[d].cols} Grid • {CONFIG[d].mines} Mines
                                            </div>
                                        </div>
                                        <span className="text-base group-hover:translate-x-1 transition-transform">➡️</span>
                                    </button>
                                ))}
                            </div>

                            <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                                <span>💡 Tip: Tap/Click to dig, right-click or toggle to flag.</span>
                            </div>
                        </div>
                    ) : (
                        /* Auto-Resizing Grid Container that Guarantees Zero Scrollbars */
                        <div 
                            key={`board-${boardMountKey}`}
                            className="inline-grid bg-neutral-950 p-1.5 sm:p-2 rounded-2xl border border-neutral-800 shadow-2xl"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, ${dynamicCellSize}px)`,
                                gap: `${gridGap}px`
                            }}
                        >
                            {grid.map((row, rIdx) => 
                                row.map((cell, cIdx) => {
                                    const cellClass = cell.isRevealed
                                        ? cell.isMine
                                            ? 'bg-red-700/80 border-red-500'
                                            : 'bg-neutral-900 border-neutral-800/80'
                                        : 'bg-neutral-800 hover:bg-neutral-750 active:bg-neutral-700 border-neutral-700 shadow-sm';

                                    // Tile Fly-In Animation duration controlled by Settings animDuration
                                    const stagger = Math.min(0.25, (rIdx + cIdx) * 0.005 * (animSpeed / 0.5));
                                    const animStyle = animSpeed > 0 ? {
                                        animation: `msTileFlyIn ${animSpeed}s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${stagger}s both`
                                    } : undefined;

                                    return (
                                        <button
                                            key={`${rIdx}-${cIdx}`}
                                            onClick={() => handleCellClick(rIdx, cIdx)}
                                            onContextMenu={(e) => handleContextMenu(e, rIdx, cIdx)}
                                            onTouchStart={() => handleTouchStart(rIdx, cIdx)}
                                            onTouchEnd={handleTouchEnd}
                                            style={{
                                                width: `${dynamicCellSize}px`,
                                                height: `${dynamicCellSize}px`,
                                                fontSize: `${dynamicFontSize}px`,
                                                ...animStyle
                                            }}
                                            className={`shrink-0 rounded-md border flex items-center justify-center font-black transition-all ${cellClass}`}
                                            disabled={gameState !== 'playing' && !cell.isRevealed}
                                        >
                                            {cell.isRevealed ? (
                                                cell.isMine ? (
                                                    '💣'
                                                ) : cell.neighborMines > 0 ? (
                                                    <span style={{ color: NUMBER_COLORS[cell.neighborMines] }}>
                                                        {cell.neighborMines}
                                                    </span>
                                                ) : null
                                            ) : cell.isFlagged ? (
                                                <span className="scale-90">🚩</span>
                                            ) : null}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Victory / Defeat Modal */}
                {(gameState === 'won' || gameState === 'lost') && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className={`bg-neutral-900 border-2 ${gameState === 'won' ? 'border-green-500' : 'border-red-500'} rounded-2xl p-6 max-w-xs w-full flex flex-col items-center text-center shadow-2xl`}>
                            <div className="text-4xl mb-2">{gameState === 'won' ? '😎' : '💥'}</div>
                            <h3 className={`text-xl font-black mb-1 ${gameState === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                                {gameState === 'won' ? 'SECTOR CLEARED!' : 'DETONATION!'}
                            </h3>
                            <p className="text-neutral-400 text-xs mb-5">
                                {gameState === 'won' 
                                    ? `All safe tiles uncovered in ${timer} seconds.` 
                                    : 'A hidden mine was triggered. Better luck on the next sweep!'}
                            </p>
                            <div className="flex gap-2.5 w-full">
                                <button
                                    onClick={() => setGameState('menu')}
                                    className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs transition-colors"
                                >
                                    Menu
                                </button>
                                <button
                                    onClick={() => initBoard(difficulty)}
                                    className={`flex-1 py-2.5 ${gameState === 'won' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} text-white font-black rounded-xl text-xs transition-transform active:scale-95 shadow-lg`}
                                >
                                    Play Again
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <GameLeaderboardSidebar
                mode={`minesweeper-${difficulty}`}
                allowedModes={['minesweeper-beginner', 'minesweeper-intermediate', 'minesweeper-expert']}
                tabLabels={{
                    'minesweeper-beginner': 'BEG',
                    'minesweeper-intermediate': 'INT',
                    'minesweeper-expert': 'EXP'
                }}
                title="Top Defusers"
                scoreLabel="TIME"
                storageKey="minesweeper_leaderboard_collapsed"
                isMobile={isMobile}
                showMobileLeaderboard={showMobileLeaderboard}
                onCloseMobileLeaderboard={() => setShowMobileLeaderboard(false)}
            />
        </div>
    );
}
