
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
          fontFamily: '"Press Start 2P", cursive'
      }}
      className={`text-white text-xs md:text-base py-3 px-4 md:py-4 md:px-5 border-4 border-white cursor-pointer transition-all duration-200 hover:scale-110 hover:brightness-125 active:scale-95 ${className}`}
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
        <div className="absolute top-0 right-0 h-full w-[160px] md:w-[300px] border-l-4 border-white bg-[#0a0a0a] p-2 md:p-4 flex flex-col z-[150] shadow-[-10px_0_30px_rgba(0,0,0,0.8)]">
            
            {/* Settings / Admin Icon */}
            <div 
                onClick={() => {
                    if (isAdmin) {
                        if(confirm("Logout Admin?")) setIsAdmin(false);
                    } else {
                        setShowAdminLogin(true);
                    }
                }}
                className={`absolute top-2 right-2 w-4 h-4 md:w-6 md:h-6 cursor-pointer opacity-50 hover:opacity-100 transition-opacity z-50 ${isAdmin ? 'text-red-500' : 'text-gray-500'}`}
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

            <h3 className="text-[#f4b400] text-center mb-4 text-[10px] md:text-xs uppercase border-b-2 border-[#333] pb-3 tracking-widest mt-4">
                {isAdmin ? 'ADMIN MODE' : 'Top Chefs'}
            </h3>
            
            <div className="flex gap-1 mb-4 justify-center flex-wrap">
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Screens ---

export const StartScreen: React.FC<{ 
    onStart: () => void, 
    onInfinite: () => void, 
    onUniversal: () => void,
    onSpeedTest: () => void,
    user: User,
    onLogout: () => void,
    isGenerating: boolean
}> = ({ onStart, onInfinite, onUniversal, onSpeedTest, user, onLogout, isGenerating }) => (
  <Overlay>
    <LeaderboardWidget />
    <h1 className="text-4xl md:text-6xl mb-2 text-[#f4b400] text-center" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>
      Typing for<br/>Tacos
    </h1>
    <p className="text-xs md:text-sm text-[#aaa] mb-8 text-center max-w-md leading-relaxed">
      You are the head chef. Orders are coming in fast.<br/>
      Type the ingredients to cook. Don't drop the food!
    </p>

    <div className="flex flex-col gap-4 w-full max-w-xs z-10">
      <Button onClick={onStart}>START SERVICE</Button>
      
      <Button 
        onClick={onSpeedTest} 
        variant="pro" 
        className="relative overflow-hidden group" 
        disabled={isGenerating}
      >
        {isGenerating ? "GENERATING..." : "SPEED CHEF MODE (AI)"}
        {!isGenerating && <span className="absolute top-0 right-0 text-[8px] bg-white text-black px-1 font-bold">NEW</span>}
      </Button>

      <div className="flex gap-4 w-full">
          <Button onClick={onUniversal} variant="secondary" className="flex-1 text-[10px]">Universal</Button>
          <Button onClick={onInfinite} variant="secondary" className="flex-1 text-[10px]">Infinite</Button>
      </div>

      <div className="mt-8 pt-4 border-t border-[#333] w-full flex justify-between items-center text-[10px] text-[#555]">
          <span>Chef: {user?.displayName || 'Unknown'}</span>
          <button onClick={onLogout} className="hover:text-white underline">Sign Out</button>
      </div>
    </div>
  </Overlay>
);

export const ModeSelectScreen: React.FC<{
    onCompetitive: () => void,
    onUnrated: () => void,
    onBack: () => void
}> = ({ onCompetitive, onUnrated, onBack }) => (
    <Overlay>
        <h2 className="text-3xl text-[#f4b400] mb-8">Select Mode</h2>
        <div className="flex flex-col gap-6 w-full max-w-sm">
            <button onClick={onCompetitive} className="bg-[#111] border-2 border-[#e55934] p-6 hover:bg-[#222] transition-colors text-left group relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#e55934] text-black text-[10px] px-2 py-1 font-bold">LEADERBOARD</div>
                <h3 className="text-xl text-[#e55934] mb-2 group-hover:scale-105 transition-transform">Competitive</h3>
                <p className="text-[10px] text-[#aaa] leading-relaxed">
                    - Ranked on Global Leaderboard<br/>
                    - Standard Speed & Difficulty<br/>
                    - AI Judges your performance
                </p>
            </button>

            <button onClick={onUnrated} className="bg-[#111] border-2 border-[#57a863] p-6 hover:bg-[#222] transition-colors text-left group">
                <h3 className="text-xl text-[#57a863] mb-2 group-hover:scale-105 transition-transform">Unrated Practice</h3>
                <p className="text-[10px] text-[#aaa] leading-relaxed">
                    - Choose your starting level<br/>
                    - No Leaderboard pressure<br/>
                    - Just cooking vibes
                </p>
            </button>
            
            <Button onClick={onBack} variant="secondary" className="mt-4">Back</Button>
        </div>
    </Overlay>
);

export const UsernameScreen: React.FC<{ onSubmit: (name: string) => void }> = ({ onSubmit }) => {
    const [name, setName] = useState('');
    return (
        <Overlay>
            <h2 className="text-2xl text-[#f4b400] mb-4">Who is cooking?</h2>
            <input 
                autoFocus
                type="text" 
                maxLength={12}
                className="bg-black border-4 border-white p-3 text-center text-xl mb-4 outline-none focus:border-[#f4b400] uppercase"
                placeholder="CHEF NAME"
                value={name}
                onChange={e => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && name.length > 0 && onSubmit(name)}
            />
            <Button onClick={() => name.length > 0 && onSubmit(name)}>CONFIRM</Button>
        </Overlay>
    );
};

export const LevelSelectScreen: React.FC<{ onSelectLevel: (lvl: number) => void, onBack: () => void }> = ({ onSelectLevel, onBack }) => (
  <Overlay>
    <h2 className="text-3xl mb-8 text-[#f4b400]">Select Menu</h2>
    <div className="grid grid-cols-2 gap-4 max-w-lg">
      {[1, 2, 3, 4, 5].map(lvl => (
        <Button key={lvl} onClick={() => onSelectLevel(lvl)} variant="secondary" className="min-w-[140px]">
          Level {lvl}
        </Button>
      ))}
    </div>
    <Button onClick={onBack} variant="accent" className="mt-8">Back to Title</Button>
  </Overlay>
);

export const LevelCompleteScreen: React.FC<{ levelName: string, message: string, emoji: string, onNext: () => void }> = ({ levelName, message, emoji, onNext }) => (
  <Overlay>
    <div className="text-6xl mb-4 animate-bounce">{emoji}</div>
    <h2 className="text-3xl text-[#57a863] mb-2">Service Complete!</h2>
    <p className="text-xl text-white mb-6">{levelName}</p>
    <p className="text-sm text-[#aaa] mb-8 max-w-md text-center">{message}</p>
    <Button onClick={onNext}>Next Course</Button>
  </Overlay>
);

export const BossIntroScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <Overlay>
    <h2 className="text-4xl text-[#ff0055] mb-4 animate-pulse text-center">RUSH HOUR!</h2>
    <p className="text-sm md:text-base text-white mb-8 text-center max-w-md leading-relaxed">
      The restaurant is packed. A VIP party just walked in.<br/><br/>
      Survive the <strong>Social Interactions</strong> to become a Master Chef.
    </p>
    <Button onClick={onStart} variant="pro">LET'S COOK!</Button>
  </Overlay>
);

export const GameOverScreen: React.FC<{ 
    score: number, 
    message: string, 
    stats?: string, 
    onRestart: () => void,
    aiTitle?: string,
    aiScore?: number,
    isCalculating: boolean,
    isTimeScore?: boolean
}> = ({ score, message, stats, onRestart, aiTitle, aiScore, isCalculating, isTimeScore }) => (
  <Overlay>
    <h2 className="text-4xl text-[#e55934] mb-2" style={{ textShadow: '2px 2px 0px #fff' }}>SHIFT OVER</h2>
    
    <div className="bg-[#111] border-4 border-white p-6 my-6 flex flex-col items-center min-w-[300px]">
        <p className="text-[#aaa] text-xs mb-2 uppercase tracking-widest">Performance Review</p>
        
        {isCalculating ? (
            <div className="flex flex-col items-center py-4">
                <div className="loading-spinner mb-2"></div>
                <p className="text-xs animate-pulse">Judges are tasting...</p>
            </div>
        ) : (
            <>
                <div className="text-2xl text-white mb-1">
                    {aiTitle || "Line Cook"}
                </div>
                <div className="text-4xl text-[#f4b400] mb-4 font-bold">
                    {isTimeScore ? `${Math.floor(score/60)}:${Math.floor(score%60).toString().padStart(2,'0')}` : score} 
                    <span className="text-xs text-[#555] ml-2">{isTimeScore ? 'TIME' : 'PTS'}</span>
                </div>
                {aiScore !== undefined && !isTimeScore && (
                     <div className="text-[10px] text-[#555] mt-[-10px] mb-2">AI Judge Score: {aiScore}/100</div>
                )}
                <div className="w-full h-px bg-[#333] my-2"></div>
                <p className="text-xs text-center text-[#888] italic">"{message}"</p>
            </>
        )}
        
        {stats && <p className="mt-4 text-xs text-[#57a863]">{stats}</p>}
    </div>

    <Button onClick={onRestart}>Back to Kitchen</Button>
  </Overlay>
);

export const SpeedResultScreen: React.FC<{ wpm: number, cpm: number, accuracy: number, comment: string, onRestart: () => void }> = ({ wpm, cpm, accuracy, comment, onRestart }) => (
    <Overlay>
        <h2 className="text-3xl text-[#f4b400] mb-6">Speed Test Results</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-lg">
            <div className="bg-[#111] border-2 border-white p-4 flex flex-col items-center">
                <span className="text-3xl text-[#4facfe] mb-1">{wpm}</span>
                <span className="text-[10px] text-[#aaa]">WPM</span>
            </div>
            <div className="bg-[#111] border-2 border-white p-4 flex flex-col items-center">
                <span className="text-3xl text-[#e55934] mb-1">{cpm}</span>
                <span className="text-[10px] text-[#aaa]">CPM</span>
            </div>
            <div className="bg-[#111] border-2 border-white p-4 flex flex-col items-center">
                <span className={`text-3xl mb-1 ${accuracy >= 95 ? 'text-[#57a863]' : accuracy >= 80 ? 'text-[#f4b400]' : 'text-[#e55934]'}`}>{accuracy}%</span>
                <span className="text-[10px] text-[#aaa]">ACCURACY</span>
            </div>
        </div>

        <div className="bg-[#111] p-4 border-l-4 border-[#f4b400] max-w-md mb-8">
            <p className="text-xs text-[#aaa] mb-1">HEAD CHEF SAYS:</p>
            <p className="text-sm text-white italic">"{comment}"</p>
        </div>

        <Button onClick={onRestart}>Back to Kitchen</Button>
    </Overlay>
);

export const PauseScreen: React.FC<{ onResume: () => void, onQuit: () => void }> = ({ onResume, onQuit }) => (
    <Overlay>
        <h2 className="text-4xl mb-8 animate-pulse">PAUSED</h2>
        <div className="flex flex-col gap-4 min-w-[200px]">
            <Button onClick={onResume}>Resume Cooking</Button>
            <Button onClick={onQuit} variant="secondary">Quit to Menu</Button>
        </div>
    </Overlay>
);

export const ExitConfirmScreen: React.FC<{ onConfirm: () => void, onCancel: () => void }> = ({ onConfirm, onCancel }) => (
    <Overlay>
        <div className="bg-[#111] border-4 border-red-600 p-6 max-w-sm text-center">
            <h2 className="text-xl text-red-500 mb-4">ABANDON SERVICE?</h2>
            <p className="text-xs text-[#aaa] mb-6">Leaving now will forfeit your current run and score.</p>
            <div className="flex gap-4 justify-center">
                 <Button onClick={onConfirm} variant="accent">YES, QUIT</Button>
                 <Button onClick={onCancel}>NO, STAY</Button>
            </div>
        </div>
    </Overlay>
);

export const InfoModal: React.FC<{ text: string, onClose: () => void }> = ({ text, onClose }) => (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#111] border-4 border-white p-6 z-[200] text-center min-w-[300px] animate-pop-in shadow-2xl">
        <p className="mb-6 text-sm leading-relaxed">{text}</p>
        <Button onClick={onClose} className="py-2 px-6 text-xs">OK CHEF</Button>
    </div>
);

export interface GeneratingModalProps {
    message: string;
}

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
