import React, { useEffect, useState } from 'react';
import { COLORS, LEVEL_CONFIGS } from '../constants';
import type { User, FriendRequest } from '../services/firebase';
import { LeaderboardEntry } from '../types';
import { getLeaderboard, deleteLeaderboardEntry, searchUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { useSettings } from '../contexts/SettingsContext';

interface OverlayProps {
  children: React.ReactNode;
}

export interface ExitConfirmProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export interface UsernameScreenProps {
    onSubmit: (name: string) => void;
}

export interface ModeSelectProps {
    onCompetitive: () => void;
    onUnrated: () => void;
    onBack: () => void;
}

export interface LevelSelectProps {
    onSelectLevel: (level: number) => void;
    onBack: () => void;
}

export interface LevelCompleteProps {
    levelName: string;
    message: string;
    emoji: string;
    onNext: () => void;
}

export interface GameOverProps {
    score: number;
    message: string;
    stats?: string;
    onRestart: () => void;
    aiTitle?: string;
    aiScore?: number;
    isCalculating?: boolean;
    isTimeScore?: boolean;
}

export interface SpeedResultProps {
    wpm: number;
    cpm: number;
    accuracy: number;
    comment: string;
    onRestart: () => void;
}

export interface GeneratingModalProps {
    message: string;
}

export interface BossIntroProps {
    onStart: () => void;
}

export interface PauseScreenProps {
    onResume: () => void;
    onQuit: () => void;
}

export interface InfoModalProps {
    text: string;
    onClose: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ children }) => (
  <div 
    className="absolute top-0 left-0 w-full h-full bg-black/90 text-white flex flex-col justify-center items-center z-[100] animate-fade-in p-4 overflow-y-auto"
    style={{ animation: 'fadeIn 0.5s ease-out forwards' }}
  >
    {children}
  </div>
);

// --- Buttons ---
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'accent' | 'pro' }> = ({ children, variant = 'primary', className = '', ...props }) => {
  let bgColor = COLORS.correct;
  if (variant === 'secondary') bgColor = COLORS.secondaryBtn;
  if (variant === 'accent') bgColor = COLORS.accent;
  if (variant === 'pro') bgColor = COLORS.pro;

  return (
    <button
      {...props}
      style={{ 
          backgroundColor: bgColor,
          fontFamily: '"Press Start 2P", cursive',
          color: 'var(--color-text)' // Ensure text is visible in BW mode if bgcolor is weird
      }}
      className={`text-xs md:text-base py-3 px-4 md:py-4 md:px-5 border-4 border-white cursor-pointer transition-all duration-200 hover:scale-110 hover:brightness-125 active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
};

// --- Leaderboard Component ---
const LeaderboardWidget: React.FC = () => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<string>('competitive');
    const { isAdmin } = useSettings();

    const fetchLeaderboard = async () => {
        setLoading(true);
        const data = await getLeaderboard(mode === 'speed' ? 'speed-test' : mode);
        setEntries(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [mode]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this score permanently?")) return;
        setEntries(prev => prev.filter(e => e.id !== id));
        const success = await deleteLeaderboardEntry(id);
        if (!success) fetchLeaderboard();
    };

    const formatScore = (entry: LeaderboardEntry) => {
        if (mode === 'competitive') {
            const mins = Math.floor(entry.score / 60);
            const secs = Math.floor(entry.score % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return entry.score;
    };

    const getScoreLabel = () => {
        return mode === 'competitive' ? 'TIME' : 'PTS';
    };

    const modes = ['competitive', 'infinite', 'universal', 'speed'];
    const activeIndex = modes.indexOf(mode);

    return (
        <RandomReveal distance={1500} className="absolute top-0 right-0 h-full w-[160px] md:w-[300px] border-l-4 border-white bg-[#0a0a0a] p-2 md:p-4 flex flex-col z-[150] shadow-[-10px_0_30px_rgba(0,0,0,0.8)]">
            <h3 className="text-[#f4b400] text-center mb-4 text-[10px] md:text-xs uppercase border-b-2 border-[#333] pb-3 tracking-widest mt-4">
                {isAdmin ? 'ADMIN MODE' : 'Top Chefs'}
            </h3>
            
            {/* Capsule Slider */}
            <div className="relative flex w-full bg-[#000] border border-[#333] rounded-full p-1 mb-4 select-none">
                {/* Moving Indicator */}
                <div 
                    className="absolute top-1 bottom-1 rounded-full bg-white/20 transition-all duration-300 ease-out"
                    style={{ 
                        left: `calc(${activeIndex * 25}% + 2px)`,
                        width: 'calc(25% - 4px)'
                    }}
                />
                
                {modes.map(m => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 relative z-10 text-[7px] md:text-[8px] py-1.5 text-center transition-colors duration-200 font-bold uppercase tracking-tight
                            ${mode === m ? 'text-white' : 'text-[#555] hover:text-[#777]'}`}
                    >
                        {m === 'competitive' ? 'COMP' : m === 'infinite' ? 'INF' : m === 'universal' ? 'UNIV' : 'SPEED'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="loading-spinner mb-4 w-6 h-6 border-2" />
                    <div className="text-[10px] text-[#aaa]">Retrieving Archives...</div>
                </div>
            ) : entries.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-[10px] text-[#aaa] leading-5 px-4">
                    Kitchen is empty.<br/>Be the first to cook!
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                    {entries.map((entry, idx) => (
                        <RandomReveal key={entry.id} distance={300} className="flex flex-col bg-[#161616] p-2 border border-[#333] hover:border-[#555] transition-colors relative group">
                            {isAdmin && (
                                <button 
                                    onClick={() => handleDelete(entry.id)}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white hover:bg-red-800 z-50 shadow-md"
                                >
                                    ✕
                                </button>
                            )}
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className={`text-xs font-bold w-5 ${idx === 0 ? 'text-[#f4b400]' : idx === 1 ? 'text-[#ccc]' : idx === 2 ? 'text-[#cd7f32]' : 'text-[#444]'}`}>
                                        #{idx + 1}
                                    </span>
                                    <span className="text-[10px] text-white truncate max-w-[80px] md:max-w-[110px]">{entry.username}</span>
                                </div>
                                <div className="flex flex-col items-end shrink-0 ml-1">
                                    <span className="text-[#57a863] text-[10px] font-bold shadow-black drop-shadow-md">
                                        {formatScore(entry)} {getScoreLabel()}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end border-t border-[#222] pt-1 mt-1">
                                <span className="text-[8px] text-[#888] italic truncate max-w-[120px] md:max-w-[150px] block">
                                    "{entry.title}"
                                </span>
                                {mode === 'speed' && entry.accuracy !== undefined && (
                                    <span className={`text-[7px] px-1 py-px rounded ml-1 shrink-0 ${entry.accuracy < 80 ? 'text-red-500 bg-red-900/20' : 'text-green-500 bg-green-900/20'}`}>
                                        {entry.accuracy}% ACC
                                    </span>
                                )}
                                {mode === 'competitive' && (
                                    <span className="text-[7px] text-[#aaa] ml-1 shrink-0">Lvl {entry.levelReached}</span>
                                )}
                            </div>
                        </RandomReveal>
                    ))}
                </div>
            )}
        </RandomReveal>
    );
};

// --- Friends / User Search Modal ---
interface FriendsModalProps {
    onClose: () => void;
    currentUser: User;
}

const FriendsModal: React.FC<FriendsModalProps> = ({ onClose, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<{uid: string, username: string, isFriend: boolean, hasPending: boolean}[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'search' | 'requests'>('search');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        const reqs = await getFriendRequests(currentUser.uid);
        setRequests(reqs);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const results = await searchUsers(searchTerm, currentUser.uid);
        setSearchResults(results);
        setLoading(false);
    };

    const handleSendRequest = async (toUid: string) => {
        const success = await sendFriendRequest(currentUser.uid, toUid);
        if (success) {
            setFeedback("Request Sent!");
            // Update local state to reflect change immediately
            setSearchResults(prev => prev.map(u => u.uid === toUid ? {...u, hasPending: true} : u));
        } else {
            setFeedback("Failed to send.");
        }
        setTimeout(() => setFeedback(null), 2000);
    };

    const handleAccept = async (fromUid: string) => {
        await acceptFriendRequest(currentUser.uid, fromUid);
        setRequests(prev => prev.filter(r => r.from !== fromUid));
        setFeedback("New Friend Added!");
        setTimeout(() => setFeedback(null), 2000);
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/95 z-[250] flex items-center justify-center p-4">
            <RandomReveal className="bg-[#111] border-4 border-white p-6 md:p-8 w-full max-w-md flex flex-col gap-6 h-[500px]">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl md:text-2xl text-[#f4b400]">Social Kitchen</h2>
                    <button onClick={onClose} className="text-red-500 text-xl font-bold">X</button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-[#333] pb-2">
                    <button 
                        onClick={() => setActiveTab('search')}
                        className={`text-xs pb-1 transition-colors ${activeTab === 'search' ? 'text-white border-b-2 border-white' : 'text-[#555] hover:text-[#888]'}`}
                    >
                        FIND CHEFS
                    </button>
                    <button 
                        onClick={() => setActiveTab('requests')}
                        className={`text-xs pb-1 transition-colors relative ${activeTab === 'requests' ? 'text-white border-b-2 border-white' : 'text-[#555] hover:text-[#888]'}`}
                    >
                        REQUESTS
                        {requests.length > 0 && (
                            <span className="absolute -top-2 -right-3 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] animate-bounce">
                                {requests.length}
                            </span>
                        )}
                    </button>
                </div>

                {feedback && <div className="text-center text-[#57a863] text-xs animate-pulse">{feedback}</div>}

                {activeTab === 'search' && (
                    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Name (e.g. Chef, Momit)"
                                className="bg-[#000] border border-[#555] p-2 flex-1 text-white text-xs outline-none focus:border-[#f4b400]"
                            />
                            <button type="submit" className="bg-[#333] text-white px-3 border border-[#555] text-xs hover:bg-[#444]">
                                🔍
                            </button>
                        </form>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                            {loading ? (
                                <div className="text-center text-[#555] text-xs mt-4">Searching database...</div>
                            ) : searchResults.length === 0 ? (
                                <div className="text-center text-[#555] text-xs mt-4">
                                    {searchTerm.length > 0 ? "No chefs found." : "Search to find friends."}
                                </div>
                            ) : (
                                searchResults.map(user => (
                                    <div key={user.uid} className="flex justify-between items-center bg-[#1a1a1a] p-3 border border-[#333]">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white font-bold">{user.username}</span>
                                            <span className="text-[8px] text-[#666]">Chef</span>
                                        </div>
                                        {user.isFriend ? (
                                            <span className="text-[#57a863] text-[10px]">Friends ✓</span>
                                        ) : user.hasPending ? (
                                            <span className="text-[#aaa] text-[10px]">Pending...</span>
                                        ) : (
                                            <button 
                                                onClick={() => handleSendRequest(user.uid)}
                                                className="bg-[#222] hover:bg-[#333] border border-[#555] rounded-full w-6 h-6 flex items-center justify-center text-[#f4b400] transition-colors"
                                                title="Add Friend"
                                            >
                                                +
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
                        {requests.length === 0 ? (
                            <div className="text-center text-[#555] text-xs mt-10">No pending requests.</div>
                        ) : (
                            requests.map((req, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-[#1a1a1a] p-3 border border-[#333] animate-pop-in">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-white font-bold">{req.fromName}</span>
                                        <span className="text-[8px] text-[#f4b400]">Wants to connect</span>
                                    </div>
                                    <button 
                                        onClick={() => handleAccept(req.from)}
                                        className="bg-[#57a863] text-black text-[10px] px-3 py-1 border border-white hover:brightness-110"
                                    >
                                        ACCEPT
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </RandomReveal>
        </div>
    );
};

// --- Settings Modal ---
interface SettingsModalProps {
    onClose: () => void;
    username: string | null | undefined;
    onUpdateUsername: (name: string) => void;
}
const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, username, onUpdateUsername }) => {
    const { settings, updateSettings, isAdmin, setIsAdmin } = useSettings();
    const [passwordInput, setPasswordInput] = useState('');
    const [editName, setEditName] = useState(username || '');

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === 'tacos') {
            setIsAdmin(true);
            setPasswordInput('');
        } else {
            alert("Wrong password, Chef!");
        }
    };

    const handleSaveName = () => {
        if (editName.trim().length > 0) {
            onUpdateUsername(editName.trim());
            alert("Name updated!");
        }
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/95 z-[250] flex items-center justify-center p-4">
            <RandomReveal className="bg-[#111] border-4 border-white p-6 md:p-8 w-full max-w-md flex flex-col gap-6 h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl text-[#f4b400]">Kitchen Settings</h2>
                    <button onClick={onClose} className="text-red-500 text-xl font-bold">X</button>
                </div>

                <div className="flex flex-col gap-4">
                    {/* User Name Config */}
                     <div className="flex flex-col gap-2 border-b border-[#333] pb-4">
                         <label className="text-sm">Chef Name</label>
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                maxLength={12}
                                className="bg-black border border-[#555] flex-1 p-2 text-xs text-white outline-none focus:border-[#f4b400]"
                                placeholder="Your Name"
                             />
                             <button onClick={handleSaveName} className="bg-[#333] text-white text-xs px-3 border border-[#555] hover:bg-[#555]">
                                 SAVE
                             </button>
                         </div>
                     </div>

                    {/* Fast Boot */}
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm">Fast Boot (No Animations)</span>
                        <input 
                            type="checkbox" 
                            checked={settings.fastBoot}
                            onChange={(e) => updateSettings({ fastBoot: e.target.checked })}
                            className="w-5 h-5 accent-[#e55934]"
                        />
                    </label>

                    {/* Theme */}
                    <div className="flex flex-col gap-3">
                         <div className="flex items-center justify-between">
                             <span className="text-sm">Visual Theme</span>
                             <div className="flex gap-2">
                                 <button 
                                    onClick={() => updateSettings({ theme: 'taco' })}
                                    className={`text-[10px] px-3 py-2 border transition-all ${settings.theme === 'taco' ? 'bg-[#e55934] border-white' : 'bg-transparent border-[#555] text-[#888]'}`}
                                 >
                                    TACO
                                 </button>
                                 <button 
                                    onClick={() => updateSettings({ theme: 'dark' })}
                                    className={`text-[10px] px-3 py-2 border transition-all ${settings.theme === 'dark' ? 'bg-white text-black border-white' : 'bg-transparent border-[#555] text-[#888]'}`}
                                 >
                                    DARK
                                 </button>
                                 <button 
                                    onClick={() => updateSettings({ theme: 'neon', neonColor: settings.neonColor || '#00ff00' })}
                                    className={`text-[10px] px-3 py-2 border transition-all font-bold ${settings.theme === 'neon' ? 'border-white text-black' : 'bg-transparent border-[#555] text-[#888]'}`}
                                    style={{ 
                                        backgroundColor: settings.theme === 'neon' ? settings.neonColor : 'transparent',
                                        boxShadow: settings.theme === 'neon' ? `0 0 10px ${settings.neonColor}` : 'none'
                                    }}
                                 >
                                    NEON
                                 </button>
                             </div>
                         </div>
                         
                         {/* Neon Sub-options */}
                         {settings.theme === 'neon' && (
                             <div className="flex items-center justify-end gap-2 animate-fade-in p-2 border border-[#333] bg-[#000]">
                                 <span className="text-[10px] text-[#aaa] mr-2">COLOR:</span>
                                 <button 
                                    onClick={() => updateSettings({ neonColor: '#00ffff' })}
                                    className="w-6 h-6 border border-white"
                                    style={{ backgroundColor: '#00ffff', boxShadow: settings.neonColor === '#00ffff' ? '0 0 8px #00ffff' : 'none' }}
                                    title="Blue"
                                 />
                                 <button 
                                    onClick={() => updateSettings({ neonColor: '#00ff00' })}
                                    className="w-6 h-6 border border-white"
                                    style={{ backgroundColor: '#00ff00', boxShadow: settings.neonColor === '#00ff00' ? '0 0 8px #00ff00' : 'none' }}
                                    title="Green"
                                 />
                                 <div className="relative group">
                                     <input 
                                        type="color" 
                                        value={settings.neonColor}
                                        onChange={(e) => updateSettings({ neonColor: e.target.value })}
                                        className="w-6 h-6 p-0 border border-white cursor-pointer"
                                        title="Custom"
                                     />
                                 </div>
                             </div>
                         )}
                    </div>
                </div>

                <div className="h-px bg-[#333] my-2"></div>

                {/* Admin Section */}
                <div className="mt-auto pt-4">
                     {isAdmin ? (
                         <div className="flex justify-between items-center">
                             <span className="text-green-500 text-xs">Admin Access Active</span>
                             <button onClick={() => setIsAdmin(false)} className="text-red-500 text-xs border border-red-500 px-2 py-1 hover:bg-red-900">Logout</button>
                         </div>
                     ) : (
                         <form onSubmit={handleAdminLogin} className="flex flex-col gap-2">
                             <label className="text-[10px] text-[#555] uppercase">Admin Access</label>
                             <div className="flex gap-2">
                                 <input 
                                     type="password"
                                     value={passwordInput}
                                     onChange={(e) => setPasswordInput(e.target.value)}
                                     placeholder="Password"
                                     className="bg-black border border-[#333] flex-1 p-2 text-xs text-white outline-none focus:border-[#f4b400]"
                                 />
                                 <button type="submit" className="bg-[#333] text-white text-xs px-3 border border-[#555] hover:bg-[#555]">Login</button>
                             </div>
                         </form>
                     )}
                </div>
            </RandomReveal>
        </div>
    );
};

// --- Start Screen ---
interface StartScreenProps {
  onStart: () => void;
  onInfinite: () => void;
  onUniversal: () => void;
  onSpeedTest: () => void;
  user?: User | null;
  onLogout?: () => void;
  isGenerating?: boolean;
  username?: string | null;
  onUpdateUsername: (name: string) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onInfinite, onUniversal, onSpeedTest, user, onLogout, isGenerating, username, onUpdateUsername }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  // Fix display name logic: Use the custom username if available, otherwise fallback.
  const displayableName = username || user?.displayName || 'Chef';

  return (
      <Overlay>
         <div className="hidden md:block">
            <LeaderboardWidget />
         </div>
         
         <div className="absolute top-4 left-4 md:top-8 md:left-8 flex gap-4 z-[120]">
            <button 
                onClick={() => setShowSettings(true)}
                className="text-2xl hover:rotate-90 transition-transform duration-300"
                title="Settings"
            >
                ⚙️
            </button>
            {user && (
                <RandomReveal distance={100} className="flex items-center gap-4">
                    <span className="text-[#aaa] text-[10px] md:text-xs">{displayableName}</span>
                    {!showLogoutConfirm ? (
                        <button 
                            onClick={() => setShowLogoutConfirm(true)}
                            className="bg-transparent border-2 border-[#ff2a2a] text-[#ff2a2a] text-[10px] md:text-xs py-1 px-2 md:py-2 md:px-4 cursor-pointer font-['Press_Start_2P'] hover:bg-[#ff2a2a] hover:text-white"
                        >
                            Log Out
                        </button>
                    ) : (
                        <div className="flex gap-2">
                             <span className="text-[10px] md:text-xs text-white self-center">Sure?</span>
                             <button onClick={onLogout} className="bg-[#ff2a2a] text-white text-[10px] md:text-xs py-1 px-2 md:py-2 md:px-2 border-2 border-[#ff2a2a] hover:brightness-125">Yes</button>
                             <button onClick={() => setShowLogoutConfirm(false)} className="bg-transparent text-[#aaa] text-[10px] md:text-xs py-1 px-2 md:py-2 md:px-2 border-2 border-[#aaa] hover:bg-[#333]">No</button>
                        </div>
                    )}
                </RandomReveal>
            )}
         </div>

         {/* Friends Button - Positioned top right but left of leaderboard */}
         <div className="absolute top-4 right-[170px] md:right-[320px] z-[160]">
             <button 
                onClick={() => setShowFriends(true)}
                className="text-2xl hover:scale-110 transition-transform"
                title="Social Kitchen"
             >
                👥
             </button>
         </div>

         {showSettings && (
             <SettingsModal 
                onClose={() => setShowSettings(false)} 
                username={displayableName}
                onUpdateUsername={onUpdateUsername}
             />
         )}
         {showFriends && user && <FriendsModal onClose={() => setShowFriends(false)} currentUser={user} />}
         
         <div className="flex flex-col items-center md:mr-[300px]">
            <h1 className="text-3xl md:text-5xl mb-5 text-[#f4b400] shadow-[#e55934] text-center leading-normal" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>
                <RandomText text="Typing for" />
                <br className="md:hidden"/> <RandomText text="Tacos" />
            </h1>
            <p className="text-xs md:text-base max-w-[500px] leading-normal mb-8 text-center px-4">
                <RandomText text="Type ingredients to cook!" /><br />
                <RandomText text="Don't drop the food!" />
            </p>
            <div className="flex flex-col gap-4 md:gap-5 items-center">
                <div className="flex gap-4 md:gap-5">
                    <RandomReveal><Button onClick={onStart}>Start Cooking</Button></RandomReveal>
                    <RandomReveal delay={0.1}><Button onClick={onInfinite} variant="secondary">Infinite</Button></RandomReveal>
                </div>
                
                <div className="flex gap-4">
                     <RandomReveal delay={0.2}>
                         <button 
                            onClick={onUniversal}
                            className="bg-transparent border-2 border-[#4facfe] text-[#4facfe] text-[10px] md:text-xs py-2 px-4 cursor-pointer font-['Press_Start_2P'] hover:bg-[#4facfe] hover:text-white hover:scale-105"
                        >
                            Universal
                        </button>
                    </RandomReveal>
                    <RandomReveal delay={0.3}>
                        <button 
                            onClick={onSpeedTest}
                            disabled={isGenerating}
                            className={`bg-transparent border-2 border-[#ff2a2a] text-[#ff2a2a] text-[10px] md:text-xs py-2 px-4 cursor-pointer font-['Press_Start_2P'] hover:bg-[#ff2a2a] hover:text-white hover:scale-105 transition-all ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isGenerating ? '...' : 'Speed Test'}
                        </button>
                    </RandomReveal>
                </div>
            </div>
         </div>
      </Overlay>
  );
};

export const ExitConfirmScreen: React.FC<ExitConfirmProps> = ({ onConfirm, onCancel }) => (
    <div className="absolute top-0 left-0 w-full h-full bg-black/80 flex items-center justify-center z-[200] animate-fade-in p-4">
        <RandomReveal className="bg-[#111] border-4 border-[#ff2a2a] p-4 md:p-8 flex flex-col items-center max-w-md text-center shadow-[0_0_30px_rgba(255,0,0,0.3)]">
            <h2 className="text-xl md:text-2xl text-[#ff2a2a] mb-4">WARNING CHEF!</h2>
            <p className="text-xs md:text-sm leading-6 mb-6">
                You are about to abandon the kitchen during a ranked service.<br/><br/>
                <span className="text-[#f4b400]">Your score/time will not be recorded.</span>
            </p>
            <div className="flex gap-4">
                <Button onClick={onConfirm} variant="secondary">Leave Kitchen</Button>
                <Button onClick={onCancel} variant="primary">Keep Cooking</Button>
            </div>
        </RandomReveal>
    </div>
);

export const UsernameScreen: React.FC<UsernameScreenProps> = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim().length > 0 && name.trim().length <= 12) onSubmit(name.trim());
    };
    return (
        <Overlay>
            <h2 className="text-xl md:text-2xl mb-6 text-[#f4b400]"><RandomText text="Identify Yourself" /></h2>
            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                <RandomReveal>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nickname"
                        maxLength={12}
                        className="bg-[#111] border-4 border-white p-3 md:p-4 text-center text-white font-['Press_Start_2P'] outline-none focus:border-[#f4b400] w-[250px] md:w-[300px]"
                        autoFocus
                    />
                </RandomReveal>
                <div className="text-[10px] text-[#aaa] mb-4">Max 12 chars</div>
                <RandomReveal delay={0.2}><Button type="submit">Confirm Identity</Button></RandomReveal>
            </form>
        </Overlay>
    );
};

export const ModeSelectScreen: React.FC<ModeSelectProps> = ({ onCompetitive, onUnrated, onBack }) => (
    <Overlay>
        <h2 className="text-3xl text-[#f4b400] mb-8"><RandomText text="Select Mode" /></h2>
        <div className="flex flex-col gap-6 w-full max-w-sm">
             <RandomReveal>
                <Button onClick={onCompetitive} variant="pro" className="w-full relative overflow-hidden group">
                     <span className="relative z-10">COMPETITIVE (Ranked)</span>
                     <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
                </Button>
                <div className="text-[10px] text-[#aaa] text-center mt-1">Leaderboards • Survival • Speed</div>
             </RandomReveal>

             <RandomReveal delay={0.2}>
                <Button onClick={onUnrated} variant="secondary" className="w-full">
                    TRAINING (Unrated)
                </Button>
                <div className="text-[10px] text-[#aaa] text-center mt-1">Practice Levels • No Stress</div>
             </RandomReveal>

             <RandomReveal delay={0.4}>
                <Button onClick={onBack} className="w-full bg-transparent border-[#555] text-[#aaa] hover:bg-[#333]">
                    Back
                </Button>
             </RandomReveal>
        </div>
    </Overlay>
);

export const LevelSelectScreen: React.FC<LevelSelectProps> = ({ onSelectLevel, onBack }) => (
    <Overlay>
        <h2 className="text-xl md:text-3xl text-[#f4b400] mb-8"><RandomText text="Select Menu" /></h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3, 4, 5].map((lvl, i) => (
                <RandomReveal key={lvl} delay={i * 0.1}>
                    <Button onClick={() => onSelectLevel(lvl)} className="w-[100px] h-[90px] md:w-[120px] md:h-[100px] flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">{LEVEL_CONFIGS[lvl]?.emoji || '🍳'}</span>
                        <span className="text-[10px] md:text-xs">Level {lvl}</span>
                    </Button>
                </RandomReveal>
            ))}
        </div>
        <RandomReveal delay={0.6}>
            <Button onClick={onBack} variant="secondary">Back to Lobby</Button>
        </RandomReveal>
    </Overlay>
);

export const LevelCompleteScreen: React.FC<LevelCompleteProps> = ({ levelName, message, emoji, onNext }) => (
    <Overlay>
        <RandomReveal className="text-6xl mb-4">{emoji}</RandomReveal>
        <h2 className="text-3xl text-[#f4b400] mb-4 text-center">{levelName} Complete!</h2>
        <p className="text-white mb-8 text-center">{message}</p>
        <RandomReveal delay={0.5}>
            <Button onClick={onNext} className="animate-pulse">Next Course &gt;&gt;</Button>
        </RandomReveal>
    </Overlay>
);

export const BossIntroScreen: React.FC<BossIntroProps> = ({ onStart }) => (
    <Overlay>
        <div className="border-4 border-red-600 p-8 bg-black max-w-2xl text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-red-600 animate-pulse" />
             <div className="absolute bottom-0 left-0 w-full h-2 bg-red-600 animate-pulse" />
             
             <RandomReveal className="text-red-500 text-sm mb-4 tracking-widest uppercase font-bold">Warning: Boss Level</RandomReveal>
             <h1 className="text-4xl md:text-5xl text-white mb-6 font-['Creepster'] tracking-wider text-red-600">THE SOCIAL HOUR</h1>
             <p className="text-sm md:text-base text-[#ccc] leading-loose mb-8">
                The kitchen is closed.<br/>
                The guests are arriving.<br/>
                <span className="text-[#f4b400]">Socialize or perish.</span>
             </p>
             <RandomReveal delay={1}>
                <Button onClick={onStart} variant="pro" className="w-full text-red-100 border-red-500 hover:bg-red-900">
                    OPEN DOORS
                </Button>
             </RandomReveal>
        </div>
    </Overlay>
);

export const GameOverScreen: React.FC<GameOverProps> = ({ score, message, stats, onRestart, aiTitle, aiScore, isCalculating, isTimeScore }) => (
    <Overlay>
        <div className="flex flex-col items-center bg-[#111] border-4 border-white p-8 max-w-lg w-full relative">
            <h2 className="text-4xl text-[#ff2a2a] mb-2 font-['Creepster']">GAME OVER</h2>
            <div className="w-full h-px bg-[#333] mb-6"></div>
            
            <p className="text-[#f4b400] text-lg mb-6 text-center">{message}</p>

            <div className="flex flex-col gap-2 mb-8 w-full bg-black p-4 border border-[#333]">
                {/* Score Section */}
                <div className="flex justify-between items-center">
                     <span className="text-[#aaa] text-xs uppercase">{isTimeScore ? 'Survival Time' : 'Raw Score'}</span>
                     <span className="text-white text-xl">{score}{isTimeScore ? 's' : ''}</span>
                </div>
                
                {stats && (
                    <div className="flex justify-between items-center">
                        <span className="text-[#aaa] text-xs uppercase">Bonus</span>
                        <span className="text-white text-xs">{stats}</span>
                    </div>
                )}

                {/* AI Judging Section */}
                <div className="mt-4 pt-4 border-t border-[#333] flex flex-col gap-2">
                    <span className="text-[#555] text-[10px] uppercase tracking-widest">Judge's Verdict</span>
                    {isCalculating ? (
                        <div className="text-[#f4b400] text-xs animate-pulse">Calculating Performance...</div>
                    ) : (
                        <>
                            <div className="flex justify-between items-end">
                                <span className="text-2xl text-white font-bold">"{aiTitle}"</span>
                                {aiScore !== undefined && (
                                    <span className={`text-xl font-bold ${aiScore >= 90 ? 'text-[#57a863]' : aiScore >= 70 ? 'text-[#f4b400]' : 'text-[#ff2a2a]'}`}>
                                        {aiScore}/100
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <Button onClick={onRestart}>Back to Kitchen</Button>
        </div>
    </Overlay>
);

export const PauseScreen: React.FC<PauseScreenProps> = ({ onResume, onQuit }) => (
    <div className="absolute top-0 left-0 w-full h-full bg-black/50 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-fade-in">
        <h1 className="text-5xl text-white mb-8 tracking-widest uppercase drop-shadow-lg">PAUSED</h1>
        <div className="flex flex-col gap-4 min-w-[200px]">
            <Button onClick={onResume} className="w-full">RESUME</Button>
            <Button onClick={onQuit} variant="secondary" className="w-full">QUIT</Button>
        </div>
    </div>
);

export const InfoModal: React.FC<InfoModalProps> = ({ text, onClose }) => (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#111] border-2 border-[#f4b400] p-6 z-[200] text-center shadow-2xl min-w-[300px] animate-pop-in">
        <p className="text-white mb-6 text-sm leading-relaxed">{text}</p>
        <Button onClick={onClose} className="text-xs py-2 px-4">OK, Chef</Button>
    </div>
);

export const SpeedResultScreen: React.FC<SpeedResultProps> = ({ wpm, cpm, accuracy, comment, onRestart }) => (
    <Overlay>
        <div className="bg-[#111] border-4 border-[#f4b400] p-8 max-w-lg w-full flex flex-col items-center relative">
            <h2 className="text-2xl md:text-3xl text-[#f4b400] mb-6 uppercase tracking-wider">Service Report</h2>
            
            <div className="grid grid-cols-3 gap-4 w-full mb-8">
                 <div className="flex flex-col items-center p-3 bg-black border border-[#333]">
                     <span className="text-[10px] text-[#aaa] mb-1">NET WPM</span>
                     <span className="text-2xl md:text-4xl text-[#4facfe] font-bold">{wpm}</span>
                 </div>
                 <div className="flex flex-col items-center p-3 bg-black border border-[#333]">
                     <span className="text-[10px] text-[#aaa] mb-1">ACCURACY</span>
                     <span className={`text-2xl md:text-4xl font-bold ${accuracy >= 95 ? 'text-[#57a863]' : accuracy >= 80 ? 'text-[#f4b400]' : 'text-[#ff2a2a]'}`}>
                         {accuracy}%
                     </span>
                 </div>
                 <div className="flex flex-col items-center p-3 bg-black border border-[#333]">
                     <span className="text-[10px] text-[#aaa] mb-1">RAW CPM</span>
                     <span className="text-2xl md:text-4xl text-[#e55934] font-bold">{cpm}</span>
                 </div>
            </div>

            <div className="w-full bg-[#1a1a1a] p-4 border-l-4 border-[#f4b400] mb-8 relative">
                <span className="absolute -top-3 left-2 bg-[#111] px-1 text-[10px] text-[#f4b400]">CHEF'S COMMENT</span>
                <p className="text-sm md:text-base italic text-white leading-relaxed">
                    "{comment}"
                </p>
            </div>

            <Button onClick={onRestart}>Back to Menu</Button>
        </div>
    </Overlay>
);

export const GeneratingModal: React.FC<GeneratingModalProps> = ({ message }) => (
    <div className="absolute top-0 left-0 w-full h-full bg-black/80 z-[300] flex flex-col items-center justify-center cursor-wait">
        <div className="loading-spinner w-12 h-12 border-4 mb-4"></div>
        <div className="text-[#f4b400] text-sm animate-pulse">{message}</div>
    </div>
);
