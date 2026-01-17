
import React, { useEffect, useState } from 'react';
import { COLORS } from '../constants';
import { User } from 'firebase/auth';
import { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../services/firebase';

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

    useEffect(() => {
        setLoading(true);
        const fetch = async () => {
            const data = await getLeaderboard(mode === 'speed' ? 'speed-test' : mode);
            setEntries(data);
            setLoading(false);
        };
        fetch();
    }, [mode]);

    return (
        <div className="absolute top-20 right-10 w-[320px] h-[70vh] border-4 border-white bg-[#111] p-4 flex flex-col z-[110] shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <h3 className="text-[#f4b400] text-center mb-4 text-sm uppercase border-b-2 border-[#333] pb-2">Top Chefs</h3>
            
            <div className="flex gap-1 mb-4 justify-center">
                <button 
                    onClick={() => setMode('competitive')} 
                    className={`text-[9px] px-2 py-1 border ${mode === 'competitive' ? 'bg-[#e55934] border-white' : 'bg-transparent border-[#444] text-[#888]'}`}
                >
                    Comp
                </button>
                <button 
                    onClick={() => setMode('infinite')} 
                    className={`text-[9px] px-2 py-1 border ${mode === 'infinite' ? 'bg-[#4facfe] border-white' : 'bg-transparent border-[#444] text-[#888]'}`}
                >
                    Inf
                </button>
                <button 
                    onClick={() => setMode('universal')} 
                    className={`text-[9px] px-2 py-1 border ${mode === 'universal' ? 'bg-[#57a863] border-white' : 'bg-transparent border-[#444] text-[#888]'}`}
                >
                    Univ
                </button>
                <button 
                    onClick={() => setMode('speed')} 
                    className={`text-[9px] px-2 py-1 border ${mode === 'speed' ? 'bg-[#ff2a2a] border-white' : 'bg-transparent border-[#444] text-[#888]'}`}
                >
                    Speed
                </button>
            </div>

            {loading ? (
                <div className="text-center text-xs text-[#aaa] mt-10">Loading Rankings...</div>
            ) : entries.length === 0 ? (
                <div className="text-center text-xs text-[#aaa] mt-10">No scores yet. Be the first!</div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {entries.map((entry, idx) => (
                        <div key={entry.id} className="flex flex-col border-b border-[#333] pb-2">
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs ${idx === 0 ? 'text-[#f4b400]' : idx === 1 ? 'text-[#ccc]' : idx === 2 ? 'text-[#cd7f32]' : 'text-white'}`}>
                                        #{idx + 1}
                                    </span>
                                    <span className="text-xs text-white">{entry.username}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[#57a863] text-xs">
                                        {entry.score} {mode === 'speed' ? 'WPM' : ''}
                                    </span>
                                    {mode === 'competitive' && (
                                        <span className="text-[9px] text-[#aaa]">Lvl {entry.levelReached}</span>
                                    )}
                                    {mode === 'speed' && entry.accuracy && (
                                        <span className="text-[9px] text-[#aaa]">{entry.accuracy}% Acc</span>
                                    )}
                                </div>
                            </div>
                            <span className="text-[10px] text-[#888] italic truncate w-full">{entry.title}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

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
                    Ranked Play.<br/>Lvl 1 - Boss.<br/>Stats Tracked.<br/>AI Scored.
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

// --- Infinite Select ---
interface InfiniteSelectProps {
    onSelectMode: (isPro: boolean) => void;
    onBack: () => void;
    onInfo: (mode: 'normal' | 'pro') => void;
}

export const InfiniteSelectScreen: React.FC<InfiniteSelectProps> = ({ onSelectMode, onBack, onInfo }) => (
    <Overlay>
        <h1 className="text-4xl mb-8 text-[#f4b400]" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>Select Difficulty</h1>
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-4">
                <Button onClick={() => onSelectMode(false)} className="w-[180px]">Normal</Button>
                <div onClick={() => onInfo('normal')} className="text-xl cursor-pointer bg-[#333] border-2 border-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-[#555] hover:scale-110 transition-all">👁️</div>
            </div>
            <div className="flex items-center gap-4">
                <Button onClick={() => onSelectMode(true)} variant="pro" className="w-[180px]">Pro</Button>
                <div onClick={() => onInfo('pro')} className="text-xl cursor-pointer bg-[#333] border-2 border-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-[#555] hover:scale-110 transition-all">👁️</div>
            </div>
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
}

export const GameOverScreen: React.FC<GameOverProps> = ({ score, message, stats, onRestart, aiTitle, aiScore, isCalculating }) => (
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
             <div className="bg-[#222] border-4 border-[#fff] p-6 mb-6 flex flex-col items-center animate-pop-in">
                 <p className="text-[#aaa] text-xs mb-2">COMPETITIVE SCORE</p>
                 <p className="text-5xl text-[#57a863] mb-4">{aiScore}</p>
                 <p className="text-xl text-[#f4b400] border-t-2 border-[#555] pt-2 w-full text-center">"{aiTitle}"</p>
             </div>
        ) : (
            <>
                <p className="mb-2">Final Score: <span className="text-[#f4b400]">{score}</span></p>
                <p className="mb-5 text-center px-4">{message}</p>
                {stats && <p className="mb-5 text-sm text-[#aaa]">{stats}</p>}
            </>
        )}
        
        <Button onClick={onRestart}>Home</Button>
    </Overlay>
);

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

// --- Speed Test Result ---
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
