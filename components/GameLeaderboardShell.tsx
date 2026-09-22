import React, { useState } from 'react';
import { LeaderboardWidget } from './Overlays';
import { audioService } from '../services/audioService';

export const GAME_LEADERBOARD_CONFIG: Record<string, { modes: string[]; defaultMode: string; title: string }> = {
  'tic-tac-toe': {
    modes: ['tic_tac_toe-medium', 'tic_tac_toe-hard'],
    defaultMode: 'tic_tac_toe-medium',
    title: 'Tic Tac Toe Streaks'
  },
  'wordle': {
    modes: ['wordle-5', 'wordle-6', 'wordle-7', 'wordle-8', 'wordle-9'],
    defaultMode: 'wordle-5',
    title: 'Wordle Streaks'
  },
  'angle': {
    modes: ['angle'],
    defaultMode: 'angle',
    title: 'Angle Snipers'
  },
  'dots-and-boxes': {
    modes: ['dots_boxes-4x4', 'dots_boxes-5x5', 'dots_boxes-6x6'],
    defaultMode: 'dots_boxes-4x4',
    title: 'Dots & Boxes Streaks'
  },
  'nim': {
    modes: ['nim'],
    defaultMode: 'nim',
    title: 'Nim Matchstick Duel'
  },
  'pong': {
    modes: ['pong-medium', 'pong-hard'],
    defaultMode: 'pong-medium',
    title: 'Pong Streaks'
  },
  'mine': {
    modes: ['minesweeper-beginner', 'minesweeper-intermediate', 'minesweeper-expert'],
    defaultMode: 'minesweeper-beginner',
    title: 'Minesweeper Times'
  },
  'ultimate-tictactoe': {
    modes: ['ultimate_ttt-medium', 'ultimate_ttt-hard', 'ultimate_ttt-master'],
    defaultMode: 'ultimate_ttt-medium',
    title: 'Ultimate Tic-Tac-Toe'
  },
  'reversi': {
    modes: ['reversi-medium', 'reversi-hard'],
    defaultMode: 'reversi-medium',
    title: 'Reversi Masters'
  },
  'checkers': {
    modes: ['checkers-medium', 'checkers-hard'],
    defaultMode: 'checkers-medium',
    title: 'Checkers Speed'
  },
  'knife-flip': {
    modes: ['knife_flip'],
    defaultMode: 'knife_flip',
    title: 'Knife Flip Records'
  },
  'snake': {
    modes: ['snake'],
    defaultMode: 'snake',
    title: 'Snake Length'
  },
  'brick-breaker': {
    modes: ['brick_breaker'],
    defaultMode: 'brick_breaker',
    title: 'Brick Breaker Scores'
  },
  'color-memory': {
    modes: ['color_memory'],
    defaultMode: 'color_memory',
    title: 'Color Memory'
  },
  'fruit-merge': {
    modes: ['fruit_merge'],
    defaultMode: 'fruit_merge',
    title: 'Fruit Merge'
  },
  'simon': {
    modes: ['simon'],
    defaultMode: 'simon',
    title: 'Simon Memory'
  },
  'tower-stacker': {
    modes: ['tower_stacker'],
    defaultMode: 'tower_stacker',
    title: 'Tower Stacker'
  },
  'tetris': {
    modes: ['tetris'],
    defaultMode: 'tetris',
    title: 'Tetris High Scores'
  },
  'game-2048': {
    modes: ['2048-3x3', '2048-4x4', '2048-5x5'],
    defaultMode: '2048-4x4',
    title: '2048 High Scores'
  },
  'iq': {
    modes: ['iq-test'],
    defaultMode: 'iq-test',
    title: 'IQ Test'
  },
  'connect-4': {
    modes: ['connect_4-time', 'connect_4-streak'],
    defaultMode: 'connect_4-time',
    title: 'Connect 4 Champions'
  },
  'quick-draw': {
    modes: ['quickdraw-medium-time', 'quickdraw-medium-streak', 'quickdraw-hard-time', 'quickdraw-hard-streak'],
    defaultMode: 'quickdraw-medium-time',
    title: 'Quick Draw Gunslingers'
  },
  'finger-sumo': {
    modes: ['fingersumo-medium', 'fingersumo-hard'],
    defaultMode: 'fingersumo-medium',
    title: 'Finger Sumo CPS'
  }
};

interface GameLeaderboardShellProps {
  appId: string;
  children: React.ReactNode;
}

export const GameLeaderboardShell: React.FC<GameLeaderboardShellProps> = ({ appId, children }) => {
  const config = GAME_LEADERBOARD_CONFIG[appId];
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // If game is excluded from leaderboards (e.g. particle-physics, battleship), just render children
  if (!config) {
    return <>{children}</>;
  }

  const toggleDesktop = () => {
    audioService.playSound('button_click');
    setIsDesktopOpen(prev => !prev);
  };

  const toggleMobile = () => {
    audioService.playSound('button_click');
    setIsMobileOpen(prev => !prev);
  };

  return (
    <div className="relative flex w-full h-full overflow-hidden bg-black select-none">
      {/* Main Game Area: flex-1 ensures it dynamically resizes without overlapping or clipping */}
      <div className="flex-1 min-w-0 h-full overflow-hidden relative">
        {children}
      </div>

      {/* Floating Trophy / Leaderboard Toggle Button in Header (Persistent across mobile & desktop) */}
      <div className="fixed top-2.5 right-2.5 sm:top-3 sm:right-3 z-[110] flex items-center gap-2">
        {/* Mobile Toggle Button (<768px) */}
        <button
          id={`btn-mobile-leaderboard-${appId}`}
          onClick={toggleMobile}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-neutral-900/90 text-amber-400 border border-neutral-700 shadow-xl active:scale-95 transition-transform"
          title="Open Leaderboard"
        >
          <span className="text-lg">🏆</span>
        </button>

        {/* Desktop Toggle Button (>=768px) */}
        <button
          id={`btn-desktop-leaderboard-${appId}`}
          onClick={toggleDesktop}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shadow-lg transition-all duration-200 ${
            isDesktopOpen
              ? 'bg-neutral-900/95 text-neutral-300 border-neutral-700 hover:border-neutral-500'
              : 'bg-amber-500 text-black border-amber-400 hover:bg-amber-400 hover:scale-105'
          }`}
          title={isDesktopOpen ? 'Collapse Leaderboard Sidebar' : 'Show Leaderboard'}
        >
          <span>🏆</span>
          <span>{isDesktopOpen ? 'Hide Ranks' : 'Leaderboard'}</span>
        </button>
      </div>

      {/* Desktop Sidebar (>=768px) */}
      {isDesktopOpen && (
        <aside
          id={`desktop-leaderboard-sidebar-${appId}`}
          className="hidden md:flex flex-col w-[290px] lg:w-[310px] xl:w-[330px] h-full bg-[#0a0a0a] border-l-2 border-neutral-800 shrink-0 z-40 relative animate-fade-in shadow-[-10px_0_20px_rgba(0,0,0,0.5)]"
        >
          <LeaderboardWidget
            className="h-full border-none"
            allowedModes={config.modes}
            defaultMode={config.defaultMode}
          />
        </aside>
      )}

      {/* Mobile Drawer / Full-Screen Modal Overlay (<768px) */}
      {isMobileOpen && (
        <div 
          id={`mobile-leaderboard-modal-${appId}`}
          className="fixed inset-0 z-[150] md:hidden bg-black/80 backdrop-blur-md flex flex-col justify-end animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) toggleMobile();
          }}
        >
          <div className="w-full h-[85vh] bg-[#0c0c0e] rounded-t-2xl border-t border-neutral-800 flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            {/* Header with Close */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-800 bg-neutral-950">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <span className="font-bold text-sm text-white">{config.title}</span>
              </div>
              <button
                id="btn-close-mobile-leaderboard"
                onClick={toggleMobile}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden p-2">
              <LeaderboardWidget
                className="h-full border-none"
                allowedModes={config.modes}
                defaultMode={config.defaultMode}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLeaderboardShell;
