import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';

interface NimProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export default function NimGame({ onBackToHub }: NimProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isMisere, setIsMisere] = useState(true); // Last to take loses
  // Standard 4-row pyramid layout: 1 (top), 3, 5, 7 (bottom)
  const [piles, setPiles] = useState<number[]>([1, 3, 5, 7]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [selectedCount, setSelectedCount] = useState(1);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lastAction, setLastAction] = useState('Your turn! Select a row and take matchsticks.');
  const [winner, setWinner] = useState<'player' | 'bot' | null>(null);

  useEffect(() => {
    incrementGamePlays('nim');
  }, []);

  const resetGame = useCallback(() => {
    setPiles([1, 3, 5, 7]);
    setIsPlayerTurn(true);
    setSelectedPile(null);
    setSelectedCount(1);
    setIsBotThinking(false);
    setGameOver(false);
    setWinner(null);
    setLastAction('New game! Select a row to take sticks.');
  }, []);

  const totalSticks = useMemo(() => {
    return piles.reduce((a, b) => a + b, 0);
  }, [piles]);

  // Optimal Bot Move Computation
  const getOptimalMove = useCallback((currentPiles: number[], misere: boolean): { pileIdx: number; removeCount: number } => {
    const nonZeroIndices = currentPiles
      .map((count, idx) => (count > 0 ? idx : -1))
      .filter(idx => idx !== -1);

    // Misere Endgame: Check if all remaining piles will have size <= 1
    const pilesGreaterThanOne = currentPiles.filter(c => c > 1);
    if (misere && pilesGreaterThanOne.length <= 1) {
      // Leave an odd number of 1-sized piles
      let targetPileIdx = currentPiles.findIndex(c => c > 1);
      if (targetPileIdx === -1) {
        targetPileIdx = nonZeroIndices[0];
        return { pileIdx: targetPileIdx, removeCount: 1 };
      }

      const onesCount = currentPiles.filter((c, idx) => c === 1 && idx !== targetPileIdx).length;
      const desiredTargetSize = (onesCount % 2 === 1) ? 0 : 1;
      const remove = currentPiles[targetPileIdx] - desiredTargetSize;
      return { pileIdx: targetPileIdx, removeCount: Math.max(1, remove) };
    }

    // Standard XOR strategy
    const sum = currentPiles.reduce((acc, c) => acc ^ c, 0);
    if (sum !== 0) {
      for (const idx of nonZeroIndices) {
        const target = currentPiles[idx] ^ sum;
        if (target < currentPiles[idx]) {
          return { pileIdx: idx, removeCount: currentPiles[idx] - target };
        }
      }
    }

    // Disadvantage state: remove 1 from largest pile
    let maxIdx = nonZeroIndices[0];
    for (const idx of nonZeroIndices) {
      if (currentPiles[idx] > currentPiles[maxIdx]) {
        maxIdx = idx;
      }
    }
    return { pileIdx: maxIdx, removeCount: 1 };
  }, []);

  // Player Confirms Move
  const handlePlayerMove = () => {
    if (!isPlayerTurn || selectedPile === null || gameOver || isBotThinking) return;
    const available = piles[selectedPile];
    if (available <= 0 || selectedCount <= 0 || selectedCount > available) return;

    audioService.playSound('piece_drop');
    const nextPiles = [...piles];
    nextPiles[selectedPile] -= selectedCount;
    setPiles(nextPiles);

    setLastAction(`You removed ${selectedCount} stick${selectedCount > 1 ? 's' : ''} from Row ${selectedPile + 1}.`);
    setSelectedPile(null);
    setSelectedCount(1);

    const remaining = nextPiles.reduce((a, b) => a + b, 0);
    if (remaining === 0) {
      setGameOver(true);
      if (isMisere) {
        setWinner('bot');
        audioService.playSound('failure');
      } else {
        setWinner('player');
        audioService.playSound('success');
      }
      return;
    }

    setIsPlayerTurn(false);
  };

  // Bot Turn Automation
  useEffect(() => {
    if (isPlayerTurn || gameOver) return;

    setIsBotThinking(true);
    const botTimer = setTimeout(() => {
      const nonZeroPiles = piles
        .map((count, idx) => ({ count, idx }))
        .filter(p => p.count > 0);

      if (nonZeroPiles.length === 0) return;

      let chosenPile = nonZeroPiles[0].idx;
      let chosenRemove = 1;

      if (difficulty === 'easy') {
        const randomTarget = nonZeroPiles[Math.floor(Math.random() * nonZeroPiles.length)];
        chosenPile = randomTarget.idx;
        chosenRemove = Math.floor(Math.random() * randomTarget.count) + 1;
      } else if (difficulty === 'medium') {
        if (Math.random() < 0.65) {
          const move = getOptimalMove(piles, isMisere);
          chosenPile = move.pileIdx;
          chosenRemove = move.removeCount;
        } else {
          const randomTarget = nonZeroPiles[Math.floor(Math.random() * nonZeroPiles.length)];
          chosenPile = randomTarget.idx;
          chosenRemove = Math.floor(Math.random() * randomTarget.count) + 1;
        }
      } else {
        const move = getOptimalMove(piles, isMisere);
        chosenPile = move.pileIdx;
        chosenRemove = move.removeCount;
      }

      audioService.playSound('piece_land');
      const nextPiles = [...piles];
      nextPiles[chosenPile] -= chosenRemove;
      setPiles(nextPiles);

      setLastAction(`Bot took ${chosenRemove} stick${chosenRemove > 1 ? 's' : ''} from Row ${chosenPile + 1}.`);

      const remaining = nextPiles.reduce((a, b) => a + b, 0);
      if (remaining === 0) {
        setGameOver(true);
        if (isMisere) {
          setWinner('player');
          audioService.playSound('success');
        } else {
          setWinner('bot');
          audioService.playSound('failure');
        }
      } else {
        setIsPlayerTurn(true);
      }
      setIsBotThinking(false);
    }, 600);

    return () => clearTimeout(botTimer);
  }, [isPlayerTurn, gameOver, piles, difficulty, isMisere, getOptimalMove]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#0b0c10] text-white select-none overflow-hidden font-sans">
      <header className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 border-b border-neutral-800 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHub}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-amber-400">NIM</h1>
            <span className="text-[9px] text-neutral-400 font-mono hidden sm:inline">PYRAMID MATCHSTICKS (1-3-5-7)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Misere Toggle */}
          <button
            onClick={() => { setIsMisere(!isMisere); resetGame(); }}
            className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded border ${
              isMisere
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
          >
            {isMisere ? 'Misère (Last Loses)' : 'Normal (Last Wins)'}
          </button>

          {/* Difficulty */}
          <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); resetGame(); }}
                className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded capitalize transition-all ${
                  difficulty === d
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-neutral-400 hover:text-white'
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

      {/* Turn & Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-neutral-950/70 border-b border-neutral-900 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2 truncate pr-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isPlayerTurn ? 'bg-amber-400 animate-ping' : 'bg-rose-500'}`} />
          <span className="text-neutral-300 truncate text-[11px] sm:text-xs">{lastAction}</span>
        </div>
        <div className="text-neutral-400 text-[11px] shrink-0 font-bold">
          Sticks Left: <span className="text-amber-400 font-mono text-xs sm:text-sm">{totalSticks}</span>
        </div>
      </div>

      {/* Nim Pyramid Stage: 1 stick (top), 3 sticks, 5 sticks, 7 sticks (bottom) */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 max-w-2xl mx-auto w-full overflow-y-auto">
        <div className="w-full flex flex-col items-center gap-2 sm:gap-3.5 my-auto">
          {piles.map((count, pileIdx) => {
            const isSelected = selectedPile === pileIdx;

            return (
              <div
                key={pileIdx}
                onClick={() => {
                  if (count > 0 && isPlayerTurn && !isBotThinking) {
                    setSelectedPile(pileIdx);
                    setSelectedCount(1);
                    audioService.playSound('tile_click');
                  }
                }}
                className={`w-full max-w-xl flex items-center justify-between px-3 sm:px-6 py-2 sm:py-2.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  count === 0
                    ? 'bg-neutral-950/40 border-neutral-900 opacity-40 cursor-not-allowed'
                    : isSelected
                    ? 'bg-amber-950/30 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-[1.01]'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="text-[10px] sm:text-xs font-mono font-bold text-neutral-400 w-16 sm:w-20 shrink-0">
                  ROW {pileIdx + 1} ({count})
                </div>

                {/* Matchsticks row centered */}
                <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3.5 py-1 min-h-[56px] sm:min-h-[64px]">
                  {Array.from({ length: count }).map((_, stickIdx) => (
                    <div
                      key={stickIdx}
                      className="flex flex-col items-center group transition-transform hover:-translate-y-1"
                    >
                      {/* Sulfur Red Tip */}
                      <div className="w-2.5 h-3 bg-red-600 rounded-full shadow-[0_0_6px_rgba(220,38,38,0.8)]" />
                      {/* Wooden Match Body */}
                      <div className="w-1.5 h-11 sm:h-13 bg-amber-200 rounded-b shadow-sm" />
                    </div>
                  ))}
                  {count === 0 && (
                    <span className="text-[10px] text-neutral-600 font-mono font-bold uppercase">EMPTY</span>
                  )}
                </div>

                <div className="w-16 sm:w-20 text-right shrink-0">
                  {isSelected && (
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase animate-pulse">
                      Selected
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Player Action Controls Tray */}
        {isPlayerTurn && selectedPile !== null && piles[selectedPile] > 0 && (
          <div className="w-full max-w-xl bg-neutral-900/95 border border-neutral-800 p-3 sm:p-4 rounded-2xl flex flex-col items-center gap-3 animate-fade-in shadow-xl mt-3 shrink-0">
            <div className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">
              Take sticks from Row {selectedPile + 1}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
              {Array.from({ length: piles[selectedPile] }).map((_, i) => {
                const countNum = i + 1;
                return (
                  <button
                    key={countNum}
                    onClick={() => setSelectedCount(countNum)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold font-mono text-xs sm:text-sm transition-all ${
                      selectedCount === countNum
                        ? 'bg-amber-500 text-black shadow-lg scale-105'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {countNum}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 w-full justify-center">
              <button
                onClick={handlePlayerMove}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                Confirm: Remove {selectedCount}
              </button>
              <button
                onClick={() => setSelectedPile(null)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-bold text-xs uppercase rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm z-30 p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-2">{winner === 'player' ? '🏆' : '💀'}</div>
            <h2 className={`text-2xl font-black mb-1 ${winner === 'player' ? 'text-amber-400' : 'text-rose-500'}`}>
              {winner === 'player' ? 'YOU WON!' : 'BOT WON!'}
            </h2>
            <p className="text-sm text-neutral-400 mb-6">
              {isMisere
                ? (winner === 'player'
                    ? 'Bot took the final stick and loses in Misère rules!'
                    : 'You took the final stick and lost under Misère rules!')
                : (winner === 'player'
                    ? 'You took the final stick and claimed victory!'
                    : 'Bot claimed the last stick and won!')}
            </p>
            <button
              onClick={resetGame}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <footer className="py-1 px-2 text-center text-[10px] text-neutral-500 border-t border-neutral-900 bg-neutral-950/60 shrink-0">
        Classic Pyramid Nim: Take any number of sticks from one row per turn
      </footer>
    </div>
  );
}
