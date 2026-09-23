import React, { useEffect } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { ChessBoard } from './chess/src/components/ChessBoard';

interface ChessGameProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

export default function ChessGame({ onBackToHub, username }: ChessGameProps) {
  useEffect(() => {
    incrementGamePlays('chess');
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0e14] text-white font-sans select-none overflow-hidden relative">
      {/* Top Header Bar matching Taco Hub layout */}
      <div className="flex justify-between items-center w-full px-3 sm:px-6 py-2 border-b border-neutral-800/80 bg-black/60 backdrop-blur-md shrink-0 z-30">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-full text-xs sm:text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
          title="Back to Hub"
        >
          <span>⬅️</span>
          <span className="hidden sm:inline">Hub</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xl">♟️</span>
          <span className="font-extrabold text-sm sm:text-base text-indigo-400 font-mono tracking-wider">CHESS</span>
          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden sm:inline-block">
            STOCKFISH & PVP
          </span>
        </div>

        <div className="flex items-center gap-2">
          {username && (
            <div className="text-xs text-neutral-400 font-mono hidden md:block">
              Player: <span className="text-amber-400 font-bold">{username}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Chess Game Container */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden">
        <ChessBoard />
      </div>
    </div>
  );
}
