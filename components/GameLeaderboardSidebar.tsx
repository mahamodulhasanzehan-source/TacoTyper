import React, { useState, useEffect } from 'react';
import { LeaderboardWidget } from './Overlays';

interface GameLeaderboardSidebarProps {
  mode: string;
  allowedModes?: string[];
  tabLabels?: Record<string, string>;
  title?: string;
  scoreLabel?: string;
  storageKey: string;
  isMobile: boolean;
  showMobileLeaderboard: boolean;
  onCloseMobileLeaderboard: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export const MobileLeaderboardButton: React.FC<{
  onClick: () => void;
  className?: string;
}> = ({ onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 bg-[#f4b400] text-black border border-white hover:bg-yellow-400 font-bold text-xs rounded-lg shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer font-sans shrink-0 ${className}`}
    title="Open Leaderboard"
    onPointerDown={e => e.stopPropagation()}
  >
    <span>🏆</span>
    <span className="text-[10px] font-black">RANK</span>
  </button>
);

export const GameLeaderboardSidebar: React.FC<GameLeaderboardSidebarProps> = ({
  mode,
  allowedModes,
  tabLabels,
  title,
  scoreLabel,
  storageKey,
  isMobile,
  showMobileLeaderboard,
  onCloseMobileLeaderboard,
  onCollapseChange
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const activeModes = allowedModes || [mode];

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem(storageKey, collapsed ? 'true' : 'false');
    if (onCollapseChange) {
      onCollapseChange(collapsed);
    }
  };

  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
  }, [isCollapsed, onCollapseChange]);

  return (
    <>
      {/* Desktop Leaderboard Column (Collapsible) */}
      {!isMobile && (
        <div
          className={`h-full z-[120] transition-all duration-300 ease-in-out shrink-0 relative ${
            isCollapsed
              ? 'w-[42px] border-l border-neutral-800 bg-[#0a0a0a] flex flex-col items-center py-3 cursor-pointer hover:bg-neutral-900 group select-none shadow-[-5px_0_15px_rgba(0,0,0,0.5)]'
              : 'w-[280px] sm:w-[310px] border-l border-neutral-800 bg-[#0a0a0a] shadow-[-10px_0_30px_rgba(0,0,0,0.8)]'
          }`}
          onPointerDown={e => e.stopPropagation()}
          onClick={isCollapsed ? () => handleToggleCollapse(false) : undefined}
          title={isCollapsed ? "Click anywhere on the bar to expand leaderboard" : undefined}
        >
          {isCollapsed ? (
            <div className="w-full h-full flex flex-col items-center justify-between py-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:border-amber-400/50 transition-all text-xs font-bold shadow-sm">
                ◀
              </div>
              <div className="flex flex-col items-center gap-3 my-auto">
                <span className="text-base group-hover:scale-110 transition-transform">🏆</span>
                <span
                  className="text-[10px] tracking-widest text-[#f4b400] font-black uppercase select-none group-hover:text-amber-300 transition-colors"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  LEADERBOARD
                </span>
              </div>
              <span className="text-[10px] text-neutral-600 group-hover:text-amber-400 transition-colors">
                ◀
              </span>
            </div>
          ) : (
            <div className="h-full w-full relative">
              <LeaderboardWidget
                className="h-full border-none"
                allowedModes={activeModes}
                defaultMode={mode}
                tabLabels={tabLabels}
                customTitle={title}
                scoreLabel={scoreLabel}
                onCollapse={() => handleToggleCollapse(true)}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile Leaderboard Popup Modal */}
      {isMobile && showMobileLeaderboard && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={onCloseMobileLeaderboard}
          onPointerDown={e => e.stopPropagation()}
        >
          <div
            className="w-full max-w-sm h-[85vh] max-h-[580px] flex flex-col bg-[#0a0a0a] border-4 border-white shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <LeaderboardWidget
              className="h-full border-none"
              allowedModes={activeModes}
              defaultMode={mode}
              tabLabels={tabLabels}
              customTitle={title}
              scoreLabel={scoreLabel}
              onClose={onCloseMobileLeaderboard}
            />
          </div>
        </div>
      )}
    </>
  );
};
