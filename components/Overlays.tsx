
import React, { useEffect, useState } from 'react';
import { COLORS, LEVEL_CONFIGS } from '../constants';
import type { User, FriendRequest } from '../services/firebase';
import { LeaderboardEntry } from '../types';
import { getLeaderboard, deleteLeaderboardEntry, fetchActiveUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest } from '../services/firebase';
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

export interface FriendsModalProps {
    onClose: () => void;
    currentUser: User;
}

export interface SettingsModalProps {
    onClose: () => void;
    username: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout?: () => void;
}

export interface StartScreenProps {
    onStart: () => void;
    onInfinite: () => void;
    onUniversal: () => void;
    onSpeedTest: () => void;
    onBackToHub: () => void;
    user: User;
    isGenerating: boolean;
    username: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
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
          color: 'var(--color-text)' 
      }}
      className={`text-xs md:text-base py-3 px-4 md:py-4 md:px-5 border-4 border-white cursor-pointer transition-all duration-200 hover:scale-110 hover:brightness-125 active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
};

// --- Leaderboard Component ---
interface LeaderboardWidgetProps {
    className?: string;
    allowedModes?: string[];
    defaultMode?: string;
}

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({ className = '', allowedModes, defaultMode }) => {
    const modes = allowedModes || ['competitive', 'infinite', 'universal', 'speed'];
    const initialMode = defaultMode && modes.includes(defaultMode) ? defaultMode : modes[0];

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<string>(initialMode);
    const { isAdmin } = useSettings();

    // Sync mode with defaultMode prop when it changes
    useEffect(() => {
        if (defaultMode && modes.includes(defaultMode)) {
            setMode(defaultMode);
        }
    }, [defaultMode]);

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
        if (mode === 'competitive' || mode.includes('minesweeper')) {
            const mins = Math.floor(entry.score / 60);
            const secs = Math.floor(entry.score % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return entry.score;
    };

    const getScoreLabel = () => {
        if (mode === 'iq-test') return 'IQ';
        if (mode.includes('minesweeper')) return 'TIME';
        return mode === 'competitive' ? 'TIME' : 'PTS';
    };

    const getTitle = () => {
        if (isAdmin) return 'ADMIN MODE';
        if (mode === 'iq-test') return 'Top Minds';
        if (mode.includes('minesweeper')) return 'Top Defusers';
        return 'Top Chefs';
    }

    const activeIndex = modes.indexOf(mode);

    return (
        <RandomReveal distance={200} className={`flex flex-col bg-[#0a0a0a] border-l-4 border-white p-2 md:p-4 z-[150] shadow-[-10px_0_30px_rgba(0,0,0,0.8)] ${className}`}>
            <h3 className="text-[#f4b400] text-center mb-2 text-[10px] md:text-xs uppercase border-b-2 border-[#333] pb-2 tracking-widest mt-2">
                <RandomText text={getTitle()} />
            </h3>
            
            {/* Capsule Slider - Only show if multiple modes allowed */}
            {modes.length > 1 && (
                <div className="relative flex w-full bg-[#000] border border-[#333] rounded-full p-1 mb-2 select-none shrink-0 overflow-hidden">
                    {/* Moving Indicator */}
                    <div 
                        className="absolute top-1 bottom-1 rounded-full bg-white/20 transition-all duration-300 ease-out"
                        style={{ 
                            left: `calc(${(activeIndex / modes.length) * 100}% + 2px)`,
                            width: `calc(${100 / modes.length}% - 4px)`
                        }}
                    />
                    
                    {modes.map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`flex-1 relative z-10 text-[7px] md:text-[8px] py-1.5 text-center transition-colors duration-200 font-bold uppercase tracking-tight
                                ${mode === m ? 'text-white' : 'text-[#555] hover:text-[#777]'}`}
                        >
                            {m.replace('minesweeper-', '').substring(0, 4).toUpperCase()}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                    <div className="loading-spinner mb-4 w-4 h-4 border-2" />
                    <div className="text-[10px] text-[#aaa]">Retrieving Archives...</div>
                </div>
            ) : entries.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-[10px] text-[#aaa] leading-5 px-4 min-h-0">
                    List is empty.<br/>Be the first!
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar min-h-0">
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
                                    {/* Chaos Animation for Names */}
                                    <div className="text-[10px] text-white truncate max-w-[80px] md:max-w-[110px]">
                                        <RandomText text={entry.username} distance={100} stagger={0.02} />
                                    </div>
                                </div>
                                <div className="flex flex-col items-end shrink-0 ml-1">
                                    <span className="text-[#57a863] text-[10px] font-bold shadow-black drop-shadow-md">
                                        <RandomText text={`${formatScore(entry)} ${getScoreLabel()}`} distance={50} />
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

export const FriendsModal: React.FC<FriendsModalProps> = ({ onClose, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState<{uid: string, username: string, isFriend: boolean, hasPending: boolean}[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'search' | 'requests'>('search');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const reqs = await getFriendRequests(currentUser.uid);
        setRequests(reqs);
        const users = await fetchActiveUsers(currentUser.uid);
        setAllUsers(users);
        setLoading(false);
    };

    const handleSendRequest = async (toUid: string) => {
        const success = await sendFriendRequest(currentUser.uid, toUid);
        if (success) {
            setFeedback("Request Sent!");
            setAllUsers(prev => prev.map(u => u.uid === toUid ? {...u, hasPending: true} : u));
        } else {
            setFeedback("Failed to send.");
        }
        setTimeout(() => setFeedback(null), 2000);
    };

    const handleAccept = async (fromUid: string) => {
        await acceptFriendRequest(currentUser.uid, fromUid);
        setRequests(prev => prev.filter(r => r.from !== fromUid));
        setAllUsers(prev => prev.map(u => u.uid === fromUid ? {...u, isFriend: true} : u));
        setFeedback("New Friend Added!");
        setTimeout(() => setFeedback(null), 2000);
    };

    const filteredUsers = allUsers.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/95 z-[250] flex items-center justify-center p-4">
            <RandomReveal className="bg-[#111] border-4 border-white p-6 md:p-8 w-full max-w-md flex flex-col gap-6 h-[500px]">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl md:text-2xl text-[#f4b400]"><RandomText text="Social Kitchen" /></h2>
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
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Filter by Name..."
                                className="bg-[#000] border border-[#555] p-2 flex-1 text-white text-xs outline-none focus:border-[#f4b400]"
                                autoFocus
                            />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                            {loading ? (
                                <div className="text-center text-[#555] text-xs mt-4">Loading Chefs...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center text-[#555] text-xs mt-4">
                                    No chefs found matching "{searchTerm}".
                                </div>
                            ) : (
                                filteredUsers.map(user => (
                                    <RandomReveal key={user.uid} distance={50} className="flex justify-between items-center bg-[#1a1a1a] p-3 border border-[#333]">
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
                                    </RandomReveal>
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
                                <RandomReveal key={idx} className="flex justify-between items-center bg-[#1a1a1a] p-3 border border-[#333]">
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
                                </RandomReveal>
                            ))
                        )}
                    </div>
                )}
            </RandomReveal>
        </div>
    );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, username, onUpdateUsername, onLogout }) => {
    const { settings, updateSettings, isAdmin, setIsAdmin } = useSettings();
    const [passwordInput, setPasswordInput] = useState('');
    const [editName, setEditName] = useState(username || '');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
                    <h2 className="text-2xl text-[#f4b400]"><RandomText text="Settings" /></h2>
                    <button onClick={onClose} className="text-red-500 text-xl font-bold">X</button>
                </div>

                <div className="flex flex-col gap-4">
                     <div className="flex flex-col gap-2 border-b border-[#333] pb-4">
                         <label className="text-sm">Player Name</label>
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

                     {/* Animation Speed Slider */}
                     <div className="flex flex-col gap-2 pb-4 border-b border-[#333]">
                        <div className="flex justify-between items-center">
                            <label className="text-sm">Animation Speed</label>
                            <span className="text-xs text-[#f4b400] font-bold">{settings.animDuration}s</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="6" 
                            step="1"
                            value={settings.animDuration} 
                            onChange={(e) => updateSettings({ animDuration: Number(e.target.value) })}
                            className="w-full accent-[#e55934] h-2 bg-[#333] rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-[#555]">
                            <span>Instant</span>
                            <span>Slow</span>
                        </div>
                     </div>

                    <label className="flex items-center justify-between cursor-pointer group hover:bg-[#222] p-2 rounded">
                        <div className="flex flex-col">
                            <span className="text-sm text-white">Reduced Motion</span>
                            <span className="text-[10px] text-[#aaa]">Simple fades instead of chaos</span>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={settings.reducedMotion}
                            onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                            className="w-5 h-5 accent-[#e55934]"
                        />
                    </label>

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

                {onLogout && (
                    <div className="border-t border-[#333] pt-4">
                        {!showLogoutConfirm ? (
                             <button 
                                onClick={() => setShowLogoutConfirm(true)}
                                className="w-full bg-[#333] text-[#ff2a2a] py-2 border border-[#ff2a2a] hover:bg-[#ff2a2a] hover:text-white transition-colors"
                             >
                                 LOG OUT
                             </button>
                        ) : (
                             <div className="flex gap-2 items-center justify-between">
                                 <span className="text-xs text-[#aaa]">Are you sure?</span>
                                 <div className="flex gap-2">
                                     <button onClick={onLogout} className="bg-[#ff2a2a] text-white px-3 py-1 text-xs hover:brightness-110">Yes</button>
                                     <button onClick={() => setShowLogoutConfirm(false)} className="bg-[#333] text-white px-3 py-1 text-xs border border-[#555]">No</button>
                                 </div>
                             </div>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-[#333]">
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

export const StartScreen: React.FC<StartScreenProps> = ({ 
    onStart, 
    onInfinite, 
    onUniversal, 
    onSpeedTest, 
    onBackToHub, 
    user, 
    isGenerating, 
    username, 
    onUpdateUsername, 
    onLogout 
}) => {
    return (
        <Overlay>
            <RandomReveal className="bg-[#111] border-4 border-white p-8 rounded-none max-w-lg w-full text-center shadow-[10px_10px_0px_#f4b400]">
                <h1 className="text-4xl text-[#f4b400] mb-2 font-['Press_Start_2P']"><RandomText text="TACO TYPER" /></h1>
                <p className="text-xs text-[#aaa] mb-8">Type fast, don't drop the food!</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Button onClick={onStart} className="hover:scale-105">Play Standard</Button>
                    <Button onClick={onInfinite} variant="accent" className="hover:scale-105">Infinite Mode</Button>
                    <Button onClick={onUniversal} variant="secondary" className="hover:scale-105">Universal Mode</Button>
                    <Button onClick={onSpeedTest} variant="pro" className="hover:scale-105" disabled={isGenerating}>
                        {isGenerating ? 'Generating...' : 'Speed Test (AI)'}
                    </Button>
                </div>

                <div className="border-t border-[#333] pt-4 mt-4">
                    <Button onClick={onBackToHub} className="w-full bg-[#333] border-[#555] text-white hover:bg-[#444]">
                        Back to Hub
                    </Button>
                </div>
            </RandomReveal>
        </Overlay>
    );
};

export const ModeSelectScreen: React.FC<ModeSelectProps> = ({ onCompetitive, onUnrated, onBack }) => (
  <Overlay>
      <RandomReveal className="bg-[#111] border-4 border-white p-6 md:p-8 text-center max-w-md w-full">
          <h2 className="text-2xl text-[#f4b400] mb-6"><RandomText text="Select Mode" /></h2>
          <div className="flex flex-col gap-4">
              <Button onClick={onCompetitive} variant="pro" className="w-full group">
                  <div className="text-lg">COMPETITIVE</div>
                  <div className="text-[10px] text-[#ccc] mt-1 normal-case font-sans">Ranked • Time Attack • Leaderboards</div>
              </Button>
              <Button onClick={onUnrated} className="w-full group">
                  <div className="text-lg">UNRATED</div>
                  <div className="text-[10px] text-[#ccc] mt-1 normal-case font-sans">Practice • Select Level • Relax</div>
              </Button>
              <div className="mt-4 pt-4 border-t border-[#333]">
                  <Button onClick={onBack} variant="secondary" className="w-full text-xs">Back</Button>
              </div>
          </div>
      </RandomReveal>
  </Overlay>
);

export const LevelSelectScreen: React.FC<LevelSelectProps> = ({ onSelectLevel, onBack }) => (
  <Overlay>
    <RandomReveal className="bg-[#111] border-4 border-white p-6 md:p-8 max-w-2xl w-full text-center">
        <h2 className="text-2xl text-[#f4b400] mb-6"><RandomText text="Select Menu" /></h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map(lvl => (
                <button 
                    key={lvl}
                    onClick={() => onSelectLevel(lvl)}
                    className="p-4 border-2 border-[#555] hover:border-[#f4b400] bg-[#222] hover:bg-[#333] transition-all flex flex-col items-center gap-2 group"
                >
                    <span className="text-3xl group-hover:scale-125 transition-transform">{LEVEL_CONFIGS[lvl].emoji}</span>
                    <span className="text-xs text-white">{LEVEL_CONFIGS[lvl].name}</span>
                </button>
            ))}
        </div>
        <div className="mt-8">
            <Button onClick={onBack} variant="secondary">Back</Button>
        </div>
    </RandomReveal>
  </Overlay>
);

export const LevelCompleteScreen: React.FC<LevelCompleteProps> = ({ levelName, message, emoji, onNext }) => (
    <Overlay>
        <RandomReveal className="bg-[#111] border-4 border-white p-8 text-center max-w-md w-full animate-bounce-in">
            <div className="text-6xl mb-4 animate-spin-slow">{emoji}</div>
            <h2 className="text-2xl text-[#f4b400] mb-2"><RandomText text={levelName} /></h2>
            <p className="text-sm text-[#ccc] mb-6">{message}</p>
            <Button onClick={onNext} className="w-full animate-pulse">Next Level</Button>
        </RandomReveal>
    </Overlay>
);

export const GameOverScreen: React.FC<GameOverProps> = ({ score, message, stats, onRestart, aiTitle, aiScore, isCalculating, isTimeScore }) => (
    <Overlay>
        <RandomReveal className="bg-[#111] border-4 border-white p-8 text-center max-w-md w-full shadow-[0_0_50px_rgba(255,0,0,0.3)]">
            <h2 className="text-3xl text-red-500 mb-4"><RandomText text="GAME OVER" /></h2>
            <p className="text-sm text-[#ccc] mb-4">{message}</p>
            
            <div className="bg-[#222] p-4 mb-6 border border-[#333]">
                <div className="text-xs text-[#888] mb-1">{isTimeScore ? 'FINAL TIME' : 'FINAL SCORE'}</div>
                <div className="text-3xl text-white font-bold">{score}{isTimeScore ? 's' : ''}</div>
                {stats && <div className="text-xs text-[#f4b400] mt-2">{stats}</div>}
            </div>

            {isCalculating ? (
                 <div className="mb-6 animate-pulse text-[#f4b400] text-xs">AI Evaluating Performance...</div>
            ) : aiTitle && (
                 <div className="mb-6 bg-[#1a1a1a] p-3 border border-[#f4b400] relative overflow-hidden">
                     <div className="absolute top-0 right-0 bg-[#f4b400] text-black text-[8px] px-2 py-1 font-bold">AI RANK</div>
                     <div className="text-lg text-[#f4b400] font-bold mt-2">"{aiTitle}"</div>
                     {aiScore !== undefined && !isTimeScore && <div className="text-xs text-[#888] mt-1">Performance Score: {aiScore}/100</div>}
                 </div>
            )}

            <Button onClick={onRestart} className="w-full">Try Again</Button>
        </RandomReveal>
    </Overlay>
);

export const BossIntroScreen: React.FC<BossIntroProps> = ({ onStart }) => (
    <Overlay>
        <RandomReveal className="bg-red-900/90 border-4 border-red-500 p-8 text-center max-w-lg w-full shadow-[0_0_100px_rgba(255,0,0,0.5)]">
            <h1 className="text-4xl text-white mb-4 animate-pulse" style={{ fontFamily: '"Creepster", cursive' }}>BOSS LEVEL</h1>
            <p className="text-lg text-[#f4b400] mb-6">THE DINNER RUSH</p>
            <p className="text-xs text-[#ccc] mb-8 leading-relaxed">
                The restaurant is packed. <br/>
                Orders are flying in. <br/>
                Don't mess this up, Chef!
            </p>
            <Button onClick={onStart} variant="accent" className="w-full text-xl animate-bounce">LET'S COOK!</Button>
        </RandomReveal>
    </Overlay>
);

export const PauseScreen: React.FC<PauseScreenProps> = ({ onResume, onQuit }) => (
    <Overlay>
        <RandomReveal className="bg-[#111] border-4 border-white p-8 text-center min-w-[300px]">
            <h2 className="text-2xl text-white mb-8">PAUSED</h2>
            <div className="flex flex-col gap-4">
                <Button onClick={onResume}>RESUME</Button>
                <Button onClick={onQuit} variant="secondary">QUIT</Button>
            </div>
        </RandomReveal>
    </Overlay>
);

export const ExitConfirmScreen: React.FC<ExitConfirmProps> = ({ onConfirm, onCancel }) => (
    <Overlay>
        <RandomReveal className="bg-[#111] border-4 border-red-500 p-6 text-center max-w-sm">
            <h3 className="text-red-500 mb-4">Confirm Quit?</h3>
            <p className="text-xs text-[#aaa] mb-6">Competitive progress will be lost!</p>
            <div className="flex gap-4">
                <Button onClick={onConfirm} className="flex-1 bg-red-600 border-red-400">Yes</Button>
                <Button onClick={onCancel} className="flex-1">No</Button>
            </div>
        </RandomReveal>
    </Overlay>
);

export const InfoModal: React.FC<InfoModalProps> = ({ text, onClose }) => (
    <Overlay>
        <RandomReveal className="bg-[#111] border-2 border-[#f4b400] p-6 text-center max-w-sm shadow-[0_0_30px_rgba(244,180,0,0.2)]">
            <p className="text-sm text-white mb-6 leading-relaxed">{text}</p>
            <Button onClick={onClose} className="w-full py-2 text-xs">OK</Button>
        </RandomReveal>
    </Overlay>
);

export const SpeedResultScreen: React.FC<SpeedResultProps> = ({ wpm, cpm, accuracy, comment, onRestart }) => (
    <Overlay>
        <RandomReveal className="bg-[#111] border-4 border-[#4facfe] p-8 text-center max-w-md w-full shadow-[0_0_50px_rgba(79,172,254,0.3)]">
            <h2 className="text-2xl text-[#4facfe] mb-6">SHIFT COMPLETE</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="flex flex-col">
                    <span className="text-3xl text-white font-bold">{wpm}</span>
                    <span className="text-[10px] text-[#888]">WPM</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-3xl text-white font-bold">{cpm}</span>
                    <span className="text-[10px] text-[#888]">CPM</span>
                </div>
                <div className="flex flex-col">
                    <span className={`text-3xl font-bold ${accuracy >= 95 ? 'text-green-500' : accuracy >= 80 ? 'text-[#f4b400]' : 'text-red-500'}`}>{accuracy}%</span>
                    <span className="text-[10px] text-[#888]">ACC</span>
                </div>
            </div>

            <div className="bg-[#1a1a1a] p-4 border-l-4 border-[#f4b400] text-left mb-8">
                <span className="text-[10px] text-[#f4b400] font-bold block mb-1">CHEF'S FEEDBACK:</span>
                <p className="text-xs text-[#ccc] italic">"{comment}"</p>
            </div>

            <Button onClick={onRestart} className="w-full">Next Ticket</Button>
        </RandomReveal>
    </Overlay>
);

export const UsernameScreen: React.FC<UsernameScreenProps> = ({ onSubmit }) => {
    const [name, setName] = useState('');
    return (
        <Overlay>
            <RandomReveal className="bg-[#111] border-4 border-white p-8 text-center max-w-sm w-full">
                <h2 className="text-xl text-[#f4b400] mb-4">Who's Cooking?</h2>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={12}
                    placeholder="Enter Chef Name"
                    className="w-full bg-black border border-[#555] p-3 text-white text-center mb-6 outline-none focus:border-[#f4b400]"
                    autoFocus
                />
                <Button onClick={() => name.trim() && onSubmit(name.trim())} className="w-full" disabled={!name.trim()}>
                    Start Cooking
                </Button>
            </RandomReveal>
        </Overlay>
    );
};

export const GeneratingModal: React.FC<GeneratingModalProps> = ({ message }) => (
    <Overlay>
        <div className="flex flex-col items-center animate-pulse">
            <div className="text-6xl mb-4">🤖</div>
            <p className="text-[#f4b400] text-sm">{message}</p>
        </div>
    </Overlay>
);
