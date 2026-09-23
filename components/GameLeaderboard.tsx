import React, { useState } from 'react';
import { AppId } from '../types';
import { GAME_LEADERBOARD_CONFIGS } from '../services/leaderboardConfig';
import { LeaderboardWidget } from './Overlays';

interface GameLeaderboardProps {
  appId: AppId;
  defaultMode?: string;
  className?: string;
}

export const GameLeaderboard: React.FC<GameLeaderboardProps> = ({
  appId,
  defaultMode,
  className = ''
}) => {
  const config = GAME_LEADERBOARD_CONFIGS[appId];
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!config) return null;

  return (
    <>
      {/* --- DESKTOP COLLAPSIBLE SIDEBAR (>=768px) --- */}
      <div 
        className={`hidden md:flex relative h-full transition-all duration-300 ease-in-out shrink-0 select-none ${
          isDesktopCollapsed ? 'w-10' : 'w-[280px] lg:w-[320px]'
        } ${className}`}
      >
        {isDesktopCollapsed ? (
          /* Thin collapsed bar */
          <button
            onClick={() => setIsDesktopCollapsed(false)}
            className="w-full h-full bg-[#0c0c0e] border-l border-neutral-800 hover:border-amber-400/50 hover:bg-neutral-900/90 flex flex-col items-center justify-between py-6 cursor-pointer group transition-all"
            title="Expand Leaderboard"
            aria-label="Expand Leaderboard"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-base group-hover:scale-110 transition-transform">🏆</span>
              <span className="text-[10px] text-amber-400 font-mono">◀</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 py-4">
              {['R', 'A', 'N', 'K', 'S'].map((char, i) => (
                <span key={i} className="text-[10px] font-bold text-neutral-400 group-hover:text-amber-300 tracking-wider">
                  {char}
                </span>
              ))}
            </div>

            <span className="text-xs text-neutral-500 group-hover:text-white transition-colors">⚡</span>
          </button>
        ) : (
          /* Expanded sidebar */
          <div className="relative w-full h-full">
            {/* Collapse toggle tab on the left edge */}
            <button
              onClick={() => setIsDesktopCollapsed(true)}
              title="Collapse to Thin Bar"
              aria-label="Collapse to Thin Bar"
              className="absolute top-3.5 -left-7 z-[160] bg-[#0c0c0e] border-y border-l border-neutral-700 hover:border-amber-400 text-amber-400 text-[10px] font-bold py-2 px-1 rounded-l-md shadow-[-4px_2px_10px_rgba(0,0,0,0.8)] flex flex-col items-center gap-0.5 cursor-pointer transition-colors active:scale-95"
            >
              <span className="text-xs">🏆</span>
              <span className="text-[9px] leading-none text-white/80 font-mono">▶</span>
            </button>

            <div className="w-full h-full overflow-hidden">
              <LeaderboardWidget
                className="h-full border-l-2 border-neutral-800 bg-[#0a0a0a]"
                allowedModes={config.modes}
                defaultMode={defaultMode || config.defaultMode}
                tabLabels={config.labels}
                customTitle={config.title}
                scoreLabel={config.scoreLabel}
              />
            </div>
          </div>
        )}
      </div>

      {/* --- MOBILE MODAL / FULL-SCREEN DRAWER (<768px) --- */}
      {!config.isDesktopOnly && (
        <div className="md:hidden">
          {/* Persistent Floating Trophy Button */}
          <button
            onClick={() => setIsMobileOpen(true)}
            title="View Leaderboard"
            aria-label="View Leaderboard"
            className="fixed top-2.5 right-2.5 sm:top-4 sm:right-4 z-[55] bg-neutral-900/90 hover:bg-neutral-800 active:scale-95 border border-amber-400/40 text-amber-400 p-2 sm:p-2.5 rounded-full shadow-lg backdrop-blur-md flex items-center justify-center cursor-pointer transition-transform"
          >
            <span className="text-base sm:text-lg">🏆</span>
          </button>

          {/* Full-Screen Drawer / Popup Overlay */}
          {isMobileOpen && (
            <div 
              className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex justify-end animate-fadeIn"
              onClick={() => setIsMobileOpen(false)}
            >
              <div 
                className="w-full max-w-[340px] h-full bg-[#0a0a0a] border-l border-neutral-800 shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <LeaderboardWidget
                  className="h-full border-none"
                  allowedModes={config.modes}
                  defaultMode={defaultMode || config.defaultMode}
                  tabLabels={config.labels}
                  customTitle={config.title}
                  scoreLabel={config.scoreLabel}
                  onClose={() => setIsMobileOpen(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
