import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays } from '../services/firebase';

export type PlayerColor = 'blue' | 'red'; // Blue = Player (You), Red = Bot / Player 2

interface DotsAndBoxesProps {
    onBackToHub: () => void;
    user?: any;
    username?: string | null;
}

export default function DotsAndBoxesGame({ onBackToHub }: DotsAndBoxesProps) {
    // Grid size N = 6 (6x6 boxes = 7x7 dots)
    const [gridSize, setGridSize] = useState<number>(6);
    const [gameMode, setGameMode] = useState<'bot' | 'pvp'>('bot');
    const [turn, setTurn] = useState<PlayerColor>('blue'); // Blue = Player 1, Red = Bot/Player 2
    const [isBotThinking, setIsBotThinking] = useState(false);

    // Board structures:
    // Horizontal lines: (N + 1) rows, N cols, stores who drew it ('blue' | 'red' | null)
    const [hLines, setHLines] = useState<(PlayerColor | null)[][]>([]);
    // Vertical lines: N rows, (N + 1) cols, stores who drew it ('blue' | 'red' | null)
    const [vLines, setVLines] = useState<(PlayerColor | null)[][]>([]);
    // Boxes: N x N, holds owner 'blue' | 'red' | null
    const [boxes, setBoxes] = useState<(PlayerColor | null)[][]>([]);

    const [blueScore, setBlueScore] = useState(0);
    const [redScore, setRedScore] = useState(0);
    const [winner, setWinner] = useState<PlayerColor | 'tie' | null>(null);

    // Dynamic auto-resizing
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

    // Initialize/reset board
    const initBoard = useCallback((size: number) => {
        const newH = Array(size + 1).fill(null).map(() => Array(size).fill(null));
        const newV = Array(size).fill(null).map(() => Array(size + 1).fill(null));
        const newB = Array(size).fill(null).map(() => Array(size).fill(null));

        setHLines(newH);
        setVLines(newV);
        setBoxes(newB);
        setBlueScore(0);
        setRedScore(0);
        setTurn('blue');
        setWinner(null);
        setIsBotThinking(false);
    }, []);

    useEffect(() => {
        incrementGamePlays('dots_and_boxes');
        initBoard(gridSize);
    }, [gridSize, initBoard]);

    // Count drawn sides for box (r, c)
    const countBoxSides = (r: number, c: number, h: (PlayerColor | null)[][], v: (PlayerColor | null)[][]): number => {
        let count = 0;
        if (h[r]?.[c]) count++;
        if (h[r + 1]?.[c]) count++;
        if (v[r]?.[c]) count++;
        if (v[r]?.[c + 1]) count++;
        return count;
    };

    // Check which boxes were completed by drawing a line
    const checkNewlyCompletedBoxes = (
        type: 'h' | 'v',
        r: number,
        c: number,
        h: (PlayerColor | null)[][],
        v: (PlayerColor | null)[][],
        b: (PlayerColor | null)[][]
    ): { r: number; c: number }[] => {
        const completed: { r: number; c: number }[] = [];

        if (type === 'h') {
            // Can affect box above (r - 1, c) and box below (r, c)
            if (r > 0 && !b[r - 1][c] && countBoxSides(r - 1, c, h, v) === 4) {
                completed.push({ r: r - 1, c });
            }
            if (r < gridSize && !b[r][c] && countBoxSides(r, c, h, v) === 4) {
                completed.push({ r, c });
            }
        } else {
            // Can affect box left (r, c - 1) and box right (r, c)
            if (c > 0 && !b[r][c - 1] && countBoxSides(r, c - 1, h, v) === 4) {
                completed.push({ r, c: c - 1 });
            }
            if (c < gridSize && !b[r][c] && countBoxSides(r, c, h, v) === 4) {
                completed.push({ r, c });
            }
        }

        return completed;
    };

    // Make a move
    const makeMove = useCallback((type: 'h' | 'v', r: number, c: number, activeTurn: PlayerColor) => {
        if (type === 'h' && hLines[r]?.[c]) return;
        if (type === 'v' && vLines[r]?.[c]) return;

        const nextH = hLines.map(row => [...row]);
        const nextV = vLines.map(row => [...row]);
        const nextB = boxes.map(row => [...row]);

        if (type === 'h') nextH[r][c] = activeTurn;
        else nextV[r][c] = activeTurn;

        audioService.playSound('piece_drop');

        // Check for completed boxes
        const completed = checkNewlyCompletedBoxes(type, r, c, nextH, nextV, nextB);

        let newBlueScore = blueScore;
        let newRedScore = redScore;

        if (completed.length > 0) {
            audioService.playSound('powerup');
            for (const box of completed) {
                nextB[box.r][box.c] = activeTurn;
                if (activeTurn === 'blue') newBlueScore++;
                else newRedScore++;
            }
            setBlueScore(newBlueScore);
            setRedScore(newRedScore);
        }

        setHLines(nextH);
        setVLines(nextV);
        setBoxes(nextB);

        // Check if game is completed
        const totalBoxes = gridSize * gridSize;
        if (newBlueScore + newRedScore === totalBoxes) {
            if (newBlueScore > newRedScore) {
                setWinner('blue');
                audioService.playSound('mine_win');
            } else if (newRedScore > newBlueScore) {
                setWinner('red');
                audioService.playSound(gameMode === 'bot' ? 'failure' : 'mine_win');
            } else {
                setWinner('tie');
            }
            return;
        }

        // Turn logic: if a box was completed, player gets another turn!
        if (completed.length === 0) {
            setTurn(prev => (prev === 'blue' ? 'red' : 'blue'));
        }
    }, [hLines, vLines, boxes, blueScore, redScore, gridSize, gameMode]);

    // Bot AI move calculation (Bot plays Red)
    const makeBotMove = useCallback(() => {
        if (winner || turn !== 'red') return;

        setIsBotThinking(true);

        setTimeout(() => {
            interface LineMove {
                type: 'h' | 'v';
                r: number;
                c: number;
                sidesCompleted: number; // how many boxes this move would complete (0, 1, or 2)
                badMoveForUs: boolean; // would this move create a 3rd side in any box (giving it away)?
            }

            const available: LineMove[] = [];

            // Check horizontal lines
            for (let r = 0; r <= gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    if (!hLines[r]?.[c]) {
                        const nextH = hLines.map(row => [...row]);
                        nextH[r][c] = 'red';
                        const completes = checkNewlyCompletedBoxes('h', r, c, nextH, vLines, boxes).length;

                        let creates3rdSide = false;
                        if (r > 0 && countBoxSides(r - 1, c, nextH, vLines) === 3) creates3rdSide = true;
                        if (r < gridSize && countBoxSides(r, c, nextH, vLines) === 3) creates3rdSide = true;

                        available.push({
                            type: 'h',
                            r,
                            c,
                            sidesCompleted: completes,
                            badMoveForUs: completes === 0 && creates3rdSide
                        });
                    }
                }
            }

            // Check vertical lines
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c <= gridSize; c++) {
                    if (!vLines[r]?.[c]) {
                        const nextV = vLines.map(row => [...row]);
                        nextV[r][c] = 'red';
                        const completes = checkNewlyCompletedBoxes('v', r, c, hLines, nextV, boxes).length;

                        let creates3rdSide = false;
                        if (c > 0 && countBoxSides(r, c - 1, hLines, nextV) === 3) creates3rdSide = true;
                        if (c < gridSize && countBoxSides(r, c, hLines, nextV) === 3) creates3rdSide = true;

                        available.push({
                            type: 'v',
                            r,
                            c,
                            sidesCompleted: completes,
                            badMoveForUs: completes === 0 && creates3rdSide
                        });
                    }
                }
            }

            if (available.length === 0) {
                setIsBotThinking(false);
                return;
            }

            // Decision priority:
            // 1. Take any move that completes a box (or 2 boxes!)
            const boxTakers = available.filter(m => m.sidesCompleted > 0);
            if (boxTakers.length > 0) {
                boxTakers.sort((a, b) => b.sidesCompleted - a.sidesCompleted);
                const choice = boxTakers[0];
                makeMove(choice.type, choice.r, choice.c, 'red');
                setIsBotThinking(false);
                return;
            }

            // 2. Take a safe move that doesn't create a 3rd side
            const safeMoves = available.filter(m => !m.badMoveForUs);
            if (safeMoves.length > 0) {
                const choice = safeMoves[Math.floor(Math.random() * safeMoves.length)];
                makeMove(choice.type, choice.r, choice.c, 'red');
                setIsBotThinking(false);
                return;
            }

            // 3. Forced move: pick any available move
            const choice = available[Math.floor(Math.random() * available.length)];
            makeMove(choice.type, choice.r, choice.c, 'red');
            setIsBotThinking(false);
        }, 300);
    }, [winner, turn, gridSize, hLines, vLines, boxes, makeMove]);

    // Trigger Bot Move
    useEffect(() => {
        if (gameMode === 'bot' && turn === 'red' && !winner && !isBotThinking) {
            makeBotMove();
        }
    }, [turn, gameMode, winner, isBotThinking, makeBotMove]);

    const handleLineClick = (type: 'h' | 'v', r: number, c: number) => {
        if (winner) return;
        if (gameMode === 'bot' && (turn === 'red' || isBotThinking)) return;
        makeMove(type, r, c, turn);
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0a0c] text-white font-sans select-none overflow-hidden relative">
            {/* Top Bar */}
            <div className="flex justify-between items-center w-full px-3 sm:px-6 py-2 border-b border-neutral-800/80 bg-black/60 backdrop-blur-md shrink-0 z-20">
                <button
                    onClick={onBackToHub}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-full text-xs sm:text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-md"
                    title="Back to Hub"
                >
                    <span>⬅️</span>
                    <span className="hidden sm:inline">Hub</span>
                </button>

                {/* Grid Size Selector */}
                <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 p-1 rounded-full">
                    {[4, 5, 6].map(size => (
                        <button
                            key={size}
                            onClick={() => {
                                setGridSize(size);
                                initBoard(size);
                            }}
                            className={`px-2.5 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all ${
                                gridSize === size
                                    ? 'bg-amber-500 text-black shadow-md'
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            {size}x{size}
                        </button>
                    ))}
                </div>

                {/* Mode Selector & Reset */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const nextM = gameMode === 'bot' ? 'pvp' : 'bot';
                            setGameMode(nextM);
                            initBoard(gridSize);
                        }}
                        className="px-2.5 sm:px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-bold transition-transform active:scale-95"
                    >
                        {gameMode === 'bot' ? '🤖 vs Bot' : '👥 2-Player'}
                    </button>
                    <button
                        onClick={() => initBoard(gridSize)}
                        className="px-2.5 sm:px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-bold transition-transform active:scale-95"
                        title="Restart Game"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-2 sm:p-4 gap-2 md:gap-8 overflow-hidden min-h-0">
                
                {/* Score & Turn Banner (Responsive layout) */}
                <div className="flex md:flex-col items-center justify-between md:justify-center gap-3 w-full md:w-52 shrink-0 bg-neutral-900/70 border border-neutral-800/80 px-3.5 py-2 md:py-4 rounded-2xl shadow-lg">
                    {/* Blue Player Card (Your Lines) */}
                    <div className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all flex-1 md:w-full ${turn === 'blue' && !winner ? 'border-sky-500 bg-sky-500/15 shadow-md scale-[1.02]' : 'border-transparent'}`}>
                        <div className="w-8 h-8 rounded-full bg-sky-600 border-2 border-sky-300 flex items-center justify-center font-bold text-sm shadow-md">
                            🔵
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] sm:text-xs font-bold text-sky-300 truncate">You (Blue)</div>
                            <div className="text-base sm:text-xl font-black font-mono text-white">{blueScore} pts</div>
                        </div>
                    </div>

                    <div className="hidden md:block text-neutral-600 font-bold text-xs uppercase tracking-widest text-center">VS</div>

                    {/* Red Bot / Player 2 Card (Bot Lines) */}
                    <div className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all flex-1 md:w-full ${turn === 'red' && !winner ? 'border-rose-500 bg-rose-500/15 shadow-md scale-[1.02]' : 'border-transparent'}`}>
                        <div className="w-8 h-8 rounded-full bg-rose-600 border-2 border-rose-300 flex items-center justify-center font-bold text-sm shadow-md">
                            {gameMode === 'bot' ? '🤖' : '🔴'}
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] sm:text-xs font-bold text-rose-300 flex items-center gap-1 truncate">
                                <span>{gameMode === 'bot' ? 'Bot (Red)' : 'P2 (Red)'}</span>
                                {isBotThinking && <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping" />}
                            </div>
                            <div className="text-base sm:text-xl font-black font-mono text-white">{redScore} pts</div>
                        </div>
                    </div>
                </div>

                {/* Dots and Boxes Interactive Board Container with Dynamic Auto-Resize */}
                <div ref={boardContainerRef} className="flex-1 min-h-0 w-full flex items-center justify-center p-1">
                    <div 
                        style={{ width: `${boardDim}px`, height: `${boardDim}px` }} 
                        className="relative flex items-center justify-center p-3 sm:p-4 bg-neutral-900 border-3 sm:border-4 border-neutral-800 rounded-2xl shadow-2xl overflow-hidden transition-all"
                    >
                        <svg
                            className="w-full h-full"
                            viewBox={`-20 -20 ${(gridSize * 100) + 40} ${(gridSize * 100) + 40}`}
                        >
                            {/* 1. Claimed Box Fills: Simply filled with owner's color, NO letters inside */}
                            {boxes.map((row, r) =>
                                row.map((owner, c) => {
                                    if (!owner) return null;
                                    return (
                                        <rect
                                            key={`box-${r}-${c}`}
                                            x={c * 100 + 4}
                                            y={r * 100 + 4}
                                            width={92}
                                            height={92}
                                            rx={8}
                                            fill={owner === 'blue' ? 'rgba(14, 165, 233, 0.82)' : 'rgba(244, 63, 94, 0.82)'}
                                            className="transition-all duration-300 ease-out"
                                        />
                                    );
                                })
                            )}

                            {/* 2. Horizontal Lines: Blue for Player, Red for Bot */}
                            {hLines.map((row, r) =>
                                row.map((lineOwner, c) => {
                                    const isDrawn = lineOwner !== null;
                                    return (
                                        <g key={`h-${r}-${c}`}>
                                            {/* Hit target for touch & click */}
                                            <rect
                                                x={c * 100}
                                                y={r * 100 - 15}
                                                width={100}
                                                height={30}
                                                fill="transparent"
                                                className={`cursor-pointer ${!isDrawn ? 'group' : ''}`}
                                                onClick={() => handleLineClick('h', r, c)}
                                            />
                                            {/* Line Rendering */}
                                            <line
                                                x1={c * 100 + 6}
                                                y1={r * 100}
                                                x2={(c + 1) * 100 - 6}
                                                y2={r * 100}
                                                stroke={
                                                    lineOwner === 'blue'
                                                        ? '#38bdf8'
                                                        : lineOwner === 'red'
                                                        ? '#f43f5e'
                                                        : 'rgba(255, 255, 255, 0.14)'
                                                }
                                                strokeWidth={isDrawn ? 6.5 : 3.5}
                                                strokeLinecap="round"
                                                className={`pointer-events-none transition-all duration-200 ${
                                                    !isDrawn ? 'hover:stroke-sky-400' : ''
                                                }`}
                                            />
                                        </g>
                                    );
                                })
                            )}

                            {/* 3. Vertical Lines: Blue for Player, Red for Bot */}
                            {vLines.map((row, r) =>
                                row.map((lineOwner, c) => {
                                    const isDrawn = lineOwner !== null;
                                    return (
                                        <g key={`v-${r}-${c}`}>
                                            <rect
                                                x={c * 100 - 15}
                                                y={r * 100}
                                                width={30}
                                                height={100}
                                                fill="transparent"
                                                className={`cursor-pointer ${!isDrawn ? 'group' : ''}`}
                                                onClick={() => handleLineClick('v', r, c)}
                                            />
                                            <line
                                                x1={c * 100}
                                                y1={r * 100 + 6}
                                                x2={c * 100}
                                                y2={(r + 1) * 100 - 6}
                                                stroke={
                                                    lineOwner === 'blue'
                                                        ? '#38bdf8'
                                                        : lineOwner === 'red'
                                                        ? '#f43f5e'
                                                        : 'rgba(255, 255, 255, 0.14)'
                                                }
                                                strokeWidth={isDrawn ? 6.5 : 3.5}
                                                strokeLinecap="round"
                                                className={`pointer-events-none transition-all duration-200 ${
                                                    !isDrawn ? 'hover:stroke-sky-400' : ''
                                                }`}
                                            />
                                        </g>
                                    );
                                })
                            )}

                            {/* 4. Dots Matrix (N + 1) x (N + 1) */}
                            {Array.from({ length: gridSize + 1 }).map((_, r) =>
                                Array.from({ length: gridSize + 1 }).map((_, c) => (
                                    <circle
                                        key={`dot-${r}-${c}`}
                                        cx={c * 100}
                                        cy={r * 100}
                                        r={6.5}
                                        fill="#fbbf24"
                                        stroke="#09090b"
                                        strokeWidth={2}
                                        className="drop-shadow-md pointer-events-none"
                                    />
                                ))
                            )}
                        </svg>

                        {/* Game Over Screen Modal */}
                        {winner && (
                            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in rounded-2xl z-30">
                                <div className="text-5xl mb-2">
                                    {winner === 'blue' ? '🏆' : winner === 'red' ? '🤖' : '🤝'}
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black mb-1 font-mono text-amber-400">
                                    {winner === 'blue'
                                        ? 'BLUE WINS!'
                                        : winner === 'red'
                                        ? (gameMode === 'bot' ? 'BOT WINS!' : 'RED WINS!')
                                        : 'TIE GAME!'}
                                </h2>
                                <p className="text-sm text-neutral-300 mb-6">
                                    Final Score: Blue {blueScore} - {redScore} Red
                                </p>

                                <button
                                    onClick={() => initBoard(gridSize)}
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
