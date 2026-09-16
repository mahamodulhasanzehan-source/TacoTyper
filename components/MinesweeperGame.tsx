import React, { useState, useEffect, useRef } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { isMobileDevice } from '../utils/device';
import { audioService } from '../services/audioService';

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
    '#3b82f6', // 1: Blue
    '#22c55e', // 2: Green
    '#ef4444', // 3: Red
    '#8b5cf6', // 4: Purple
    '#f97316', // 5: Orange
    '#06b6d4', // 6: Cyan
    '#ec4899', // 7: Pink
    '#e2e8f0', // 8: Gray-white
];

export default function MinesweeperGame({ user, onBackToHub, username }: MinesweeperGameProps) {
    const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'won' | 'lost'>('menu');
    const [minesLeft, setMinesLeft] = useState(10);
    const [timer, setTimer] = useState(0);
    const [firstClick, setFirstClick] = useState(true);
    const [touchMode, setTouchMode] = useState<'dig' | 'flag'>('dig');
    const [isMobile, setIsMobile] = useState(false);

    const timerRef = useRef<number | null>(null);
    const longPressTimer = useRef<number | null>(null);

    const displayableName = username || user.displayName || 'Player';

    useEffect(() => {
        setIsMobile(isMobileDevice());
    }, []);

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

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#050508] text-white relative overflow-y-auto custom-scrollbar p-3 select-none font-sans">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, #ef4444 2px, transparent 2px)', backgroundSize: '70px 70px' }}></div>

            {/* Top Bar */}
            <div className="flex justify-between items-center w-full max-w-xl mb-3 z-10">
                <button 
                    onClick={() => {
                        audioService.playSound('button_click');
                        onBackToHub();
                    }} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded-full text-sm font-bold transition-transform hover:scale-105"
                    title="Back to Hub"
                >
                    <span>⬅️</span>
                    <span className="hidden sm:inline">Hub</span>
                </button>

                <div className="flex flex-col items-center">
                    <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-500 tracking-wide">
                        MINESWEEPER
                    </h1>
                </div>

                <div className="w-16 flex justify-end">
                    {gameState !== 'menu' && (
                        <button
                            onClick={() => setGameState('menu')}
                            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-full text-xs font-bold text-neutral-300"
                        >
                            Menu
                        </button>
                    )}
                </div>
            </div>

            {/* Menu or Game */}
            {gameState === 'menu' ? (
                <div className="bg-neutral-900/90 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl animate-fade-in flex flex-col items-center z-10">
                    <div className="text-5xl mb-4 animate-bounce">💣</div>
                    <h2 className="text-2xl font-black mb-1 text-red-400">Minefield Sector</h2>
                    <p className="text-neutral-400 text-xs mb-6">Uncover safe zones without detonating hidden explosives.</p>

                    <div className="flex flex-col gap-3 w-full mb-6">
                        {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
                            <button
                                key={d}
                                onClick={() => {
                                    audioService.playSound('button_click');
                                    initBoard(d);
                                }}
                                className="group p-4 bg-neutral-950 border border-neutral-800 hover:border-red-500 rounded-xl transition-all text-left flex justify-between items-center active:scale-98"
                            >
                                <div>
                                    <div className="font-black text-white text-base group-hover:text-red-400 transition-colors">
                                        {CONFIG[d].name}
                                    </div>
                                    <div className="text-xs text-neutral-500 font-mono mt-0.5">
                                        {CONFIG[d].rows}x{CONFIG[d].cols} Grid • {CONFIG[d].mines} Mines
                                    </div>
                                </div>
                                <span className="text-xl group-hover:translate-x-1 transition-transform">➡️</span>
                            </button>
                        ))}
                    </div>

                    <div className="text-xs text-neutral-500 flex items-center gap-2">
                        <span>💡 Tip: Tap to dig, long-press to flag.</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center w-full max-w-2xl z-10 animate-fade-in">
                    {/* Header Controls */}
                    <div className="bg-neutral-900/95 border border-neutral-800 rounded-2xl px-5 py-3 mb-3 flex justify-between items-center w-full shadow-lg">
                        {/* Mine Counter */}
                        <div className="bg-neutral-950 px-3 py-1 rounded-lg border border-neutral-800 font-mono text-red-500 font-black text-lg flex items-center gap-1.5">
                            <span>💣</span>
                            <span>{String(Math.max(0, minesLeft)).padStart(3, '0')}</span>
                        </div>

                        {/* Reset Smiley */}
                        <button
                            onClick={() => {
                                audioService.playSound('button_click');
                                initBoard(difficulty);
                            }}
                            className="text-2xl p-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl transition-transform active:scale-90"
                            title="Reset Board"
                        >
                            {gameState === 'playing' ? '🙂' : gameState === 'won' ? '😎' : '💥'}
                        </button>

                        {/* Timer */}
                        <div className="bg-neutral-950 px-3 py-1 rounded-lg border border-neutral-800 font-mono text-amber-400 font-black text-lg flex items-center gap-1.5">
                            <span>⏱️</span>
                            <span>{String(Math.min(999, timer)).padStart(3, '0')}</span>
                        </div>
                    </div>

                    {/* Mode Switcher for Mobile Touch */}
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => {
                                audioService.playSound('button_click');
                                setTouchMode('dig');
                            }}
                            className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                touchMode === 'dig' ? 'bg-blue-600 text-white shadow-lg' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                            }`}
                        >
                            <span>⛏️</span>
                            <span>Dig Mode</span>
                        </button>
                        <button
                            onClick={() => {
                                audioService.playSound('button_click');
                                setTouchMode('flag');
                            }}
                            className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                touchMode === 'flag' ? 'bg-red-600 text-white shadow-lg' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                            }`}
                        >
                            <span>🚩</span>
                            <span>Flag Mode</span>
                        </button>
                    </div>

                    {/* Minefield Grid Container */}
                    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-2.5 shadow-2xl overflow-auto max-w-full max-h-[62vh] custom-scrollbar">
                        <div 
                            className="grid gap-1"
                            style={{
                                gridTemplateColumns: `repeat(${CONFIG[difficulty].cols}, minmax(0, 1fr))`
                            }}
                        >
                            {grid.map((row, rIdx) => 
                                row.map((cell, cIdx) => {
                                    const cellClass = cell.isRevealed
                                        ? cell.isMine
                                            ? 'bg-red-700/80 border-red-500'
                                            : 'bg-neutral-950/90 border-neutral-800/80'
                                        : 'bg-neutral-800 hover:bg-neutral-750 active:bg-neutral-700 border-neutral-700 shadow-sm';

                                    const cellSize = difficulty === 'expert' ? 'w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm' : difficulty === 'intermediate' ? 'w-8 h-8 sm:w-9 sm:h-9 text-sm sm:text-base' : 'w-9 h-9 sm:w-11 sm:h-11 text-base sm:text-lg';

                                    return (
                                        <button
                                            key={`${rIdx}-${cIdx}`}
                                            onClick={() => handleCellClick(rIdx, cIdx)}
                                            onContextMenu={(e) => handleContextMenu(e, rIdx, cIdx)}
                                            onTouchStart={() => handleTouchStart(rIdx, cIdx)}
                                            onTouchEnd={handleTouchEnd}
                                            className={`${cellSize} rounded-lg border flex items-center justify-center font-black transition-all ${cellClass}`}
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
                                                <span className="animate-bounce">🚩</span>
                                            ) : null}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Victory / Defeat Modal */}
                    {(gameState === 'won' || gameState === 'lost') && (
                        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-fade-in">
                            <div className={`bg-neutral-900 border-2 ${gameState === 'won' ? 'border-green-500' : 'border-red-500'} rounded-2xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center shadow-2xl`}>
                                <div className="text-5xl mb-3">{gameState === 'won' ? '😎' : '💥'}</div>
                                <h3 className={`text-2xl font-black mb-2 ${gameState === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                                    {gameState === 'won' ? 'SECTOR CLEARED!' : 'DETONATION!'}
                                </h3>
                                <p className="text-neutral-400 text-xs mb-6">
                                    {gameState === 'won' 
                                        ? `All safe tiles uncovered in ${timer} seconds.` 
                                        : 'A hidden mine was triggered. Better luck on the next sweep!'}
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setGameState('menu')}
                                        className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-sm transition-colors"
                                    >
                                        Menu
                                    </button>
                                    <button
                                        onClick={() => initBoard(difficulty)}
                                        className={`flex-1 py-3 ${gameState === 'won' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} text-white font-black rounded-xl text-sm transition-transform active:scale-95 shadow-lg`}
                                    >
                                        Play Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
