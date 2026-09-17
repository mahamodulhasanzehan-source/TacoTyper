import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, incrementGamePlays, saveLeaderboardScore } from '../services/firebase';
import { audioService } from '../services/audioService';

interface AngleGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

export default function AngleGame({ user, onBackToHub, username }: AngleGameProps) {
    const [targetAngle, setTargetAngle] = useState(0);
    const [guess, setGuess] = useState('');
    const [feedback, setFeedback] = useState<{ message: string, color: string, arrow: string } | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [lastDiff, setLastDiff] = useState<number | null>(null);
    const [streak, setStreak] = useState(0);
    const [previousGuesses, setPreviousGuesses] = useState<number[]>([]);
    const [isWon, setIsWon] = useState(false);
    
    const dialRef = useRef<HTMLDivElement>(null);
    const displayableName = username || user.displayName || 'Angler';

    const startNewGame = useCallback(() => {
        const angle = Math.floor(Math.random() * 360);
        setTargetAngle(angle);
        setGuess('');
        setFeedback(null);
        setGameOver(false);
        setIsWon(false);
        setLastDiff(null);
        setPreviousGuesses([]);
        incrementGamePlays('angle');
    }, []);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    const handleGuess = useCallback(async (forcedGuess?: number) => {
        if (gameOver) return;

        let numGuess = forcedGuess !== undefined ? forcedGuess : parseInt(guess, 10);
        if (isNaN(numGuess) || numGuess < 0 || numGuess > 360) {
            audioService.playSound('wrong_answer');
            setFeedback({ message: 'Enter a valid angle (0-360°)', color: '#f59e0b', arrow: '' });
            return;
        }
        
        if (numGuess === 360) numGuess = 0;
        const actualTarget = targetAngle === 360 ? 0 : targetAngle;

        let diff = Math.abs(actualTarget - numGuess);
        if (diff > 180) {
            diff = 360 - diff;
        }

        const newGuesses = [...previousGuesses, numGuess];
        setPreviousGuesses(newGuesses);
        
        if (diff === 0) {
            audioService.playSound('correct_answer');
            setFeedback({ message: 'Bullseye! Perfect! 🎯', color: '#10b981', arrow: '🎯' });
            setGameOver(true);
            setIsWon(true);
            const newStreak = streak + 1;
            setStreak(newStreak);

            await saveLeaderboardScore(
                user,
                displayableName,
                newStreak,
                'Angle Sniper',
                { mistakes: newGuesses.length - 1, timeTaken: 0, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: newStreak * 100, levelReached: newStreak },
                'angle'
            );
        } else {
            let tempMsg = '';
            let color = '#fff';
            
            if (lastDiff !== null) {
                if (diff < lastDiff) {
                    audioService.playSound('tile_click');
                    tempMsg = 'Hotter! 🔥';
                    color = '#ef4444';
                } else if (diff > lastDiff) {
                    audioService.playSound('button_click');
                    tempMsg = 'Colder! ❄️';
                    color = '#38bdf8';
                } else {
                    tempMsg = 'Same distance.';
                    color = '#9ca3af';
                }
            } else {
                if (diff <= 10) { tempMsg = 'Boiling Hot! 🔥'; color = '#ef4444'; }
                else if (diff <= 35) { tempMsg = 'Warm! ☀️'; color = '#f59e0b'; }
                else { tempMsg = 'Cold! ❄️'; color = '#38bdf8'; }
            }

            let clockwiseDiff = actualTarget - numGuess;
            if (clockwiseDiff < 0) clockwiseDiff += 360;
            
            const arrow = clockwiseDiff <= 180 ? '🔄 Rotate Clockwise' : '🔄 Rotate Counter-Clockwise';

            setFeedback({ message: tempMsg, color, arrow });
            setLastDiff(diff);

            if (newGuesses.length >= 6) {
                audioService.playSound('wrong_answer');
                setGameOver(true);
                setIsWon(false);
                setFeedback({ message: `Detonated! The angle was ${actualTarget}°`, color: '#ef4444', arrow: '' });
                setStreak(0);
            }
        }
        setGuess('');
    }, [gameOver, guess, targetAngle, previousGuesses, lastDiff, streak, user, displayableName]);

    const handleKeypadClick = useCallback((num: string) => {
        if (gameOver) return;
        audioService.playSound('button_click');
        if (num === 'DEL') {
            setGuess(prev => prev.slice(0, -1));
        } else if (num === 'ENTER') {
            handleGuess();
        } else {
            setGuess(prev => {
                const newVal = prev + num;
                if (parseInt(newVal, 10) > 360) return prev;
                return newVal;
            });
        }
    }, [gameOver, handleGuess]);

    // Handle touch/click on dial to set angle directly
    const handleDialPointer = (e: React.PointerEvent<HTMLDivElement>) => {
        if (gameOver || !dialRef.current) return;
        const rect = dialRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const x = e.clientX - centerX;
        const y = e.clientY - centerY;

        // Angle in radians from 12 o'clock or 3 o'clock
        // standard circle (0 is right, counter-clockwise)
        let rad = Math.atan2(y, x);
        let deg = Math.round((rad * 180) / Math.PI);
        if (deg < 0) deg += 360;

        audioService.playSound('button_click');
        setGuess(deg.toString());
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameOver) return;
            if (e.key >= '0' && e.key <= '9') {
                handleKeypadClick(e.key);
            } else if (e.key === 'Backspace') {
                handleKeypadClick('DEL');
            } else if (e.key === 'Enter') {
                handleKeypadClick('ENTER');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeypadClick, gameOver]);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#050508] text-white relative overflow-y-auto custom-scrollbar p-3 select-none font-sans">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, #d946ef 2px, transparent 2px)', backgroundSize: '70px 70px' }}></div>

            {/* Top Bar */}
            <div className="flex justify-between items-center w-full max-w-md mb-2 z-10">
                <button 
                    onClick={() => {
                        audioService.playSound('button_click');
                        onBackToHub();
                    }} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded-full text-sm font-bold transition-transform hover:scale-105"
                    title="Back to Hub"
                >
                    <span>⬅️</span>
                    <span className="hidden sm:inline">Hub</span>
                </button>

                <div className="flex flex-col items-center">
                    <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500 tracking-wide">
                        ANGLE ESTIMATE
                    </h1>
                </div>

                <div className="text-xs font-bold text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
                    🔥 <span className="text-amber-400 font-mono">{streak}</span>
                </div>
            </div>

            <div className="flex flex-col items-center w-full max-w-md z-10">
                {/* Protractor Dial */}
                <div 
                    ref={dialRef}
                    onPointerDown={handleDialPointer}
                    className="relative w-[min(52vw,180px)] h-[min(52vw,180px)] sm:w-52 sm:h-52 md:w-56 md:h-56 bg-neutral-900/90 rounded-full border-4 border-neutral-700 flex items-center justify-center cursor-crosshair shadow-2xl transition-all mb-2.5 hover:border-fuchsia-500/60"
                    title="Tap dial to pick angle"
                >
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        {/* Reference Base Line (0 deg) */}
                        <line x1="50" y1="50" x2="95" y2="50" stroke="#737373" strokeWidth="2.5" strokeLinecap="round" />
                        
                        {/* Arc fill */}
                        <circle 
                            cx="50" cy="50" r="18" 
                            fill="none" stroke="#d946ef" strokeWidth="4" strokeOpacity="0.4"
                            strokeDasharray={2 * Math.PI * 18}
                            strokeDashoffset={2 * Math.PI * 18 * (1 - targetAngle / 360)}
                            className="transition-all duration-700 ease-out"
                        />

                        {/* Previous Guesses */}
                        {previousGuesses.map((g, i) => (
                            <line 
                                key={i}
                                x1="50" y1="50" 
                                x2="95" y2="50" 
                                stroke="#525252" strokeWidth="1.5" strokeDasharray="2,2"
                                style={{ transform: `rotate(${g}deg)`, transformOrigin: '50px 50px' }}
                            />
                        ))}
                        
                        {/* Target Angle Line */}
                        <line 
                            x1="50" y1="50" 
                            x2="95" y2="50" 
                            stroke="#d946ef" strokeWidth="3" strokeLinecap="round"
                            className="transition-all duration-700 ease-out shadow-[0_0_10px_rgba(217,70,239,0.8)]"
                            style={{ transform: `rotate(${targetAngle}deg)`, transformOrigin: '50px 50px' }}
                        />
                        
                        {/* Current Guess Line preview */}
                        {guess && !isNaN(parseInt(guess, 10)) && (
                            <line 
                                x1="50" y1="50" 
                                x2="95" y2="50" 
                                stroke="#38bdf8" strokeWidth="2" strokeDasharray="3,3"
                                style={{ transform: `rotate(${parseInt(guess, 10)}deg)`, transformOrigin: '50px 50px' }}
                            />
                        )}

                        {/* Center Hub */}
                        <circle cx="50" cy="50" r="4" fill="#ffffff" />
                    </svg>
                </div>

                {/* Status & Input Display */}
                <div className="flex flex-col items-center w-full mb-3">
                    <div className="text-[11px] sm:text-xs text-neutral-400 font-bold mb-1">
                        Attempts remaining: <span className="text-amber-400 font-mono text-sm">{6 - previousGuesses.length}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-24 sm:w-28 px-3 py-1 text-center text-xl sm:text-2xl font-mono font-black bg-neutral-950 border-2 border-neutral-700 rounded-xl text-white flex items-center justify-center">
                            {guess || '0'}°
                        </div>
                    </div>

                    {feedback && (
                        <div className="flex flex-col items-center text-center animate-fade-in mb-2 min-h-[32px]">
                            <span className="text-xs sm:text-sm font-black" style={{ color: feedback.color }}>{feedback.message}</span>
                            {feedback.arrow && <span className="text-[10px] sm:text-xs font-bold text-neutral-300 mt-0.5">{feedback.arrow}</span>}
                        </div>
                    )}

                    {/* Numeric Keypad */}
                    {!gameOver && (
                        <div className="grid grid-cols-3 gap-1.5 w-full max-w-[260px] sm:max-w-[280px]">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'ENTER'].map((key) => (
                                <button
                                    key={key}
                                    onClick={() => handleKeypadClick(key)}
                                    className={`h-9 min-[380px]:h-10 sm:h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center transition-all active:scale-95 ${
                                        key === 'ENTER' 
                                            ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg' 
                                            : key === 'DEL'
                                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                            : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800'
                                    }`}
                                >
                                    {key === 'DEL' ? '⌫' : key === 'ENTER' ? 'SUBMIT' : key}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Result Modal */}
                {gameOver && (
                    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className={`bg-neutral-900 border-2 ${isWon ? 'border-emerald-500' : 'border-fuchsia-500'} rounded-2xl p-6 max-w-xs w-full flex flex-col items-center text-center shadow-2xl`}>
                            <div className="text-5xl mb-3">{isWon ? '🎯' : '📐'}</div>
                            <h3 className={`text-xl font-black mb-2 ${isWon ? 'text-emerald-400' : 'text-fuchsia-400'}`}>
                                {isWon ? 'BULLSEYE!' : 'ROUND OVER'}
                            </h3>
                            
                            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 w-full mb-4">
                                <p className="text-neutral-400 text-xs font-bold mb-1">Target Angle</p>
                                <div className="text-3xl font-black text-fuchsia-400 font-mono">{targetAngle}°</div>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => {
                                        audioService.playSound('button_click');
                                        onBackToHub();
                                    }}
                                    className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs transition-colors"
                                >
                                    Hub
                                </button>
                                <button 
                                    onClick={() => {
                                        audioService.playSound('button_click');
                                        startNewGame();
                                    }}
                                    className="flex-1 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black rounded-xl text-xs transition-transform active:scale-95 shadow-lg"
                                >
                                    Next Angle
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
