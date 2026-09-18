import React, { useState, useEffect, useCallback } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';

interface TicTacToeGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

type Player = 'X' | 'O' | null;

const COMBOS_3X3 = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// In 5x5, winning requires matching 4 in a row
const generate5x5Combos = (): number[][] => {
    const list: number[][] = [];
    // Horizontal (length 4)
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c <= 1; c++) {
            list.push([r * 5 + c, r * 5 + c + 1, r * 5 + c + 2, r * 5 + c + 3]);
        }
    }
    // Vertical (length 4)
    for (let c = 0; c < 5; c++) {
        for (let r = 0; r <= 1; r++) {
            list.push([r * 5 + c, (r + 1) * 5 + c, (r + 2) * 5 + c, (r + 3) * 5 + c]);
        }
    }
    // Diagonal (\)
    for (let r = 0; r <= 1; r++) {
        for (let c = 0; c <= 1; c++) {
            list.push([
                r * 5 + c,
                (r + 1) * 5 + c + 1,
                (r + 2) * 5 + c + 2,
                (r + 3) * 5 + c + 3
            ]);
        }
    }
    // Anti-diagonal (/)
    for (let r = 0; r <= 1; r++) {
        for (let c = 3; c <= 4; c++) {
            list.push([
                r * 5 + c,
                (r + 1) * 5 + c - 1,
                (r + 2) * 5 + c - 2,
                (r + 3) * 5 + c - 3
            ]);
        }
    }
    return list;
};

const COMBOS_5X5_MATCH_4 = generate5x5Combos();

export default function TicTacToeGame({ user, onBackToHub, username }: TicTacToeGameProps) {
    const [difficulty, setDifficulty] = useState<0 | 1 | 2>(2); // 0: Easy (3x3), 1: Medium (3x3), 2: Hard (5x5 match 4)
    const is5x5 = difficulty === 2;
    const [board, setBoard] = useState<Player[]>(Array(25).fill(null));
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<Player | 'Draw'>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);
    const [streak, setStreak] = useState(0);
    const [aiPlaysFirst, setAiPlaysFirst] = useState(false);
    const [currentStarter, setCurrentStarter] = useState<'player' | 'ai'>('player');
    const [nextAiPlaysFirst, setNextAiPlaysFirst] = useState(false);

    const combos = is5x5 ? COMBOS_5X5_MATCH_4 : COMBOS_3X3;

    const startNewGame = useCallback((diff: 0 | 1 | 2 = difficulty, aiFirst: boolean = aiPlaysFirst) => {
        const size = diff === 2 ? 25 : 9;
        setBoard(Array(size).fill(null));
        setGameOver(false);
        setWinner(null);
        setWinningLine(null);
        setAiPlaysFirst(aiFirst);
        setCurrentStarter(aiFirst ? 'ai' : 'player');
        setIsPlayerTurn(!aiFirst);
        incrementGamePlays('tic_tac_toe' as any);
    }, [difficulty, aiPlaysFirst]);

    useEffect(() => {
        startNewGame(difficulty, false);
    }, []);

    const checkWinState = (squares: Player[], currentCombos: number[][]): { winner: Player | 'Draw', line?: number[] } | null => {
        for (const combo of currentCombos) {
            const first = squares[combo[0]];
            if (!first) continue;
            const allMatch = combo.every(idx => squares[idx] === first);
            if (allMatch) {
                return { winner: first, line: combo };
            }
        }
        if (!squares.includes(null)) return { winner: 'Draw' };
        return null;
    };

    // Minimax / Smart Heuristic for 3x3 and 5x5 Match 4
    const getBestMove = (squares: Player[]): number => {
        const available = squares.map((v, i) => v === null ? i : null).filter((v): v is number => v !== null);
        if (available.length === 0) return -1;

        if (difficulty === 0) {
            return available[Math.floor(Math.random() * available.length)];
        }

        // Check immediate AI win
        for (const idx of available) {
            squares[idx] = 'O';
            const win = checkWinState(squares, combos);
            squares[idx] = null;
            if (win?.winner === 'O') return idx;
        }

        // Check immediate Player block
        for (const idx of available) {
            squares[idx] = 'X';
            const win = checkWinState(squares, combos);
            squares[idx] = null;
            if (win?.winner === 'X') return idx;
        }

        // Medium 3x3 or Hard 5x5: Strategic combo weighting
        let bestScore = -Infinity;
        let bestMove = available[0];

        for (const idx of available) {
            let score = 0;
            for (const combo of combos) {
                if (combo.includes(idx)) {
                    const oCount = combo.filter(c => squares[c] === 'O').length;
                    const xCount = combo.filter(c => squares[c] === 'X').length;
                    if (xCount === 0) {
                        if (oCount === 2) score += is5x5 ? 25 : 6;
                        else if (oCount === 1) score += 4;
                        else if (oCount === 0) score += 2;
                    }
                    if (oCount === 0) {
                        if (xCount === 2) score += is5x5 ? 18 : 5;
                        else if (xCount === 1) score += 3;
                    }
                }
            }
            // Center & inner ring preference
            if (is5x5) {
                if (idx === 12) score += 6; // Exact center
                else if ([6, 7, 8, 11, 13, 16, 17, 18].includes(idx)) score += 3; // Inner 3x3
            } else if (idx === 4) {
                score += 3;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = idx;
            }
        }

        return bestMove;
    };

    useEffect(() => {
        if (!isPlayerTurn && !gameOver) {
            const timer = setTimeout(() => {
                const move = getBestMove([...board]);
                if (move !== -1) {
                    const newBoard = [...board];
                    newBoard[move] = 'O';
                    setBoard(newBoard);
                    audioService.playSound('tile_click');

                    const state = checkWinState(newBoard, combos);
                    if (state) {
                        handleGameOver(state.winner, state.line);
                    } else {
                        setIsPlayerTurn(true);
                    }
                }
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [isPlayerTurn, board, gameOver]);

    const handleGameOver = async (res: Player | 'Draw', line?: number[]) => {
        setGameOver(true);
        setWinner(res);
        if (line) setWinningLine(line);

        // Turn order rules based on outcome:
        // If player 1 went first and lost -> player 1 goes first again.
        // If won or draw -> player 2 goes first.
        // If player 2 (AI) went first and lost -> player 2 goes first again.
        // If won or draw -> player 1 goes first.
        let nextAi = false;
        if (currentStarter === 'player') {
            nextAi = res === 'O' ? false : true;
        } else {
            nextAi = res === 'X' ? true : false;
        }
        setNextAiPlaysFirst(nextAi);

        if (res === 'X') {
            audioService.playSound('correct_answer');
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (difficulty === 2) {
                await saveLeaderboardScore(
                    user,
                    username || user.displayName || 'Chef',
                    newStreak,
                    is5x5 ? 'Tic Tac Toe 5x5 Champion' : 'Tic Tac Toe Grandmaster',
                    { mistakes: 0, timeTaken: 0, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: newStreak, levelReached: newStreak },
                    'tic_tac_toe'
                );
            }
        } else if (res === 'O') {
            audioService.playSound('wrong_answer');
            setStreak(0);
        } else {
            audioService.playSound('button_click');
        }
    };

    const handleCellClick = (index: number) => {
        if (!isPlayerTurn || gameOver || board[index] !== null) return;

        const newBoard = [...board];
        newBoard[index] = 'X';
        setBoard(newBoard);
        audioService.playSound('tile_click');

        const state = checkWinState(newBoard, combos);
        if (state) {
            handleGameOver(state.winner, state.line);
        } else {
            setIsPlayerTurn(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-between w-full h-full bg-[#050508] text-white relative overflow-y-auto custom-scrollbar p-2.5 sm:p-4 select-none font-sans">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #38bdf8 2px, transparent 2px)', backgroundSize: '60px 60px' }}></div>

            {/* Top Bar - Pinned at top */}
            <div className="flex justify-between items-center w-full max-w-lg shrink-0 pt-1 sm:pt-2 mb-2 z-10">
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
                    <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 tracking-wide">
                        TIC TAC TOE
                    </h1>
                    <div className="text-xs text-neutral-400 font-bold mt-0.5">
                        🔥 Win Streak: <span className="text-amber-400 font-mono text-sm">{streak}</span>
                    </div>
                </div>

                <div className="w-16 flex justify-end">
                    <button
                        onClick={() => {
                            audioService.playSound('button_click');
                            startNewGame(difficulty, aiPlaysFirst);
                        }}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-full text-xs font-bold text-neutral-300 transition-transform active:scale-95 shadow-md"
                        title="Reset Game"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Middle Content */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg my-auto py-1 z-10">
                {/* Difficulty Controls */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-2 z-10 max-w-md">
                    <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                        {[
                            { label: 'Easy', val: 0 },
                            { label: 'Medium', val: 1 },
                            { label: 'Hard (5×5)', val: 2 }
                        ].map(d => (
                            <button
                                key={d.val}
                                onClick={() => {
                                    audioService.playSound('button_click');
                                    const newDiff = d.val as 0 | 1 | 2;
                                    setDifficulty(newDiff);
                                    startNewGame(newDiff, aiPlaysFirst);
                                }}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    difficulty === d.val 
                                        ? d.val === 2 ? 'bg-amber-500 text-black shadow font-black' : 'bg-sky-500 text-black shadow font-black'
                                        : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>

                    {/* First turn toggle */}
                    <button
                        onClick={() => {
                            audioService.playSound('button_click');
                            const newAi = !aiPlaysFirst;
                            startNewGame(difficulty, newAi);
                        }}
                        className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition-colors"
                        title="Toggle first move"
                    >
                        {aiPlaysFirst ? '🤖 AI Starts' : '👤 You Start'}
                    </button>
                </div>

                {/* Game Mode Objective Hint */}
                <div className="z-10 mb-2.5 text-[11px] sm:text-xs font-semibold px-3 py-0.5 rounded-full bg-neutral-900/90 border border-neutral-800 text-neutral-300 flex items-center gap-1.5 shadow-sm">
                    <span className={is5x5 ? 'text-amber-400' : 'text-sky-400'}>●</span>
                    <span>{is5x5 ? '5×5 Grid • Match 4 in a row to win' : '3×3 Grid • Match 3 in a row to win'}</span>
                </div>

                {/* Game Board */}
                <div className="flex flex-col items-center justify-center z-10 w-full px-2">
                <div className={`grid gap-1.5 sm:gap-2 bg-neutral-900/90 p-2 sm:p-3 rounded-2xl border-2 border-neutral-800 shadow-2xl max-w-full ${is5x5 ? 'grid-cols-5' : 'grid-cols-3'}`}>
                    {board.map((cell, index) => {
                        const isWinCell = winningLine?.includes(index);
                        return (
                            <button
                                key={index}
                                onClick={() => handleCellClick(index)}
                                className={`rounded-xl font-black flex items-center justify-center transition-all duration-150 active:scale-95 shadow-inner ${
                                    !is5x5
                                        ? 'w-[23vw] max-w-[110px] min-w-[64px] h-[23vw] max-h-[110px] min-h-[64px] sm:w-24 sm:h-24 md:w-28 md:h-28 text-3xl sm:text-5xl md:text-6xl'
                                        : 'w-[14vw] max-w-[64px] min-w-[42px] h-[14vw] max-h-[64px] min-h-[42px] sm:w-14 sm:h-14 md:w-16 md:h-16 text-xl sm:text-2xl md:text-3xl'
                                } ${
                                    isWinCell 
                                        ? 'bg-amber-500/20 border-2 border-amber-400 animate-pulse' 
                                        : 'bg-neutral-950 border border-neutral-800 hover:border-neutral-700'
                                } ${
                                    !cell && isPlayerTurn && !gameOver ? 'cursor-pointer hover:bg-neutral-800/60' : 'cursor-default'
                                } ${
                                    cell === 'X' ? 'text-sky-400' : 'text-red-400'
                                }`}
                            >
                                {cell}
                            </button>
                        );
                    })}
                </div>

                {/* Result Overlay */}
                {gameOver && (
                    <div className="mt-6 flex flex-col items-center animate-fade-in bg-neutral-900/90 border border-neutral-700 p-4 sm:p-6 rounded-2xl shadow-xl">
                        <div className={`text-xl sm:text-2xl font-black mb-3 ${winner === 'X' ? 'text-sky-400' : winner === 'O' ? 'text-red-400' : 'text-neutral-300'}`}>
                            {winner === 'X' ? '🎉 You Won!' : winner === 'O' ? '😢 AI Won!' : '🤝 Cat\'s Game (Draw)!'}
                        </div>
                        <button
                            onClick={() => {
                                audioService.playSound('button_click');
                                startNewGame(difficulty, nextAiPlaysFirst);
                            }}
                            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-full shadow-lg transition-transform active:scale-95 text-sm sm:text-base"
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
