import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays, saveLeaderboardScore } from '../services/firebase';

export type Piece = 'R' | 'RK' | 'B' | 'BK' | null; // R = Red, B = Black, K = King
export type PlayerColor = 'red' | 'black';
export type Difficulty = 'easy' | 'medium' | 'hard';

interface Position {
    r: number;
    c: number;
}

interface Move {
    from: Position;
    to: Position;
    jumps?: Position[]; // Captured pieces' positions
}

interface CheckersGameProps {
    onBackToHub: () => void;
    user?: any;
    username?: string | null;
}

// Standard 8x8 Initial Board
const getInitialBoard = (): Piece[][] => {
    const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 === 1) {
                if (r < 3) board[r][c] = 'B';
                else if (r > 4) board[r][c] = 'R';
            }
        }
    }
    return board;
};

export default function CheckersGame({ onBackToHub, user, username }: CheckersGameProps) {
    const startTimeRef = useRef<number>(Date.now());
    const [board, setBoard] = useState<Piece[][]>(getInitialBoard);
    const [turn, setTurn] = useState<PlayerColor>('red'); // Red = human, Black = bot
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [selectedPos, setSelectedPos] = useState<Position | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);
    const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
    const [isBotThinking, setIsBotThinking] = useState(false);
    const [winner, setWinner] = useState<PlayerColor | 'draw' | null>(null);
    const [capturedRed, setCapturedRed] = useState(0);
    const [capturedBlack, setCapturedBlack] = useState(0);
    const [moveHistory, setMoveHistory] = useState<{ board: Piece[][]; turn: PlayerColor }[]>([]);

    // Container auto-resize logic for mobile responsiveness
    const boardContainerRef = useRef<HTMLDivElement>(null);
    const [boardDim, setBoardDim] = useState<number>(360);

    useEffect(() => {
        const el = boardContainerRef.current;
        if (!el) return;
        const updateSize = () => {
            const { clientWidth, clientHeight } = el;
            if (clientWidth && clientHeight) {
                const s = Math.min(clientWidth - 12, clientHeight - 12, 540);
                setBoardDim(Math.max(260, Math.floor(s)));
            }
        };
        updateSize();
        const ro = new ResizeObserver(updateSize);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        incrementGamePlays('checkers');
    }, []);

    // Helper: is piece friendly
    const isPlayerPiece = (p: Piece, color: PlayerColor): boolean => {
        if (!p) return false;
        return color === 'red' ? (p === 'R' || p === 'RK') : (p === 'B' || p === 'BK');
    };

    const isKing = (p: Piece): boolean => p === 'RK' || p === 'BK';

    // Generate all jumps for a single piece
    const getJumpsForPiece = (b: Piece[][], pos: Position): Move[] => {
        const p = b[pos.r][pos.c];
        if (!p) return [];

        const color: PlayerColor = (p === 'R' || p === 'RK') ? 'red' : 'black';
        const king = isKing(p);
        const directions: [number, number][] = [];

        if (color === 'red' || king) {
            directions.push([-1, -1], [-1, 1]); // Upward
        }
        if (color === 'black' || king) {
            directions.push([1, -1], [1, 1]); // Downward
        }

        const jumps: Move[] = [];

        // DFS for multi-jumps
        const findSequences = (currPos: Position, currentB: Piece[][], jumpedAlready: Position[]) => {
            let foundNext = false;
            for (const [dr, dc] of directions) {
                const midR = currPos.r + dr;
                const midC = currPos.c + dc;
                const landR = currPos.r + dr * 2;
                const landC = currPos.c + dc * 2;

                if (landR >= 0 && landR < 8 && landC >= 0 && landC < 8) {
                    const midPiece = currentB[midR][midC];
                    const landPiece = currentB[landR][landC];

                    if (midPiece && !isPlayerPiece(midPiece, color) && !landPiece) {
                        foundNext = true;
                        const nextB = currentB.map(row => [...row]);
                        nextB[landR][landC] = nextB[currPos.r][currPos.c];
                        nextB[currPos.r][currPos.c] = null;
                        nextB[midR][midC] = null;

                        findSequences(
                            { r: landR, c: landC },
                            nextB,
                            [...jumpedAlready, { r: midR, c: midC }]
                        );
                    }
                }
            }

            if (!foundNext && jumpedAlready.length > 0) {
                jumps.push({
                    from: pos,
                    to: currPos,
                    jumps: jumpedAlready
                });
            }
        };

        findSequences(pos, b, []);
        return jumps;
    };

    // Generate normal moves (non-jumps) for a single piece
    const getSimpleMovesForPiece = (b: Piece[][], pos: Position): Move[] => {
        const p = b[pos.r][pos.c];
        if (!p) return [];

        const color: PlayerColor = (p === 'R' || p === 'RK') ? 'red' : 'black';
        const king = isKing(p);
        const directions: [number, number][] = [];

        if (color === 'red' || king) {
            directions.push([-1, -1], [-1, 1]);
        }
        if (color === 'black' || king) {
            directions.push([1, -1], [1, 1]);
        }

        const moves: Move[] = [];
        for (const [dr, dc] of directions) {
            const nr = pos.r + dr;
            const nc = pos.c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr][nc]) {
                moves.push({ from: pos, to: { r: nr, c: nc } });
            }
        }
        return moves;
    };

    // Get all legal moves for a player on board (enforcing mandatory jumps)
    const getAllLegalMoves = useCallback((b: Piece[][], color: PlayerColor): Move[] => {
        const allJumps: Move[] = [];
        const allSimple: Move[] = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (isPlayerPiece(b[r][c], color)) {
                    const jumps = getJumpsForPiece(b, { r, c });
                    if (jumps.length > 0) {
                        allJumps.push(...jumps);
                    } else {
                        allSimple.push(...getSimpleMovesForPiece(b, { r, c }));
                    }
                }
            }
        }

        return allJumps.length > 0 ? allJumps : allSimple;
    }, []);

    // Apply move and return new board
    const applyMove = (b: Piece[][], move: Move): { newBoard: Piece[][]; crowned: boolean } => {
        const next = b.map(row => [...row]);
        const piece = next[move.from.r][move.from.c];
        next[move.from.r][move.from.c] = null;

        let finalPiece = piece;
        let crowned = false;
        if (piece === 'R' && move.to.r === 0) {
            finalPiece = 'RK';
            crowned = true;
        }
        if (piece === 'B' && move.to.r === 7) {
            finalPiece = 'BK';
            crowned = true;
        }

        next[move.to.r][move.to.c] = finalPiece;

        // Remove jumped pieces
        if (move.jumps) {
            for (const jp of move.jumps) {
                next[jp.r][jp.c] = null;
            }
        }
        return { newBoard: next, crowned };
    };

    // Check game over
    const checkWinCondition = useCallback((b: Piece[][], currentTurn: PlayerColor) => {
        const legal = getAllLegalMoves(b, currentTurn);
        if (legal.length === 0) {
            const opp: PlayerColor = currentTurn === 'red' ? 'black' : 'red';
            setWinner(opp);
            audioService.playSound(opp === 'red' ? 'mine_win' : 'failure');
            if (opp === 'red' && (difficulty === 'medium' || difficulty === 'hard')) {
                const elapsed = Date.now() - startTimeRef.current;
                saveLeaderboardScore(
                    user,
                    username || user?.displayName || 'Checkers Grandmaster',
                    elapsed,
                    `${difficulty.toUpperCase()} Speedrun`,
                    { mistakes: 0, timeTaken: Math.round(elapsed / 1000), ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: elapsed, levelReached: 1 },
                    `checkers-${difficulty}`
                );
            }
            return true;
        }
        return false;
    }, [getAllLegalMoves, difficulty, user, username]);

    // Heuristic Board Evaluation for Bot
    const evaluateBoard = (b: Piece[][]): number => {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (!p) continue;

                let val = 10;
                if (isKing(p)) val = 25;
                else {
                    // Slight incentive to advance toward king's row and control center
                    if (p === 'B') val += r * 1.5;
                    else if (p === 'R') val += (7 - r) * 1.5;
                }

                // Center board control bonus
                if ((r === 3 || r === 4) && (c >= 2 && c <= 5)) {
                    val += 3;
                }

                if (p === 'B' || p === 'BK') score += val;
                else score -= val;
            }
        }
        return score;
    };

    // Minimax search with alpha-beta pruning
    const minimax = (
        b: Piece[][],
        depth: number,
        alpha: number,
        beta: number,
        isMaximizing: boolean
    ): number => {
        if (depth === 0) return evaluateBoard(b);

        const currentTurn: PlayerColor = isMaximizing ? 'black' : 'red';
        const legalMoves = getAllLegalMoves(b, currentTurn);

        if (legalMoves.length === 0) {
            return isMaximizing ? -1000 : 1000;
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of legalMoves) {
                const { newBoard: nextB } = applyMove(b, move);
                const evalVal = minimax(nextB, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, evalVal);
                alpha = Math.max(alpha, evalVal);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of legalMoves) {
                const { newBoard: nextB } = applyMove(b, move);
                const evalVal = minimax(nextB, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, evalVal);
                beta = Math.min(beta, evalVal);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    };

    // Bot decision engine
    const executeBotMove = useCallback(() => {
        if (turn !== 'black' || winner) return;

        setIsBotThinking(true);

        const thinkDelay = difficulty === 'easy' ? 220 : difficulty === 'medium' ? 320 : 420;

        setTimeout(() => {
            const legalMoves = getAllLegalMoves(board, 'black');
            if (legalMoves.length === 0) {
                setIsBotThinking(false);
                setWinner('red');
                audioService.playSound('mine_win');
                return;
            }

            let chosenMove: Move;

            if (difficulty === 'easy') {
                // Easy: 70% random, 30% best immediate
                if (Math.random() < 0.7) {
                    chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                } else {
                    legalMoves.sort((a, b) => (b.jumps?.length || 0) - (a.jumps?.length || 0));
                    chosenMove = legalMoves[0];
                }
            } else if (difficulty === 'medium') {
                // Medium: Minimax depth 2 with tactical jump priority
                let bestVal = -Infinity;
                let bestMoves: Move[] = [];
                for (const move of legalMoves) {
                    const { newBoard: nextB } = applyMove(board, move);
                    const val = minimax(nextB, 2, -Infinity, Infinity, false);
                    if (val > bestVal) {
                        bestVal = val;
                        bestMoves = [move];
                    } else if (val === bestVal) {
                        bestMoves.push(move);
                    }
                }
                chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)] || legalMoves[0];
            } else {
                // Hard: Minimax depth 4 with positional weighting
                let bestVal = -Infinity;
                let bestMoves: Move[] = [];
                for (const move of legalMoves) {
                    const { newBoard: nextB } = applyMove(board, move);
                    const val = minimax(nextB, 4, -Infinity, Infinity, false);
                    if (val > bestVal) {
                        bestVal = val;
                        bestMoves = [move];
                    } else if (val === bestVal) {
                        bestMoves.push(move);
                    }
                }
                chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)] || legalMoves[0];
            }

            // Execute chosen bot move
            setMoveHistory(prev => [...prev, { board, turn: 'black' }]);
            const { newBoard, crowned } = applyMove(board, chosenMove);
            setBoard(newBoard);
            setLastMove({ from: chosenMove.from, to: chosenMove.to });

            if (crowned) {
                audioService.playSound('powerup');
            } else if (chosenMove.jumps?.length) {
                audioService.playSound('hit');
            } else {
                audioService.playSound('piece_land');
            }

            // Count captures
            let rCount = 0;
            let bCount = 0;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (isPlayerPiece(newBoard[r][c], 'red')) rCount++;
                    if (isPlayerPiece(newBoard[r][c], 'black')) bCount++;
                }
            }
            setCapturedRed(12 - rCount);
            setCapturedBlack(12 - bCount);

            setIsBotThinking(false);
            setTurn('red');
            checkWinCondition(newBoard, 'red');
        }, thinkDelay);
    }, [board, difficulty, getAllLegalMoves, winner, checkWinCondition]);

    // Handle bot turn trigger
    useEffect(() => {
        if (turn === 'black' && !winner) {
            executeBotMove();
        }
    }, [turn, winner, executeBotMove]);

    // Handle square click by player (Red)
    const handleSquareClick = (r: number, c: number) => {
        if (turn !== 'red' || isBotThinking || winner) return;

        const piece = board[r][c];

        // If clicking on an existing valid destination move
        const targetMove = validMoves.find(m => m.to.r === r && m.to.c === c);
        if (targetMove && selectedPos) {
            setMoveHistory(prev => [...prev, { board, turn: 'red' }]);
            const { newBoard, crowned } = applyMove(board, targetMove);
            setBoard(newBoard);
            setLastMove({ from: targetMove.from, to: targetMove.to });

            if (crowned) {
                audioService.playSound('powerup');
            } else if (targetMove.jumps?.length) {
                audioService.playSound('hit');
            } else {
                audioService.playSound('piece_land');
            }

            // Recalculate captured
            let rCount = 0;
            let bCount = 0;
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (isPlayerPiece(newBoard[row][col], 'red')) rCount++;
                    if (isPlayerPiece(newBoard[row][col], 'black')) bCount++;
                }
            }
            setCapturedRed(12 - rCount);
            setCapturedBlack(12 - bCount);

            setSelectedPos(null);
            setValidMoves([]);

            // Check if player won
            if (!checkWinCondition(newBoard, 'black')) {
                setTurn('black');
            }
            return;
        }

        // If clicking on player piece, select it and show legal moves
        if (piece && isPlayerPiece(piece, 'red')) {
            const allLegal = getAllLegalMoves(board, 'red');
            const pieceMoves = allLegal.filter(m => m.from.r === r && m.from.c === c);

            if (pieceMoves.length > 0) {
                setSelectedPos({ r, c });
                setValidMoves(pieceMoves);
                audioService.playSound('tile_click');
            } else {
                setSelectedPos(null);
                setValidMoves([]);
            }
        } else {
            setSelectedPos(null);
            setValidMoves([]);
        }
    };

    const handleUndo = () => {
        if (moveHistory.length < 2 || isBotThinking) return;
        const previousState = moveHistory[moveHistory.length - 2];
        setBoard(previousState.board);
        setTurn('red');
        setSelectedPos(null);
        setValidMoves([]);
        setLastMove(null);
        setWinner(null);
        setMoveHistory(prev => prev.slice(0, prev.length - 2));
        audioService.playSound('button_click');
    };

    const handleRestart = () => {
        startTimeRef.current = Date.now();
        setBoard(getInitialBoard());
        setTurn('red');
        setSelectedPos(null);
        setValidMoves([]);
        setLastMove(null);
        setWinner(null);
        setCapturedRed(0);
        setCapturedBlack(0);
        setMoveHistory([]);
        audioService.playSound('button_click');
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0a0c] text-white font-sans select-none overflow-hidden relative">
            {/* Top Bar - Pinned at top */}
            <div className="flex justify-between items-center w-full px-3 sm:px-6 py-2 border-b border-neutral-800/80 bg-black/60 backdrop-blur-md shrink-0 z-20">
                <button
                    onClick={onBackToHub}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-full text-xs sm:text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-md"
                    title="Back to Hub"
                >
                    <span>⬅️</span>
                    <span className="hidden sm:inline">Hub</span>
                </button>

                {/* Difficulty Pill Controls */}
                <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 p-1 rounded-full">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => {
                                setDifficulty(lvl);
                                handleRestart();
                            }}
                            className={`px-2.5 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-xs font-bold capitalize transition-all ${
                                difficulty === lvl
                                    ? lvl === 'easy'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : lvl === 'medium'
                                        ? 'bg-amber-600 text-white shadow-md'
                                        : 'bg-red-600 text-white shadow-md'
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleUndo}
                        disabled={moveHistory.length < 2 || isBotThinking}
                        className="px-2.5 sm:px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 border border-neutral-700 rounded-xl text-xs font-bold transition-transform active:scale-95"
                        title="Undo Move"
                    >
                        ↩️ <span className="hidden sm:inline">Undo</span>
                    </button>
                    <button
                        onClick={handleRestart}
                        className="px-2.5 sm:px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-bold transition-transform active:scale-95"
                        title="Reset Game"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Board Container Area with dynamic responsive space */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-2 sm:p-4 gap-2 md:gap-8 overflow-hidden min-h-0">
                
                {/* Stats / Player cards */}
                <div className="flex md:flex-col items-center justify-between md:justify-center gap-3 w-full md:w-52 shrink-0 bg-neutral-900/70 border border-neutral-800/80 px-3 py-2 md:py-4 rounded-2xl shadow-lg">
                    {/* Bot Card */}
                    <div className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all flex-1 md:w-full ${turn === 'black' ? 'border-amber-500 bg-amber-500/15 shadow-md scale-[1.02]' : 'border-transparent'}`}>
                        <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-sm shadow-inner shrink-0">
                            🤖
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 truncate">
                                <span>Bot ({difficulty})</span>
                                {isBotThinking && <span className="inline-block w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">Lost: {capturedBlack}/12</div>
                        </div>
                    </div>

                    <div className="hidden md:block text-neutral-600 font-bold text-xs uppercase tracking-widest text-center">VS</div>

                    {/* Human Player Card */}
                    <div className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all flex-1 md:w-full ${turn === 'red' ? 'border-rose-500 bg-rose-500/15 shadow-md scale-[1.02]' : 'border-transparent'}`}>
                        <div className="w-8 h-8 rounded-full bg-rose-700 border-2 border-rose-400 flex items-center justify-center text-sm shadow-md shrink-0">
                            👤
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] sm:text-xs font-bold text-rose-300 truncate">You (Red)</div>
                            <div className="text-[10px] text-neutral-400 font-mono">Lost: {capturedRed}/12</div>
                        </div>
                    </div>
                </div>

                {/* 8x8 Checkers Board with ResizeObserver Auto-Fitting */}
                <div ref={boardContainerRef} className="flex-1 min-h-0 w-full flex items-center justify-center p-1">
                    <div 
                        style={{ width: `${boardDim}px`, height: `${boardDim}px` }}
                        className="relative flex items-center justify-center p-2 sm:p-3 bg-neutral-900 border-3 sm:border-4 border-neutral-800 rounded-2xl shadow-2xl transition-all"
                    >
                        <div className="w-full h-full grid grid-cols-8 grid-rows-8 border-2 border-neutral-950 rounded-xl overflow-hidden shadow-inner">
                            {board.map((row, r) =>
                                row.map((piece, c) => {
                                    const isDark = (r + c) % 2 === 1;
                                    const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                                    const isDestination = validMoves.some(m => m.to.r === r && m.to.c === c);
                                    const isRecentMove = lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c));

                                    return (
                                        <div
                                            key={`${r}-${c}`}
                                            onClick={() => handleSquareClick(r, c)}
                                            className={`relative flex items-center justify-center transition-colors select-none ${
                                                isDark ? 'bg-[#18181b]' : 'bg-[#27272a]'
                                            } ${isDark ? 'cursor-pointer' : ''}`}
                                        >
                                            {/* Recent Move Trail Highlight */}
                                            {isRecentMove && (
                                                <div className="absolute inset-0 bg-amber-500/15 pointer-events-none" />
                                            )}

                                            {/* Selection Highlight */}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-rose-500/30 ring-2 ring-rose-400 ring-inset z-10 animate-pulse" />
                                            )}

                                            {/* Valid Destination Marker with smooth pulsing glow */}
                                            {isDestination && (
                                                <div className="absolute w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-400/90 border-2 border-white animate-pulse z-20 shadow-lg shadow-emerald-500/50" />
                                            )}

                                            {/* Piece with smooth hover and transitions */}
                                            {piece && (
                                                <div
                                                    className={`relative w-[84%] h-[84%] rounded-full flex items-center justify-center transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 shadow-lg ${
                                                        piece.startsWith('R')
                                                            ? 'bg-gradient-to-br from-rose-500 to-rose-700 border-2 sm:border-3 border-rose-300 shadow-rose-950/80 ring-1 ring-rose-300/40'
                                                            : 'bg-gradient-to-br from-neutral-700 to-neutral-950 border-2 sm:border-3 border-neutral-400 shadow-black ring-1 ring-neutral-500/40'
                                                    }`}
                                                >
                                                    {/* Concentric inner ridge detail */}
                                                    <div className="w-[72%] h-[72%] rounded-full border border-white/20 flex items-center justify-center shadow-inner">
                                                        {isKing(piece) && (
                                                            <span className="text-sm sm:text-xl drop-shadow-md select-none transform transition-transform hover:scale-125 animate-bounce">👑</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Game Over Screen Modal */}
                        {winner && (
                            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in rounded-2xl z-30">
                                <div className="text-5xl mb-2">{winner === 'red' ? '🏆' : '💀'}</div>
                                <h2 className="text-2xl sm:text-3xl font-black mb-1 font-mono text-amber-400">
                                    {winner === 'red' ? 'VICTORY!' : 'DEFEATED'}
                                </h2>
                                <p className="text-sm text-neutral-300 mb-6">
                                    {winner === 'red'
                                        ? `You conquered the ${difficulty} checkers bot!`
                                        : `The ${difficulty} bot outmaneuvered you.`}
                                </p>

                                <button
                                    onClick={handleRestart}
                                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    Play Again 🔄
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
