import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../services/firebase';

interface AngleGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

const AngleGame: React.FC<AngleGameProps> = ({ onBackToHub }) => {
    const [targetAngle, setTargetAngle] = useState(0);
    const [guess, setGuess] = useState('');
    const [feedback, setFeedback] = useState<{ message: string, color: string, arrow: string } | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [lastDiff, setLastDiff] = useState<number | null>(null);
    const [streak, setStreak] = useState(0);
    const [previousGuesses, setPreviousGuesses] = useState<number[]>([]);

    const startNewGame = useCallback(() => {
        setTargetAngle(Math.floor(Math.random() * 360));
        setGuess('');
        setFeedback(null);
        setGameOver(false);
        setLastDiff(null);
        setPreviousGuesses([]);
    }, []);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    const handleGuess = (e: React.FormEvent) => {
        e.preventDefault();
        if (gameOver) return;

        const numGuess = parseInt(guess, 10);
        if (isNaN(numGuess) || numGuess < 0 || numGuess > 360) {
            setFeedback({ message: 'Enter a valid angle (0-360)', color: '#f4b400', arrow: '' });
            return;
        }

        const diff = Math.abs(targetAngle - numGuess);
        setPreviousGuesses(prev => [...prev, numGuess]);
        
        if (diff === 0 || diff <= 2) {
            setFeedback({ message: 'Perfect!', color: '#57a863', arrow: '🎯' });
            setGameOver(true);
            setStreak(s => s + 1);
        } else {
            let tempMsg = '';
            let color = '#fff';
            
            if (lastDiff !== null) {
                if (diff < lastDiff) {
                    tempMsg = 'Hotter! 🔥';
                    color = '#ff2a2a';
                } else if (diff > lastDiff) {
                    tempMsg = 'Colder! ❄️';
                    color = '#4facfe';
                } else {
                    tempMsg = 'Same distance.';
                    color = '#aaa';
                }
            } else {
                if (diff <= 10) { tempMsg = 'Very Hot! 🔥'; color = '#ff2a2a'; }
                else if (diff <= 30) { tempMsg = 'Warm! ☀️'; color = '#f4b400'; }
                else { tempMsg = 'Cold! ❄️'; color = '#4facfe'; }
            }

            const arrow = numGuess < targetAngle ? '⬆️ Higher' : '⬇️ Lower';
            setFeedback({ message: tempMsg, color, arrow });
            setLastDiff(diff);
            if (previousGuesses.length >= 5) {
                setGameOver(true);
                setFeedback({ message: `Game Over! Angle was ${targetAngle}°`, color: '#ff2a2a', arrow: '' });
                setStreak(0);
            }
        }
        setGuess('');
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#000] text-white font-['Inter'] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, #d900ff 2px, transparent 2px), radial-gradient(circle at 90% 80%, #d900ff 2px, transparent 2px)', backgroundSize: '150px 150px' }}></div>
            
            <div className="flex justify-between items-center w-full max-w-md p-4 z-10 absolute top-0">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl md:text-2xl font-bold font-['Press_Start_2P'] text-[#d900ff]">ANGLE</h1>
                    <div className="text-xs text-[#aaa] mt-1">Streak: {streak}</div>
                </div>
                <div className="w-8"></div>
            </div>

            <div className="flex flex-col items-center gap-8 z-10 mt-16">
                <div className="relative w-64 h-64 bg-[#111] rounded-full border-4 border-[#333] flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Arc */}
                        <circle 
                            cx="50" cy="50" r="15" 
                            fill="none" stroke="#d900ff" strokeWidth="4" strokeOpacity="0.5"
                            strokeDasharray={2 * Math.PI * 15}
                            strokeDashoffset={2 * Math.PI * 15 * (1 - targetAngle / 360)}
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Fixed line */}
                        <line x1="50" y1="50" x2="100" y2="50" stroke="white" strokeWidth="2" />
                        
                        {/* Previous guesses */}
                        {previousGuesses.map((g, i) => (
                            <line 
                                key={i}
                                x1="50" y1="50" 
                                x2="100" y2="50" 
                                stroke="#555" strokeWidth="1" strokeOpacity="0.5"
                                style={{ transform: `rotate(${g}deg)`, transformOrigin: '50px 50px' }}
                            />
                        ))}
                        
                        {/* Moving line */}
                        <line 
                            x1="50" y1="50" 
                            x2="100" y2="50" 
                            stroke="#d900ff" strokeWidth="2" 
                            className="transition-all duration-1000 ease-out"
                            style={{ transform: `rotate(${targetAngle}deg)`, transformOrigin: '50px 50px' }}
                        />
                        
                        {/* Center dot */}
                        <circle cx="50" cy="50" r="3" fill="white" />
                    </svg>
                </div>

                <form onSubmit={handleGuess} className="flex flex-col items-center gap-4">
                    <div className="text-sm text-[#aaa]">Guesses left: {6 - previousGuesses.length}</div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={guess} 
                            onChange={(e) => setGuess(e.target.value)} 
                            className="w-24 p-2 text-center text-2xl bg-[#222] border-2 border-[#555] rounded focus:outline-none focus:border-[#d900ff] text-white"
                            placeholder="0"
                            min="0"
                            max="360"
                            disabled={gameOver}
                            autoFocus
                        />
                        <span className="text-2xl">°</span>
                    </div>
                    
                    {!gameOver && (
                        <button type="submit" className="px-6 py-2 bg-[#d900ff] text-white font-bold rounded hover:bg-[#b000cc] transition-colors font-['Press_Start_2P'] text-xs">
                            GUESS
                        </button>
                    )}
                </form>

                <div className="h-24 flex flex-col items-center justify-center">
                    {feedback && (
                        <div key={Date.now()} className="flex flex-col items-center gap-2 animate-pop-in">
                            <span className="text-xl font-bold" style={{ color: feedback.color }}>{feedback.message}</span>
                            <span className="text-lg">{feedback.arrow}</span>
                        </div>
                    )}
                </div>

                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1a1b] border border-[#3a3a3c] rounded-lg p-8 max-w-sm w-full flex flex-col items-center gap-6 animate-pop-in shadow-2xl">
                            <h2 className="text-2xl font-bold font-['Press_Start_2P'] text-center text-white">
                                {feedback?.message.includes('Perfect') ? 'YOU WIN!' : 'GAME OVER'}
                            </h2>
                            
                            <div className="text-center">
                                <p className="text-[#aaa] mb-2">The angle was</p>
                                <div className="text-3xl font-bold text-[#d900ff] tracking-widest uppercase">
                                    {targetAngle}°
                                </div>
                            </div>

                            <div className="flex gap-4 w-full mt-4">
                                <button 
                                    onClick={onBackToHub}
                                    className="flex-1 py-3 bg-[#3a3a3c] text-white font-bold rounded hover:bg-[#565758] transition-colors font-['Press_Start_2P'] text-xs"
                                >
                                    HOME
                                </button>
                                <button 
                                    onClick={startNewGame}
                                    className="flex-1 py-3 bg-[#d900ff] text-white font-bold rounded hover:bg-[#b000cc] transition-colors font-['Press_Start_2P'] text-xs"
                                >
                                    REPLAY
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AngleGame;
