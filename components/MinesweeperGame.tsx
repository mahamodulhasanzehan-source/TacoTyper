
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { LeaderboardWidget, SettingsModal, FriendsModal, Button } from './Overlays';
import ChatWidget from './ChatWidget';
import { isMobileDevice } from '../utils/device';
import { COLORS } from '../constants';

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
    intermediate: { rows: 16, cols: 16, mines: 40, name: 'Intermediate' },
    expert: { rows: 16, cols: 30, mines: 99, name: 'Expert' }
};

const MinesweeperGame: React.FC<MinesweeperGameProps> = ({ user, onBackToHub, username, onUpdateUsername, onLogout }) => {
    const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'won' | 'lost'>('menu');
    const [minesLeft, setMinesLeft] = useState(0);
    const [timer, setTimer] = useState(0);
    const [firstClick, setFirstClick] = useState(true);
    
    const [showSettings, setShowSettings] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

    const timerRef = useRef<number | null>(null);
    const displayableName = username || user.displayName || 'Chef';

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
            
            // Don't place mine on first click or neighbors
            if (Math.abs(r - clickedR) <= 1 && Math.abs(c - clickedC) <= 1) continue;
            if (newGrid[r][c].isMine) continue;

            newGrid[r][c].isMine = true;
            placed++;
        }

        // Calculate numbers
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
        if (r < 0 || r >= CONFIG[difficulty].rows || c < 0 || c >= CONFIG[difficulty].cols) return;
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

    const handleCellClick = (r: number, c: number) => {
        if (gameState !== 'playing' || grid[r][c].isFlagged) return;

        let currentGrid = [...grid];
        if (firstClick) {
            currentGrid = placeMines(r, c);
            setFirstClick(false);
        }

        if (currentGrid[r][c].isMine) {
            // BOOM
            currentGrid[r][c].isRevealed = true;
            // Reveal all mines
            currentGrid.forEach(row => row.forEach(cell => {
                if (cell.isMine) cell.isRevealed = true;
            }));
            setGrid(currentGrid);
            setGameState('lost');
            return;
        }

        revealCell(r, c, currentGrid);
        setGrid([...currentGrid]); // Trigger update

        // Check Win
        let unrevealedSafe = 0;
        currentGrid.forEach(row => row.forEach(cell => {
            if (!cell.isMine && !cell.isRevealed) unrevealedSafe++;
        }));

        if (unrevealedSafe === 0) {
            setGameState('won');
            handleWin();
        }
    };

    const handleRightClick = (e: React.MouseEvent, r: number, c: number) => {
        e.preventDefault();
        if (gameState !== 'playing' || grid[r][c].isRevealed) return;

        const newGrid = [...grid];
        newGrid[r][c].isFlagged = !newGrid[r][c].isFlagged;
        setGrid(newGrid);
        setMinesLeft(prev => newGrid[r][c].isFlagged ? prev - 1 : prev + 1);
    };

    const handleWin = async () => {
        if (!user || !displayableName) return;
        
        await saveLeaderboardScore(
            user, 
            displayableName, 
            timer, 
            "Minesweeper Pro", 
            {
                mistakes: 0,
                timeTaken: timer,
                ingredientsMissed: 0,
                rottenWordsTyped: 0,
                totalScore: 0,
                levelReached: 1
            }, 
            `minesweeper-${difficulty}`
        );
    };

    // --- Render ---
    return (
        <div className="flex h-full w-full bg-[#000] text-white overflow-hidden relative font-['Press_Start_2P']">
            {/* Nav & Overlays similar to other games */}
            {!isMobile && (
                <div className="flex flex-col absolute top-0 right-0 h-full w-[300px] z-[50] border-l border-[#333] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <LeaderboardWidget className="h-[66%] border-b-0" allowedModes={['minesweeper-beginner', 'minesweeper-intermediate', 'minesweeper-expert']} defaultMode={`minesweeper-${difficulty}`} />
                    <ChatWidget user={user} className="h-[34%]" />
                </div>
            )}
             {isMobile && (
                <>
                    <div className="absolute top-4 right-4 z-[60]">
                        <button onClick={() => setShowMobileLeaderboard(true)} className="text-2xl hover:scale-110 transition-transform bg-[#111] p-2 rounded-full border border-[#f4b400]">🏆</button>
                    </div>
                    {showMobileLeaderboard && (
                        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-[#f4b400] text-xl font-bold">Sweeper Ranks</h2>
                                <button onClick={() => setShowMobileLeaderboard(false)} className="text-red-500 text-2xl font-bold p-2">✕</button>
                            </div>
                            <LeaderboardWidget className="flex-1 border-none shadow-none p-0" allowedModes={['minesweeper-beginner', 'minesweeper-intermediate', 'minesweeper-expert']} defaultMode={`minesweeper-${difficulty}`} />
                        </div>
                    )}
                </>
            )}
            <div className="absolute top-4 left-4 flex gap-4 z-[60]">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform" title="Back to Hub">🏠</button>
                <button onClick={() => setShowSettings(true)} className="text-2xl hover:rotate-90 transition-transform" title="Settings">⚙️</button>
            </div>

            {/* Modals */}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} username={displayableName} onUpdateUsername={onUpdateUsername} onLogout={onLogout} />}
            
            {/* Main Area */}
            <div className={`flex-1 flex flex-col items-center justify-center p-4 relative z-10 ${isMobile ? '' : 'md:mr-[300px]'}`}>
                
                {gameState === 'menu' ? (
                     <RandomReveal className="bg-[#111] border-4 border-white p-8 max-w-lg w-full text-center">
                        <h1 className="text-3xl text-green-500 mb-8"><RandomText text="MINESWEEPER" /></h1>
                        <div className="flex flex-col gap-4">
                            {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
                                <button 
                                    key={d}
                                    onClick={() => { setDifficulty(d); initBoard(d); }}
                                    className="bg-[#222] border border-[#555] p-4 hover:bg-[#333] hover:border-green-500 text-sm uppercase transition-all duration-300 hover:scale-105"
                                >
                                    {CONFIG[d].name}
                                </button>
                            ))}
                        </div>
                     </RandomReveal>
                ) : (
                    <div className="flex flex-col items-center animate-fade-in w-full h-full justify-center">
                        {/* Status Bar */}
                        <div className="bg-[#222] border-4 border-[#555] p-2 mb-4 flex justify-between w-full max-w-2xl text-xl font-mono">
                             <div className="text-red-500">{String(minesLeft).padStart(3, '0')}</div>
                             <button onClick={() => setGameState('menu')} className="text-2xl hover:scale-125 transition-transform">
                                 {gameState === 'playing' ? '🙂' : gameState === 'won' ? '😎' : '😵'}
                             </button>
                             <div className="text-red-500">{String(timer).padStart(3, '0')}</div>
                        </div>

                        {/* Grid */}
                        <div 
                            className="bg-[#111] border-4 border-[#fff] overflow-auto max-w-full max-h-[70vh] custom-scrollbar shadow-2xl"
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            <div 
                                style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: `repeat(${CONFIG[difficulty].cols}, 24px)`,
                                    gap: '1px',
                                    backgroundColor: '#333'
                                }}
                            >
                                {grid.flat().map((cell, i) => {
                                    const isRevealed = cell.isRevealed;
                                    const isFlagged = cell.isFlagged;
                                    const isMine = cell.isMine;
                                    
                                    let content = '';
                                    let style = 'bg-[#ccc] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-[#888]';
                                    
                                    if (isRevealed) {
                                        style = 'bg-[#222] border border-[#111]';
                                        if (isMine) {
                                            content = '💣';
                                            style = 'bg-red-600 border border-red-800 flex items-center justify-center';
                                        } else if (cell.neighborMines > 0) {
                                            content = String(cell.neighborMines);
                                            const colors = ['blue', 'green', 'red', 'purple', 'maroon', 'turquoise', 'black', 'gray'];
                                            style += ` text-[${colors[cell.neighborMines-1]}] font-bold flex items-center justify-center text-sm font-sans`;
                                        }
                                    } else if (isFlagged) {
                                        content = '🚩';
                                        style += ' flex items-center justify-center text-sm';
                                    }

                                    return (
                                        <div
                                            key={`${cell.x}-${cell.y}`}
                                            onClick={() => handleCellClick(cell.y, cell.x)}
                                            onContextMenu={(e) => handleRightClick(e, cell.y, cell.x)}
                                            className={`w-6 h-6 cursor-pointer select-none transition-colors duration-100 ${style}`}
                                        >
                                            <span className={isRevealed || isFlagged ? 'animate-pop-in block' : ''}>{content}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {gameState !== 'playing' && (
                             <RandomReveal className="mt-6 text-center">
                                 <h2 className={`text-2xl mb-4 ${gameState === 'won' ? 'text-green-500' : 'text-red-500'}`}>
                                     <RandomText text={gameState === 'won' ? 'CLEARED!' : 'GAME OVER'} />
                                 </h2>
                                 <Button onClick={() => initBoard(difficulty)}>Play Again</Button>
                             </RandomReveal>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default MinesweeperGame;
