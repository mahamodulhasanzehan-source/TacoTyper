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
      className={`group relative w-full cursor-pointer select-none rounded-2xl sm:rounded-3xl border-2 sm:border-[3px] transition-all duration-200 active:scale-[0.97] hover:-translate-y-1 overflow-hidden flex flex-col justify-between ${
        featured
          ? 'min-h-[160px] sm:min-h-[190px] p-3 sm:p-4'
          : 'aspect-square min-h-[140px] sm:min-h-[170px] p-2.5 sm:p-3'
      }`}
      style={{
        borderColor: `${game.color}`,
        backgroundColor: '#12141c',
        backgroundImage: `radial-gradient(circle at 50% 30%, ${game.color}25 0%, #0e1017 80%)`,
        boxShadow: `0 8px 24px -4px rgba(0,0,0,0.8), 0 0 16px -2px ${game.accentGlow}`,
      }}
    >
      {/* Top Header Row: Category Badge & Play count */}
      <div className="flex items-center justify-between z-10 w-full mb-1">
        <span
          className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm font-sans"
          style={{
            backgroundColor: `${game.color}33`,
            borderColor: game.color,
            color: game.color,
          }}
        >
          {featured ? '👑 POPULAR' : game.tag}
        </span>

        <div
          className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-black/40 border border-neutral-800"
          style={{ color: game.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: game.color }} />
          <span>{game.plays.toLocaleString()}</span>
        </div>
      </div>

      {/* Center Artwork: High-Fidelity 2-Player-Games Style Vector Stage */}
      <div className="flex-1 flex items-center justify-center my-1 z-10 relative">
        <div
          className={`rounded-xl sm:rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-108 ${
            featured
              ? 'w-20 h-20 sm:w-24 sm:h-24'
              : 'w-16 h-16 sm:w-20 sm:h-20'
          }`}
          style={{
            backgroundColor: '#0a0d14',
            borderColor: `${game.color}99`,
            boxShadow: `inset 0 0 16px ${game.color}20, 0 4px 12px rgba(0,0,0,0.6)`
          }}
        >
          <GameArtwork id={game.id as AppId} color={game.color} />
        </div>
      </div>

      {/* Bottom Bar: Bold Readable Title & Play Ribbon */}
      <div className="z-10 w-full flex items-center justify-between gap-1.5 pt-1 border-t border-white/5">
        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-white text-xs sm:text-sm font-black truncate tracking-wide group-hover:text-[var(--accent-color)] transition-colors">
            {game.title}
          </span>
          <span className="text-[9px] sm:text-[10px] text-neutral-400 font-sans truncate font-medium">
            {game.description}
          </span>
        </div>

        {/* 2-Player Style Play Pill */}
        <div
          className="shrink-0 flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-black font-black text-[9px] sm:text-[10px] transition-transform group-hover:scale-105 shadow-md"
          style={{
            backgroundColor: game.color,
            boxShadow: `0 0 10px ${game.accentGlow}`
          }}
        >
          <span>PLAY</span>
          <span className="text-[7px]">▶</span>
        </div>
      </div>
    </div>
  );
};
