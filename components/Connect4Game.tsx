import React, { useState, useEffect, useCallback } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { LeaderboardWidget } from './Overlays';
import ChatWidget from './ChatWidget';
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
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

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

    const getBestMove = (currentBoard: Player[][]): number => {
        // 90% accurate AI
        if (Math.random() > 0.9) {
            const availableCols = [];
            for (let c = 0; c < COLS; c++) {
                if (currentBoard[0][c] === null) availableCols.push(c);
            }
            if (availableCols.length > 0) {
                return availableCols[Math.floor(Math.random() * availableCols.length)];
            }
        }

        // Check if AI can win
        for (let c = 0; c < COLS; c++) {
            if (currentBoard[0][c] === null) {
                const testBoard = dropPiece(currentBoard, c, 'Y');
                if (checkWinner(testBoard) === 'Y') return c;
            }
        }

        // Check if Player can win and block
        for (let c = 0; c < COLS; c++) {
            if (currentBoard[0][c] === null) {
                const testBoard = dropPiece(currentBoard, c, 'R');
                if (checkWinner(testBoard) === 'R') return c;
            }
        }

        // Pick center if available
        if (currentBoard[0][3] === null) return 3;

        // Pick random available
        const availableCols = [];
        for (let c = 0; c < COLS; c++) {
            if (currentBoard[0][c] === null) availableCols.push(c);
        }
        return availableCols[Math.floor(Math.random() * availableCols.length)];
    };

    useEffect(() => {
        if (!isPlayerTurn && !gameOver) {
            const timer = setTimeout(() => {
                const col = getBestMove(board);
                if (col !== undefined) {
                    const newBoard = dropPiece(board, col, 'Y');
                    setBoard(newBoard);
                    
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
            await saveLeaderboardScore(
                user, 
                username || user.displayName || 'Chef', 
                elapsedTime, 
                'Connect 4 Master', 
                { mistakes: 0, timeTaken: elapsedTime, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: elapsedTime, levelReached: 1 }, 
                'connect_4'
            );
        }
    };

    const handleColumnClick = (col: number) => {
        if (!isPlayerTurn || gameOver || board[0][col] !== null) return;

        const newBoard = dropPiece(board, col, 'R');
        setBoard(newBoard);

        const result = checkWinner(newBoard);
        if (result) {
            handleGameOver(result);
        } else {
            setIsPlayerTurn(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#000] text-white font-['Inter'] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #ff2a2a 2px, transparent 2px)', backgroundSize: '80px 80px' }}></div>
            
            {!isMobile && (
                <div className="flex flex-col absolute top-0 right-0 h-full w-[300px] z-[50] border-l border-[#333] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <LeaderboardWidget className="h-[66%] border-b-0" allowedModes={['connect_4']} defaultMode="connect_4" />
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
                                <h2 className="text-[#f4b400] text-xl font-bold">Fastest Connectors</h2>
                                <button onClick={() => setShowMobileLeaderboard(false)} className="text-red-500 text-2xl font-bold p-2">✕</button>
                            </div>
                            <LeaderboardWidget className="flex-1 border-none shadow-none p-0" allowedModes={['connect_4']} defaultMode="connect_4" />
                        </div>
                    )}
                </>
            )}

            <div className="flex justify-between items-center w-full max-w-md p-4 z-10 absolute top-0">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl md:text-2xl font-bold font-['Press_Start_2P'] text-[#ff2a2a]">CONNECT 4</h1>
                    <div className="text-xs text-[#aaa] mt-1">Time: {elapsedTime}s</div>
                </div>
                <div className="w-8"></div>
            </div>

            <div className="flex flex-col items-center justify-center z-10 mt-16">
                <div className="bg-[#1a4b8c] p-1.5 sm:p-2 md:p-4 rounded-xl flex flex-col gap-1.5 sm:gap-2 shadow-[0_0_20px_rgba(26,75,140,0.5)]">
                    {board.map((row, rIdx) => (
                        <div key={rIdx} className="flex gap-1.5 sm:gap-2">
                            {row.map((cell, cIdx) => (
                                <div
                                    key={`${rIdx}-${cIdx}`}
                                    onClick={() => handleColumnClick(cIdx)}
                                    className={`w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer
                                        ${cell === 'R' ? 'bg-[#ff2a2a] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 
                                          cell === 'Y' ? 'bg-[#f4b400] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 
                                          'bg-[#0a1f3a] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]'}`}
                                >
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {gameOver && (
                    <div className="mt-8 flex flex-col items-center animate-pop-in">
                        <div className={`text-2xl font-bold mb-4 ${winner === 'R' ? 'text-[#ff2a2a]' : winner === 'Y' ? 'text-[#f4b400]' : 'text-white'}`}>
                            {winner === 'R' ? 'You Win! 🎉' : winner === 'Y' ? 'You Lose! 😢' : 'Draw! 🤝'}
                        </div>
                        <button
                            onClick={startNewGame}
                            className="px-6 py-3 bg-[#ff2a2a] text-white font-bold rounded-full hover:bg-[#cc0000] transition-colors"
                        >
                            Play Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
