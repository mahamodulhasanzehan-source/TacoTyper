import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../services/firebase';
import { aiService } from '../services/aiService';

interface CluelessGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

const CluelessGame: React.FC<CluelessGameProps> = ({ onBackToHub }) => {
    const [targetWord, setTargetWord] = useState('');
    const [guess, setGuess] = useState('');
    const [guesses, setGuesses] = useState<{ word: string, score: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState('');
    const [streak, setStreak] = useState(0);
    const [gaveUp, setGaveUp] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [wordQueue, setWordQueue] = useState<string[]>([]);
    const [isInitializing, setIsInitializing] = useState(true);

    const startNewGame = useCallback(async () => {
        setIsInitializing(true);
        let currentQueue = [...wordQueue];
        if (currentQueue.length === 0) {
            currentQueue = await aiService.generateWordleWords(5);
        }
        
        const word = currentQueue.shift() || 'tacos';
        setWordQueue(currentQueue);
        setTargetWord(word.toLowerCase());
        setGuesses([]);
        setGuess('');
        setGameOver(false);
        setMessage('');
        setGaveUp(false);
        setIsInitializing(false);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [wordQueue]);

    // Initial load
    useEffect(() => {
        startNewGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleGuess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (gameOver || loading || !guess.trim()) return;

        const cleanGuess = guess.trim().toLowerCase();
        
        if (guesses.some(g => g.word === cleanGuess)) {
            setMessage('Already guessed that word!');
            setTimeout(() => setMessage(''), 2000);
            setGuess('');
            return;
        }

        setLoading(true);
        
        if (cleanGuess === targetWord) {
            const newGuesses = [{ word: cleanGuess, score: 100 }, ...guesses];
            setGuesses(newGuesses.sort((a, b) => b.score - a.score));
            setGameOver(true);
            setMessage(`You found it in ${newGuesses.length} guesses! 🎉`);
            setStreak(s => s + 1);
        } else {
            const score = await aiService.getSemanticSimilarity(targetWord, cleanGuess);
            const newGuesses = [{ word: cleanGuess, score }, ...guesses];
            setGuesses(newGuesses.sort((a, b) => b.score - a.score));
        }

        setGuess('');
        setLoading(false);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleGiveUp = () => {
        setGameOver(true);
        setGaveUp(true);
        setStreak(0);
        setMessage(`The word was: ${targetWord.toUpperCase()}`);
    };

    const getScoreColor = (score: number) => {
        if (score === 100) return 'bg-[#57a863]';
        if (score > 80) return 'bg-[#f4b400]';
        if (score > 50) return 'bg-[#ff9800]';
        if (score > 20) return 'bg-[#ff5722]';
        return 'bg-[#333]';
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#000] text-white font-['Inter'] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #4facfe 2px, transparent 2px), radial-gradient(circle at 10% 90%, #4facfe 2px, transparent 2px)', backgroundSize: '80px 80px' }}></div>
            
            <div className="flex justify-between items-center w-full max-w-md p-4 z-10 absolute top-0">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl md:text-2xl font-bold font-['Press_Start_2P'] text-[#4facfe]">CLUELESS</h1>
                    <div className="text-xs text-[#aaa] mt-1">Streak: {streak}</div>
                </div>
                <div className="w-8"></div>
            </div>

            {isInitializing ? (
                <div className="flex-1 flex items-center justify-center z-10">
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <div className="flex flex-col items-center w-full max-w-lg px-4 z-10 mt-16 h-[calc(100vh-100px)]">
                <div className="text-center mb-4 flex justify-between items-center w-full">
                    <p className="text-[#aaa] text-sm">Guess the secret word. Closer meaning = higher score.</p>
                    {!gameOver && (
                        <button 
                            onClick={handleGiveUp}
                            className="text-xs text-[#ff2a2a] hover:text-[#ff5555] underline ml-4 shrink-0"
                        >
                            Give Up
                        </button>
                    )}
                </div>

                {message && (
                    <div className={`px-4 py-2 rounded font-bold mb-4 animate-pop-in ${gaveUp ? 'bg-[#331111] text-[#ff2a2a] border border-[#ff2a2a]' : 'bg-white text-black'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleGuess} className="w-full flex gap-2 mb-6">
                    <input
                        ref={inputRef}
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        className="flex-1 p-3 text-lg bg-[#222] border-2 border-[#555] rounded focus:outline-none focus:border-[#4facfe] text-white"
                        placeholder="Type a word..."
                        disabled={gameOver || loading}
                        autoComplete="off"
                        spellCheck="false"
                    />
                    <button 
                        type="submit" 
                        className={`px-6 py-3 bg-[#4facfe] text-black font-bold rounded hover:bg-[#3b8edb] transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={gameOver || loading}
                    >
                        {loading ? '...' : 'GUESS'}
                    </button>
                </form>

                <div className="w-full flex-1 overflow-y-auto flex flex-col gap-2 pr-2 custom-scrollbar">
                    {guesses.map((g) => (
                        <div key={g.word} className="flex items-center justify-between bg-[#111] border border-[#333] rounded p-3 animate-pop-in">
                            <span className="text-lg font-bold">{g.word}</span>
                            <div className="flex items-center gap-3">
                                <div className="w-32 h-4 bg-[#222] rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${getScoreColor(g.score)} transition-all duration-1000 ease-out`}
                                        style={{ width: `${g.score}%` }}
                                    ></div>
                                </div>
                                <span className="w-10 text-right font-mono font-bold">{g.score}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1a1b] border border-[#3a3a3c] rounded-lg p-8 max-w-sm w-full flex flex-col items-center gap-6 animate-pop-in shadow-2xl">
                            <h2 className="text-2xl font-bold font-['Press_Start_2P'] text-center text-white">
                                {gaveUp ? 'GAVE UP!' : 'YOU WIN!'}
                            </h2>
                            
                            <div className="text-center">
                                <p className="text-[#aaa] mb-2">The word was</p>
                                <div className="text-3xl font-bold text-[#4facfe] tracking-widest uppercase">
                                    {targetWord}
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
                                    className="flex-1 py-3 bg-[#4facfe] text-black font-bold rounded hover:bg-[#3b8edb] transition-colors font-['Press_Start_2P'] text-xs"
                                >
                                    REPLAY
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

export default CluelessGame;
