
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { LeaderboardWidget, SettingsModal, FriendsModal, Button } from './Overlays';
import ChatWidget from './ChatWidget';
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
    const [boardId, setBoardId] = useState(0); // Used to force re-render animations
    
    const [showSettings, setShowSettings] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

    const timerRef = useRef<number | null>(null);
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
        setGrid(newGrid);
        setMinesLeft(mines);
        setTimer(0);
        setFirstClick(true);
        setGameState('playing');
        setBoardId(prev => prev + 1); // Force new animation cycle
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
            audioService.playSound('mine_explode');
            currentGrid[r][c].isRevealed = true;
            // Reveal all mines
            currentGrid.forEach(row => row.forEach(cell => {
                if (cell.isMine) cell.isRevealed = true;
            }));
            setGrid(currentGrid);
            setGameState('lost');
            return;
        }

        audioService.playSound('mine_click');
        revealCell(r, c, currentGrid);
        setGrid([...currentGrid]);

        // Check Win
        let unrevealedSafe = 0;
        currentGrid.forEach(row => row.forEach(cell => {
            if (!cell.isMine && !cell.isRevealed) unrevealedSafe++;
        }));

        if (unrevealedSafe === 0) {
            audioService.playSound('mine_win');
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
        audioService.playSound('mine_flag');
    };

    const handleWin = async () => {
        if (!user || !displayableName) return;
        
        await saveLeaderboardScore(
            user, 
            displayableName, 
            timer, 
            "Expert Defuser", 
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

    const cellSize = isMobile ? '24px' : '30px';

    // --- Render ---
    return (
        <div className="flex h-full w-full bg-[#000] text-white overflow-hidden relative font-['Inter',_sans-serif]">
            {/* Desktop Sidebar */}
            {!isMobile && (
                <div className="flex flex-col absolute top-0 right-0 h-full w-[300px] z-[50] border-l border-[#333] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <LeaderboardWidget className="h-[66%] border-b-0" allowedModes={['minesweeper-beginner', 'minesweeper-intermediate', 'minesweeper-expert']} defaultMode={`minesweeper-${difficulty}`} />
                    <ChatWidget user={user} className="h-[34%]" />
                </div>
            )}
            
            {/* Mobile Header Icons */}
             {isMobile && (
                <>
                    <div className="absolute top-4 right-4 z-[60]">
                        <button onClick={() => setShowMobileLeaderboard(true)} className="text-2xl hover:scale-110 transition-transform bg-[#111] p-2 rounded-full border border-[#f4b400]">🏆</button>
                    </div>
                    {showMobileLeaderboard && (
                        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-[#f4b400] text-xl font-bold">Defuser Ranks</h2>
                                <button onClick={() => setShowMobileLeaderboard(false)} className="text-red-500 text-2xl font-bold p-2">✕</button>
                            </div>
                            <LeaderboardWidget className="flex-1 border-none shadow-none p-0" allowedModes={['minesweeper-beginner', 'minesweeper-intermediate', 'minesweeper-expert']} defaultMode={`minesweeper-${difficulty}`} />
                        </div>
                    )}
                </>
            )}
            
            {/* Back Button */}
            <div className="absolute top-4 left-4 flex gap-4 z-[60]">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform" title="Back to Hub">🏠</button>
                <button onClick={() => setShowSettings(true)} className="text-2xl hover:rotate-90 transition-transform" title="Settings">⚙️</button>
            </div>

            {/* Modals */}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} username={displayableName} onUpdateUsername={onUpdateUsername} onLogout={onLogout} />}
            
            {/* Main Area */}
            <div className={`flex-1 flex flex-col items-center justify-center p-4 relative z-10 ${isMobile ? '' : 'md:mr-[300px]'}`}>
                
                {gameState === 'menu' ? (
                     <RandomReveal className="bg-[#111] border-4 border-white p-8 max-w-lg w-full text-center shadow-2xl">
                        <h1 className="text-3xl md:text-4xl text-green-500 mb-8 font-['Press_Start_2P']"><RandomText text="MINESWEEPER" /></h1>
                        <div className="flex flex-col gap-4">
                            {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
                                <button 
                                    key={d}
                                    onClick={() => { setDifficulty(d); initBoard(d); }}
                                    className="group relative bg-[#222] border-2 border-[#555] p-4 text-white uppercase font-bold tracking-widest hover:border-green-500 hover:bg-[#2a2a2a] transition-all overflow-hidden"
                                >
                                    <span className="relative z-10">{CONFIG[d].name}</span>
                                    <div className="absolute inset-0 bg-green-500/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                                </button>
                            ))}
                        </div>
                     </RandomReveal>
                ) : (
                    <div className="flex flex-col items-center animate-fade-in w-full h-full justify-center">
                        {/* Status Bar */}
                        <div className="bg-[#1a1a1a] border-2 border-[#444] p-3 mb-4 flex justify-between items-center w-auto gap-8 rounded-lg shadow-lg font-mono">
                             <div className="text-red-500 text-2xl font-bold bg-black px-2 py-1 rounded border border-[#333]">
                                {String(minesLeft).padStart(3, '0')}
                             </div>
                             <button 
                                onClick={() => setGameState('menu')} 
                                className="text-3xl hover:scale-125 transition-transform"
                                title="Reset"
                             >
                                 {gameState === 'playing' ? '🙂' : gameState === 'won' ? '😎' : '😵'}
                             </button>
                             <div className="text-green-500 text-2xl font-bold bg-black px-2 py-1 rounded border border-[#333]">
                                {String(timer).padStart(3, '0')}
                             </div>
                        </div>

                        {/* Grid Container */}
                        <div className="bg-[#222] p-3 border-4 border-[#555] shadow-2xl rounded-sm max-w-full overflow-auto custom-scrollbar">
                            <div 
                                style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: `repeat(${CONFIG[difficulty].cols}, ${cellSize})`,
                                    gridTemplateRows: `repeat(${CONFIG[difficulty].rows}, ${cellSize})`,
                                    gap: '1px',
                                    backgroundColor: '#444'
                                }}
                            >
                                {grid.map((row, rIdx) => (
                                    row.map((cell, cIdx) => {
                                        const isRevealed = cell.isRevealed;
                                        const isFlagged = cell.isFlagged;
                                        const isMine = cell.isMine;
                                        const neighbor = cell.neighborMines;
                                        
                                        // Key with boardId forces re-mount and thus re-animation
                                        const key = `${boardId}-${cell.x}-${cell.y}`;
                                        
                                        // Base style for unrevealed
                                        let bgClass = 'bg-[#c0c0c0] hover:bg-[#d0d0d0]';
                                        let borderClass = 'border-t-[3px] border-l-[3px] border-white border-b-[3px] border-r-[3px] border-[#777]';
                                        let content: React.ReactNode = null;

                                        if (isRevealed) {
                                            bgClass = 'bg-[#bdbdbd]'; // Flat darker grey for revealed
                                            borderClass = 'border border-[#999]';
                                            
                                            if (isMine) {
                                                bgClass = 'bg-red-600';
                                                content = '💣';
                                            } else if (neighbor > 0) {
                                                const colors = ['#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];
                                                content = <span style={{ color: colors[neighbor-1] }} className="font-bold font-mono">{neighbor}</span>;
                                            }
                                        } else if (isFlagged) {
                                            content = '🚩';
                                        }

                                        return (
                                            <RandomReveal 
                                                key={key}
                                                distance={300} // High distance for chaotic entrance
                                                delay={Math.random() * 0.5} // Random delay for "rain" effect
                                                duration={0.6}
                                                className={`
                                                    flex items-center justify-center cursor-pointer select-none
                                                    ${bgClass} ${borderClass}
                                                    text-xs md:text-sm
                                                `}
                                                style={{ width: '100%', height: '100%' }} // Ensure fill
                                                onMouseDown={(e: React.MouseEvent) => {
                                                    // Handle right click via mousedown for responsiveness
                                                    if (e.button === 2) handleRightClick(e, rIdx, cIdx);
                                                    else if (e.button === 0) handleCellClick(rIdx, cIdx);
                                                }}
                                                onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
                                            >
                                                {content}
                                            </RandomReveal>
                                        );
                                    })
                                ))}
                            </div>
                        </div>
                        
                        {gameState !== 'playing' && (
                             <RandomReveal className="mt-6 text-center">
                                 <h2 className={`text-2xl mb-4 font-bold ${gameState === 'won' ? 'text-green-500' : 'text-red-500'}`}>
                                     <RandomText text={gameState === 'won' ? 'MISSION ACCOMPLISHED' : 'DETONATION DETECTED'} />
                                 </h2>
                                 <Button onClick={() => initBoard(difficulty)}>Try Again</Button>
                             </RandomReveal>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default MinesweeperGame;
