import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { incrementGamePlays } from '../services/firebase';
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

export default function ReversiGame({ onBackToHub }: ReversiGameProps) {
  const [board, setBoard] = useState<Board>(getInitialBoard);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerColor] = useState<'B' | 'W'>('B'); // Player is Dark (B)
  const [turn, setTurn] = useState<'B' | 'W'>('B');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);

  const botColor: 'B' | 'W' = playerColor === 'B' ? 'W' : 'B';

  useEffect(() => {
    incrementGamePlays('reversi');
  }, []);

  const resetGame = useCallback(() => {
    setBoard(getInitialBoard());
    setTurn('B');
    setIsBotThinking(false);
    setStatusMessage('');
    setGameOver(false);
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

  // Handle Player Turn
  const handleCellClick = useCallback((idx: number) => {
    if (turn !== playerColor || isBotThinking || gameOver) return;

    const move = legalMoves.find(m => m.idx === idx);
    if (!move) return;

    audioService.playSound('tictac_move');
    const nextBoard = applyMove(board, move.idx, move.flips, playerColor);
    setBoard(nextBoard);

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
        // Neither player can move -> Game Over
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
          audioService.playSound('piece_drop');
          const nextBoard = applyMove(board, move.idx, move.flips, botColor);
          setBoard(nextBoard);

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
        // Bot has no moves, pass back to player
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

  return (
    <div className="w-full h-screen flex flex-col bg-[#08090d] text-white select-none overflow-hidden font-sans">
      <header className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-base font-black tracking-wide text-emerald-400">REVERSI / OTHELLO</h1>
            <span className="text-[10px] text-neutral-400 font-mono">8X8 FLANKING STRATEGY</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); resetGame(); }}
                className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-all ${
                  difficulty === d
                    ? 'bg-emerald-500 text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={resetGame}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Discs Score & Turn Bar */}
      <div className="flex items-center justify-around py-3 bg-neutral-950/70 border-b border-neutral-900 px-4">
        {/* Dark (Player) */}
        <div className={`flex items-center gap-3 px-4 py-1.5 rounded-xl border transition-all ${
          turn === 'B' ? 'border-amber-400 bg-neutral-900 shadow-md' : 'border-transparent'
        }`}>
          <div className="w-6 h-6 rounded-full bg-neutral-900 border-2 border-neutral-700 shadow-inner flex items-center justify-center text-xs">
            ⚫
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 font-semibold uppercase">You (Dark)</div>
            <div className="text-lg font-black font-mono text-white">{darkCount}</div>
          </div>
        </div>

        {/* Status Notice */}
        <div className="text-xs font-mono font-bold text-center px-2">
          {statusMessage ? (
            <span className="text-amber-400 animate-pulse">{statusMessage}</span>
          ) : isBotThinking ? (
            <span className="text-neutral-400">Bot thinking...</span>
          ) : turn === playerColor ? (
            <span className="text-emerald-400">Your Turn (Select dot)</span>
          ) : (
            <span className="text-neutral-400">Bot's Turn</span>
          )}
        </div>

        {/* Light (Bot) */}
        <div className={`flex items-center gap-3 px-4 py-1.5 rounded-xl border transition-all ${
          turn === 'W' ? 'border-amber-400 bg-neutral-900 shadow-md' : 'border-transparent'
        }`}>
          <div>
            <div className="text-[10px] text-neutral-400 font-semibold uppercase text-right">Bot (Light)</div>
            <div className="text-lg font-black font-mono text-white text-right">{lightCount}</div>
          </div>
          <div className="w-6 h-6 rounded-full bg-neutral-100 border-2 border-neutral-300 shadow flex items-center justify-center text-xs">
            ⚪
          </div>
        </div>
      </div>

      {/* 8x8 Reversi Board */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 relative">
        <div className="aspect-square w-full max-w-[min(90vw,480px,calc(100vh-210px))] p-2.5 sm:p-3.5 bg-neutral-950 rounded-2xl border-4 border-[#064e3b] shadow-2xl">
          <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-1 bg-[#064e3b] p-1 rounded-xl">
            {board.map((cell, idx) => {
              const isLegal = legalMoves.some(m => m.idx === idx) && turn === playerColor;

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={!isLegal || isBotThinking || gameOver}
                  className="w-full h-full bg-[#047857] hover:bg-[#059669] rounded flex items-center justify-center relative cursor-pointer disabled:cursor-default transition-colors p-0.5 outline-none"
                  aria-label={`Cell ${idx}`}
                >
                  {/* Discs */}
                  {cell === 'B' && (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-neutral-800 to-black border border-neutral-700 shadow-[0_3px_6px_rgba(0,0,0,0.8)] flex items-center justify-center transform transition-transform duration-200" />
                  )}
                  {cell === 'W' && (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-white to-neutral-300 border border-neutral-200 shadow-[0_3px_6px_rgba(0,0,0,0.4)] flex items-center justify-center transform transition-transform duration-200" />
                  )}

                  {/* Valid move indicator dot */}
                  {isLegal && !cell && (
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-300/60 shadow-sm animate-pulse pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-30 p-4">
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-2xl font-black text-emerald-400 mb-1">{winnerText}</h2>
              <p className="text-sm text-neutral-400 mb-6 font-mono">
                Dark {darkCount} - Light {lightCount}
              </p>
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

      <footer className="p-2.5 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950/40">
        Trap opponent discs in a straight line to flip them • Bot algorithms: Easy (Random), Medium (Greedy), Hard (Minimax + Positional Corners)
      </footer>
    </div>
  );
}
