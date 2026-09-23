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
          isDesktopCollapsed ? 'w-0' : 'w-[280px] lg:w-[320px]'
        } ${className}`}
      >
        {/* Expand / Collapse Edge Tab */}
        <button
          onClick={() => setIsDesktopCollapsed(prev => !prev)}
          title={isDesktopCollapsed ? 'Open Leaderboard' : 'Collapse Leaderboard'}
          aria-label={isDesktopCollapsed ? 'Open Leaderboard' : 'Collapse Leaderboard'}
          className="absolute top-3.5 -left-8 z-[160] bg-[#0a0a0a] border-y border-l border-white/30 hover:border-amber-400 text-[#f4b400] text-[11px] font-bold py-2.5 px-1.5 rounded-l-lg shadow-[-4px_2px_12px_rgba(0,0,0,0.8)] flex flex-col items-center gap-1 cursor-pointer transition-colors active:scale-95"
        >
          <span className="text-xs">🏆</span>
          <span className="text-[9px] leading-none text-white/80 font-mono">
            {isDesktopCollapsed ? '◀' : '▶'}
          </span>
        </button>

        {/* Sidebar content container */}
        <div className={`w-full h-full overflow-hidden transition-opacity duration-200 ${
          isDesktopCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          <div className="w-[280px] lg:w-[320px] h-full">
            <LeaderboardWidget
              className="h-full border-l-2 border-neutral-700/60 bg-[#0a0a0a]"
              allowedModes={config.modes}
              defaultMode={defaultMode || config.defaultMode}
              tabLabels={config.labels}
              customTitle={config.title}
              scoreLabel={config.scoreLabel}
            />
          </div>
        </div>
      </div>

      {/* --- MOBILE MODAL / FULL-SCREEN DRAWER (<768px) --- */}
      {/* Note: Taco Typer is desktop-only, so isDesktopOnly games omit this */}
      {!config.isDesktopOnly && (
        <div className="md:hidden">
          {/* Persistent Floating Trophy Button in Top-Right */}
          <button
            onClick={() => setIsMobileOpen(true)}
            title="View Leaderboard"
            aria-label="View Leaderboard"
            className="fixed top-2.5 right-2.5 sm:top-4 sm:right-4 z-[55] bg-neutral-900/90 hover:bg-neutral-800 active:scale-95 border border-neutral-700/80 p-2 sm:p-2.5 rounded-full shadow-lg backdrop-blur-md flex items-center justify-center cursor-pointer transition-transform"
          >
            <span className="text-base sm:text-lg">🏆</span>
          </button>

          {/* Full-Screen Drawer Overlay */}
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
