import React, { useState, useEffect } from 'react';
import { User, subscribeToGlobalUnread } from '../services/firebase';
import ChatWidget from './ChatWidget';
import { LeaderboardWidget, FriendsModal } from './Overlays';
import { audioService } from '../services/audioService';

interface UnifiedSidebarProps {
  user: User;
  isOpen: boolean;
  onToggle: () => void;
  activeApp?: string;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  user,
  isOpen,
  onToggle,
  activeApp = 'taco',
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'leaderboard' | 'friends'>('chat');
  const [hasUnread, setHasUnread] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const unsub = subscribeToGlobalUnread(user.uid, null, (unread) => {
      setHasUnread(unread);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user]);

  const handleTabChange = (tab: 'chat' | 'leaderboard' | 'friends') => {
    audioService.playSound('button_click');
    if (tab === 'friends') {
      setShowFriendsModal(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <>
      {/* Floating Sitewide Toggle Button in Top-Right */}
      <div className="fixed top-3 right-3 z-[150] flex items-center gap-2">
        <button
          id="btn-toggle-sidebar"
          onClick={() => {
            audioService.playSound('button_click');
            onToggle();
          }}
          className={`inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border text-xs sm:text-sm font-bold shadow-md transition-all duration-200 select-none cursor-pointer active:scale-95 ${
            isOpen 
              ? 'bg-amber-500 text-black border-amber-400 font-black' 
              : 'bg-neutral-900/90 hover:bg-neutral-800 text-white border-neutral-700 hover:border-neutral-500'
          }`}
          title={isOpen ? 'Collapse Sidebar' : 'Open Sidebar (Chat & Scores)'}
        >
          {isOpen ? (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          )}
          <span className="hidden sm:inline">{isOpen ? 'Close' : 'Chat & Ranks'}</span>
          {!isOpen && hasUnread && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block ml-0.5" />
          )}
        </button>
      </div>

      {/* Backdrop for mobile/tablet when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] lg:hidden animate-fade-in"
          onClick={() => {
            audioService.playSound('button_click');
            onToggle();
          }}
        />
      )}

      {/* Slide-out Sidebar Panel */}
      <aside
        id="unified-sidebar-panel"
        className={`fixed top-0 right-0 h-full w-[310px] sm:w-[350px] md:w-[380px] bg-[#0c0c0e] border-l border-neutral-800 z-[140] flex flex-col shadow-2xl transition-transform duration-300 ease-out font-sans ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header & Navigation Tabs */}
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => handleTabChange('chat')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-black shadow-sm font-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Chat</span>
              {hasUnread && activeTab !== 'chat' && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => handleTabChange('leaderboard')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-black shadow-sm font-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path>
                <path d="M14 14.66V17c0 .55.45 1 1 1h2"></path>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
              </svg>
              <span>Scores</span>
            </button>

            <button
              onClick={() => handleTabChange('friends')}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
              title="Friends & Requests"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Friends</span>
            </button>
          </div>

          <button
            onClick={() => {
              audioService.playSound('button_click');
              onToggle();
            }}
            className="text-neutral-400 hover:text-white w-7 h-7 rounded-lg hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'chat' ? (
            <ChatWidget user={user} className="h-full border-none" />
          ) : (
            <LeaderboardWidget 
              className="h-full border-none" 
              allowedModes={[
                'competitive', 
                'universal', 
                'speed', 
                'iq-test', 
                'minesweeper-beginner', 
                'minesweeper-intermediate', 
                'minesweeper-expert', 
                'tic_tac_toe', 
                'connect_4'
              ]} 
              defaultMode={
                activeApp === 'iq' || activeApp === 'iq-test' ? 'iq-test' :
                activeApp === 'mine' || activeApp === 'minesweeper' ? 'minesweeper-beginner' :
                activeApp === 'tic-tac-toe' ? 'tic_tac_toe' :
                activeApp === 'connect-4' ? 'connect_4' :
                'competitive'
              } 
            />
          )}
        </div>
      </aside>

      {/* Friends Modal */}
      {showFriendsModal && (
        <FriendsModal
          currentUser={user}
          onClose={() => setShowFriendsModal(false)}
        />
      )}
    </>
  );
};

export default UnifiedSidebar;
