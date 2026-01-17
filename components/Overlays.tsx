
import React, { useEffect, useState } from 'react';
import { COLORS } from '../constants';
import type { User } from '../services/firebase';
import { LeaderboardEntry } from '../types';
import { getLeaderboard, deleteLeaderboardEntry } from '../services/firebase';
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

// --- Settings Modal ---
interface SettingsModalProps {
    onClose: () => void;
}
const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const { settings, updateSettings, isAdmin, setIsAdmin } = useSettings();
    const [passwordInput, setPasswordInput] = useState('');

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === 'tacos') {
            setIsAdmin(true);
            setPasswordInput('');
        } else {
            alert("Wrong password, Chef!");
        }
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/95 z-[250] flex items-center justify-center p-4">
            <RandomReveal className="bg-[#111] border-4 border-white p-6 md:p-8 w-full max-w-md flex flex-col gap-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl text-[#f4b400]">Kitchen Settings</h2>
                    <button onClick={onClose} className="text-red-500 text-xl font-bold">X</button>
                </div>

                <div className="flex flex-col gap-4">
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

                    {/* Reduced Motion */}
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm">Reduced Motion (No Shake)</span>
                        <input 
                            type="checkbox" 
                            checked={settings.reducedMotion}
                            onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                            className="w-5 h-5 accent-[#e55934]"
                        />
                    </label>

                    {/* Theme */}
                    <div className="flex items-center justify-between">
                         <span className="text-sm">Visual Theme</span>
                         <div className="flex gap-2">
                             <button 
                                onClick={() => updateSettings({ theme: 'taco' })}
                                className={`text-[10px] px-3 py-2 border ${settings.theme === 'taco' ? 'bg-[#e55934] border-white' : 'bg-transparent border-[#555] text-[#888]'}`}
                             >
                                TACO
                             </button>
                             <button 
                                onClick={() => updateSettings({ theme: 'dark' })}
                                className={`text-[10px] px-3 py-2 border ${settings.theme === 'dark' ? 'bg-white text-black border-white' : 'bg-transparent border-[#555] text-[#888]'}`}
                             >
                                DARK
                             </button>
                         </div>
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
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onInfinite, onUniversal, onSpeedTest, user, onLogout, isGenerating }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
                    <span className="text-[#aaa] text-[10px] md:text-xs">Chef {user.displayName}</span>
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

         {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
         
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
        <h2 className="text-2xl md:text-3xl text-[#f4b400] mb-8" style={{ textShadow: `3px 3px 0px ${COLORS.accent}` }}>
            <RandomText text="Select Kitchen" />
        </h2>
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-8">
            <RandomReveal>
                <button 
                    onClick={onCompetitive}
                    className="w-[200px] h-[150px] md:w-[220px] md:h-[180px] bg-[#222] border-4 border-[#ff2a2a] hover:bg-[#330000] hover:scale-105 transition-all flex flex-col items-center justify-center p-4"
                >
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-[#ff2a2a] mb-2 font-bold text-xs md:text-base">COMPETITIVE</h3>
                    <p className="text-[10px] text-center text-[#aaa] leading-4">
                        Ranked Play.<br/>Lvl 1 - Boss.<br/>Time Attack.<br/>No AI Score.
                    </p>
                </button>
            </RandomReveal>

            <RandomReveal delay={0.2}>
                <button 
                    onClick={onUnrated}
                    className="w-[200px] h-[150px] md:w-[220px] md:h-[180px] bg-[#222] border-4 border-[#57a863] hover:bg-[#002200] hover:scale-105 transition-all flex flex-col items-center justify-center p-4"
                >
                    <div className="text-4xl mb-4">🍳</div>
                    <h3 className="text-[#57a863] mb-2 font-bold text-xs md:text-base">UNRATED</h3>
                    <p className="text-[10px] text-center text-[#aaa] leading-4">
                        Casual Play.<br/>Select Level.<br/>Practice.<br/>No Pressure.
                    </p>
                </button>
            </RandomReveal>
        </div>
        <RandomReveal delay={0.4}><button onClick={onBack} className="bg-[#444] text-white text-xs py-2 px-4 border-2 border-white font-['Press_Start_2P'] hover:bg-[#666]">Back</button></RandomReveal>
    </Overlay>
);

export const LevelSelectScreen: React.FC<LevelSelectProps> = ({ onSelectLevel, onBack }) => (
  <Overlay>
    <h1 className="text-3xl md:text-5xl mb-5 text-[#f4b400]" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}><RandomText text="Select Level" /></h1>
    <div className="grid grid-cols-2 gap-4 md:gap-5 mb-5">
        {[
            { lvl: 1, icon: '🌮', name: 'Level 1\nTacos' },
            { lvl: 2, icon: '🍔', name: 'Level 2\nBurgers' },
            { lvl: 3, icon: '🍝', name: 'Level 3\nNoodles' },
            { lvl: 4, icon: '🍲', name: 'Level 4\nPrep' },
            { lvl: 5, icon: '🍛', name: 'Level 5\nKabsa', full: true },
        ].map((item, idx) => (
            <RandomReveal key={item.lvl} delay={idx * 0.1}>
                <button
                    onClick={() => onSelectLevel(item.lvl)}
                    className={`bg-[#57a863] text-white flex flex-col items-center justify-center w-[130px] h-[90px] md:w-[160px] md:h-[100px] border-4 border-white hover:scale-105 transition-transform active:scale-95 ${item.full ? 'col-span-2 w-full' : ''}`}
                    style={{ fontFamily: '"Press Start 2P", cursive', fontSize: '10px' }}
                >
                    <span className="text-2xl md:text-3xl mb-2">{item.icon}</span>
                    <span className="whitespace-pre-line text-center">{item.name}</span>
                </button>
            </RandomReveal>
        ))}
    </div>
    <RandomReveal delay={0.6}><button onClick={onBack} className="bg-[#444] text-white text-xs py-2 px-4 border-2 border-white font-['Press_Start_2P'] hover:bg-[#666]">Back</button></RandomReveal>
  </Overlay>
);

export const LevelCompleteScreen: React.FC<LevelCompleteProps> = ({ levelName, message, emoji, onNext }) => (
    <Overlay>
        <h2 className="text-2xl md:text-3xl text-[#f4b400] mb-4 text-center"><RandomText text={levelName} /></h2>
        <p className="mb-4 text-center text-xs md:text-base"><RandomText text={message} /></p>
        <RandomReveal className="relative w-[200px] h-[100px] md:w-[300px] md:h-[150px] flex justify-center items-center my-4">
            <span className="text-[80px] md:text-[120px] absolute animate-bounce">{emoji}</span>
        </RandomReveal>
        <RandomReveal delay={0.5}><Button onClick={onNext}>Next Level</Button></RandomReveal>
    </Overlay>
);

export const GameOverScreen: React.FC<GameOverProps> = ({ score, message, stats, onRestart, aiTitle, aiScore, isCalculating, isTimeScore }) => {
    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Overlay>
            <h1 className="text-2xl md:text-4xl text-[#f4b400] mb-5 shadow-[#e55934] text-center" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>
                <RandomText text={aiTitle ? "RANKING REPORT" : "Game Over!"} />
            </h1>
            
            {isCalculating ? (
                 <div className="flex flex-col items-center mb-6">
                     <div className="loading-spinner mb-4" />
                     <p className="animate-pulse text-xs md:text-base">The Judges are deliberating...</p>
                 </div>
            ) : aiScore !== undefined ? (
                 <RandomReveal className="bg-[#222] border-4 border-[#fff] p-6 mb-6 flex flex-col items-center animate-pop-in min-w-[280px] md:min-w-[300px]">
                     <p className="text-[#aaa] text-xs mb-2">{isTimeScore ? "TOTAL TIME" : "FINAL SCORE"}</p>
                     <p className="text-4xl md:text-6xl text-[#57a863] mb-4 font-bold">
                        {isTimeScore ? formatTime(aiScore) : aiScore}
                     </p>
                     <p className="text-lg md:text-xl text-[#f4b400] border-t-2 border-[#555] pt-4 w-full text-center tracking-widest">
                        "{aiTitle}"
                     </p>
                 </RandomReveal>
            ) : (
                <RandomReveal>
                    <p className="mb-2 text-xs md:text-base">
                        {isTimeScore ? "Total Time: " : "Final Score: "} 
                        <span className="text-[#f4b400]">{isTimeScore ? formatTime(score) : score}</span>
                    </p>
                    <p className="mb-5 text-center px-4 text-xs md:text-base">{message}</p>
                    {stats && <p className="mb-5 text-xs text-[#aaa]">{stats}</p>}
                </RandomReveal>
            )}
            
            <RandomReveal delay={0.5}><Button onClick={onRestart}>Home</Button></RandomReveal>
        </Overlay>
    );
};

export const BossIntroScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <Overlay>
        <h1 className="text-2xl md:text-4xl mb-4 text-[#ff0055]"><RandomText text="The After Party" /></h1>
        <p className="mb-6 text-center max-w-[80%] leading-relaxed text-xs md:text-base"><RandomText text='"The food was amazing. Let`s see if you can hold up and socialize."' /></p>
        <RandomReveal><Button onClick={onStart}>Let's Go!</Button></RandomReveal>
    </Overlay>
);

export const PauseScreen: React.FC<{ onResume: () => void, onQuit: () => void }> = ({ onResume, onQuit }) => (
    <Overlay>
        <h1 className="text-4xl md:text-5xl mb-4"><RandomText text="PAUSED" /></h1>
        <p className="animate-blink mb-8 cursor-pointer hover:text-[#f4b400] text-xs md:text-base" onClick={onResume}>
            <RandomText text="Tap / Press ESC to Resume" />
        </p>
        <RandomReveal><Button onClick={onQuit} variant="accent">Quit to Menu</Button></RandomReveal>
    </Overlay>
);

export const InfoModal: React.FC<{ text: string, onClose: () => void }> = ({ text, onClose }) => (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] md:w-[500px] bg-[#111] border-4 border-white p-6 md:p-8 z-[200] flex flex-col items-center shadow-[0_0_20px_rgba(0,0,0,0.9)] animate-fade-in" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        <button onClick={onClose} className="absolute top-2 right-2 bg-[#e55934] border-2 border-white text-white cursor-pointer text-xs p-1 hover:scale-110">X</button>
        <h2 className="text-[#f4b400] mb-4 text-lg md:text-xl">Mode Info</h2>
        <p className="text-xs md:text-sm text-center leading-6">{text}</p>
    </div>
);

export const SpeedResultScreen: React.FC<SpeedResultProps> = ({ wpm, cpm, accuracy, comment, onRestart }) => {
    // Re-implemented to use CSS Vars via COLORS
    const getStatColor = (val: number, low: number, high: number) => {
        if (val < low) return COLORS.gameBorder; // Red 
        if (val < high) return COLORS.warn;
        return COLORS.correct;
    };

    const wpmColor = getStatColor(wpm, 30, 60);
    const cpmColor = getStatColor(cpm, 150, 300);
    const accColor = getStatColor(accuracy, 85, 95);

    let commentColor = COLORS.warn;
    if (accuracy < 85 || wpm < 30) {
        commentColor = COLORS.gameBorder;
    } else if (wpm > 60 && accuracy > 95) {
        commentColor = COLORS.correct;
    }

    return (
        <Overlay>
            <h1 className="text-2xl md:text-4xl text-[#4facfe] mb-8 text-center" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>
                <RandomText text="Kitchen Report" />
            </h1>
            <div className="flex gap-4 md:gap-12 mb-8">
                <RandomReveal className="flex flex-col items-center">
                    <span className="text-3xl md:text-[60px]" style={{ color: wpmColor }}>{wpm}</span>
                    <span className="text-[#aaa] text-[10px] md:text-base">WPM</span>
                </RandomReveal>
                <RandomReveal delay={0.2} className="flex flex-col items-center">
                    <span className="text-3xl md:text-[60px]" style={{ color: cpmColor }}>{cpm}</span>
                    <span className="text-[#aaa] text-[10px] md:text-base">CPM</span>
                </RandomReveal>
                <RandomReveal delay={0.4} className="flex flex-col items-center">
                    <span className="text-3xl md:text-[60px]" style={{ color: accColor }}>{accuracy}%</span>
                    <span className="text-[#aaa] text-[10px] md:text-base">ACCURACY</span>
                </RandomReveal>
            </div>
            <RandomReveal delay={0.6}
                className="bg-[#222] border-l-4 p-4 max-w-[600px] mb-8 italic text-xs md:text-base"
                style={{ borderColor: commentColor, color: commentColor }}
            >
                " {comment} "
            </RandomReveal>
            <RandomReveal delay={0.8}><Button onClick={onRestart}>Back to Kitchen</Button></RandomReveal>
        </Overlay>
    );
};

export const GeneratingModal: React.FC<GeneratingModalProps> = ({ message }) => (
    <div className="absolute top-0 left-0 w-full h-full bg-black flex flex-col items-center justify-center z-[300] animate-fade-in cursor-wait">
        <div className="relative mb-8">
            <span className="text-6xl animate-bounce inline-block">👨‍🍳</span>
        </div>
        
        <h2 className="text-2xl md:text-4xl text-[#f4b400] mb-6 text-center" style={{ textShadow: '2px 2px 0px #e55934', fontFamily: '"Press Start 2P", cursive' }}>
            {message}
        </h2>
        <div className="loading-spinner w-12 h-12 border-4 border-[#333] border-t-[#f4b400]"></div>
        <div className="mt-4 text-[#888] text-xs animate-pulse font-['Press_Start_2P']">AI is cooking...</div>
    </div>
);
