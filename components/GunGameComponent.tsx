import React from 'react';
import { audioService } from '../services/audioService';

interface GunGameProps {
  onBackToHub: () => void;
}

export default function GunGameComponent({ onBackToHub }: GunGameProps) {
  return (
    <div className="fixed inset-0 w-full h-full bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 z-50 font-sans select-none">
      <div className="max-w-md w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-4xl shadow-inner">
          🔫
        </div>

        <div className="flex flex-col gap-2">
          <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-xs font-bold uppercase tracking-wider mx-auto">
            Under Maintenance
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">Gun Game</h2>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
            Active gameplay is temporarily disabled while we upgrade the physics engine and mobile touch controls.
          </p>
        </div>

        <div className="text-xs text-neutral-500 font-medium">
          Status: <span className="text-amber-400">Coming soon.</span>
        </div>

        <button
          onClick={() => {
            audioService.playSound('button_click');
            onBackToHub();
          }}
          className="w-full py-3 px-6 bg-white text-black font-bold rounded-2xl hover:bg-neutral-200 active:scale-95 transition-all text-sm shadow-lg flex items-center justify-center gap-2"
        >
          <span>🏠</span>
          <span>Back to Game Hub</span>
        </button>
      </div>
    </div>
  );
}
