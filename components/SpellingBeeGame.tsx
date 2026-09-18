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

const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
];

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
    const [pressedKey, setPressedKey] = useState<string | null>(null);

    const activeSeqRef = useRef(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const getUKVoice = useCallback((): SpeechSynthesisVoice | null => {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return null;
        
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
    }, []);

    const playAudio = useCallback((text: string, rate: number = 0.9) => {
        if ('speechSynthesis' in window && text) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const voice = getUKVoice();
            if (voice) utterance.voice = voice;
            utterance.rate = rate;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }, [getUKVoice]);

    const fetchWords = useCallback(async (diff: number) => {
        const currentSeq = ++activeSeqRef.current;
        setLoading(true);
        setFeedback(null);
        setGuess('');
        setInputState('idle');

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        const data = await aiService.generateSpellingBeeWordsBatch(5, diff);
        if (!isMountedRef.current || currentSeq !== activeSeqRef.current) return;

        if (data && data.length > 0) {
            setWordQueue(data.slice(1));
            setWordData(data[0]);
            setLoading(false);

            // Auto-speak target word once at 0.9x speed
            setTimeout(() => {
                if (isMountedRef.current && currentSeq === activeSeqRef.current) {
                    playAudio(data[0].word, 0.9);
                }
            }, 350);
        } else {
            setLoading(false);
        }
    }, [playAudio]);

    const nextWord = useCallback(async () => {
        const currentSeq = ++activeSeqRef.current;
        if (wordQueue.length > 0) {
            setFeedback(null);
            setGuess('');
            setInputState('idle');
            const next = wordQueue[0];
            setWordData(next);
            setWordQueue(prev => prev.slice(1));
            setTimeout(() => {
                if (isMountedRef.current && currentSeq === activeSeqRef.current) {
                    playAudio(next.word, 0.9);
                }
            }, 250);
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

    // Mount only once to start new game
    useEffect(() => {
        startNewGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitGuess = useCallback(async () => {
        if (!wordData || gameOver || loading || inputState === 'correct') return;

        const cleanGuess = guess.trim().toLowerCase();
        if (!cleanGuess) return;
        
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
            setFeedback({ message: 'Incorrect!', color: '#f87171' });
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
    }, [wordData, gameOver, loading, inputState, guess, streak, nextWord, user, username, difficulty]);

    const handleKeyPress = useCallback((key: string) => {
        if (gameOver || loading || inputState === 'correct') return;

        setPressedKey(key);
        setTimeout(() => setPressedKey(null), 100);

        if (key === 'ENTER' || key === 'SUBMIT') {
            submitGuess();
        } else if (key === 'BACKSPACE') {
            audioService.playSound('button_click');
            setGuess(prev => prev.slice(0, -1));
            if (inputState === 'wrong') setInputState('idle');
        } else if (/^[A-Z]$/.test(key)) {
            if (guess.length < 24) {
                audioService.playSound('button_click');
                setGuess(prev => prev + key);
                if (inputState === 'wrong') setInputState('idle');
            }
        }
    }, [gameOver, loading, inputState, submitGuess, guess.length]);

    // Physical keyboard listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') handleKeyPress('ENTER');
            else if (e.key === 'Backspace') handleKeyPress('BACKSPACE');
            else {
                const key = e.key.toUpperCase();
                if (/^[A-Z]$/.test(key)) handleKeyPress(key);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyPress]);

    return (
        <div className="flex flex-col items-center justify-between w-full h-full bg-[#050508] text-white relative overflow-y-auto custom-scrollbar p-3 sm:p-4 select-none font-sans">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #f59e0b 2px, transparent 2px), radial-gradient(circle at 20% 80%, #f59e0b 2px, transparent 2px)', backgroundSize: '80px 80px' }}></div>

            {/* Top Navigation Bar - Pinned at top */}
            <div className="flex justify-between items-center w-full max-w-xl shrink-0 pt-1 sm:pt-2 mb-2 z-10">
                <button 
                    onClick={() => {
                        audioService.playSound('button_click');
                        onBackToHub();
                    }} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-md"
                    title="Back to Hub"
                >
                    <span>⬅️</span>
                    <span className="hidden sm:inline">Hub</span>
                </button>

                <div className="flex flex-col items-center">
                    <h1 className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 tracking-wide">
                        SPELLING BEE
                    </h1>
                    <div className="text-[11px] sm:text-xs text-neutral-400 font-bold mt-0.5">
                        🔥 Streak: <span className="text-amber-400 font-mono text-sm">{streak}</span> | Level: <span className="text-yellow-300 font-bold">{difficulty}</span>
                    </div>
                </div>

                <div className="w-16 flex justify-end">
                    <button
                        onClick={() => {
                            audioService.playSound('button_click');
                            startNewGame();
                        }}
                        className="p-2 sm:px-2.5 sm:py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-full text-xs font-bold text-neutral-300 transition-transform active:scale-95 shadow-md"
                        title="Restart Game"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl my-auto py-1 sm:py-2 z-10">
                {loading ? (
                    <LoadingScreen text="Preparing Spelling Challenge..." color="#f59e0b" />
                ) : wordData ? (
                    <div key={wordData.word} className="flex flex-col items-center w-full bg-neutral-900/90 border-2 border-neutral-800 rounded-2xl p-3.5 sm:p-5 md:p-6 gap-3 sm:gap-4 shadow-2xl animate-fade-in max-w-full">
                        
                        {/* Audio Controls */}
                        <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
                            <button 
                                onClick={() => playAudio(wordData.word, 0.9)}
                                className="flex-1 max-w-[200px] px-3.5 sm:px-5 py-2.5 sm:py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-transform hover:scale-105 active:scale-95 text-xs sm:text-sm"
                                title="Hear Word (0.9x Clear British)"
                            >
                                <span className="text-base sm:text-xl">🔊</span>
                                <span>Say Word</span>
                            </button>
                            <button 
                                onClick={() => playAudio(wordData.sentence, 0.1)}
                                className="flex-1 max-w-[200px] px-3.5 sm:px-5 py-2.5 sm:py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 transition-transform hover:scale-105 active:scale-95 text-xs sm:text-sm"
                                title="Hear In Sentence (0.1x Speed)"
                            >
                                <span className="text-base sm:text-xl">💬</span>
                                <span>In Sentence</span>
                            </button>
                            <button 
                                onClick={() => playAudio(wordData.word, 0.6)}
                                className="px-3 py-2.5 sm:py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-400 font-bold rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 text-xs sm:text-sm"
                                title="Slow Spellout"
                            >
                                <span className="text-base sm:text-lg">🐢</span>
                            </button>
                        </div>

                        {/* Meaning / Definition */}
                        <div className="text-center w-full bg-neutral-950/70 p-2.5 sm:p-3.5 rounded-xl border border-neutral-800">
                            <div className="text-[9px] sm:text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Definition</div>
                            <p className="text-neutral-200 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3">{wordData.meaning}</p>
                        </div>

                        {/* Visual Typed Word Display Box (No Native Autocorrect / No Soft Keyboard) */}
                        <div className="w-full flex flex-col gap-2">
                            <div 
                                className={`w-full min-h-[50px] sm:min-h-[58px] p-2.5 sm:p-3 text-center flex items-center justify-center bg-neutral-950 border-2 rounded-xl transition-all ${
                                    inputState === 'correct' ? 'border-green-500 bg-green-950/40 shadow-[0_0_20px_rgba(34,197,94,0.4)]' :
                                    inputState === 'wrong' ? 'border-red-500 bg-red-950/40 animate-shake shadow-[0_0_20px_rgba(239,68,68,0.4)]' :
                                    'border-amber-400/80 bg-neutral-950'
                                }`}
                            >
                                {guess ? (
                                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
                                        {guess.split('').map((char, index) => (
                                            <span 
                                                key={index} 
                                                className="text-lg sm:text-2xl font-black uppercase text-amber-300 tracking-wider"
                                            >
                                                {char}
                                            </span>
                                        ))}
                                        {!gameOver && inputState !== 'correct' && (
                                            <span className="w-2 h-5 sm:h-6 bg-amber-400 animate-pulse inline-block ml-0.5" />
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-neutral-500 text-xs sm:text-sm font-bold tracking-wide">
                                        Type or tap keys to spell...
                                    </span>
                                )}
                            </div>
                        </div>

                        {feedback && (
                            <div className="text-sm sm:text-base font-black text-center" style={{ color: feedback.color }}>
                                {feedback.message}
                            </div>
                        )}

                        {gameOver && (
                            <div className="flex flex-col items-center gap-3 w-full animate-fade-in">
                                <div className="p-3 bg-red-950/50 border border-red-500/60 rounded-xl w-full text-center">
                                    <div className="text-neutral-400 text-[10px] sm:text-xs mb-1 uppercase font-bold">The correct spelling was:</div>
                                    <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-widest uppercase">
                                        {wordData.word}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        audioService.playSound('button_click');
                                        startNewGame();
                                    }}
                                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-full transition-transform active:scale-95 shadow-xl text-xs sm:text-sm"
                                >
                                    PLAY AGAIN
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-base text-red-400">Failed to load word. Please try again.</div>
                )}
            </div>

            {/* Virtual On-Screen Keyboard - Pinned at bottom */}
            <div className="flex flex-col gap-1 sm:gap-1.5 w-full max-w-lg px-1 sm:px-2 shrink-0 pb-1 sm:pb-3 mt-auto z-10">
                {KEYBOARD_ROWS.map((row, i) => (
                    <div key={i} className="flex justify-center gap-0.5 min-[380px]:gap-1 sm:gap-1.5">
                        {row.map(key => {
                            const isEnter = key === 'ENTER' || key === 'SUBMIT';
                            const isBackspace = key === 'BACKSPACE';
                            const isPressed = pressedKey === key;

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleKeyPress(key)}
                                    disabled={gameOver || loading || inputState === 'correct'}
                                    className={`border active:scale-95 font-black rounded-lg transition-all ${
                                        isEnter 
                                            ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400 px-2 min-[380px]:px-2.5 sm:px-3 text-[9px] min-[380px]:text-[10px] sm:text-xs shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black' 
                                            : isBackspace 
                                            ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-neutral-700 px-1.5 min-[380px]:px-2 sm:px-3 text-[11px] min-[380px]:text-xs sm:text-sm' 
                                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border-neutral-700 w-[min(8.6vw,36px)] sm:w-9 md:w-10 text-xs sm:text-base'
                                    } h-9 min-[380px]:h-10 sm:h-12 flex items-center justify-center ${isPressed ? 'scale-90 brightness-150' : ''} disabled:opacity-50`}
                                >
                                    {isBackspace ? '⌫' : isEnter ? 'SUBMIT' : key}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpellingBeeGame;
