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
                    <div className="absolute w-1/2 h-1 bg-white right-0 origin-left" style={{ top: 'calc(50% - 0.5px)', left: '50%' }}></div>
                    <div className="absolute w-1/2 h-1 bg-[#d900ff] right-0 origin-left transition-transform duration-1000 ease-out" style={{ top: 'calc(50% - 0.5px)', left: '50%', transform: `rotate(-${targetAngle}deg)` }}></div>
                    
                    {previousGuesses.map((g, i) => (
                        <div key={i} className="absolute w-1/2 h-0.5 bg-[#555] right-0 origin-left opacity-50" style={{ top: 'calc(50% - 0.25px)', left: '50%', transform: `rotate(-${g}deg)` }}></div>
                    ))}
                    
                    <div className="absolute w-4 h-4 bg-white rounded-full"></div>
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
                    <button 
                        onClick={startNewGame}
                        className="px-6 py-3 bg-[#57a863] text-white font-bold rounded hover:bg-[#468a4f] transition-colors z-10 font-['Press_Start_2P'] text-sm animate-pop-in"
                    >
                        PLAY AGAIN
                    </button>
                )}
            </div>
        </div>
    );
};

export default AngleGame;
