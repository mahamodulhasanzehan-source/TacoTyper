import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { incrementGamePlays, saveLeaderboardScore } from '../services/firebase';
import { audioService } from '../services/audioService';
import { isMobileDevice } from '../utils/device';
import { GameLeaderboardSidebar, MobileLeaderboardButton } from './GameLeaderboardSidebar';
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
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    const nextBoard = applyMove(board, idx, move.flips, playerColor);
    setBoard(nextBoard);
    setRecentlyFlipped(new Set(move.flips));
    playFlipCascadeSound(move.flips.length);

    // Check opponent moves
    const oppMoves = getLegalMoves(nextBoard, botColor);
    if (oppMoves.length > 0) {
      setTurn(botColor);
      setStatusMessage('Bot is calculating move...');
    } else {
      // Opponent passes
      const myNextMoves = getLegalMoves(nextBoard, playerColor);
      if (myNextMoves.length > 0) {
        setStatusMessage('Bot has no legal moves! Your turn again.');
        audioService.playSound('powerup');
      } else {
        // Both pass -> Game Over
        setGameOver(true);
      }
    }
  }, [board, botColor, gameOver, isBotThinking, legalMoves, playerColor, turn]);

  // Bot Turn Effect
  useEffect(() => {
    if (turn !== botColor || gameOver) return;

    setIsBotThinking(true);
    const delay = difficulty === 'hard' ? 700 : difficulty === 'medium' ? 500 : 350;

    const timer = setTimeout(() => {
      const bestMoveIdx = getBotMove(board, botColor, difficulty);

      if (bestMoveIdx !== null) {
        const move = getLegalMoves(board, botColor).find(m => m.idx === bestMoveIdx);
        const flips = move ? move.flips : [];
        const nextBoard = applyMove(board, bestMoveIdx, flips, botColor);
        setBoard(nextBoard);
        setRecentlyFlipped(new Set(flips));
        playFlipCascadeSound(flips.length);

        const playerMoves = getLegalMoves(nextBoard, playerColor);
        if (playerMoves.length > 0) {
          setTurn(playerColor);
          setStatusMessage('Your turn');
        } else {
          // Player has no moves -> check if bot can move again
          const botNextMoves = getLegalMoves(nextBoard, botColor);
          if (botNextMoves.length > 0) {
            setStatusMessage('No legal moves for you! Bot plays again.');
            setTurn(botColor);
          } else {
            // Both pass -> Game Over
            setGameOver(true);
          }
        }
      } else {
        // Bot has no moves -> check if player can move
        const playerMoves = getLegalMoves(board, playerColor);
        if (playerMoves.length > 0) {
          setStatusMessage('Bot passed! Your turn.');
          setTurn(playerColor);
        } else {
          setGameOver(true);
        }
      }

      setIsBotThinking(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [board, botColor, difficulty, gameOver, playerColor, turn]);

  // Game Winner Announcement
  const winnerText = useMemo(() => {
    if (!gameOver) return '';
    const playerScore = playerColor === 'B' ? darkCount : lightCount;
    const botScore = playerColor === 'B' ? lightCount : darkCount;

    if (playerScore > botScore) return '🎉 YOU WON!';
    if (botScore > playerScore) return '🤖 BOT WON!';
    return '🤝 TIE GAME!';
  }, [darkCount, gameOver, lightCount, playerColor]);

  // Play game over sound effect & record score
  useEffect(() => {
    if (!gameOver) return;
    const playerScore = playerColor === 'B' ? darkCount : lightCount;
    const botScore = playerColor === 'B' ? lightCount : darkCount;

    if (playerScore > botScore) {
      audioService.playSound('mine_win');
      if (!scoreSavedRef.current && (difficulty === 'medium' || difficulty === 'hard')) {
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
    <div className="w-full h-full flex flex-row bg-[#06080e] text-white select-none overflow-hidden font-sans">
      <div className="flex-1 h-full flex flex-col relative overflow-hidden min-w-0">
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
                  onClick={() => {
                    setDifficulty(d);
                    resetGame();
                  }}
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

            {isMobile && (
              <MobileLeaderboardButton onClick={() => setShowMobileLeaderboard(true)} />
            )}
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

          {/* Turn Alert Message */}
          <div className="text-center font-mono text-xs text-neutral-300 max-w-[180px] sm:max-w-xs truncate">
            {gameOver ? (
              <span className="text-amber-400 font-bold">{winnerText}</span>
            ) : isBotThinking ? (
              <span className="text-amber-400 animate-pulse font-bold">🤖 Bot thinking...</span>
            ) : statusMessage ? (
              statusMessage
            ) : (
              'Your turn'
            )}
          </div>

          {/* Light (Bot) */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border transition-all ${
            turn === 'W' ? 'border-emerald-400 bg-neutral-900 shadow-md' : 'border-transparent'
          }`}>
            <div className="text-right">
              <div className="text-[9px] text-neutral-400 font-semibold uppercase">Bot</div>
              <div className="text-base font-black font-mono text-white leading-none">{lightCount}</div>
            </div>
            <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-300 shadow-inner flex items-center justify-center text-[10px]">
              ⚪
            </div>
          </div>
        </div>

        {/* Board Viewport */}
        <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden">
          <div className="w-full max-w-[min(90vw,440px,calc(100vh-200px))] aspect-square bg-[#064e3b] p-2 sm:p-3 rounded-2xl shadow-2xl border-4 border-[#022c22] grid grid-cols-8 grid-rows-8 gap-1 select-none">
            {board.map((cell, idx) => {
              const isLegal = legalMoves.some(m => m.idx === idx);
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

        <footer className="py-1 px-2 text-center text-[10px] text-neutral-500 border-t border-neutral-900 bg-neutral-950/60 shrink-0">
          Sandwich your opponent's discs to flip them to your color!
        </footer>
      </div>

      <GameLeaderboardSidebar
        mode={`reversi-${difficulty === 'easy' ? 'medium' : difficulty}`}
        allowedModes={['reversi-medium', 'reversi-hard']}
        tabLabels={{
          'reversi-medium': 'MED',
          'reversi-hard': 'HARD'
        }}
        title="Reversi Masters"
        scoreLabel="TIME"
        storageKey="reversi_leaderboard_collapsed"
        isMobile={isMobile}
        showMobileLeaderboard={showMobileLeaderboard}
        onCloseMobileLeaderboard={() => setShowMobileLeaderboard(false)}
      />
    </div>
  );
}
