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
  const [piles, setPiles] = useState<number[]>([3, 5, 7]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [selectedCount, setSelectedCount] = useState(1);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lastAction, setLastAction] = useState('Your turn! Select a pile and choose how many sticks to remove.');
  const [winner, setWinner] = useState<'player' | 'bot' | null>(null);

  useEffect(() => {
    incrementGamePlays('nim');
  }, []);

  const resetGame = useCallback(() => {
    setPiles([3, 5, 7]);
    setIsPlayerTurn(true);
    setSelectedPile(null);
    setSelectedCount(1);
    setIsBotThinking(false);
    setGameOver(false);
    setWinner(null);
    setLastAction('New match! Select a pile to begin.');
  }, []);

  // Compute Nim-Sum (XOR of all piles)
  const nimSum = useMemo(() => {
    return piles.reduce((acc, count) => acc ^ count, 0);
  }, [piles]);

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
      // We want to leave an ODD number of 1-sized piles
      let targetPileIdx = currentPiles.findIndex(c => c > 1);
      if (targetPileIdx === -1) {
        // All remaining piles have 1 stick
        targetPileIdx = nonZeroIndices[0];
        return { pileIdx: targetPileIdx, removeCount: 1 };
      }

      const onesCount = currentPiles.filter((c, idx) => c === 1 && idx !== targetPileIdx).length;
      // If onesCount is odd, reduce target pile to 0; if onesCount is even, reduce target pile to 1
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

    // In a zero-sum position (disadvantage), remove 1 from the largest pile
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

    setLastAction(`You removed ${selectedCount} stick${selectedCount > 1 ? 's' : ''} from Pile ${selectedPile + 1}.`);
    setSelectedPile(null);
    setSelectedCount(1);

    const remaining = nextPiles.reduce((a, b) => a + b, 0);
    if (remaining === 0) {
      // Game Over: the player just took the last object
      setGameOver(true);
      if (isMisere) {
        setWinner('bot'); // In misere, player who took last loses
        audioService.playSound('failure');
      } else {
        setWinner('player'); // In normal, player who took last wins
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
        chosenRemove = 1 + Math.floor(Math.random() * randomTarget.count);
      } else if (difficulty === 'medium') {
        if (Math.random() < 0.5) {
          const move = getOptimalMove(piles, isMisere);
          chosenPile = move.pileIdx;
          chosenRemove = move.removeCount;
        } else {
          const randomTarget = nonZeroPiles[Math.floor(Math.random() * nonZeroPiles.length)];
          chosenPile = randomTarget.idx;
          chosenRemove = 1 + Math.floor(Math.random() * randomTarget.count);
        }
      } else {
        // Hard: Mathematical perfection
        const move = getOptimalMove(piles, isMisere);
        chosenPile = move.pileIdx;
        chosenRemove = move.removeCount;
      }

      audioService.playSound('piece_land');
      const nextPiles = [...piles];
      nextPiles[chosenPile] -= chosenRemove;
      setPiles(nextPiles);

      setLastAction(`Bot removed ${chosenRemove} stick${chosenRemove > 1 ? 's' : ''} from Pile ${chosenPile + 1}.`);

      const remaining = nextPiles.reduce((a, b) => a + b, 0);
      if (remaining === 0) {
        setGameOver(true);
        if (isMisere) {
          setWinner('player'); // Bot took last stick, player wins!
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
      <header className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            ← Hub
          </button>
          <div>
            <h1 className="text-base font-black tracking-wide text-amber-400">NIM</h1>
            <span className="text-[10px] text-neutral-400 font-mono">MATHEMATICAL PILE STRATEGY</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Misere Toggle */}
          <button
            onClick={() => { setIsMisere(!isMisere); resetGame(); }}
            className={`px-2.5 py-1 text-xs font-bold rounded border ${
              isMisere
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
          >
            {isMisere ? 'Misère (Last Loses)' : 'Normal (Last Wins)'}
          </button>

          {/* Difficulty */}
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); resetGame(); }}
                className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-all ${
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
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg border border-neutral-700 text-neutral-300"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Turn & Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-950/70 border-b border-neutral-900 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isPlayerTurn ? 'bg-amber-400 animate-ping' : 'bg-rose-500'}`} />
          <span className="text-neutral-300">{lastAction}</span>
        </div>
        <div className="text-neutral-400 font-bold">
          Sticks Left: <span className="text-amber-400 font-mono text-sm">{totalSticks}</span>
        </div>
      </div>

      {/* Nim Piles Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        <div className="w-full grid grid-cols-3 gap-4 mb-8">
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
                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  count === 0
                    ? 'bg-neutral-950/40 border-neutral-900 opacity-40 cursor-not-allowed'
                    : isSelected
                    ? 'bg-amber-950/30 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)] scale-[1.02]'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="text-xs font-mono font-bold text-neutral-400 mb-4">
                  PILE {pileIdx + 1} ({count})
                </div>

                {/* Matchsticks container */}
                <div className="flex flex-wrap items-center justify-center gap-2 min-h-[140px]">
                  {Array.from({ length: count }).map((_, stickIdx) => (
                    <div
                      key={stickIdx}
                      className="flex flex-col items-center group transition-transform hover:-translate-y-1"
                    >
                      {/* Sulfur Red Tip */}
                      <div className="w-2.5 h-3 bg-red-600 rounded-full shadow-[0_0_6px_rgba(220,38,38,0.8)]" />
                      {/* Wooden Match Body */}
                      <div className="w-1.5 h-16 bg-amber-200 rounded-b shadow-sm" />
                    </div>
                  ))}
                </div>

                {count === 0 && (
                  <div className="text-xs text-neutral-600 font-bold mt-2 font-mono">EMPTY</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Player Action Controls */}
        {isPlayerTurn && selectedPile !== null && piles[selectedPile] > 0 && (
          <div className="w-full bg-neutral-900/90 border border-neutral-800 p-5 rounded-2xl flex flex-col items-center gap-4 animate-fade-in shadow-xl">
            <div className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">
              Remove from Pile {selectedPile + 1}
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {Array.from({ length: piles[selectedPile] }).map((_, i) => {
                const countNum = i + 1;
                return (
                  <button
                    key={countNum}
                    onClick={() => setSelectedCount(countNum)}
                    className={`w-10 h-10 rounded-xl font-bold font-mono text-sm transition-all ${
                      selectedCount === countNum
                        ? 'bg-amber-400 text-black shadow-lg scale-105'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {countNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handlePlayerMove}
              className="w-full max-w-xs py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wider uppercase rounded-xl shadow-lg transition-all"
            >
              Confirm Remove ({selectedCount})
            </button>
          </div>
        )}

        {isBotThinking && (
          <div className="text-neutral-400 font-mono text-sm animate-pulse flex items-center gap-2">
            <span>🤖</span> Bot is calculating optimal Nim-sum...
          </div>
        )}

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 p-4">
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
              <div className="text-5xl mb-3">{winner === 'player' ? '🏆' : '💀'}</div>
              <h2 className={`text-2xl font-black mb-1 ${winner === 'player' ? 'text-amber-400' : 'text-rose-400'}`}>
                {winner === 'player' ? 'YOU WON THE GAME!' : 'BOT WINS!'}
              </h2>
              <p className="text-sm text-neutral-300 mb-6">
                {isMisere
                  ? (winner === 'player' ? 'Bot took the final stick and lost (Misère Play)!' : 'You were forced to take the last stick (Misère Play)!')
                  : (winner === 'player' ? 'You took the final stick and won (Normal Play)!' : 'Bot claimed the last stick and won!')}
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
      </div>

      <footer className="p-2.5 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950/40">
        Choose any single pile and take 1 to all sticks • In Misère rule, taking the last stick loses!
      </footer>
    </div>
  );
}
