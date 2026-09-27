import React, { useState, useEffect } from 'react';
import { LeaderboardWidget } from './Overlays';

interface GameLeaderboardSidebarProps {
  mode: string;
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
              ? 'w-[38px] border-l-2 border-white/80 bg-[#0a0a0a] flex flex-col items-center py-2 cursor-pointer hover:bg-neutral-900 group select-none shadow-[-5px_0_15px_rgba(0,0,0,0.5)]'
              : 'w-[280px] sm:w-[300px] border-l-4 border-white bg-[#0a0a0a] shadow-[-10px_0_30px_rgba(0,0,0,0.8)]'
          }`}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {isCollapsed ? (
            <div
              className="w-full h-full flex flex-col items-center justify-between py-3"
              onClick={() => handleToggleCollapse(false)}
              title="Expand Leaderboard"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCollapse(false);
                }}
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 text-xs font-bold cursor-pointer transition-colors shadow-sm"
                title="Expand Leaderboard"
              >
                ◀
              </button>
              <div className="flex flex-col items-center gap-3 my-auto">
                <span className="text-sm">🏆</span>
                <span
                  className="text-[9px] tracking-widest text-[#f4b400] font-bold uppercase select-none"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  LEADERBOARD
                </span>
              </div>
              <div className="text-[10px] text-neutral-500 group-hover:text-white transition-colors">
                ◀
              </div>
            </div>
          ) : (
            <div className="h-full w-full relative">
              {/* Button at top-left corner of column to collapse */}
              <button
                onClick={() => handleToggleCollapse(true)}
                className="absolute top-2 left-2 z-[140] w-6 h-6 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 rounded flex items-center justify-center text-xs font-bold cursor-pointer transition-colors shadow-md"
                title="Collapse Leaderboard"
              >
                ▶
              </button>
              <LeaderboardWidget
                className="h-full border-none"
                allowedModes={[mode]}
                defaultMode={mode}
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
              allowedModes={[mode]}
              defaultMode={mode}
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
