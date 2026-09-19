import React, { useState, useEffect, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { incrementGamePlays } from '../services/firebase';

interface UltimateTicTacToeProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Player = 'X' | 'O';
type CellValue = Player | null;
type SubBoardWinner = Player | 'TIE' | null;

interface MoveHistory {
  mainRow: number;
  mainCol: number;
  subRow: number;
  subCol: number;
  player: Player;
  prevActiveBoard: { r: number; c: number } | null;
  prevSubWinners: SubBoardWinner[][];
  prevBoardState: CellValue[][][][];
}

export default function UltimateTicTacToeGame({ onBackToHub }: UltimateTicTacToeProps) {
  // 3x3 array of 3x3 boards: board[mainR][mainC][subR][subC]
  const [boards, setBoards] = useState<CellValue[][][][]>(() => createInitialBoards());
  // 3x3 status of each sub-board: 'X' | 'O' | 'TIE' | null
  const [subWinners, setSubWinners] = useState<SubBoardWinner[][]>(() => createInitialSubWinners());
  
  // Next board player must play in. If null, player has a Free Move anywhere open.
  const [activeBoard, setActiveBoard] = useState<{ r: number; c: number } | null>(null);
  
  const [turn, setTurn] = useState<Player>('X');
  const [gameMode, setGameMode] = useState<'bot' | 'pvp'>('bot');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [mainWinner, setMainWinner] = useState<Player | 'TIE' | null>(null);
  const [history, setHistory] = useState<MoveHistory[]>([]);
  const [showRules, setShowRules] = useState<boolean>(false);

  useEffect(() => {
    incrementGamePlays('ultimate_tictactoe');
  }, []);

  function createInitialBoards(): CellValue[][][][] {
    return Array(3).fill(null).map(() =>
      Array(3).fill(null).map(() =>
        Array(3).fill(null).map(() =>
          Array(3).fill(null)
        )
      )
    );
  }

  function createInitialSubWinners(): SubBoardWinner[][] {
    return Array(3).fill(null).map(() => Array(3).fill(null));
  }

  const resetGame = useCallback(() => {
    setBoards(createInitialBoards());
    setSubWinners(createInitialSubWinners());
    setActiveBoard(null);
    setTurn('X');
    setMainWinner(null);
    setHistory([]);
    setIsBotThinking(false);
  }, []);

  // Check 3x3 line winner
  const check3x3Winner = (grid: CellValue[][]): Player | 'TIE' | null => {
    const lines = [
      // Rows
      [[0, 0], [0, 1], [0, 2]],
      [[1, 0], [1, 1], [1, 2]],
      [[2, 0], [2, 1], [2, 2]],
      // Cols
      [[0, 0], [1, 0], [2, 0]],
      [[0, 1], [1, 1], [2, 1]],
      [[0, 2], [1, 2], [2, 2]],
      // Diagonals
      [[0, 0], [1, 1], [2, 2]],
      [[0, 2], [1, 1], [2, 0]]
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      const valA = grid[a[0]][a[1]];
      const valB = grid[b[0]][b[1]];
      const valC = grid[c[0]][c[1]];
      if (valA && valA === valB && valA === valC) {
        return valA;
      }
    }

    // Check full
    const isFull = grid.every(row => row.every(cell => cell !== null));
    return isFull ? 'TIE' : null;
  };

  const checkMainWinner = (mainGrid: SubBoardWinner[][]): Player | 'TIE' | null => {
    const lines = [
      [[0, 0], [0, 1], [0, 2]],
      [[1, 0], [1, 1], [1, 2]],
      [[2, 0], [2, 1], [2, 2]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 1], [1, 1], [2, 1]],
      [[0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 1], [2, 2]],
      [[0, 2], [1, 1], [2, 0]]
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      const vA = mainGrid[a[0]][a[1]];
      const vB = mainGrid[b[0]][b[1]];
      const vC = mainGrid[c[0]][c[1]];
      if (vA && vA !== 'TIE' && vA === vB && vA === vC) {
        return vA;
      }
    }

    const isFull = mainGrid.every(row => row.every(cell => cell !== null));
    return isFull ? 'TIE' : null;
  };

  const makeMove = useCallback((mainR: number, mainC: number, subR: number, subC: number) => {
    if (mainWinner) return;

    // Is move legal?
    // 1. If activeBoard is set, must be inside activeBoard
    if (activeBoard && (activeBoard.r !== mainR || activeBoard.c !== mainC)) {
      return;
    }
    // 2. Sub-board must not already be won or tied
    if (subWinners[mainR][mainC] !== null) {
      return;
    }
    // 3. Target cell must be empty
    if (boards[mainR][mainC][subR][subC] !== null) {
      return;
    }

    audioService.playSound('tictac_move');

    // Clone state
    const newBoards = boards.map(r => r.map(c => c.map(sr => [...sr])));
    const newSubWinners = subWinners.map(r => [...r]);

    // Save history
    setHistory(prev => [
      ...prev,
      {
        mainRow: mainR,
        mainCol: mainC,
        subRow: subR,
        subCol: subC,
        player: turn,
        prevActiveBoard: activeBoard,
        prevSubWinners: subWinners,
        prevBoardState: boards
      }
    ]);

    // Place mark
    newBoards[mainR][mainC][subR][subC] = turn;

    // Check if this small board is now won
    const subWin = check3x3Winner(newBoards[mainR][mainC]);
    if (subWin) {
      newSubWinners[mainR][mainC] = subWin;
      audioService.playSound('success');
    }

    // Check main game winner
    const overallWin = checkMainWinner(newSubWinners);
    if (overallWin) {
      setMainWinner(overallWin);
      audioService.playSound('success');
    }

    // Determine NEXT active board based on Sending Rule (subR, subC)
    let nextActive: { r: number; c: number } | null = { r: subR, c: subC };

    // If target board is already won or completely full, player gets a Free Move
    if (newSubWinners[subR][subC] !== null) {
      nextActive = null; // Free Move
    } else {
      // Check if board has any open cells
      const isBoardFull = newBoards[subR][subC].every(row => row.every(cell => cell !== null));
      if (isBoardFull) {
        nextActive = null; // Free Move
      }
    }

    setBoards(newBoards);
    setSubWinners(newSubWinners);
    setActiveBoard(nextActive);
    setTurn(t => (t === 'X' ? 'O' : 'X'));
  }, [activeBoard, boards, mainWinner, subWinners, turn]);

  // BOT AI LOGIC
  useEffect(() => {
    if (gameMode !== 'bot' || turn !== 'O' || mainWinner) return;

    setIsBotThinking(true);
    const timer = setTimeout(() => {
      // Gather all legal moves
      const legalMoves: { mr: number; mc: number; sr: number; sc: number }[] = [];

      for (let mr = 0; mr < 3; mr++) {
        for (let mc = 0; mc < 3; mc++) {
          // If activeBoard specified, must match
          if (activeBoard && (activeBoard.r !== mr || activeBoard.c !== mc)) continue;
          // Must not be won
          if (subWinners[mr][mc] !== null) continue;

          for (let sr = 0; sr < 3; sr++) {
            for (let sc = 0; sc < 3; sc++) {
              if (boards[mr][mc][sr][sc] === null) {
                legalMoves.push({ mr, mc, sr, sc });
              }
            }
          }
        }
      }

      if (legalMoves.length === 0) {
        setIsBotThinking(false);
        return;
      }

      let chosenMove = legalMoves[0];

      if (botDifficulty === 'easy') {
        chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      } else {
        // Medium / Hard heuristic scoring
        let bestScore = -Infinity;
        for (const mv of legalMoves) {
          let score = 0;

          // 1. Winning the small board
          const testBoard = boards[mv.mr][mv.mc].map(r => [...r]);
          testBoard[mv.sr][mv.sc] = 'O';
          if (check3x3Winner(testBoard) === 'O') {
            score += 50;
            // Check if this also wins the entire game
            const testMain = subWinners.map(r => [...r]);
            testMain[mv.mr][mv.mc] = 'O';
            if (checkMainWinner(testMain) === 'O') {
              score += 500;
            }
          }

          // 2. Blocking player X from winning small board
          const blockBoard = boards[mv.mr][mv.mc].map(r => [...r]);
          blockBoard[mv.sr][mv.sc] = 'X';
          if (check3x3Winner(blockBoard) === 'X') {
            score += 35;
          }

          // 3. Center square bonus
          if (mv.sr === 1 && mv.sc === 1) score += 5;

          // 4. Avoid sending opponent to a free move board or advantageous board
          if (subWinners[mv.sr][mv.sc] !== null) {
            score -= 15; // gives opponent a free move!
          }

          // Random tie-breaker
          score += Math.random() * 3;

          if (score > bestScore) {
            bestScore = score;
            chosenMove = mv;
          }
        }
      }

      makeMove(chosenMove.mr, chosenMove.mc, chosenMove.sr, chosenMove.sc);
      setIsBotThinking(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [activeBoard, boards, botDifficulty, gameMode, mainWinner, makeMove, subWinners, turn]);

  const handleUndo = () => {
    if (history.length === 0 || isBotThinking) return;
    const stepsBack = gameMode === 'bot' ? (history.length >= 2 ? 2 : 1) : 1;
    const targetIdx = history.length - stepsBack;
    const targetState = history[targetIdx];

    setBoards(targetState.prevBoardState);
    setSubWinners(targetState.prevSubWinners);
    setActiveBoard(targetState.prevActiveBoard);
    setTurn(targetState.player);
    setMainWinner(null);
    setHistory(prev => prev.slice(0, targetIdx));
    audioService.playSound('button_click');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#07090e] text-white select-none overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between p-3 sm:p-4 bg-[#0d111a] border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm font-bold transition-all text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <span>←</span>
            <span>Hub</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            <h1 className="text-base sm:text-lg font-bold text-violet-400 tracking-wide">Ultimate Tic-Tac-Toe</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowRules(true)}
            className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-medium cursor-pointer"
          >
            📖 Rules
          </button>
          <button
            onClick={resetGame}
            className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-500 text-white font-bold rounded cursor-pointer"
          >
            New Game
          </button>
        </div>
      </header>

      {/* Control / Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#0b0e14] border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">Mode:</span>
            <button
              onClick={() => { setGameMode('bot'); resetGame(); }}
              className={`px-2 py-0.5 rounded font-bold ${gameMode === 'bot' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'text-neutral-400 hover:text-white'}`}
            >
              🤖 vs AI
            </button>
            <button
              onClick={() => { setGameMode('pvp'); resetGame(); }}
              className={`px-2 py-0.5 rounded font-bold ${gameMode === 'pvp' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'text-neutral-400 hover:text-white'}`}
            >
              👥 2-Player
            </button>
          </div>

          {gameMode === 'bot' && (
            <div className="flex items-center gap-1 text-[11px] text-neutral-400 border-l border-neutral-800 pl-3">
              <span>Diff:</span>
              <button
                onClick={() => setBotDifficulty('easy')}
                className={`px-1.5 py-0.5 rounded ${botDifficulty === 'easy' ? 'text-emerald-400 font-bold' : ''}`}
              >
                Easy
              </button>
              <button
                onClick={() => setBotDifficulty('medium')}
                className={`px-1.5 py-0.5 rounded ${botDifficulty === 'medium' ? 'text-amber-400 font-bold' : ''}`}
              >
                Mid
              </button>
              <button
                onClick={() => setBotDifficulty('hard')}
                className={`px-1.5 py-0.5 rounded ${botDifficulty === 'hard' ? 'text-red-400 font-bold' : ''}`}
              >
                Master
              </button>
            </div>
          )}
        </div>

        {/* Turn & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Turn:</span>
            <span className={`font-black px-2 py-0.5 rounded ${turn === 'X' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'}`}>
              {turn === 'X' ? 'Player X' : gameMode === 'bot' ? 'Bot O' : 'Player O'}
            </span>
          </div>
          {activeBoard === null ? (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-bold animate-pulse">
              🌟 FREE MOVE!
            </span>
          ) : (
            <span className="text-neutral-400">
              Target: Board ({activeBoard.r + 1},{activeBoard.c + 1})
            </span>
          )}
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`px-2 py-0.5 rounded transition ${history.length > 0 ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'opacity-40 cursor-not-allowed'}`}
          >
            ↶ Undo
          </button>
        </div>
      </div>

      {/* Main 9x9 Grid Arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 relative">
        <div className="relative bg-[#0d1017] p-2 sm:p-4 rounded-3xl shadow-2xl border-4 border-neutral-800 max-w-[540px] w-full">
          {/* Main 3x3 Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[0, 1, 2].map(mr =>
              [0, 1, 2].map(mc => {
                const isTarget = activeBoard === null ? subWinners[mr][mc] === null : (activeBoard.r === mr && activeBoard.c === mc);
                const subWin = subWinners[mr][mc];

                return (
                  <div
                    key={`main-${mr}-${mc}`}
                    className={`relative aspect-square p-1.5 sm:p-2 rounded-2xl transition-all duration-300 flex flex-col justify-between ${
                      subWin === 'X'
                        ? 'bg-cyan-950/40 border-2 border-cyan-500/50'
                        : subWin === 'O'
                        ? 'bg-pink-950/40 border-2 border-pink-500/50'
                        : subWin === 'TIE'
                        ? 'bg-neutral-900/50 border-2 border-neutral-700'
                        : isTarget
                        ? 'bg-[#151926] border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-2 ring-amber-400/50'
                        : 'bg-[#10131d] border border-neutral-800'
                    }`}
                  >
                    {/* Small 3x3 Grid */}
                    <div className="grid grid-cols-3 gap-1 h-full w-full">
                      {[0, 1, 2].map(sr =>
                        [0, 1, 2].map(sc => {
                          const cellVal = boards[mr][mc][sr][sc];
                          const canPlayHere = isTarget && subWin === null && cellVal === null && !mainWinner && !isBotThinking;

                          return (
                            <button
                              key={`sub-${sr}-${sc}`}
                              onClick={() => makeMove(mr, mc, sr, sc)}
                              disabled={!canPlayHere}
                              className={`rounded-lg flex items-center justify-center font-black text-sm sm:text-lg transition-all duration-150 ${
                                cellVal === 'X'
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : cellVal === 'O'
                                  ? 'bg-pink-500/20 text-pink-300'
                                  : canPlayHere
                                  ? 'bg-neutral-800/80 hover:bg-amber-500/30 text-transparent hover:text-amber-300 cursor-pointer active:scale-95'
                                  : 'bg-neutral-900/40 text-transparent'
                              }`}
                            >
                              {cellVal || (canPlayHere ? '•' : '')}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Sub-board Claim Overlay */}
                    {subWin && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center pointer-events-none z-10 animate-fade-in">
                        <span
                          className={`text-4xl sm:text-6xl font-black ${
                            subWin === 'X'
                              ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                              : subWin === 'O'
                              ? 'text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]'
                              : 'text-neutral-500'
                          }`}
                        >
                          {subWin === 'TIE' ? '—' : subWin}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Victory Modal Overlay */}
          {mainWinner && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
              <span className="text-5xl mb-2">{mainWinner === 'TIE' ? '🤝' : '🏆'}</span>
              <h2 className="text-2xl sm:text-3xl font-black text-amber-400 mb-1">
                {mainWinner === 'TIE' ? 'IT IS A DRAW!' : `PLAYER ${mainWinner} WINS!`}
              </h2>
              <p className="text-sm text-neutral-300 mb-6">
                {mainWinner === 'TIE' ? 'No more winning alignments on the main grid.' : 'Aligned 3 sub-boards on the main grid!'}
              </p>
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-extrabold rounded-2xl shadow-xl transition-transform hover:scale-105 cursor-pointer"
              >
                Play Rematch
              </button>
            </div>
          )}
        </div>

        {/* Sending Rule Quick Hint */}
        <p className="mt-4 text-xs text-neutral-400 text-center max-w-md">
          💡 <span className="text-amber-300 font-bold">Sending Rule:</span> Your move's local position inside a small board sends your opponent directly to that corresponding big board square.
        </p>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141e] border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-sm">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-violet-400 flex items-center gap-2">
                <span>📖</span>
                <span>Rules of Ultimate Tic-Tac-Toe</span>
              </h3>
              <button
                onClick={() => setShowRules(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-neutral-300">
              <p>
                <strong className="text-white">1. The Layout:</strong> Played on a large 3×3 grid containing 9 smaller 3×3 tic-tac-toe boards (81 spots total).
              </p>
              <p>
                <strong className="text-white">2. The Sending Rule:</strong> Your move's relative position in a small board determines which small board your opponent must play in next.
              </p>
              <p>
                <strong className="text-white">3. Winning a Small Board:</strong> Getting 3-in-a-row inside any small board claims that entire square on the main grid.
              </p>
              <p>
                <strong className="text-white">4. Full or Won Boards (Free Move):</strong> If sent to a small board that is already claimed or completely full, you can place your mark in ANY open square on ANY available small board!
              </p>
              <p>
                <strong className="text-white">5. Winning the Game:</strong> Align three won small boards horizontally, vertically, or diagonally on the main grid.
              </p>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="mt-6 w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
