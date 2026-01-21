
import React, { useState, useEffect, useRef } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { LeaderboardWidget, SettingsModal, Button } from './Overlays';
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
    const [boardId, setBoardId] = useState(0);
    
    // New State for Mobile Selection
    const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
    
    const [showSettings, setShowSettings] = useState(false);
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
        setBoardId(prev => prev + 1);
        setSelectedCell(null);
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
            for (let c = 0; r < rows && c < cols; c++) {
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

    const handleCellInteraction = (r: number, c: number) => {
        if (gameState !== 'playing') return;
        
        if (isMobile) {
            // Mobile: Select cell for popup if not revealed
            if (!grid[r][c].isRevealed) {
                setSelectedCell({r, c});
                audioService.playSound('type'); // Feedback click
            }
        } else {
            // Desktop: Dig directly
            handleCellClick(r, c);
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
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
            
            currentGrid[r][c].isRevealed = true;
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

    const handleRightClick = (e: React.MouseEvent | null, r: number, c: number) => {
        if (e) e.preventDefault();
        if (gameState !== 'playing' || grid[r][c].isRevealed) return;

        const newGrid = [...grid];
        newGrid[r][c].isFlagged = !newGrid[r][c].isFlagged;
        setGrid(newGrid);
        setMinesLeft(prev => newGrid[r][c].isFlagged ? prev - 1 : prev + 1);
        audioService.playSound('mine_flag');
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const handleWin = async () => {
        if (!user || !displayableName) return;
        await saveLeaderboardScore(
            user, displayableName, timer, "Expert Defuser", 
            { mistakes: 0, timeTaken: timer, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: 0, levelReached: 1 }, 
            `minesweeper-${difficulty}`
        );
    };

    const handleMobileAction = (action: 'dig' | 'flag') => {
        if (!selectedCell) return;
        
        if (action === 'dig') {
            handleCellClick(selectedCell.r, selectedCell.c);
        } else {
            handleRightClick(null, selectedCell.r, selectedCell.c);
        }
        setSelectedCell(null);
    };

    const cellSize = isMobile ? '32px' : '30px';

    return (
        <div className="flex h-full w-full bg-[#000] text-white overflow-hidden relative font-['Inter',_sans-serif]">
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
                                <h2 className="text-[#f4b400] text-xl font-bold">Defuser Ranks</h2>
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

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} username={displayableName} onUpdateUsername={onUpdateUsername} onLogout={onLogout} />}
            
            <div className={`flex-1 flex flex-col items-center justify-center p-2 md:p-4 relative z-10 ${isMobile ? '' : 'md:mr-[300px]'}`}>
                
                {gameState === 'menu' ? (
                     <RandomReveal className="bg-[#111] border-4 border-white p-4 md:p-8 max-w-lg w-full text-center shadow-2xl">
                        <h1 className="text-2xl md:text-4xl text-green-500 mb-8 font-['Press_Start_2P']"><RandomText text="MINESWEEPER" /></h1>
                        <div className="flex flex-col gap-4">
                            {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
                                <button 
                                    key={d}
                                    onClick={() => { setDifficulty(d); initBoard(d); }}
                                    className="group relative bg-[#222] border-2 border-[#555] p-4 text-white uppercase font-bold tracking-widest hover:border-green-500 hover:bg-[#2a2a2a] transition-all overflow-hidden active:scale-95"
                                >
                                    <span className="relative z-10 text-sm md:text-base">{CONFIG[d].name}</span>
                                    <div className="absolute inset-0 bg-green-500/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                                </button>
                            ))}
                        </div>
                        {isMobile && <p className="text-[#666] text-xs mt-6">Tap a tile to Dig or Flag 🚩</p>}
                     </RandomReveal>
                ) : (
                    <div className="flex flex-col items-center animate-fade-in w-full h-full justify-start md:justify-center pt-16 md:pt-0">
                        <div className="bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-[#808080] p-2 mb-4 flex justify-between items-center w-full max-w-[95vw] md:w-auto gap-4 md:gap-8 shadow-lg font-mono box-border">
                             <div className="text-red-600 text-2xl font-bold bg-black px-2 border-t-2 border-l-2 border-[#808080] border-b-2 border-r-2 border-white">
                                {String(minesLeft).padStart(3, '0')}
                             </div>
                             <button 
                                onClick={() => setGameState('menu')} 
                                className="text-2xl active:translate-y-px border-2 border-[#c0c0c0] hover:bg-[#dcdcdc] rounded-sm"
                                title="Reset"
                             >
                                 {gameState === 'playing' ? '🙂' : gameState === 'won' ? '😎' : '😵'}
                             </button>
                             <div className="text-red-600 text-2xl font-bold bg-black px-2 border-t-2 border-l-2 border-[#808080] border-b-2 border-r-2 border-white">
                                {String(timer).padStart(3, '0')}
                             </div>
                        </div>

                        <div className="p-1 bg-[#c0c0c0] border-t-[3px] border-l-[3px] border-white border-b-[3px] border-r-[3px] border-[#808080] shadow-2xl max-w-[98vw] max-h-[70vh] overflow-auto custom-scrollbar">
                            <div 
                                style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: `repeat(${CONFIG[difficulty].cols}, ${cellSize})`,
                                    gridTemplateRows: `repeat(${CONFIG[difficulty].rows}, ${cellSize})`,
                                    gap: '0px',
                                }}
                            >
                                {grid.map((row, rIdx) => (
                                    row.map((cell, cIdx) => {
                                        const isRevealed = cell.isRevealed;
                                        const isFlagged = cell.isFlagged;
                                        const isMine = cell.isMine;
                                        const neighbor = cell.neighborMines;
                                        const key = `${boardId}-${cell.x}-${cell.y}`;
                                        
                                        const isSelected = selectedCell?.r === rIdx && selectedCell?.c === cIdx;

                                        let content: React.ReactNode = null;
                                        let className = "mine-cell"; 

                                        if (isRevealed) {
                                            className += " revealed";
                                            if (isMine) {
                                                className += " mine";
                                                content = '💣';
                                            } else if (neighbor > 0) {
                                                const colors = ['#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];
                                                content = <span style={{ color: colors[neighbor-1] }} className="font-bold font-mono text-base md:text-lg">{neighbor}</span>;
                                            }
                                        } else if (isFlagged) {
                                            content = <span className="text-red-600">🚩</span>;
                                        }

                                        if (isSelected) {
                                            className += " border-[#f4b400] z-20"; // Highlight selected cell on mobile
                                        }

                                        return (
                                            <RandomReveal 
                                                key={key}
                                                distance={200} 
                                                delay={Math.random() * 0.5} 
                                                duration={0.4}
                                                className={`flex items-center justify-center cursor-pointer select-none text-sm md:text-base ${className}`}
                                                style={isSelected ? { borderColor: '#f4b400', boxShadow: '0 0 5px #f4b400' } : {}}
                                                onMouseDown={(e: React.MouseEvent) => {
                                                    if (isMobile) return;
                                                    if (e.button === 2) handleRightClick(e, rIdx, cIdx);
                                                    else if (e.button === 0) handleCellInteraction(rIdx, cIdx);
                                                }}
                                                onClick={() => {
                                                    if (isMobile) handleCellInteraction(rIdx, cIdx);
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

                        {/* MOBILE ACTION POPUP */}
                        {isMobile && selectedCell && (
                            <div 
                                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-fade-in" 
                                onClick={() => setSelectedCell(null)}
                            >
                                <div 
                                    className="bg-[#222] border-2 border-white p-4 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex gap-4 animate-pop-in" 
                                    onClick={e => e.stopPropagation()}
                                >
                                    <button 
                                        onClick={() => handleMobileAction('flag')}
                                        className="flex flex-col items-center justify-center w-16 h-16 bg-[#333] border-2 border-[#555] rounded-full hover:bg-[#444] active:scale-95 transition-all text-red-500"
                                    >
                                        <span className="text-2xl">🚩</span>
                                        <span className="text-[10px] text-white mt-1">FLAG</span>
                                    </button>
                                    <button 
                                        onClick={() => handleMobileAction('dig')}
                                        className="flex flex-col items-center justify-center w-16 h-16 bg-[#333] border-2 border-[#555] rounded-full hover:bg-[#444] active:scale-95 transition-all text-green-500"
                                    >
                                        <span className="text-2xl">⛏️</span>
                                        <span className="text-[10px] text-white mt-1">DIG</span>
                                    </button>
                                    <button 
                                        onClick={() => setSelectedCell(null)}
                                        className="flex flex-col items-center justify-center w-16 h-16 bg-[#333] border-2 border-[#555] rounded-full hover:bg-[#444] active:scale-95 transition-all text-gray-400"
                                    >
                                        <span className="text-2xl">✕</span>
                                        <span className="text-[10px] text-white mt-1">CANCEL</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {(gameState === 'won' || gameState === 'lost') && (
                            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                                <RandomReveal className="bg-[#111] border-4 border-white p-8 text-center max-w-md w-full shadow-2xl">
                                    <div className="text-6xl mb-4 animate-pop-in">{gameState === 'won' ? '😎' : '💥'}</div>
                                    <h2 className={`text-2xl md:text-3xl mb-6 font-bold ${gameState === 'won' ? 'text-green-500' : 'text-red-600'}`}>
                                        <RandomText text={gameState === 'won' ? 'MISSION ACCOMPLISHED' : 'DETONATION'} />
                                    </h2>
                                    <div className="flex flex-col gap-4">
                                        <Button onClick={() => initBoard(difficulty)}>{gameState === 'won' ? 'Next Operation' : 'Retry'}</Button>
                                        <button onClick={() => setGameState('menu')} className="text-xs text-[#aaa] hover:text-white mt-2 border-b border-transparent hover:border-white w-max mx-auto">Return to Menu</button>
                                    </div>
                                </RandomReveal>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MinesweeperGame;
