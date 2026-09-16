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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-bold shadow-lg transition-all duration-200 select-none ${
            isOpen 
              ? 'bg-amber-500 text-black border-amber-400 scale-105' 
              : 'bg-neutral-900/90 hover:bg-neutral-800 text-white border-neutral-700 hover:border-neutral-500'
          }`}
          title={isOpen ? 'Collapse Sidebar' : 'Open Sidebar (Chat & Scores)'}
        >
          <span>{isOpen ? '✕' : '💬'}</span>
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
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>💬 Chat</span>
              {hasUnread && activeTab !== 'chat' && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
            </button>

            <button
              onClick={() => handleTabChange('leaderboard')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🏆 Scores
            </button>

            <button
              onClick={() => handleTabChange('friends')}
              className="px-2.5 py-1 text-xs font-bold rounded-lg text-neutral-400 hover:text-white transition-all"
              title="Friends & Requests"
            >
              👥 Friends
            </button>
          </div>

          <button
            onClick={() => {
              audioService.playSound('button_click');
              onToggle();
            }}
            className="text-neutral-400 hover:text-white p-1 text-lg rounded-lg hover:bg-neutral-800 transition-colors"
            title="Collapse Sidebar"
          >
            ✕
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
