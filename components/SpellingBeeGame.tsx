import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../services/firebase';
import { aiService } from '../services/aiService';

interface SpellingBeeGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

const SpellingBeeGame: React.FC<SpellingBeeGameProps> = ({ onBackToHub }) => {
    const [difficulty, setDifficulty] = useState(1);
    const [wordData, setWordData] = useState<{ word: string, meaning: string, sentence: string } | null>(null);
    const [guess, setGuess] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string, color: string } | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [streak, setStreak] = useState(0);
    const [inputState, setInputState] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchWord = useCallback(async (diff: number) => {
        setLoading(true);
        setFeedback(null);
        setGuess('');
        setInputState('idle');
        const data = await aiService.generateSpellingBeeWord(diff);
        setWordData(data);
        setLoading(false);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const startNewGame = useCallback(() => {
        setDifficulty(1);
        setStreak(0);
        setGameOver(false);
        fetchWord(1);
    }, [fetchWord]);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    const playAudio = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleGuess = (e: React.FormEvent) => {
        e.preventDefault();
        if (!wordData || gameOver || loading) return;

        const cleanGuess = guess.trim().toLowerCase();
        
        if (cleanGuess === wordData.word) {
            setFeedback({ message: 'Correct! 🎉', color: '#57a863' });
            setInputState('correct');
            const newStreak = streak + 1;
            setStreak(newStreak);
            
            setTimeout(() => {
                const newDiff = Math.min(10, difficulty + 1);
                setDifficulty(newDiff);
                fetchWord(newDiff);
            }, 1500);
        } else {
            setFeedback({ message: `Incorrect!`, color: '#ff2a2a' });
            setInputState('wrong');
            setGameOver(true);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#000] text-white font-['Inter'] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #f4b400 2px, transparent 2px), radial-gradient(circle at 20% 80%, #f4b400 2px, transparent 2px)', backgroundSize: '100px 100px' }}></div>
            
            <div className="flex justify-between items-center w-full max-w-md p-4 z-10 absolute top-0">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl md:text-2xl font-bold font-['Press_Start_2P'] text-[#f4b400]">SPELLING BEE</h1>
                    <div className="text-xs text-[#aaa] mt-1">Streak: {streak}</div>
                </div>
                <div className="w-8"></div>
            </div>

            <div className="flex flex-col items-center justify-center w-full max-w-2xl px-4 z-10 mt-16">
                {loading ? (
                    <div className="text-2xl font-bold animate-pulse text-[#f4b400]">Loading word...</div>
                ) : wordData ? (
                    <div key={wordData.word} className="flex flex-col items-center w-full bg-[#111] border-4 border-[#333] rounded-xl p-6 gap-6 animate-pop-in">
                        <div className="flex gap-4">
                            <button 
                                onClick={() => playAudio(wordData.word)}
                                className="w-16 h-16 bg-[#f4b400] text-black rounded-full flex items-center justify-center text-3xl hover:bg-[#e0a800] transition-colors shadow-[0_0_15px_rgba(244,180,0,0.5)]"
                                title="Hear Word"
                            >
                                🔊
                            </button>
                            <button 
                                onClick={() => playAudio(wordData.sentence)}
                                className="w-16 h-16 bg-[#333] text-white rounded-full flex items-center justify-center text-3xl hover:bg-[#444] transition-colors"
                                title="Hear Sentence"
                            >
                                💬
                            </button>
                        </div>

                        <div className="text-center">
                            <h3 className="text-lg text-[#aaa] font-bold mb-2">Meaning:</h3>
                            <p className="text-xl">{wordData.meaning}</p>
                        </div>

                        <form onSubmit={handleGuess} className="w-full flex flex-col gap-4 mt-4">
                            <input
                                ref={inputRef}
                                type="text"
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                className={`w-full p-4 text-center text-2xl bg-[#222] border-2 rounded focus:outline-none text-white transition-colors duration-300 ${
                                    inputState === 'correct' ? 'border-[#57a863] bg-[#1a3320]' :
                                    inputState === 'wrong' ? 'border-[#ff2a2a] bg-[#331111] animate-shake' :
                                    'border-[#555] focus:border-[#f4b400]'
                                }`}
                                placeholder="Type the word here..."
                                disabled={gameOver || loading || inputState === 'correct'}
                                autoFocus
                                autoComplete="off"
                                spellCheck="false"
                            />
                            {!gameOver && inputState !== 'correct' && (
                                <button 
                                    type="submit" 
                                    className="w-full py-3 bg-[#f4b400] text-black font-bold rounded hover:bg-[#e0a800] transition-colors font-['Press_Start_2P'] text-sm"
                                >
                                    SUBMIT
                                </button>
                            )}
                        </form>

                        {feedback && (
                            <div className="text-xl font-bold text-center animate-pop-in mt-2" style={{ color: feedback.color }}>
                                {feedback.message}
                            </div>
                        )}

                        {gameOver && (
                            <div className="flex flex-col items-center gap-4 animate-pop-in w-full">
                                <div className="p-4 bg-[#222] border-2 border-[#ff2a2a] rounded-lg w-full text-center">
                                    <div className="text-[#aaa] text-sm mb-1">The correct word was:</div>
                                    <div className="text-3xl font-bold text-white tracking-widest uppercase">{wordData.word}</div>
                                </div>
                                <button 
                                    onClick={startNewGame}
                                    className="px-6 py-3 bg-[#57a863] text-white font-bold rounded hover:bg-[#468a4f] transition-colors font-['Press_Start_2P'] text-sm"
                                >
                                    PLAY AGAIN
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xl text-red-500">Failed to load word. Please try again.</div>
                )}
            </div>
        </div>
    );
};

export default SpellingBeeGame;
