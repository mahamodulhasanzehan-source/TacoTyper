import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
type Difficulty = 'easy' | 'medium' | 'hard' | 'master';

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

const WIN_LINES = [
  [[0, 0], [0, 1], [0, 2]],
  [[1, 0], [1, 1], [1, 2]],
  [[2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]]
];

export default function UltimateTicTacToeGame({ onBackToHub }: UltimateTicTacToeProps) {
  // 3x3 array of 3x3 boards: boards[mainR][mainC][subR][subC]
  const [boards, setBoards] = useState<CellValue[][][][]>(() => createInitialBoards());
  const [subWinners, setSubWinners] = useState<SubBoardWinner[][]>(() => createInitialSubWinners());
  
  // Next board player must play in. If null, player has a Free Move anywhere open.
  const [activeBoard, setActiveBoard] = useState<{ r: number; c: number } | null>(null);
  
  const [turn, setTurn] = useState<Player>('X');
  const [gameMode, setGameMode] = useState<'bot' | 'pvp'>('bot');
  const [botDifficulty, setBotDifficulty] = useState<Difficulty>('master');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [mainWinner, setMainWinner] = useState<Player | 'TIE' | null>(null);
  const [history, setHistory] = useState<MoveHistory[]>([]);
  const [lastMove, setLastMove] = useState<{ mr: number; mc: number; sr: number; sc: number } | null>(null);
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
    setLastMove(null);
    setIsBotThinking(false);
  }, []);

  // Check 3x3 line winner
  const check3x3Winner = (grid: CellValue[][]): Player | 'TIE' | null => {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      const valA = grid[a[0]][a[1]];
      const valB = grid[b[0]][b[1]];
      const valC = grid[c[0]][c[1]];
      if (valA && valA === valB && valA === valC) {
        return valA;
      }
    }
    const isFull = grid.every(row => row.every(cell => cell !== null));
    return isFull ? 'TIE' : null;
  };

  const checkMainWinner = (mainGrid: SubBoardWinner[][]): Player | 'TIE' | null => {
    for (const line of WIN_LINES) {
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

    if (activeBoard && (activeBoard.r !== mainR || activeBoard.c !== mainC)) return;
    if (subWinners[mainR][mainC] !== null) return;
    if (boards[mainR][mainC][subR][subC] !== null) return;

    // Snapshot for Undo
    const histItem: MoveHistory = {
      mainRow: mainR,
      mainCol: mainC,
      subRow: subR,
      subCol: subC,
      player: turn,
      prevActiveBoard: activeBoard,
      prevSubWinners: subWinners.map(row => [...row]),
      prevBoardState: boards.map(r => r.map(c => c.map(subR => [...subR])))
    };
    setHistory(prev => [...prev, histItem]);

    const newBoards = boards.map(r => r.map(c => c.map(subR => [...subR])));
    newBoards[mainR][mainC][subR][subC] = turn;
    setBoards(newBoards);
    setLastMove({ mr: mainR, mc: mainC, sr: subR, sc: subC });

    audioService.playSound('tictac_move');

    const newSubWinners = subWinners.map(row => [...row]);
    let boardJustWon = false;
    const subWin = check3x3Winner(newBoards[mainR][mainC]);
    if (subWin !== null && subWinners[mainR][mainC] === null) {
      newSubWinners[mainR][mainC] = subWin;
      setSubWinners(newSubWinners);
      boardJustWon = true;
      audioService.playSound('powerup');
    }

    const mWinner = checkMainWinner(newSubWinners);
    if (mWinner) {
      setMainWinner(mWinner);
      if (mWinner === 'TIE') {
        audioService.playSound('button_click');
      } else {
        audioService.playSound('mine_win');
      }
      return;
    }

    // Next active board calculation
    // Sent to board (subR, subC)
    const targetBoardWonOrFull = newSubWinners[subR][subC] !== null || 
      newBoards[subR][subC].every(row => row.every(cell => cell !== null));

    if (targetBoardWonOrFull) {
      setActiveBoard(null); // Free move!
    } else {
      setActiveBoard({ r: subR, c: subC });
    }

    setTurn(t => (t === 'X' ? 'O' : 'X'));
  }, [activeBoard, boards, mainWinner, subWinners, turn]);

  // Master Bot Evaluator & Strategic Search
  const findBestBotMove = useCallback((
    currentBoards: CellValue[][][][],
    currentSubWinners: SubBoardWinner[][],
    currentActive: { r: number; c: number } | null,
    diff: Difficulty
  ): { mr: number; mc: number; sr: number; sc: number } | null => {
    // Collect all legal moves
    const legalMoves: { mr: number; mc: number; sr: number; sc: number }[] = [];
    for (let mr = 0; mr < 3; mr++) {
      for (let mc = 0; mc < 3; mc++) {
        if (currentActive && (currentActive.r !== mr || currentActive.c !== mc)) continue;
        if (currentSubWinners[mr][mc] !== null) continue;
        for (let sr = 0; sr < 3; sr++) {
          for (let sc = 0; sc < 3; sc++) {
            if (currentBoards[mr][mc][sr][sc] === null) {
              legalMoves.push({ mr, mc, sr, sc });
            }
          }
        }
      }
    }

    if (legalMoves.length === 0) return null;
    if (diff === 'easy') {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    // Helper: evaluate sub-board threat & control
    const evaluateSubBoardThreat = (b: CellValue[][], p: Player): number => {
      let score = 0;
      for (const line of WIN_LINES) {
        const vals = [b[line[0][0]][line[0][1]], b[line[1][0]][line[1][1]], b[line[2][0]][line[2][1]]];
        const pC = vals.filter(v => v === p).length;
        const oC = vals.filter(v => v !== null && v !== p).length;
        if (pC === 2 && oC === 0) score += 35;
        if (pC === 1 && oC === 0) score += 8;
        if (oC === 2 && pC === 0) score -= 45;
      }
      return score;
    };

    // Helper: evaluate macro board (subWinners) strategic value
    const evaluateMacroBoard = (subW: SubBoardWinner[][], p: Player): number => {
      let score = 0;
      const opp: Player = p === 'O' ? 'X' : 'O';
      for (const line of WIN_LINES) {
        const vals = [subW[line[0][0]][line[0][1]], subW[line[1][0]][line[1][1]], subW[line[2][0]][line[2][1]]];
        const pC = vals.filter(v => v === p).length;
        const oC = vals.filter(v => v === opp).length;
        const drawC = vals.filter(v => v === 'TIE').length;
        if (drawC > 0) continue;
        if (pC === 2 && oC === 0) score += 400; // Winning macro 2-in-a-row
        if (pC === 1 && oC === 0) score += 60;
        if (oC === 2 && pC === 0) score -= 600; // Opponent macro 2-in-a-row threat!
      }
      return score;
    };

    const rateMove = (mv: { mr: number; mc: number; sr: number; sc: number }): number => {
      let score = 0;
      const { mr, mc, sr, sc } = mv;

      // 1. Check if placing 'O' wins the small board
      const testSmall = currentBoards[mr][mc].map(r => [...r]);
      testSmall[sr][sc] = 'O';
      const winsSmall = check3x3Winner(testSmall) === 'O';

      if (winsSmall) {
        score += 350;
        // Check if winning this small board wins the whole game
        const testMain = currentSubWinners.map(r => [...r]);
        testMain[mr][mc] = 'O';
        if (checkMainWinner(testMain) === 'O') {
          score += 50000; // Immediate decisive win!
          return score;
        }
        // Strategic macro position
        if (mr === 1 && mc === 1) score += 200; // Center board is crucial
        else if ((mr === 0 || mr === 2) && (mc === 0 || mc === 2)) score += 120; // Corner boards
        // Evaluate macro board improvements
        score += evaluateMacroBoard(testMain, 'O');
      }

      // 2. Check if this blocks opponent 'X' from winning the small board
      const blockSmall = currentBoards[mr][mc].map(r => [...r]);
      blockSmall[sr][sc] = 'X';
      const opponentWinsSmall = check3x3Winner(blockSmall) === 'X';
      if (opponentWinsSmall) {
        score += 260;
        // Check if opponent winning this would have won them the game
        const testMainX = currentSubWinners.map(r => [...r]);
        testMainX[mr][mc] = 'X';
        if (checkMainWinner(testMainX) === 'X') {
          score += 25000; // Crucial game-saving block!
        } else {
          score += Math.abs(evaluateMacroBoard(testMainX, 'X'));
        }
      }

      // 3. Positional values inside the sub-board
      if (sr === 1 && sc === 1) score += 30; // center cell
      else if ((sr === 0 || sr === 2) && (sc === 0 || sc === 2)) score += 18; // corner cell
      else score += 6;

      // 4. Create internal 2-in-a-row threat
      score += evaluateSubBoardThreat(testSmall, 'O');

      // 5. Destination evaluation: Where are we sending the opponent?
      const targetSubWonOrFull = currentSubWinners[sr][sc] !== null || 
        currentBoards[sr][sc].every(row => row.every(cell => cell !== null));

      if (targetSubWonOrFull) {
        // Opponent gets a FREE MOVE anywhere!
        // Highly dangerous unless we are already capturing a critical board or winning
        score -= 450;
      } else {
        // Target board is (sr, sc). Check if opponent can immediately win that board!
        const targetBoard = currentBoards[sr][sc];
        let opponentCanWinTarget = false;
        let opponentThreatCount = 0;
        for (let tr = 0; tr < 3; tr++) {
          for (let tc = 0; tc < 3; tc++) {
            if (targetBoard[tr][tc] === null) {
              const testT = targetBoard.map(r => [...r]);
              testT[tr][tc] = 'X';
              if (check3x3Winner(testT) === 'X') {
                opponentCanWinTarget = true;
                opponentThreatCount++;
              }
            }
          }
        }

        if (opponentCanWinTarget) {
          // Check if that win would win the game for opponent
          const testOppMain = currentSubWinners.map(r => [...r]);
          testOppMain[sr][sc] = 'X';
          if (checkMainWinner(testOppMain) === 'X') {
            score -= 20000; // NEVER send them to win the entire game!
          } else {
            score -= (280 + opponentThreatCount * 40); // Giving opponent a sub-board win
          }
        }

        // Sending opponent to center board (1,1) is risky if it's uncaptured
        if (sr === 1 && sc === 1 && currentSubWinners[1][1] === null) {
          score -= 60;
        }
      }

      return score;
    };

    if (diff === 'medium') {
      let bestScore = -Infinity;
      let bestMove = legalMoves[0];
      for (const mv of legalMoves) {
        const sc = rateMove(mv) + Math.random() * 4;
        if (sc > bestScore) {
          bestScore = sc;
          bestMove = mv;
        }
      }
      return bestMove;
    }

    // For 'hard' and 'master': 2-ply lookahead
    const scoredMoves = legalMoves.map(mv => ({ mv, score: rateMove(mv) }));
    scoredMoves.sort((a, b) => b.score - a.score);

    if (diff === 'hard' || scoredMoves[0].score >= 20000) {
      return scoredMoves[0].mv;
    }

    // MASTER: Deep lookahead across the top candidate moves
    const candidates = scoredMoves.slice(0, Math.min(10, scoredMoves.length));
    let masterBestMove = candidates[0].mv;
    let masterBestScore = -Infinity;

    for (const cand of candidates) {
      const { mr, mc, sr, sc } = cand.mv;
      // Simulate state after bot move
      const simBoards = currentBoards.map(r => r.map(c => c.map(subR => [...subR])));
      simBoards[mr][mc][sr][sc] = 'O';
      const simSubWinners = currentSubWinners.map(r => [...r]);
      const simSubWin = check3x3Winner(simBoards[mr][mc]);
      if (simSubWin) simSubWinners[mr][mc] = simSubWin;

      // Check if this move directly won the game for bot
      if (checkMainWinner(simSubWinners) === 'O') {
        return cand.mv; // Instant win
      }

      // Opponent target board
      const simNextFree = simSubWinners[sr][sc] !== null || 
        simBoards[sr][sc].every(row => row.every(cell => cell !== null));
      const simOpponentTarget = simNextFree ? null : { r: sr, c: sc };

      // Find opponent's best counter-move
      let opponentBestCounterScore = -Infinity;
      for (let omr = 0; omr < 3; omr++) {
        for (let omc = 0; omc < 3; omc++) {
          if (simOpponentTarget && (simOpponentTarget.r !== omr || simOpponentTarget.c !== omc)) continue;
          if (simSubWinners[omr][omc] !== null) continue;
          for (let osr = 0; osr < 3; osr++) {
            for (let osc = 0; osc < 3; osc++) {
              if (simBoards[omr][omc][osr][osc] === null) {
                // Rate opponent reply
                const testX = simBoards[omr][omc].map(r => [...r]);
                testX[osr][osc] = 'X';
                let opScore = 0;
                if (check3x3Winner(testX) === 'X') {
                  opScore += 350;
                  const testM = simSubWinners.map(r => [...r]);
                  testM[omr][omc] = 'X';
                  if (checkMainWinner(testM) === 'X') opScore += 30000;
                  else opScore += evaluateMacroBoard(testM, 'X');
                }
                // Check if opponent send bot to a closed board (giving bot free move)
                const botTargetClosed = simSubWinners[osr][osc] !== null ||
                  simBoards[osr][osc].every(row => row.every(cell => cell !== null));
                if (botTargetClosed) {
                  opScore -= 100; // Disadvantage to opponent to give bot free move
                }

                if (opScore > opponentBestCounterScore) {
                  opponentBestCounterScore = opScore;
                }
              }
            }
          }
        }
      }

      if (opponentBestCounterScore === -Infinity) opponentBestCounterScore = 0;
      const combinedScore = cand.score - (opponentBestCounterScore * 0.9);
      if (combinedScore > masterBestScore) {
        masterBestScore = combinedScore;
        masterBestMove = cand.mv;
      }
    }

    return masterBestMove;
  }, []);

  // Bot Turn Trigger
  useEffect(() => {
    if (gameMode !== 'bot' || turn !== 'O' || mainWinner) return;

    setIsBotThinking(true);
    const delay = botDifficulty === 'master' ? 350 : 250;
    const timer = setTimeout(() => {
      const best = findBestBotMove(boards, subWinners, activeBoard, botDifficulty);
      if (best) {
        makeMove(best.mr, best.mc, best.sr, best.sc);
      }
      setIsBotThinking(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [activeBoard, boards, botDifficulty, findBestBotMove, gameMode, mainWinner, makeMove, subWinners, turn]);

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
    if (targetIdx > 0) {
      const prevMove = history[targetIdx - 1];
      setLastMove({ mr: prevMove.mainRow, mc: prevMove.mainCol, sr: prevMove.subRow, sc: prevMove.subCol });
    } else {
      setLastMove(null);
    }
    audioService.playSound('button_click');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#06080d] text-white select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-[#0b0e17] border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm font-bold transition-all text-neutral-300 hover:text-white flex items-center gap-1.5 border border-neutral-700 active:scale-95 shadow-md cursor-pointer"
          >
            <span>←</span>
            <span>Hub</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚔️</span>
            <h1 className="text-sm sm:text-base font-black text-violet-400 tracking-wide">Ultimate Tic-Tac-Toe</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowRules(true)}
            className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-700 font-medium cursor-pointer"
          >
            📖 Rules
          </button>
          <button
            onClick={resetGame}
            className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-500 text-white font-black rounded-lg shadow-md cursor-pointer transition-transform active:scale-95"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Control / Config Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-[#090b12] border-b border-neutral-800/90 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode */}
          <div className="flex bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
            <button
              onClick={() => { setGameMode('bot'); resetGame(); }}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${gameMode === 'bot' ? 'bg-violet-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
            >
              🤖 vs AI
            </button>
            <button
              onClick={() => { setGameMode('pvp'); resetGame(); }}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${gameMode === 'pvp' ? 'bg-violet-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
            >
              👥 2-Player
            </button>
          </div>

          {/* AI Difficulty Selector */}
          {gameMode === 'bot' && (
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
              {(['easy', 'medium', 'hard', 'master'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setBotDifficulty(d)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize transition-all ${
                    botDifficulty === d
                      ? d === 'master'
                        ? 'bg-rose-500 text-white font-black shadow'
                        : 'bg-violet-500 text-white font-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Turn & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-[11px]">Turn:</span>
            <span className={`font-black px-2 py-0.5 rounded text-xs ${turn === 'X' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'}`}>
              {turn === 'X' ? 'Player X' : gameMode === 'bot' ? `Bot O (${botDifficulty})` : 'Player O'}
            </span>
          </div>

          {activeBoard === null ? (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded font-black text-[11px] animate-pulse">
              ⚡ FREE MOVE
            </span>
          ) : (
            <span className="text-neutral-400 text-[11px] hidden sm:inline">
              Target: Board ({activeBoard.r + 1}, {activeBoard.c + 1})
            </span>
          )}

          <button
            onClick={handleUndo}
            disabled={history.length === 0 || isBotThinking}
            className={`px-2.5 py-1 rounded text-xs transition border ${
              history.length > 0 && !isBotThinking
                ? 'bg-neutral-900 border-neutral-700 hover:bg-neutral-800 text-neutral-200 cursor-pointer'
                : 'opacity-40 border-transparent cursor-not-allowed text-neutral-500'
            }`}
          >
            ↶ Undo
          </button>
        </div>
      </div>

      {/* Main Board Arena: Massive Tic-Tac-Toe Grid with Inner Grids */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 min-h-0 relative select-none">
        <div className="aspect-square w-full max-w-[min(94vw,560px,calc(100vh-170px))] max-h-[min(94vw,560px,calc(100vh-170px))] relative bg-[#090c14] border-2 sm:border-3 border-neutral-800 rounded-2xl shadow-2xl p-2 sm:p-3.5 flex items-center justify-center overflow-hidden">
          
          {/* THE MASSIVE TIC-TAC-TOE 3x3 GRID - Equal intersecting lines layout */}
          <div
            className="grid w-full h-full aspect-square relative"
            style={{
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(3, minmax(0, 1fr))'
            }}
          >
            {[0, 1, 2].map(mr =>
              [0, 1, 2].map(mc => {
                const isTarget = activeBoard === null ? subWinners[mr][mc] === null : (activeBoard.r === mr && activeBoard.c === mc);
                const subWin = subWinners[mr][mc];

                // Prominent thick dividers for the massive Tic-Tac-Toe # grid
                const macroBorderClasses = [
                  mc < 2 ? 'border-r-4 sm:border-r-[5px] border-amber-500/70' : '',
                  mr < 2 ? 'border-b-4 sm:border-b-[5px] border-amber-500/70' : '',
                ].filter(Boolean).join(' ');

                return (
                  <div
                    key={`main-${mr}-${mc}`}
                    className={`relative w-full h-full min-h-0 min-w-0 p-1 sm:p-1.5 transition-colors overflow-hidden ${macroBorderClasses} ${
                      isTarget && !subWin && !mainWinner
                        ? 'bg-amber-500/10 ring-2 ring-inset ring-amber-400/80 shadow-[inset_0_0_14px_rgba(251,191,36,0.18)]'
                        : subWin === 'X'
                        ? 'bg-cyan-950/25'
                        : subWin === 'O'
                        ? 'bg-rose-950/25'
                        : 'bg-transparent'
                    }`}
                  >
                    {/* INNER 3x3 TIC-TAC-TOE GRID */}
                    <div
                      className="grid w-full h-full min-h-0 min-w-0"
                      style={{
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gridTemplateRows: 'repeat(3, minmax(0, 1fr))'
                      }}
                    >
                      {[0, 1, 2].map(sr =>
                        [0, 1, 2].map(sc => {
                          const cellVal = boards[mr][mc][sr][sc];
                          const canPlayHere = isTarget && subWin === null && cellVal === null && !mainWinner && !isBotThinking;
                          const isLast = lastMove?.mr === mr && lastMove?.mc === mc && lastMove?.sr === sr && lastMove?.sc === sc;

                          // Inner classic Tic-Tac-Toe grid dividers (# lines)
                          const cellBorderClasses = [
                            sc < 2 ? 'border-r-2 border-neutral-700/80' : '',
                            sr < 2 ? 'border-b-2 border-neutral-700/80' : ''
                          ].filter(Boolean).join(' ');

                          return (
                            <button
                              key={`sub-${sr}-${sc}`}
                              onClick={() => makeMove(mr, mc, sr, sc)}
                              disabled={!canPlayHere}
                              className={`w-full h-full min-h-0 min-w-0 flex items-center justify-center p-0 m-0 leading-none overflow-hidden select-none transition-colors relative ${cellBorderClasses} ${
                                isLast
                                  ? 'animate-move-pulse'
                                  : canPlayHere
                                  ? 'hover:bg-amber-400/20 cursor-pointer active:scale-95'
                                  : 'cursor-default'
                              }`}
                            >
                              {cellVal === 'X' ? (
                                <span className="font-black text-cyan-400 text-sm sm:text-base md:text-xl drop-shadow-[0_0_6px_rgba(34,211,238,0.7)] pointer-events-none select-none">
                                  ✕
                                </span>
                              ) : cellVal === 'O' ? (
                                <span className="font-black text-rose-400 text-sm sm:text-base md:text-xl drop-shadow-[0_0_6px_rgba(244,63,94,0.7)] pointer-events-none select-none">
                                  ◯
                                </span>
                              ) : canPlayHere ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50 pointer-events-none" />
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Sub-board Claim Overlay Watermark */}
                    {subWin && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10 animate-fade-in">
                        <span
                          className={`text-4xl sm:text-6xl font-black select-none ${
                            subWin === 'X'
                              ? 'text-cyan-400 drop-shadow-[0_0_16px_rgba(6,182,212,0.9)]'
                              : subWin === 'O'
                              ? 'text-rose-400 drop-shadow-[0_0_16px_rgba(244,63,94,0.9)]'
                              : 'text-neutral-500'
                          }`}
                        >
                          {subWin === 'TIE' ? '—' : subWin === 'X' ? '✕' : '◯'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Main Winner Modal Overlay */}
          {mainWinner && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
              <span className="text-5xl mb-2">{mainWinner === 'TIE' ? '🤝' : '🏆'}</span>
              <h2 className="text-2xl sm:text-3xl font-black text-amber-400 mb-1">
                {mainWinner === 'TIE' ? 'IT IS A DRAW!' : `PLAYER ${mainWinner} WINS!`}
              </h2>
              <p className="text-sm text-neutral-300 mb-6">
                {mainWinner === 'TIE'
                  ? 'No winning alignment on the main grid.'
                  : `Secured 3 sub-boards in a row on the main grid!`}
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
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f131d] border border-neutral-700 p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-2xl text-neutral-200 text-xs sm:text-sm space-y-3">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <h3 className="text-base font-bold text-violet-400">Rules of Ultimate Tic-Tac-Toe</h3>
              <button
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>
            <ul className="list-disc pl-4 space-y-2 text-neutral-300">
              <li>
                <strong className="text-white">Nested Grid:</strong> The board consists of a large 3×3 grid where each square holds a smaller 3×3 tic-tac-toe board.
              </li>
              <li>
                <strong className="text-white">The Sending Rule:</strong> Your relative position inside a mini board determines the exact mini board your opponent must play in next.
              </li>
              <li>
                <strong className="text-white">Winning a Board:</strong> Get 3 marks in a row in any mini board to claim that square on the main grid.
              </li>
              <li>
                <strong className="text-white">Free Move:</strong> If sent to a board that is already won or full, you can place your mark in ANY open board!
              </li>
              <li>
                <strong className="text-white">Winning the Game:</strong> Align 3 claimed sub-boards horizontally, vertically, or diagonally on the main grid.
              </li>
            </ul>
            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-3 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
