import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { incrementGamePlays, saveLeaderboardScore } from '../services/firebase';
import { audioService } from '../services/audioService';
import {
  Board,
  getInitialBoard,
  getLegalMoves,
  applyMove,
  getBotMove
} from './reversi/reversiLogic';

interface ReversiGameProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export default function ReversiGame({ onBackToHub, user, username }: ReversiGameProps) {
  const startTimeRef = useRef<number>(Date.now());
  const scoreSavedRef = useRef<boolean>(false);
  const [board, setBoard] = useState<Board>(getInitialBoard);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerColor] = useState<'B' | 'W'>('B');
  const [turn, setTurn] = useState<'B' | 'W'>('B');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [recentlyFlipped, setRecentlyFlipped] = useState<Set<number>>(new Set());

  const botColor: 'B' | 'W' = playerColor === 'B' ? 'W' : 'B';

  useEffect(() => {
    incrementGamePlays('reversi');
  }, []);

  const resetGame = useCallback(() => {
    startTimeRef.current = Date.now();
    scoreSavedRef.current = false;
    setBoard(getInitialBoard());
    setTurn('B');
    setIsBotThinking(false);
    setStatusMessage('');
    setGameOver(false);
    setRecentlyFlipped(new Set());
  }, []);

  // Compute counts
  const { darkCount, lightCount } = useMemo(() => {
    let d = 0;
    let l = 0;
    for (const cell of board) {
      if (cell === 'B') d++;
      else if (cell === 'W') l++;
    }
    return { darkCount: d, lightCount: l };
  }, [board]);

  // Legal moves for active turn
  const legalMoves = useMemo(() => {
    if (gameOver) return [];
    return getLegalMoves(board, turn);
  }, [board, turn, gameOver]);

  // Trigger cascade flipping sound effect with subtle pitch variations
  const playFlipCascadeSound = (flipsCount: number) => {
    audioService.playSound('tictac_move');
    // Staggered subtle click sounds for individual pieces flipping
    const count = Math.min(flipsCount, 5);
    for (let i = 1; i <= count; i++) {
      setTimeout(() => {
        audioService.playSound('tile_click');
      }, i * 65);
    }
  };

  // Handle Player Turn
  const handleCellClick = useCallback((idx: number) => {
    if (turn !== playerColor || isBotThinking || gameOver) return;

    const move = legalMoves.find(m => m.idx === idx);
    if (!move) return;

    playFlipCascadeSound(move.flips.length);
    setRecentlyFlipped(new Set(move.flips));

    const nextBoard = applyMove(board, move.idx, move.flips, playerColor);
    setBoard(nextBoard);

    // Clear recently flipped animation tag after 500ms
    setTimeout(() => {
      setRecentlyFlipped(new Set());
    }, 500);

    // Switch turn
    const nextTurn = botColor;
    const oppMoves = getLegalMoves(nextBoard, nextTurn);

    if (oppMoves.length > 0) {
      setTurn(nextTurn);
      setStatusMessage('');
    } else {
      // Opponent must pass
      const playerNextMoves = getLegalMoves(nextBoard, playerColor);
      if (playerNextMoves.length > 0) {
        setStatusMessage('Bot has no legal moves. Bot passes!');
        audioService.playSound('word_valid');
        setTurn(playerColor);
      } else {
        setGameOver(true);
      }
    }
  }, [turn, playerColor, isBotThinking, gameOver, legalMoves, board, botColor]);

  // Bot Turn Automation
  useEffect(() => {
    if (turn !== botColor || gameOver) return;

    setIsBotThinking(true);
    const timer = setTimeout(() => {
      const chosenIdx = getBotMove(board, botColor, difficulty);

      if (chosenIdx !== null) {
        const move = getLegalMoves(board, botColor).find(m => m.idx === chosenIdx);
        if (move) {
          playFlipCascadeSound(move.flips.length);
          setRecentlyFlipped(new Set(move.flips));

          const nextBoard = applyMove(board, move.idx, move.flips, botColor);
          setBoard(nextBoard);

          setTimeout(() => {
            setRecentlyFlipped(new Set());
          }, 500);

          // Check if player has moves
          const playerMoves = getLegalMoves(nextBoard, playerColor);
          if (playerMoves.length > 0) {
            setTurn(playerColor);
            setStatusMessage('');
          } else {
            // Player must pass
            const botNextMoves = getLegalMoves(nextBoard, botColor);
            if (botNextMoves.length > 0) {
              setStatusMessage('You have no legal moves. Turn passed to Bot.');
              audioService.playSound('word_invalid');
              setTurn(botColor);
            } else {
              setGameOver(true);
            }
          }
        }
      } else {
        const playerMoves = getLegalMoves(board, playerColor);
        if (playerMoves.length > 0) {
          setStatusMessage('Bot passes!');
          setTurn(playerColor);
        } else {
          setGameOver(true);
        }
      }
      setIsBotThinking(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [turn, botColor, board, difficulty, gameOver, playerColor]);

  // Winner calculation
  const winnerText = useMemo(() => {
    if (!gameOver) return null;
    const playerScore = playerColor === 'B' ? darkCount : lightCount;
    const botScore = botColor === 'B' ? darkCount : lightCount;
    if (playerScore > botScore) return '🎉 YOU WIN!';
    if (botScore > playerScore) return '💀 BOT WINS!';
    return '🤝 DRAW GAME!';
  }, [gameOver, playerColor, botColor, darkCount, lightCount]);

  useEffect(() => {
    if (!gameOver || scoreSavedRef.current) return;
    const playerScore = playerColor === 'B' ? darkCount : lightCount;
    const botScore = botColor === 'B' ? darkCount : lightCount;
    if (playerScore > botScore) {
      audioService.playSound('mine_win');
      if (difficulty === 'medium' || difficulty === 'hard') {
        scoreSavedRef.current = true;
        const elapsed = Date.now() - startTimeRef.current;
        saveLeaderboardScore(
          user,
          username || user?.displayName || 'Reversi Grandmaster',
          elapsed,
          `${difficulty.toUpperCase()} Speedrun`,
          { mistakes: 0, timeTaken: Math.round(elapsed / 1000), ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: elapsed, levelReached: 1 },
          `reversi-${difficulty}`
        );
      }
    } else if (botScore > playerScore) {
      audioService.playSound('failure');
    }
  }, [gameOver, playerColor, botColor, darkCount, lightCount, difficulty, user, username]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#06080e] text-white select-none overflow-hidden font-sans">
      <header className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 border-b border-neutral-800 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHub}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-emerald-400">REVERSI</h1>
            <span className="text-[9px] text-neutral-400 font-mono hidden sm:inline">8X8 OTHELLO STRATEGY</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Difficulty Picker */}
          <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                disabled={isBotThinking || gameOver}
                onClick={() => setDifficulty(d)}
                className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded capitalize transition-all ${
                  difficulty === d
                    ? 'bg-emerald-500 text-black shadow font-bold'
                    : 'text-neutral-400 hover:text-white disabled:opacity-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={resetGame}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Discs Score & Turn Bar */}
      <div className="flex items-center justify-between py-2 bg-neutral-950/90 border-b border-neutral-900 px-4 shrink-0">
        {/* Dark (Player) */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border transition-all ${
          turn === 'B' ? 'border-emerald-400 bg-neutral-900 shadow-md' : 'border-transparent'
        }`}>
          <div className="w-5 h-5 rounded-full bg-neutral-950 border-2 border-neutral-600 shadow-inner flex items-center justify-center text-[10px]">
            ⚫
          </div>
          <div>
            <div className="text-[9px] text-neutral-400 font-semibold uppercase">You</div>
            <div className="text-base font-black font-mono text-white leading-none">{darkCount}</div>
          </div>
        </div>

        {/* Status Notice */}
        <div className="text-xs font-mono font-bold text-center px-2">
          {statusMessage ? (
            <span className="text-amber-400 animate-pulse">{statusMessage}</span>
          ) : isBotThinking ? (
            <span className="text-neutral-400">Bot thinking...</span>
          ) : turn === playerColor ? (
            <span className="text-emerald-400">Your Turn (Pick dot)</span>
          ) : (
            <span className="text-neutral-400">Bot's Turn</span>
          )}
        </div>

        {/* Light (Bot) */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border transition-all ${
          turn === 'W' ? 'border-emerald-400 bg-neutral-900 shadow-md' : 'border-transparent'
        }`}>
          <div>
            <div className="text-[9px] text-neutral-400 font-semibold uppercase text-right">Bot</div>
            <div className="text-base font-black font-mono text-white text-right leading-none">{lightCount}</div>
          </div>
          <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-300 shadow flex items-center justify-center text-[10px]">
            ⚪
          </div>
        </div>
      </div>

      {/* Reversi Board - Dynamic responsive scaling taking maximum available container space */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
        <div
          className="aspect-square p-2 bg-[#022c22] rounded-2xl border-4 border-[#065f46] shadow-2xl flex items-center justify-center"
          style={{
            width: 'min(92vw, calc(100vh - 150px), 520px)',
            height: 'min(92vw, calc(100vh - 150px), 520px)'
          }}
        >
          <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-1 sm:gap-1.5 bg-[#064e3b] p-1.5 rounded-xl">
            {board.map((cell, idx) => {
              const isLegal = legalMoves.some(m => m.idx === idx) && turn === playerColor;
              const isFlipped = recentlyFlipped.has(idx);

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={!isLegal || isBotThinking || gameOver}
                  className="w-full h-full bg-[#047857] hover:bg-[#059669] rounded flex items-center justify-center relative cursor-pointer disabled:cursor-default transition-colors p-0.5 outline-none"
                  aria-label={`Cell ${idx}`}
                >
                  {/* Discs with realistic 3D flipping animation */}
                  {cell === 'B' && (
                    <div
                      className={`w-[88%] h-[88%] rounded-full bg-gradient-to-br from-neutral-800 to-black border-2 border-neutral-600 shadow-[0_3px_6px_rgba(0,0,0,0.8)] transition-transform duration-500 ${
                        isFlipped ? 'scale-110 [transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'
                      }`}
                    />
                  )}
                  {cell === 'W' && (
                    <div
                      className={`w-[88%] h-[88%] rounded-full bg-gradient-to-br from-white to-slate-200 border-2 border-slate-300 shadow-[0_3px_6px_rgba(0,0,0,0.4)] transition-transform duration-500 ${
                        isFlipped ? 'scale-110 [transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'
                      }`}
                    />
                  )}

                  {/* Legal move indicator dot */}
                  {isLegal && !cell && (
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-300/60 border border-emerald-200 animate-pulse shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 p-4">
            <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <h2 className="text-2xl font-black text-emerald-400 mb-2">{winnerText}</h2>
              <p className="text-sm text-neutral-400 mb-4">
                No more legal moves available for either player.
              </p>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 mb-6 flex justify-around">
                <div>
                  <span className="text-xs text-neutral-400 uppercase font-semibold block">You (Dark)</span>
                  <span className="text-2xl font-black text-white">{darkCount}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 uppercase font-semibold block">Bot (Light)</span>
                  <span className="text-2xl font-black text-neutral-300">{lightCount}</span>
                </div>
              </div>
              <button
                onClick={resetGame}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="py-1 px-2 text-center text-[10px] text-neutral-500 border-t border-neutral-900 bg-neutral-950/60 shrink-0">
        Sandwich your opponent's discs to flip them to your color!
      </footer>
    </div>
  );
}
