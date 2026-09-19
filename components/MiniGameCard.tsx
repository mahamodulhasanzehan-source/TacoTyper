import React from 'react';
import { GameArtwork } from './GameArtwork';
import { AppId } from '../types';

export interface GameCardItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  accentGlow: string;
  tag: string;
  plays: number;
  action: () => void;
}

interface MiniGameCardProps {
  game: GameCardItem;
  featured?: boolean;
}

export const MiniGameCard: React.FC<MiniGameCardProps> = ({ game, featured = false }) => {
  return (
    <div
      onClick={game.action}
      className={`group relative w-full cursor-pointer select-none rounded-2xl sm:rounded-3xl border-2 sm:border-[3px] transition-all duration-150 active:translate-y-1 overflow-hidden flex flex-col justify-between ${
        featured
          ? 'min-h-[170px] sm:min-h-[210px] p-3.5 sm:p-5'
          : 'aspect-square min-h-[145px] sm:min-h-[175px] p-2.5 sm:p-3.5'
      }`}
      style={{
        borderColor: game.color,
        background: `linear-gradient(180deg, #181c28 0%, #0c0e14 100%)`,
        boxShadow: `0 6px 0 0 ${game.color}66, 0 12px 24px -4px rgba(0,0,0,0.85), inset 0 1px 0 0 rgba(255,255,255,0.2)`,
      }}
    >
      {/* Top Banner: Game Category Tag & Live Plays Counter */}
      <div className="flex items-center justify-between z-10 w-full mb-1">
        <span
          className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm font-sans flex items-center gap-1"
          style={{
            backgroundColor: `${game.color}28`,
            borderColor: `${game.color}88`,
            color: game.color,
          }}
        >
          {featured ? '👑 TOP PICK' : game.tag}
        </span>

        <div
          className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-black/60 border border-neutral-800"
          style={{ color: game.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: game.color }} />
          <span>{game.plays.toLocaleString()}</span>
        </div>
      </div>

      {/* Center Artwork: 2-Player-Games Arcade Stage */}
      <div className="flex-1 flex items-center justify-center my-1 z-10 relative">
        <div
          className={`rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-108 group-active:scale-95 ${
            featured
              ? 'w-24 h-24 sm:w-28 sm:h-28'
              : 'w-18 h-18 sm:w-22 sm:h-22'
          }`}
          style={{
            backgroundColor: '#07090e',
            borderColor: `${game.color}`,
            boxShadow: `0 0 18px ${game.color}35, inset 0 0 12px ${game.color}25`
          }}
        >
          <GameArtwork id={game.id as AppId} color={game.color} />
        </div>
      </div>

      {/* Bottom Bar: Bold High-Contrast Title & PLAY Button */}
      <div className="z-10 w-full flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/10">
        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-white text-xs sm:text-sm font-black truncate tracking-wide group-hover:text-[var(--accent-color)] transition-colors drop-shadow-sm font-['Press_Start_2P']">
            {game.title}
          </span>
          <span className="text-[9px] sm:text-[10px] text-neutral-400 font-sans truncate font-medium">
            {game.description}
          </span>
        </div>

        {/* Chunky 3D Play Button */}
        <div
          className="shrink-0 flex items-center justify-center gap-1 px-3 py-1 rounded-xl text-black font-black text-[9px] sm:text-[10px] shadow-md transition-transform group-hover:scale-105"
          style={{
            backgroundColor: game.color,
            boxShadow: `0 3px 0 0 rgba(0,0,0,0.5), 0 0 12px ${game.accentGlow}`
          }}
        >
          <span>PLAY</span>
          <span className="text-[8px]">▶</span>
        </div>
      </div>
    </div>
  );
};

