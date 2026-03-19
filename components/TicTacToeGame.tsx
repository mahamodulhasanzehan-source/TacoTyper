import React, { useState, useEffect, useCallback } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { LeaderboardWidget } from './Overlays';
import ChatWidget from './ChatWidget';
import { isMobileDevice } from '../utils/device';

interface TicTacToeGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

type Player = 'X' | 'O' | null;

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

export default function TicTacToeGame({ user, onBackToHub, username }: TicTacToeGameProps) {
    const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<Player | 'Draw'>(null);
    const [streak, setStreak] = useState(0);
    const [message, setMessage] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
    const [aiPlaysFirst, setAiPlaysFirst] = useState(false);

    useEffect(() => {
        setIsMobile(isMobileDevice());
    }, []);

    const startNewGame = () => {
        setBoard(Array(9).fill(null));
        setIsPlayerTurn(!aiPlaysFirst);
        setGameOver(false);
        setWinner(null);
        setMessage('');
        incrementGamePlays('tic_tac_toe' as any);
    };

    useEffect(() => {
        incrementGamePlays('tic_tac_toe' as any);
    }, []);

    const checkWinner = (squares: Player[]): Player | 'Draw' => {
        for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
            const [a, b, c] = WINNING_COMBINATIONS[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        if (!squares.includes(null)) return 'Draw';
        return null;
    };

    const getBestMove = (squares: Player[]): number => {
        const available = squares.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
        if (available.length === 0) return -1;

        // 1. Check for immediate win
        for (let i of available) {
            squares[i] = 'O';
            if (checkWinner(squares) === 'O') {
                squares[i] = null;
                return i;
            }
            squares[i] = null;
        }

        // 2. Check for immediate block
        for (let i of available) {
            squares[i] = 'X';
            if (checkWinner(squares) === 'X') {
                squares[i] = null;
                return i;
            }
            squares[i] = null;
        }

        // 3. If center is available, 50% chance to take it (makes it slightly strategic but not perfect)
        if (squares[4] === null && Math.random() > 0.5) {
            return 4;
        }

        // 4. Otherwise, pick a random available square
        return available[Math.floor(Math.random() * available.length)];
    };

    useEffect(() => {
        if (!isPlayerTurn && !gameOver) {
            const timer = setTimeout(() => {
                const move = getBestMove(board);
                if (move !== undefined) {
                    const newBoard = [...board];
                    newBoard[move] = 'O';
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
        
        if (result === 'X') {
            const newStreak = streak + 1;
            setStreak(newStreak);
            setMessage('You Win! 🎉');
            setAiPlaysFirst(true);
            await saveLeaderboardScore(
                user, 
                username || user.displayName || 'Chef', 
                newStreak, 
                'Tic Tac Toe Master', 
                { mistakes: 0, timeTaken: 0, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: newStreak, levelReached: newStreak }, 
                'tic_tac_toe'
            );
        } else if (result === 'O') {
            setStreak(0);
            setMessage('You Lose! 😢');
            setAiPlaysFirst(false);
        } else {
            setMessage('Draw! 🤝');
            setAiPlaysFirst(prev => !prev);
        }
    };

    const handleCellClick = (index: number) => {
        if (board[index] || !isPlayerTurn || gameOver) return;

        const newBoard = [...board];
        newBoard[index] = 'X';
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
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #4facfe 2px, transparent 2px)', backgroundSize: '80px 80px' }}></div>
            
            {!isMobile && (
                <div className="flex flex-col absolute top-0 right-0 h-full w-[300px] z-[50] border-l border-[#333] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <LeaderboardWidget className="h-[66%] border-b-0" allowedModes={['tic_tac_toe']} defaultMode="tic_tac_toe" />
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
                                <h2 className="text-[#f4b400] text-xl font-bold">Top Strategists</h2>
                                <button onClick={() => setShowMobileLeaderboard(false)} className="text-red-500 text-2xl font-bold p-2">✕</button>
                            </div>
                            <LeaderboardWidget className="flex-1 border-none shadow-none p-0" allowedModes={['tic_tac_toe']} defaultMode="tic_tac_toe" />
                        </div>
                    )}
                </>
            )}

            <div className="flex justify-between items-center w-full max-w-md p-4 z-10 absolute top-0">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl md:text-2xl font-bold font-['Press_Start_2P'] text-[#4facfe]">TIC TAC TOE</h1>
                    <div className="text-xs text-[#aaa] mt-1">Win Streak: {streak}</div>
                </div>
                <div className="w-8"></div>
            </div>

            <div className="flex flex-col items-center justify-center z-10 mt-16">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-[#333] p-1.5 sm:p-2 rounded-xl">
                    {board.map((cell, index) => (
                        <button
                            key={index}
                            onClick={() => handleCellClick(index)}
                            className={`w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-[#111] rounded-lg text-4xl sm:text-5xl md:text-6xl font-bold flex items-center justify-center transition-colors
                                ${!cell && isPlayerTurn && !gameOver ? 'hover:bg-[#222] cursor-pointer' : 'cursor-default'}
                                ${cell === 'X' ? 'text-[#4facfe]' : 'text-[#ff2a2a]'}`}
                        >
                            {cell}
                        </button>
                    ))}
                </div>

                {gameOver && (
                    <div className="mt-8 flex flex-col items-center animate-pop-in">
                        <div className={`text-2xl font-bold mb-4 ${winner === 'X' ? 'text-[#4facfe]' : winner === 'O' ? 'text-[#ff2a2a]' : 'text-white'}`}>
                            {message}
                        </div>
                        <button
                            onClick={startNewGame}
                            className="px-6 py-3 bg-[#4facfe] text-black font-bold rounded-full hover:bg-[#3d8bcf] transition-colors"
                        >
                            Play Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
