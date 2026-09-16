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
type GridMode = '3x3' | '4x4';

const COMBOS_3X3 = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

const COMBOS_4X4 = [
    // Rows
    [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
    // Columns
    [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
    // Diagonals
    [0, 5, 10, 15], [3, 6, 9, 12]
];

export default function TicTacToeGame({ user, onBackToHub, username }: TicTacToeGameProps) {
    const [gridMode, setGridMode] = useState<GridMode>('3x3');
    const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<Player | 'Draw'>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);
    const [streak, setStreak] = useState(0);
    const [difficulty, setDifficulty] = useState<0 | 1 | 2>(2); // 0: Easy, 1: Medium, 2: Hard/Impossible
    const [aiPlaysFirst, setAiPlaysFirst] = useState(false);

    const combos = gridMode === '3x3' ? COMBOS_3X3 : COMBOS_4X4;
    const boardSize = gridMode === '3x3' ? 9 : 16;

    const startNewGame = useCallback((mode: GridMode = gridMode, aiFirst: boolean = aiPlaysFirst) => {
        const size = mode === '3x3' ? 9 : 16;
        setBoard(Array(size).fill(null));
        setGameOver(false);
        setWinner(null);
        setWinningLine(null);
        setIsPlayerTurn(!aiFirst);
        incrementGamePlays('tic_tac_toe' as any);
    }, [gridMode, aiPlaysFirst]);

    useEffect(() => {
        startNewGame(gridMode, aiPlaysFirst);
    }, [gridMode, aiPlaysFirst, startNewGame]);

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

    // Minimax for 3x3, Heuristic for 4x4
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

        if (gridMode === '3x3' && difficulty === 2) {
            // Minimax for 3x3
            const evaluate = (sq: Player[], depth: number, isMax: boolean): number => {
                const res = checkWinState(sq, combos);
                if (res?.winner === 'O') return 10 - depth;
                if (res?.winner === 'X') return depth - 10;
                if (res?.winner === 'Draw') return 0;

                if (isMax) {
                    let best = -Infinity;
                    for (let i = 0; i < sq.length; i++) {
                        if (sq[i] === null) {
                            sq[i] = 'O';
                            best = Math.max(best, evaluate(sq, depth + 1, false));
                            sq[i] = null;
                        }
                    }
                    return best;
                } else {
                    let best = Infinity;
                    for (let i = 0; i < sq.length; i++) {
                        if (sq[i] === null) {
                            sq[i] = 'X';
                            best = Math.min(best, evaluate(sq, depth + 1, true));
                            sq[i] = null;
                        }
                    }
                    return best;
                }
            };

            let bestScore = -Infinity;
            let move = available[0];
            for (const idx of available) {
                squares[idx] = 'O';
                const score = evaluate(squares, 0, false);
                squares[idx] = null;
                if (score > bestScore) {
                    bestScore = score;
                    move = idx;
                }
            }
            return move;
        }

        // 4x4 or Medium 3x3: Heuristic center/corner weighting
        const centerIndices = gridMode === '3x3' ? [4] : [5, 6, 9, 10];
        for (const c of centerIndices) {
            if (squares[c] === null) return c;
        }

        return available[Math.floor(Math.random() * available.length)];
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

        if (res === 'X') {
            audioService.playSound('correct_answer');
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (difficulty === 2) {
                await saveLeaderboardScore(
                    user,
                    username || user.displayName || 'Chef',
                    newStreak,
                    gridMode === '4x4' ? 'Tic Tac Toe 4x4 Champion' : 'Tic Tac Toe Grandmaster',
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
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#050508] text-white relative overflow-y-auto custom-scrollbar p-4 select-none font-sans">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #38bdf8 2px, transparent 2px)', backgroundSize: '60px 60px' }}></div>

            {/* Top Bar */}
            <div className="flex justify-between items-center w-full max-w-lg mb-4 z-10">
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
                            startNewGame();
                        }}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-full text-xs font-bold text-neutral-300"
                        title="Reset Game"
                    >
                        🔄 Reset
                    </button>
                </div>
            </div>

            {/* Mode & Difficulty Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4 z-10 max-w-md">
                {/* 3x3 vs 4x4 Selector */}
                <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    <button
                        onClick={() => {
                            audioService.playSound('button_click');
                            setGridMode('3x3');
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${gridMode === '3x3' ? 'bg-sky-500 text-black shadow' : 'text-neutral-400 hover:text-white'}`}
                    >
                        Classic 3x3
                    </button>
                    <button
                        onClick={() => {
                            audioService.playSound('button_click');
                            setGridMode('4x4');
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${gridMode === '4x4' ? 'bg-sky-500 text-black shadow' : 'text-neutral-400 hover:text-white'}`}
                    >
                        Hard 4x4 🔥
                    </button>
                </div>

                {/* Difficulty Selector */}
                <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    {(['Easy', 'Medium', 'Hard'] as const).map((label, idx) => (
                        <button
                            key={label}
                            onClick={() => {
                                audioService.playSound('button_click');
                                setDifficulty(idx as 0 | 1 | 2);
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${difficulty === idx ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* First turn toggle */}
                <button
                    onClick={() => {
                        audioService.playSound('button_click');
                        setAiPlaysFirst(prev => !prev);
                    }}
                    className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-xl text-xs font-bold"
                    title="Toggle first move"
                >
                    {aiPlaysFirst ? '🤖 AI Starts' : '👤 You Start'}
                </button>
            </div>

            {/* Game Board */}
            <div className="flex flex-col items-center justify-center z-10">
                <div className={`grid gap-2 bg-neutral-900/90 p-3 rounded-2xl border-2 border-neutral-800 shadow-2xl ${gridMode === '3x3' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    {board.map((cell, index) => {
                        const isWinCell = winningLine?.includes(index);
                        return (
                            <button
                                key={index}
                                onClick={() => handleCellClick(index)}
                                className={`rounded-xl font-black flex items-center justify-center transition-all duration-150 active:scale-95 shadow-inner ${
                                    gridMode === '3x3'
                                        ? 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 text-4xl sm:text-5xl md:text-6xl'
                                        : 'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 text-3xl sm:text-4xl'
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
                                startNewGame();
                            }}
                            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-full shadow-lg transition-transform active:scale-95 text-sm sm:text-base"
                        >
                            Play Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
