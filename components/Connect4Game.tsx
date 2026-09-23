import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';
import { isMobileDevice } from '../utils/device';

interface Connect4GameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

type Player = 'R' | 'Y' | null;

const ROWS = 6;
const COLS = 7;

export default function Connect4Game({ user, onBackToHub, username }: Connect4GameProps) {
    const [board, setBoard] = useState<Player[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<Player | 'Draw'>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [hoveredCol, setHoveredCol] = useState<number | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [lastDrop, setLastDrop] = useState<{ r: number, c: number } | null>(null);
    const elapsedTimeRef = useRef(0);

    useEffect(() => {
        elapsedTimeRef.current = elapsedTime;
    }, [elapsedTime]);

    useEffect(() => {
        setIsMobile(isMobileDevice());
    }, []);

    const startNewGame = useCallback(() => {
        setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
        setIsPlayerTurn(true);
        setGameOver(false);
        setWinner(null);
        setStartTime(Date.now());
        setElapsedTime(0);
        setHoveredCol(null);
        setLastDrop(null);
        incrementGamePlays('connect_4' as any);
    }, []);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (startTime && !gameOver) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [startTime, gameOver]);

    const checkWinner = (currentBoard: Player[][]): Player | 'Draw' => {
        // Check horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                if (currentBoard[r][c] && currentBoard[r][c] === currentBoard[r][c + 1] && currentBoard[r][c] === currentBoard[r][c + 2] && currentBoard[r][c] === currentBoard[r][c + 3]) {
                    return currentBoard[r][c];
                }
            }
        }
        // Check vertical
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS; c++) {
                if (currentBoard[r][c] && currentBoard[r][c] === currentBoard[r + 1][c] && currentBoard[r][c] === currentBoard[r + 2][c] && currentBoard[r][c] === currentBoard[r + 3][c]) {
                    return currentBoard[r][c];
                }
            }
        }
        // Check diagonal right
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                if (currentBoard[r][c] && currentBoard[r][c] === currentBoard[r + 1][c + 1] && currentBoard[r][c] === currentBoard[r + 2][c + 2] && currentBoard[r][c] === currentBoard[r + 3][c + 3]) {
                    return currentBoard[r][c];
                }
            }
        }
        // Check diagonal left
        for (let r = 3; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                if (currentBoard[r][c] && currentBoard[r][c] === currentBoard[r - 1][c + 1] && currentBoard[r][c] === currentBoard[r - 2][c + 2] && currentBoard[r][c] === currentBoard[r - 3][c + 3]) {
                    return currentBoard[r][c];
                }
            }
        }

        // Check draw
        let isDraw = true;
        for (let c = 0; c < COLS; c++) {
            if (currentBoard[0][c] === null) {
                isDraw = false;
                break;
            }
        }
        if (isDraw) return 'Draw';

        return null;
    };

    const getAvailableRow = (currentBoard: Player[][], col: number): number => {
        for (let r = ROWS - 1; r >= 0; r--) {
            if (currentBoard[r][col] === null) {
                return r;
            }
        }
        return -1;
    };

    const dropPiece = (currentBoard: Player[][], col: number, player: Player): Player[][] => {
        const row = getAvailableRow(currentBoard, col);
        if (row !== -1) {
            const newBoard = currentBoard.map(r => [...r]);
            newBoard[row][col] = player;
            return newBoard;
        }
        return currentBoard;
    };

    const evaluateBoard = (currentBoard: Player[][], player: Player): number => {
        let score = 0;
        const opponent = player === 'Y' ? 'R' : 'Y';

        const evaluateWindow = (window: (Player | null)[]) => {
            let pCount = 0;
            let oCount = 0;
            let emptyCount = 0;
            for (const cell of window) {
                if (cell === player) pCount++;
                else if (cell === opponent) oCount++;
                else emptyCount++;
            }
            if (pCount === 4) return 100;
            if (pCount === 3 && emptyCount === 1) return 5;
            if (pCount === 2 && emptyCount === 2) return 2;
            if (oCount === 3 && emptyCount === 1) return -4;
            return 0;
        };

        // Horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const window = [currentBoard[r][c], currentBoard[r][c+1], currentBoard[r][c+2], currentBoard[r][c+3]];
                score += evaluateWindow(window);
            }
        }
        // Vertical
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS; c++) {
                const window = [currentBoard[r][c], currentBoard[r+1][c], currentBoard[r+2][c], currentBoard[r+3][c]];
                score += evaluateWindow(window);
            }
        }
        // Diagonal Right
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const window = [currentBoard[r][c], currentBoard[r+1][c+1], currentBoard[r+2][c+2], currentBoard[r+3][c+3]];
                score += evaluateWindow(window);
            }
        }
        // Diagonal Left
        for (let r = 3; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const window = [currentBoard[r][c], currentBoard[r-1][c+1], currentBoard[r-2][c+2], currentBoard[r-3][c+3]];
                score += evaluateWindow(window);
            }
        }
        
        // Center column preference
        let centerCount = 0;
        for (let r = 0; r < ROWS; r++) {
            if (currentBoard[r][3] === player) centerCount++;
        }
        score += centerCount * 3;

        return score;
    };

    const minimax = (currentBoard: Player[][], depth: number, alpha: number, beta: number, isMaximizing: boolean): { score: number, col?: number } => {
        const result = checkWinner(currentBoard);
        if (result === 'Y') return { score: 1000000 - depth };
        if (result === 'R') return { score: -1000000 + depth };
        if (result === 'Draw') return { score: 0 };
        if (depth === 0) return { score: evaluateBoard(currentBoard, 'Y') };

        const availableCols = [];
        for (let c = 0; c < COLS; c++) {
            if (currentBoard[0][c] === null) availableCols.push(c);
        }

        // Sort columns to prioritize center
        availableCols.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

        if (isMaximizing) {
            let bestScore = -Infinity;
            let bestCol = availableCols[0];
            for (const col of availableCols) {
                const nextBoard = dropPiece(currentBoard, col, 'Y');
                const score = minimax(nextBoard, depth - 1, alpha, beta, false).score;
                if (score > bestScore) {
                    bestScore = score;
                    bestCol = col;
                }
                alpha = Math.max(alpha, bestScore);
                if (alpha >= beta) break;
            }
            return { score: bestScore, col: bestCol };
        } else {
            let bestScore = Infinity;
            let bestCol = availableCols[0];
            for (const col of availableCols) {
                const nextBoard = dropPiece(currentBoard, col, 'R');
                const score = minimax(nextBoard, depth - 1, alpha, beta, true).score;
                if (score < bestScore) {
                    bestScore = score;
                    bestCol = col;
                }
                beta = Math.min(beta, bestScore);
                if (alpha >= beta) break;
            }
            return { score: bestScore, col: bestCol };
        }
    };

    const getBestMove = (currentBoard: Player[][]): number => {
        // 5% chance to make a random move to not be completely unbeatable
        if (Math.random() < 0.05) {
            const availableCols = [];
            for (let c = 0; c < COLS; c++) {
                if (currentBoard[0][c] === null) availableCols.push(c);
            }
            if (availableCols.length > 0) {
                return availableCols[Math.floor(Math.random() * availableCols.length)];
            }
        }

        // Use depth 4 for a good balance of speed and intelligence
        const { col } = minimax(currentBoard, 4, -Infinity, Infinity, true);
        return col !== undefined ? col : 0;
    };

    useEffect(() => {
        if (!isPlayerTurn && !gameOver) {
            const timer = setTimeout(() => {
                const col = getBestMove(board);
                if (col !== undefined) {
                    const newBoard = dropPiece(board, col, 'Y');
                    const dropRow = getAvailableRow(board, col);
                    setBoard(newBoard);
                    setLastDrop({ r: dropRow, c: col });
                    audioService.playSound('tile_click');
                    
                    const result = checkWinner(newBoard);
                    if (result) {
                        handleGameOver(result);
                    } else {
                        setIsPlayerTurn(true);
                    }
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isPlayerTurn, board, gameOver]);

    const handleGameOver = async (result: Player | 'Draw') => {
        setGameOver(true);
        setWinner(result);
        
        if (result === 'R') {
            audioService.playSound('correct_answer');
            const finalTime = elapsedTimeRef.current;
            await saveLeaderboardScore(
                user, 
                username || user.displayName || 'Chef', 
                finalTime, 
                'Connect 4 Master', 
                { mistakes: 0, timeTaken: finalTime, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: finalTime, levelReached: 1 }, 
                'connect_4'
            );
        } else if (result === 'Y') {
            audioService.playSound('wrong_answer');
        }
    };

    const handleColumnClick = (col: number) => {
        if (!isPlayerTurn || gameOver || board[0][col] !== null) return;

        const dropRow = getAvailableRow(board, col);
        const newBoard = dropPiece(board, col, 'R');
        setBoard(newBoard);
        setLastDrop({ r: dropRow, c: col });
        audioService.playSound('button_click');

        const result = checkWinner(newBoard);
        if (result) {
            handleGameOver(result);
        } else {
            setIsPlayerTurn(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-between w-full h-full bg-[#050508] text-white relative overflow-y-auto custom-scrollbar p-2.5 sm:p-4 select-none font-sans">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #2563eb 2px, transparent 2px)', backgroundSize: '60px 60px' }}></div>

            {/* Top Navigation - Pinned at top */}
            <div className="flex justify-between items-center w-full max-w-xl shrink-0 pt-1 sm:pt-2 mb-2 z-10">
                <button 
                    onClick={() => {
                        audioService.playSound('button_click');
                        onBackToHub();
                    }} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-md"
                    title="Back to Hub"
                >
                    <span>⬅️</span>
                    <span className="hidden sm:inline">Hub</span>
                </button>

                <div className="flex flex-col items-center">
                    <h1 className="text-xl md:text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400">
                        CONNECT 4
                    </h1>
                    <div className="text-xs text-neutral-400 mt-0.5 font-bold">
                        ⏱️ Time: <span className="text-amber-400 font-mono">{elapsedTime}s</span>
                    </div>
                </div>

                <div className="w-16 flex justify-end">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${isPlayerTurn ? 'bg-red-950/80 text-red-400 border-red-700' : 'bg-amber-950/80 text-amber-400 border-amber-700'}`}>
                        {isPlayerTurn ? 'Your Turn' : 'AI Thinking...'}
                    </span>
                </div>
            </div>

            {/* Middle Section: Board & Hover Indicator */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl my-auto py-1 z-10">
                {/* Hover Indicator Row */}
                <div className="flex justify-center w-full max-w-full z-10 mb-1 px-1">
                    <div className="flex gap-1 sm:gap-2 md:gap-2.5 px-2 min-[400px]:px-3 sm:px-4 md:px-5">
                        {Array.from({ length: COLS }).map((_, cIdx) => (
                            <div 
                                key={`hover-${cIdx}`} 
                                className="w-[min(10.5vw,42px)] h-[min(10.5vw,42px)] min-w-[28px] min-h-[28px] sm:w-12 sm:h-12 md:w-16 md:h-16 flex items-center justify-center cursor-pointer"
                                onClick={() => handleColumnClick(cIdx)}
                                onMouseEnter={() => setHoveredCol(cIdx)}
                                onMouseLeave={() => setHoveredCol(null)}
                            >
                                {hoveredCol === cIdx && isPlayerTurn && !gameOver && board[0][cIdx] === null && (
                                    <div className="w-full h-full rounded-full bg-gradient-to-b from-red-500/80 to-red-600/80 shadow-[0_0_16px_rgba(239,68,68,0.7)] border-2 border-red-400/60 scale-95 transition-transform" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Arcade Style Connect 4 Board */}
                <div className="flex flex-col items-center justify-center z-10 max-w-full px-2">
                    <div 
                        className="bg-gradient-to-b from-blue-600 to-blue-800 p-2 min-[400px]:p-3 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl flex flex-col gap-1 sm:gap-2 md:gap-2.5 shadow-[0_15px_35px_rgba(30,64,175,0.45)] border-2 sm:border-4 border-blue-400/40 relative max-w-full overflow-hidden"
                        onMouseLeave={() => setHoveredCol(null)}
                    >
                        {/* 1. Underlying Slots & Dropping Pieces Layer (z-10) */}
                        {board.map((row, rIdx) => (
                            <div key={rIdx} className="flex gap-1 sm:gap-2 md:gap-2.5 relative z-10">
                                {row.map((cell, cIdx) => {
                                    const isDropTarget = lastDrop?.r === rIdx && lastDrop?.c === cIdx;
                                    const dropDistance = `calc(-${(rIdx + 1) * 115}% - ${(rIdx + 1) * 10}px)`;

                                    return (
                                        <div 
                                            key={`${rIdx}-${cIdx}`}
                                            onClick={() => handleColumnClick(cIdx)}
                                            onMouseEnter={() => setHoveredCol(cIdx)}
                                            className="w-[min(10.5vw,42px)] h-[min(10.5vw,42px)] min-w-[28px] min-h-[28px] sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center cursor-pointer bg-[#050c18] shadow-[inset_0_4px_8px_rgba(0,0,0,0.8)] transition-transform hover:scale-105 active:scale-95 relative"
                                        >
                                            {cell && (
                                                <div 
                                                    style={isDropTarget ? { ['--drop-y' as any]: dropDistance } : undefined}
                                                    className={`w-full h-full rounded-full shadow-[inset_0_-4px_6px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.5)] z-10 ${
                                                        isDropTarget ? 'animate-drop' : ''
                                                    } ${
                                                        cell === 'R' 
                                                            ? 'bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                                                            : 'bg-gradient-to-b from-amber-400 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                                                    }`}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {/* 2. Board Front Face Overlay with Higher z-index (z-20) so pieces fall behind the board */}
                        <div className="absolute inset-0 p-2 min-[400px]:p-3 sm:p-4 md:p-5 flex flex-col gap-1 sm:gap-2 md:gap-2.5 pointer-events-none z-20">
                            {board.map((row, rIdx) => (
                                <div key={rIdx} className="flex gap-1 sm:gap-2 md:gap-2.5">
                                    {row.map((_, cIdx) => (
                                        <div 
                                            key={cIdx}
                                            className="w-[min(10.5vw,42px)] h-[min(10.5vw,42px)] min-w-[28px] min-h-[28px] sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full ring-[8px] sm:ring-[14px] md:ring-[18px] ring-blue-700 shadow-[inset_0_3px_6px_rgba(0,0,0,0.45)]"
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {gameOver && (
                        <div className="mt-4 flex flex-col items-center animate-fade-in bg-neutral-900/90 border border-neutral-700 p-4 sm:p-6 rounded-2xl shadow-xl">
                            <div className={`text-xl sm:text-2xl font-black mb-3 ${winner === 'R' ? 'text-red-400' : winner === 'Y' ? 'text-amber-400' : 'text-white'}`}>
                                {winner === 'R' ? '🎉 You Won!' : winner === 'Y' ? '😢 AI Won!' : '🤝 Game Drawn!'}
                            </div>
                            <button 
                                onClick={() => {
                                    audioService.playSound('button_click');
                                    startNewGame();
                                }}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full shadow-lg transition-transform active:scale-95 text-sm sm:text-base"
                            >
                                Play Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
