import React, { useState, useEffect, useCallback } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { LoadingScreen } from './LoadingScreen';
import { audioService } from '../services/audioService';
import { WORDLE_WORDS_BY_LENGTH, validateWord } from '../services/wordleService';

interface WordleGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

const ROWS = 6;

export default function WordleGame({ user, username, onBackToHub }: WordleGameProps) {
    const [wordLength, setWordLength] = useState<number>(5);
    const [targetWord, setTargetWord] = useState('');
    const [guesses, setGuesses] = useState<string[]>([]);
    const [currentGuess, setCurrentGuess] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState('');
    const [shakeRow, setShakeRow] = useState(-1);
    const [streak, setStreak] = useState(0);
    const [strictRules, setStrictRules] = useState(false);
    const [pressedKey, setPressedKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingWord, setIsCheckingWord] = useState(false);
    const [isWon, setIsWon] = useState(false);
    const [isLost, setIsLost] = useState(false);
    const [showGameOverPopup, setShowGameOverPopup] = useState(false);

    const startNewGame = useCallback((length: number = wordLength) => {
        setIsLoading(true);
        const pool = WORDLE_WORDS_BY_LENGTH[length] || WORDLE_WORDS_BY_LENGTH[5];
        const randomWord = pool[Math.floor(Math.random() * pool.length)];

        setTargetWord(randomWord);
        setGuesses([]);
        setCurrentGuess('');
        setGameOver(false);
        setShowGameOverPopup(false);
        setIsWon(false);
        setIsLost(false);
        setMessage('');
        setIsLoading(false);
        incrementGamePlays('wordle');
    }, [wordLength]);

    useEffect(() => {
        startNewGame(wordLength);
    }, [wordLength, startNewGame]);

    const getLetterStatus = (letter: string, index: number, guess: string) => {
        if (targetWord[index] === letter) return 'correct';
        if (targetWord.includes(letter)) {
            const targetLetterCount = targetWord.split('').filter(l => l === letter).length;
            const guessLetterCountUpToIndex = guess.slice(0, index + 1).split('').filter(l => l === letter).length;
            const correctLetterCount = guess.split('').filter((l, i) => l === letter && targetWord[i] === letter).length;
            
            if (guessLetterCountUpToIndex <= targetLetterCount - correctLetterCount) {
                return 'present';
            }
        }
        return 'absent';
    };

    const handleKeyPress = useCallback(async (key: string) => {
        if (gameOver || isCheckingWord) return;

        setPressedKey(key);
        setTimeout(() => setPressedKey(null), 100);

        if (key === 'ENTER') {
            if (currentGuess.length !== wordLength) {
                audioService.playSound('wrong_answer');
                setMessage(`Word must be ${wordLength} letters`);
                setShakeRow(guesses.length);
                setTimeout(() => setShakeRow(-1), 500);
                setTimeout(() => setMessage(''), 1500);
                return;
            }

            setIsCheckingWord(true);
            const isValid = await validateWord(currentGuess, wordLength);
            setIsCheckingWord(false);

            if (!isValid) {
                audioService.playSound('wrong_answer');
                setMessage('Not in word list');
                setShakeRow(guesses.length);
                setTimeout(() => setShakeRow(-1), 500);
                setTimeout(() => setMessage(''), 1500);
                return;
            }

            // Strict rules check
            if (strictRules && guesses.length > 0) {
                const lastGuess = guesses[guesses.length - 1];
                for (let i = 0; i < wordLength; i++) {
                    const status = getLetterStatus(lastGuess[i], i, lastGuess);
                    if (status === 'correct' && currentGuess[i] !== lastGuess[i]) {
                        audioService.playSound('wrong_answer');
                        setMessage(`Must use ${lastGuess[i]} at position ${i + 1}`);
                        setShakeRow(guesses.length);
                        setTimeout(() => setShakeRow(-1), 500);
                        setTimeout(() => setMessage(''), 1500);
                        return;
                    }
                    if (status === 'present' && !currentGuess.includes(lastGuess[i])) {
                        audioService.playSound('wrong_answer');
                        setMessage(`Must contain ${lastGuess[i]}`);
                        setShakeRow(guesses.length);
                        setTimeout(() => setShakeRow(-1), 500);
                        setTimeout(() => setMessage(''), 1500);
                        return;
                    }
                }
            }

            audioService.playSound('tile_click');
            const newGuesses = [...guesses, currentGuess];
            setGuesses(newGuesses);
            setCurrentGuess('');

            if (currentGuess === targetWord) {
                audioService.playSound('correct_answer');
                setGameOver(true);
                const newStreak = streak + 1;
                setStreak(newStreak);
                setTimeout(() => {
                    setIsWon(true);
                    setMessage('Brilliant! 🎉');
                    setShowGameOverPopup(true);
                }, 1000);

                await saveLeaderboardScore(
                    user,
                    username || user.displayName || 'Wordler',
                    newStreak,
                    wordLength >= 7 ? 'Wordle Grandmaster' : 'Wordle Virtuoso',
                    { mistakes: 0, timeTaken: 0, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: newStreak, levelReached: wordLength },
                    'wordle'
                );
            } else if (newGuesses.length >= ROWS) {
                audioService.playSound('wrong_answer');
                setGameOver(true);
                setStreak(0);
                setTimeout(() => {
                    setIsLost(true);
                    setMessage(`Game Over! The word was ${targetWord}`);
                    setShowGameOverPopup(true);
                }, 1000);
            }
        } else if (key === 'BACKSPACE') {
            audioService.playSound('button_click');
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (/^[A-Z]$/.test(key) && currentGuess.length < wordLength) {
            audioService.playSound('button_click');
            setCurrentGuess(prev => prev + key);
        }
    }, [currentGuess, gameOver, guesses, targetWord, wordLength, strictRules, isCheckingWord, streak, user, username]);

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

    const keyboardRows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
    ];

    const getKeyStatus = (key: string) => {
        let status = 'default';
        for (const guess of guesses) {
            for (let i = 0; i < guess.length; i++) {
                if (guess[i] === key) {
                    const s = getLetterStatus(key, i, guess);
                    if (s === 'correct') return 'correct';
                    if (s === 'present' && status !== 'correct') status = 'present';
                    if (s === 'absent' && status === 'default') status = 'absent';
                }
            }
        }
        return status;
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#050508] text-white relative overflow-y-auto custom-scrollbar p-3 select-none font-sans">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #22c55e 2px, transparent 2px)', backgroundSize: '70px 70px' }}></div>

            {/* Top Bar */}
            <div className="flex justify-between items-center w-full max-w-xl mb-3 z-10">
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
                    <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 tracking-wide">
                        WORDLE
                    </h1>
                    <div className="text-xs text-neutral-400 font-bold mt-0.5">
                        🔥 Streak: <span className="text-amber-400 font-mono text-sm">{streak}</span>
                    </div>
                </div>

                <div className="w-16 flex justify-end">
                    <button
                        onClick={() => {
                            audioService.playSound('button_click');
                            startNewGame(wordLength);
                        }}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-full text-xs font-bold text-neutral-300"
                        title="New Word"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Word Length / Hard Mode Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3 z-10">
                <div className="flex bg-neutral-900/90 border border-neutral-800 p-1 rounded-xl">
                    {[5, 6, 7, 8, 9].map(len => (
                        <button
                            key={len}
                            onClick={() => {
                                audioService.playSound('button_click');
                                setWordLength(len);
                            }}
                            className={`w-8 h-7 text-xs font-bold rounded-lg flex items-center justify-center transition-all ${
                                wordLength === len ? 'bg-green-600 text-white shadow font-black' : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            {len}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => {
                        audioService.playSound('button_click');
                        setStrictRules(prev => !prev);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all ${
                        strictRules ? 'bg-red-950/80 border-red-500 text-red-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                    title="Strict rule enforcement"
                >
                    Strict Clues: {strictRules ? 'ON' : 'OFF'}
                </button>
            </div>

            {message && !gameOver && (
                <div className="absolute top-28 bg-neutral-900 text-white border border-amber-500/80 px-4 py-2 rounded-xl font-bold z-30 shadow-xl animate-fade-in text-sm">
                    {message}
                </div>
            )}

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center z-10 w-full">
                    <LoadingScreen text="Generating puzzle..." color="#22c55e" />
                </div>
            ) : (
                <>
                    {/* Letter Grid */}
                    <div className={`flex flex-col gap-1.5 sm:gap-2 mb-4 z-10 ${isWon ? 'animate-bounce' : ''} ${isLost ? 'animate-shake' : ''}`}>
                        {Array.from({ length: ROWS }).map((_, rowIndex) => {
                            const guess = guesses[rowIndex] || (rowIndex === guesses.length ? currentGuess : '');
                            const isSubmitted = rowIndex < guesses.length;

                            return (
                                <div key={rowIndex} className={`flex gap-1.5 sm:gap-2 ${shakeRow === rowIndex ? 'animate-shake' : ''}`}>
                                    {Array.from({ length: wordLength }).map((_, colIndex) => {
                                        const letter = guess[colIndex] || '';
                                        let bgColor = 'bg-neutral-950';
                                        let borderColor = 'border-neutral-800';
                                        
                                        if (isSubmitted) {
                                            const status = getLetterStatus(letter, colIndex, guess);
                                            if (status === 'correct') { 
                                                bgColor = 'bg-green-600 text-white'; 
                                                borderColor = 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'; 
                                            } else if (status === 'present') { 
                                                bgColor = 'bg-amber-500 text-black'; 
                                                borderColor = 'border-amber-400'; 
                                            } else { 
                                                bgColor = 'bg-neutral-800 text-neutral-400'; 
                                                borderColor = 'border-neutral-700'; 
                                            }
                                        } else if (letter) {
                                            borderColor = 'border-neutral-500 bg-neutral-900';
                                        }

                                        const boxSize = wordLength === 9 
                                            ? 'w-[min(9vw,40px)] h-[min(10.5vw,46px)] min-w-[28px] min-h-[34px] sm:w-11 sm:h-12 text-sm min-[380px]:text-base sm:text-xl' 
                                            : wordLength === 8
                                            ? 'w-[min(10vw,44px)] h-[min(11.5vw,50px)] min-w-[30px] min-h-[36px] sm:w-11 sm:h-12 text-base sm:text-xl'
                                            : wordLength === 7
                                            ? 'w-[min(11.5vw,48px)] h-[min(13vw,54px)] min-w-[34px] min-h-[40px] sm:w-12 sm:h-13 text-lg sm:text-2xl'
                                            : 'w-[min(13.5vw,56px)] h-[min(15vw,62px)] min-w-[38px] min-h-[44px] sm:w-14 sm:h-14 md:w-16 md:h-16 text-xl sm:text-2xl md:text-3xl';

                                        return (
                                            <div 
                                                key={colIndex} 
                                                className={`${boxSize} border-2 rounded-xl flex items-center justify-center font-black uppercase ${bgColor} ${borderColor} transition-all duration-300 ${isSubmitted ? 'animate-flip-in-x' : letter ? 'scale-105' : ''}`}
                                                style={{ animationDelay: isSubmitted ? `${colIndex * 0.08}s` : '0s' }}
                                            >
                                                {letter}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Virtual Keyboard */}
                    <div className="flex flex-col gap-1 sm:gap-1.5 w-full max-w-lg px-1 sm:px-2 z-10">
                        {keyboardRows.map((row, i) => (
                            <div key={i} className="flex justify-center gap-0.5 min-[380px]:gap-1 sm:gap-1.5">
                                {row.map(key => {
                                    const status = getKeyStatus(key);
                                    let bgColor = 'bg-neutral-800 text-neutral-200 border-neutral-700';
                                    if (status === 'correct') bgColor = 'bg-green-600 text-white border-green-500';
                                    else if (status === 'present') bgColor = 'bg-amber-500 text-black border-amber-400';
                                    else if (status === 'absent') bgColor = 'bg-neutral-900 text-neutral-600 border-neutral-900';

                                    const isPressed = pressedKey === key;

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleKeyPress(key)}
                                            className={`${bgColor} border active:scale-95 font-black rounded-lg ${
                                                key.length > 1 
                                                    ? 'px-1 min-[380px]:px-2 sm:px-3 text-[9px] min-[380px]:text-[11px] sm:text-xs' 
                                                    : 'w-[min(8.5vw,36px)] sm:w-9 md:w-10 text-xs sm:text-base'
                                            } h-9 min-[380px]:h-10 sm:h-12 flex items-center justify-center transition-all ${isPressed ? 'scale-90 brightness-150' : ''}`}
                                        >
                                            {key === 'BACKSPACE' ? '⌫' : key}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Result Popup */}
                    {showGameOverPopup && (
                        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
                            <div className={`bg-neutral-900 border-2 ${isWon ? 'border-green-500' : 'border-red-500'} rounded-2xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center gap-5 shadow-2xl animate-fade-in`}>
                                <h2 className={`text-2xl font-black text-center ${isWon ? 'text-green-400' : 'text-red-400'}`}>
                                    {isWon ? '🎉 YOU WON!' : '😢 GAME OVER'}
                                </h2>
                                
                                <div className="text-center bg-neutral-950 p-4 rounded-xl w-full border border-neutral-800">
                                    <p className="text-neutral-400 text-xs uppercase font-bold mb-1">The secret word was:</p>
                                    <div className="text-2xl sm:text-3xl font-black text-white tracking-widest uppercase text-green-400">
                                        {targetWord}
                                    </div>
                                </div>

                                <div className="flex gap-3 w-full">
                                    <button 
                                        onClick={() => {
                                            audioService.playSound('button_click');
                                            onBackToHub();
                                        }}
                                        className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors text-sm"
                                    >
                                        Hub
                                    </button>
                                    <button 
                                        onClick={() => {
                                            audioService.playSound('button_click');
                                            startNewGame(wordLength);
                                        }}
                                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors shadow-lg text-sm"
                                    >
                                        Next Word
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
