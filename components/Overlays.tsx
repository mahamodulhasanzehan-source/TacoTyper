import React, { useEffect, useState } from 'react';
import { COLORS } from '../constants';
import type { User } from '../services/firebase';
import { LeaderboardEntry } from '../types';
import { getLeaderboard, deleteLeaderboardEntry } from '../services/firebase';

interface OverlayProps {
  children: React.ReactNode;
}

const Overlay: React.FC<OverlayProps> = ({ children }) => (
  <div 
    className="absolute top-0 left-0 w-full h-full bg-black/90 text-white flex flex-col justify-center items-center z-[100] animate-fade-in"
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
          fontFamily: '"Press Start 2P", cursive'
      }}
      className={`text-white text-base py-4 px-5 border-4 border-white cursor-pointer transition-all duration-200 hover:scale-110 hover:brightness-125 active:scale-95 ${className}`}
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
    
    // Admin State
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    const fetchLeaderboard = async () => {
        setLoading(true);
        const data = await getLeaderboard(mode === 'speed' ? 'speed-test' : mode);
        setEntries(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [mode]);

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Simple hardcoded password for now, as requested.
        if (passwordInput === 'tacos') {
            setIsAdmin(true);
            setShowAdminLogin(false);
            setPasswordInput('');
        } else {
            alert("Wrong password, Chef!");
            setPasswordInput('');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this score permanently?")) return;
        
        // Optimistic UI Update
        setEntries(prev => prev.filter(e => e.id !== id));
        
        const success = await deleteLeaderboardEntry(id);
        if (!success) {
            alert("Failed to delete. Check console.");
            fetchLeaderboard(); // Revert on fail
        }
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

    return (
        <div className="absolute top-0 right-0 h-full w-[300px] border-l-4 border-white bg-[#0a0a0a] p-4 flex flex-col z-[150] shadow-[-10px_0_30px_rgba(0,0,0,0.8)]">
            
            {/* Settings / Admin Icon */}
            <div 
                onClick={() => {
                    if (isAdmin) {
                        if(confirm("Logout Admin?")) setIsAdmin(false);
                    } else {
                        setShowAdminLogin(true);
                    }
                }}
                className={`absolute top-2 right-2 w-6 h-6 cursor-pointer opacity-50 hover:opacity-100 transition-opacity z-50 ${isAdmin ? 'text-red-500' : 'text-gray-500'}`}
                title="Admin Control"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>

            {/* Admin Login Popup */}
            {showAdminLogin && (
                <div className="absolute top-10 right-2 bg-[#222] border-2 border-white p-2 z-[200] flex flex-col gap-2 w-48 shadow-lg">
                    <p className="text-[8px] text-[#aaa]">ENTER ADMIN PASS:</p>
                    <form onSubmit={handleAdminLogin}>
                        <input 
                            type="password" 
                            className="w-full bg-black border border-[#555] text-white p-1 text-xs outline-none focus:border-[#f4b400]"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            autoFocus
                        />
                    </form>
                    <button onClick={() => setShowAdminLogin(false)} className="text-[8px] text-red-500 hover:text-white text-left">Cancel</button>
                </div>
            )}

            <h3 className="text-[#f4b400] text-center mb-4 text-xs uppercase border-b-2 border-[#333] pb-3 tracking-widest mt-4">
                {isAdmin ? 'ADMIN MODE' : 'Top Chefs'}
            </h3>
            
            <div className="flex gap-1 mb-4 justify-center">
                <button 
                    onClick={() => setMode('competitive')} 
                    className={`text-[8px] px-2 py-1.5 border ${mode === 'competitive' ? 'bg-[#e55934] border-white text-white' : 'bg-transparent border-[#444] text-[#888] hover:border-[#666]'}`}
                >
                    COMP
                </button>
                <button 
                    onClick={() => setMode('infinite')} 
                    className={`text-[8px] px-2 py-1.5 border ${mode === 'infinite' ? 'bg-[#4facfe] border-white text-white' : 'bg-transparent border-[#444] text-[#888] hover:border-[#666]'}`}
                >
                    INF
                </button>
                <button 
                    onClick={() => setMode('universal')} 
                    className={`text-[8px] px-2 py-1.5 border ${mode === 'universal' ? 'bg-[#57a863] border-white text-white' : 'bg-transparent border-[#444] text-[#888] hover:border-[#666]'}`}
                >
                    UNIV
                </button>
                <button 
                    onClick={() => setMode('speed')} 
                    className={`text-[8px] px-2 py-1.5 border ${mode === 'speed' ? 'bg-[#ff2a2a] border-white text-white' : 'bg-transparent border-[#444] text-[#888] hover:border-[#666]'}`}
                >
                    SPEED
                </button>
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
                        <div key={entry.id} className="flex flex-col bg-[#161616] p-2 border border-[#333] hover:border-[#555] transition-colors relative group">
                            
                            {/* Delete Button (Only visible in Admin Mode) */}
                            {isAdmin && (
                                <button 
                                    onClick={() => handleDelete(entry.id)}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white hover:bg-red-800 z-50 shadow-md"
                                    title="Delete Entry"
                                >
                                    ✕
                                </button>
                            )}

                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className={`text-xs font-bold w-5 ${idx === 0 ? 'text-[#f4b400]' : idx === 1 ? 'text-[#ccc]' : idx === 2 ? 'text-[#cd7f32]' : 'text-[#444]'}`}>
                                        #{idx + 1}
                                    </span>
                                    <span className="text-[10px] text-white truncate max-w-[110px]">{entry.username}</span>
                                </div>
                                <div className="flex flex-col items-end shrink-0 ml-1">
                                    <span className="text-[#57a863] text-[10px] font-bold shadow-black drop-shadow-md">
                                        {formatScore(entry)} {getScoreLabel()}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end border-t border-[#222] pt-1 mt-1">
                                <span className="text-[8px] text-[#888] italic truncate max-w-[150px] block">
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Exit Confirmation ---
interface ExitConfirmProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export const ExitConfirmScreen: React.FC<ExitConfirmProps> = ({ onConfirm, onCancel }) => (
    <div className="absolute top-0 left-0 w-full h-full bg-black/80 flex items-center justify-center z-[200] animate-fade-in">
        <div className="bg-[#111] border-4 border-[#ff2a2a] p-8 flex flex-col items-center max-w-md text-center shadow-[0_0_30px_rgba(255,0,0,0.3)]">
            <h2 className="text-2xl text-[#ff2a2a] mb-4">WARNING CHEF!</h2>
            <p className="text-sm leading-6 mb-6">
                You are about to abandon the kitchen during a ranked service.<br/><br/>
                <span className="text-[#f4b400]">Your score/time will not be recorded.</span>
            </p>
            <div className="flex gap-4">
                <Button onClick={onConfirm} variant="secondary">Leave Kitchen</Button>
                <Button onClick={onCancel} variant="primary">Keep Cooking</Button>
            </div>
        </div>
    </div>
);

// --- Username Setup ---
interface UsernameScreenProps {
    onSubmit: (name: string) => void;
}

export const UsernameScreen: React.FC<UsernameScreenProps> = ({ onSubmit }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim().length > 0 && name.trim().length <= 12) {
            onSubmit(name.trim());
        }
    };

    return (
        <Overlay>
            <h2 className="text-2xl mb-6 text-[#f4b400]">Identify Yourself</h2>
            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nickname"
                    maxLength={12}
                    className="bg-[#111] border-4 border-white p-4 text-center text-white font-['Press_Start_2P'] outline-none focus:border-[#f4b400] w-[300px]"
                    autoFocus
                />
                <div className="text-[10px] text-[#aaa] mb-4">Max 12 chars</div>
                <Button type="submit">Confirm Identity</Button>
            </form>
        </Overlay>
    );
};

// --- Mode Select ---
interface ModeSelectProps {
    onCompetitive: () => void;
    onUnrated: () => void;
    onBack: () => void;
}

export const ModeSelectScreen: React.FC<ModeSelectProps> = ({ onCompetitive, onUnrated, onBack }) => (
    <Overlay>
        <h2 className="text-3xl text-[#f4b400] mb-8" style={{ textShadow: `3px 3px 0px ${COLORS.accent}` }}>Select Kitchen</h2>
        <div className="flex gap-8 mb-8">
            <button 
                onClick={onCompetitive}
                className="w-[220px] h-[180px] bg-[#222] border-4 border-[#ff2a2a] hover:bg-[#330000] hover:scale-105 transition-all flex flex-col items-center justify-center p-4"
            >
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-[#ff2a2a] mb-2 font-bold">COMPETITIVE</h3>
                <p className="text-[10px] text-center text-[#aaa] leading-4">
                    Ranked Play.<br/>Lvl 1 - Boss.<br/>Time Attack.<br/>No AI Score.
                </p>
            </button>

            <button 
                onClick={onUnrated}
                className="w-[220px] h-[180px] bg-[#222] border-4 border-[#57a863] hover:bg-[#002200] hover:scale-105 transition-all flex flex-col items-center justify-center p-4"
            >
                <div className="text-4xl mb-4">🍳</div>
                <h3 className="text-[#57a863] mb-2 font-bold">UNRATED</h3>
                <p className="text-[10px] text-center text-[#aaa] leading-4">
                    Casual Play.<br/>Select Level.<br/>Practice.<br/>No Pressure.
                </p>
            </button>
        </div>
        <button onClick={onBack} className="bg-[#444] text-white text-xs py-2 px-4 border-2 border-white font-['Press_Start_2P'] hover:bg-[#666]">Back</button>
    </Overlay>
);

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

  return (
      <Overlay>
         <LeaderboardWidget />
         
         <div className="absolute top-8 left-8 flex gap-4 z-[120]">
            {user && (
                <div className="flex items-center gap-4">
                    <span className="text-[#aaa] text-xs">Chef {user.displayName}</span>
                    {!showLogoutConfirm ? (
                        <button 
                            onClick={() => setShowLogoutConfirm(true)}
                            className="bg-transparent border-2 border-[#ff2a2a] text-[#ff2a2a] text-xs py-2 px-4 cursor-pointer font-['Press_Start_2P'] hover:bg-[#ff2a2a] hover:text-white"
                        >
                            Log Out
                        </button>
                    ) : (
                        <div className="flex gap-2">
                             <span className="text-xs text-white self-center">Sure?</span>
                             <button 
                                onClick={onLogout}
                                className="bg-[#ff2a2a] text-white text-xs py-2 px-2 border-2 border-[#ff2a2a] hover:brightness-125"
                             >
                                Yes
                             </button>
                             <button 
                                onClick={() => setShowLogoutConfirm(false)}
                                className="bg-transparent text-[#aaa] text-xs py-2 px-2 border-2 border-[#aaa] hover:bg-[#333]"
                             >
                                No
                             </button>
                        </div>
                    )}
                </div>
            )}
         </div>
         
         <div className="flex flex-col items-center mr-[300px]">
            <h1 className="text-5xl mb-5 text-[#f4b400] shadow-[#e55934]" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>
                Typing for Tacos
            </h1>
            <p className="text-base max-w-[500px] leading-normal mb-8 text-center">
                Type ingredients to cook!<br />Don't drop the food!
            </p>
            <div className="flex flex-col gap-5 items-center">
                <div className="flex gap-5">
                    <Button onClick={onStart}>Start Cooking</Button>
                    <Button onClick={onInfinite} variant="secondary">Infinite</Button>
                </div>
                
                <div className="flex gap-4">
                     <button 
                        onClick={onUniversal}
                        className="bg-transparent border-2 border-[#4facfe] text-[#4facfe] text-xs py-2 px-4 cursor-pointer font-['Press_Start_2P'] hover:bg-[#4facfe] hover:text-white hover:scale-105"
                    >
                        Universal
                    </button>
                    <button 
                        onClick={onSpeedTest}
                        disabled={isGenerating}
                        className={`bg-transparent border-2 border-[#ff2a2a] text-[#ff2a2a] text-xs py-2 px-4 cursor-pointer font-['Press_Start_2P'] hover:bg-[#ff2a2a] hover:text-white hover:scale-105 transition-all ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        {isGenerating ? '...' : 'Speed Test'}
                    </button>
                </div>
            </div>
         </div>
      </Overlay>
  );
};

// --- Level Select ---
interface LevelSelectProps {
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}

export const LevelSelectScreen: React.FC<LevelSelectProps> = ({ onSelectLevel, onBack }) => (
  <Overlay>
    <h1 className="text-5xl mb-5 text-[#f4b400]" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>Select Level</h1>
    <div className="grid grid-cols-2 gap-5 mb-5">
        {[
            { lvl: 1, icon: '🌮', name: 'Level 1\nTacos' },
            { lvl: 2, icon: '🍔', name: 'Level 2\nBurgers' },
            { lvl: 3, icon: '🍝', name: 'Level 3\nNoodles' },
            { lvl: 4, icon: '🍲', name: 'Level 4\nPrep' },
            { lvl: 5, icon: '🍛', name: 'Level 5\nKabsa', full: true },
        ].map((item) => (
            <button
                key={item.lvl}
                onClick={() => onSelectLevel(item.lvl)}
                className={`bg-[#57a863] text-white flex flex-col items-center justify-center w-[160px] h-[100px] border-4 border-white hover:scale-105 transition-transform active:scale-95 ${item.full ? 'col-span-2 w-full' : ''}`}
                style={{ fontFamily: '"Press Start 2P", cursive', fontSize: '14px' }}
            >
                <span className="text-3xl mb-2">{item.icon}</span>
                <span className="whitespace-pre-line text-center">{item.name}</span>
            </button>
        ))}
    </div>
    <button onClick={onBack} className="bg-[#444] text-white text-xs py-2 px-4 border-2 border-white font-['Press_Start_2P'] hover:bg-[#666]">Back</button>
  </Overlay>
);

// --- Level Complete ---
interface LevelCompleteProps {
    levelName: string;
    message: string;
    emoji: string;
    onNext: () => void;
}

export const LevelCompleteScreen: React.FC<LevelCompleteProps> = ({ levelName, message, emoji, onNext }) => (
    <Overlay>
        <h2 className="text-3xl text-[#f4b400] mb-4 text-center">{levelName}</h2>
        <p className="mb-4 text-center">{message}</p>
        <div className="relative w-[300px] h-[150px] flex justify-center items-center my-4">
            <span className="text-[120px] absolute animate-bounce">{emoji}</span>
        </div>
        <Button onClick={onNext}>Next Level</Button>
    </Overlay>
);

// --- Game Over ---
interface GameOverProps {
    score: number;
    message: string;
    stats?: string;
    onRestart: () => void;
    aiTitle?: string;
    aiScore?: number;
    isCalculating?: boolean;
    isTimeScore?: boolean;
}

export const GameOverScreen: React.FC<GameOverProps> = ({ score, message, stats, onRestart, aiTitle, aiScore, isCalculating, isTimeScore }) => {
    
    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Overlay>
            <h1 className="text-4xl text-[#f4b400] mb-5 shadow-[#e55934]" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>
                {aiTitle ? "RANKING REPORT" : "Game Over!"}
            </h1>
            
            {isCalculating ? (
                 <div className="flex flex-col items-center mb-6">
                     <div className="loading-spinner mb-4" />
                     <p className="animate-pulse">The Judges are deliberating...</p>
                 </div>
            ) : aiScore !== undefined ? (
                 <div className="bg-[#222] border-4 border-[#fff] p-6 mb-6 flex flex-col items-center animate-pop-in min-w-[300px]">
                     <p className="text-[#aaa] text-xs mb-2">{isTimeScore ? "TOTAL TIME" : "FINAL SCORE"}</p>
                     <p className="text-6xl text-[#57a863] mb-4 font-bold">
                        {isTimeScore ? formatTime(aiScore) : aiScore}
                     </p>
                     <p className="text-xl text-[#f4b400] border-t-2 border-[#555] pt-4 w-full text-center tracking-widest">
                        "{aiTitle}"
                     </p>
                 </div>
            ) : (
                <>
                    <p className="mb-2">
                        {isTimeScore ? "Total Time: " : "Final Score: "} 
                        <span className="text-[#f4b400]">{isTimeScore ? formatTime(score) : score}</span>
                    </p>
                    <p className="mb-5 text-center px-4">{message}</p>
                    {stats && <p className="mb-5 text-sm text-[#aaa]">{stats}</p>}
                </>
            )}
            
            <Button onClick={onRestart}>Home</Button>
        </Overlay>
    );
};

// --- Boss Intro ---
export const BossIntroScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <Overlay>
        <h1 className="text-4xl mb-4 text-[#ff0055]">The After Party</h1>
        <p className="mb-6 text-center max-w-[80%] leading-relaxed">"The food was amazing. Let's see if you can hold up and socialize."</p>
        <Button onClick={onStart}>Let's Go!</Button>
    </Overlay>
);

// --- Pause ---
export const PauseScreen: React.FC<{ onResume: () => void, onQuit: () => void }> = ({ onResume, onQuit }) => (
    <Overlay>
        <h1 className="text-5xl mb-4">PAUSED</h1>
        <p className="animate-blink mb-8 cursor-pointer hover:text-[#f4b400]" onClick={onResume}>Press ESC to Resume</p>
        <Button onClick={onQuit} variant="accent">Quit to Menu</Button>
    </Overlay>
);

// --- Info Modal ---
export const InfoModal: React.FC<{ text: string, onClose: () => void }> = ({ text, onClose }) => (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] bg-[#111] border-4 border-white p-8 z-[200] flex flex-col items-center shadow-[0_0_20px_rgba(0,0,0,0.9)] animate-fade-in" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        <button onClick={onClose} className="absolute top-2 right-2 bg-[#e55934] border-2 border-white text-white cursor-pointer text-xs p-1 hover:scale-110">X</button>
        <h2 className="text-[#f4b400] mb-4 text-xl">Mode Info</h2>
        <p className="text-sm text-center leading-6">{text}</p>
    </div>
);

// --- Speed Result ---
interface SpeedResultProps {
    wpm: number;
    cpm: number;
    accuracy: number;
    comment: string;
    onRestart: () => void;
}

export const SpeedResultScreen: React.FC<SpeedResultProps> = ({ wpm, cpm, accuracy, comment, onRestart }) => {
    // Helper to determine color based on value thresholds
    const getStatColor = (val: number, low: number, high: number) => {
        if (val < low) return '#ff2a2a'; // Red
        if (val < high) return '#f4b400'; // Yellow
        return '#57a863'; // Green
    };

    // Calculate colors for each stat
    const wpmColor = getStatColor(wpm, 30, 60);
    const cpmColor = getStatColor(cpm, 150, 300);
    const accColor = getStatColor(accuracy, 85, 95);

    // Determine overall comment color based on a weighted check
    let commentColor = '#f4b400';
    if (accuracy < 85 || wpm < 30) {
        commentColor = '#ff2a2a';
    } else if (wpm > 60 && accuracy > 95) {
        commentColor = '#57a863';
    }

    return (
        <Overlay>
            <h1 className="text-4xl text-[#4facfe] mb-8" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>Kitchen Report</h1>
            <div className="flex gap-12 mb-8">
                <div className="flex flex-col items-center">
                    <span className="text-[60px]" style={{ color: wpmColor }}>{wpm}</span>
                    <span className="text-[#aaa]">WPM</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[60px]" style={{ color: cpmColor }}>{cpm}</span>
                    <span className="text-[#aaa]">CPM</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[60px]" style={{ color: accColor }}>{accuracy}%</span>
                    <span className="text-[#aaa]">ACCURACY</span>
                </div>
            </div>
            <div 
                className="bg-[#222] border-l-4 p-4 max-w-[600px] mb-8 italic"
                style={{ 
                    borderColor: commentColor, 
                    color: commentColor 
                }}
            >
                " {comment} "
            </div>
            <Button onClick={onRestart}>Back to Kitchen</Button>
        </Overlay>
    );
};