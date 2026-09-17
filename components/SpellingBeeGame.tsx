import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, incrementGamePlays, saveLeaderboardScore } from '../services/firebase';
import { aiService } from '../services/aiService';
import { LoadingScreen } from './LoadingScreen';
import { audioService } from '../services/audioService';

interface SpellingBeeGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

const SpellingBeeGame: React.FC<SpellingBeeGameProps> = ({ user, username, onBackToHub }) => {
    const [difficulty, setDifficulty] = useState(1);
    const [wordQueue, setWordQueue] = useState<{ word: string, meaning: string, sentence: string }[]>([]);
    const [wordData, setWordData] = useState<{ word: string, meaning: string, sentence: string } | null>(null);
    const [guess, setGuess] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string, color: string } | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [streak, setStreak] = useState(0);
    const [inputState, setInputState] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [speechSpeed, setSpeechSpeed] = useState<number>(0.9); // Default clear British pace
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize TTS voices
    useEffect(() => {
        const updateVoices = () => {
            if ('speechSynthesis' in window) {
                setVoices(window.speechSynthesis.getVoices());
            }
        };
        updateVoices();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }
    }, []);

    const getUKVoice = useCallback((): SpeechSynthesisVoice | null => {
        if (!('speechSynthesis' in window) || voices.length === 0) return null;
        
        // 1. Exact match "Google UK English Male"
        const exact = voices.find(v => v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('uk english male'));
        if (exact) return exact;

        // 2. Any UK Male voice
        const ukMale = voices.find(v => (v.lang === 'en-GB' || v.lang.startsWith('en-GB')) && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('george') || v.name.toLowerCase().includes('daniel')));
        if (ukMale) return ukMale;

        // 3. Any en-GB voice
        const ukAny = voices.find(v => v.lang === 'en-GB' || v.lang.startsWith('en-GB'));
        if (ukAny) return ukAny;

        // 4. Default fallback
        return voices.find(v => v.lang.startsWith('en')) || null;
    }, [voices]);

    const playAudio = useCallback((text: string, rateMultiplier: number = 1.0) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const voice = getUKVoice();
            if (voice) utterance.voice = voice;
            utterance.rate = speechSpeed * rateMultiplier;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }, [getUKVoice, speechSpeed]);

    const fetchWords = useCallback(async (diff: number) => {
        setLoading(true);
        setFeedback(null);
        setGuess('');
        setInputState('idle');
        const data = await aiService.generateSpellingBeeWordsBatch(5, diff);
        setWordQueue(data.slice(1));
        setWordData(data[0]);
        setLoading(false);

        // Auto speak word
        if (data[0]) {
            setTimeout(() => {
                playAudio(data[0].word);
            }, 300);
        }

        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [playAudio]);

    const nextWord = useCallback(async () => {
        if (wordQueue.length > 0) {
            setFeedback(null);
            setGuess('');
            setInputState('idle');
            const next = wordQueue[0];
            setWordData(next);
            setWordQueue(prev => prev.slice(1));
            setTimeout(() => {
                playAudio(next.word);
            }, 200);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        } else {
            const newDiff = Math.min(10, difficulty + 1);
            setDifficulty(newDiff);
            await fetchWords(newDiff);
        }
    }, [wordQueue, difficulty, fetchWords, playAudio]);

    const startNewGame = useCallback(() => {
        setDifficulty(1);
        setStreak(0);
        setGameOver(false);
        fetchWords(1);
        incrementGamePlays('spelling_bee');
    }, [fetchWords]);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    const handleGuess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wordData || gameOver || loading) return;

        const cleanGuess = guess.trim().toLowerCase();
        
        if (cleanGuess === wordData.word.toLowerCase()) {
            audioService.playSound('correct_answer');
            setFeedback({ message: 'Correct! 🎉', color: '#4ade80' });
            setInputState('correct');
            const newStreak = streak + 1;
            setStreak(newStreak);
            
            setTimeout(() => {
                nextWord();
            }, 1200);
        } else {
            audioService.playSound('wrong_answer');
            setFeedback({ message: `Incorrect!`, color: '#f87171' });
            setInputState('wrong');
            setGameOver(true);

            if (streak > 0) {
                await saveLeaderboardScore(
                    user,
                    username || user.displayName || 'Speller',
                    streak,
                    'Spelling Bee Prodigy',
                    { mistakes: 1, timeTaken: 0, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: streak, levelReached: difficulty },
                    'spelling_bee' as any
                );
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#050508] text-white relative overflow-y-auto custom-scrollbar p-4 select-none font-sans">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #f59e0b 2px, transparent 2px), radial-gradient(circle at 20% 80%, #f59e0b 2px, transparent 2px)', backgroundSize: '80px 80px' }}></div>

            {/* Top Navigation */}
            <div className="flex justify-between items-center w-full max-w-xl mb-4 z-10">
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
                    <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 tracking-wide">
                        SPELLING BEE
                    </h1>
                    <div className="text-xs text-neutral-400 font-bold mt-0.5">
                        🔥 Streak: <span className="text-amber-400 font-mono text-sm">{streak}</span> | Level: <span className="text-yellow-300 font-bold">{difficulty}</span>
                    </div>
                </div>

                <div className="w-16 flex justify-end">
                    <button
                        onClick={() => {
                            audioService.playSound('button_click');
                            startNewGame();
                        }}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-full text-xs font-bold text-neutral-300"
                        title="Restart Game"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Speech Speed Pill Controls */}
            <div className="flex items-center gap-2 mb-4 z-10 bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded-2xl text-xs">
                <span className="text-neutral-400 font-bold">TTS Speed:</span>
                {[
                    { label: '0.7x Slow', rate: 0.7 },
                    { label: '0.9x Clear', rate: 0.9 },
                    { label: '1.1x Fast', rate: 1.1 }
                ].map(item => (
                    <button
                        key={item.label}
                        onClick={() => {
                            audioService.playSound('button_click');
                            setSpeechSpeed(item.rate);
                        }}
                        className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${speechSpeed === item.rate ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Card & Inputs */}
            <div className="flex flex-col items-center justify-center w-full max-w-xl px-4 z-10">
                {loading ? (
                    <LoadingScreen text="Preparing Spelling Challenge..." color="#f59e0b" />
                ) : wordData ? (
                    <div key={wordData.word} className="flex flex-col items-center w-full bg-neutral-900/90 border-2 border-neutral-800 rounded-2xl p-4 sm:p-6 md:p-8 gap-4 sm:gap-5 shadow-2xl animate-fade-in max-w-full">
                        
                        {/* Audio Buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 w-full">
                            <button 
                                onClick={() => playAudio(wordData.word)}
                                className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-transform hover:scale-105 active:scale-95 text-xs sm:text-base"
                                title="Hear Word (Google UK English Male)"
                            >
                                <span className="text-lg sm:text-2xl">🔊</span>
                                <span>Say Word</span>
                            </button>
                            <button 
                                onClick={() => playAudio(wordData.sentence)}
                                className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 transition-transform hover:scale-105 active:scale-95 text-xs sm:text-base"
                                title="Hear In Sentence"
                            >
                                <span className="text-lg sm:text-2xl">💬</span>
                                <span>In Sentence</span>
                            </button>
                            <button 
                                onClick={() => playAudio(wordData.word, 0.65)}
                                className="px-3 sm:px-3.5 py-2.5 sm:py-3.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-400 font-bold rounded-xl sm:rounded-2xl flex items-center transition-transform hover:scale-105 active:scale-95 text-xs sm:text-base"
                                title="Slow Spellout"
                            >
                                <span className="text-lg sm:text-xl">🐢</span>
                            </button>
                        </div>

                        {/* Meaning */}
                        <div className="text-center w-full bg-neutral-950/60 p-3 sm:p-4 rounded-xl border border-neutral-800">
                            <div className="text-[10px] sm:text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Definition</div>
                            <p className="text-neutral-200 text-xs sm:text-sm md:text-base leading-relaxed">{wordData.meaning}</p>
                        </div>

                        {/* Guess Form */}
                        <form onSubmit={handleGuess} className="w-full flex flex-col gap-2.5 sm:gap-3">
                            <input
                                ref={inputRef}
                                type="text"
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                className={`w-full p-3 sm:p-4 text-center text-xl sm:text-2xl font-bold bg-neutral-950 border-2 rounded-xl focus:outline-none text-white transition-all ${
                                    inputState === 'correct' ? 'border-green-500 bg-green-950/30' :
                                    inputState === 'wrong' ? 'border-red-500 bg-red-950/30 animate-shake' :
                                    'border-neutral-700 focus:border-amber-400'
                                }`}
                                placeholder="Spell the word..."
                                disabled={gameOver || loading || inputState === 'correct'}
                                autoFocus
                                autoComplete="off"
                                spellCheck="false"
                            />
                            {!gameOver && inputState !== 'correct' && (
                                <button 
                                    type="submit" 
                                    className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black rounded-xl transition-transform active:scale-98 shadow-lg text-xs sm:text-base"
                                >
                                    SUBMIT SPELLING
                                </button>
                            )}
                        </form>

                        {feedback && (
                            <div className="text-lg font-black text-center" style={{ color: feedback.color }}>
                                {feedback.message}
                            </div>
                        )}

                        {gameOver && (
                            <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
                                <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl w-full text-center">
                                    <div className="text-neutral-400 text-xs mb-1 uppercase font-bold">The correct spelling was:</div>
                                    <div className="text-2xl sm:text-3xl font-black text-white tracking-widest uppercase text-amber-400">
                                        {wordData.word}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        audioService.playSound('button_click');
                                        startNewGame();
                                    }}
                                    className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-full transition-transform active:scale-95 shadow-xl text-sm"
                                >
                                    PLAY AGAIN
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xl text-red-400">Failed to load word. Please try again.</div>
                )}
            </div>
        </div>
    );
};

export default SpellingBeeGame;
