import React, { useState, useEffect, useCallback } from 'react';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { aiService } from '../services/aiService';
import { LoadingScreen } from './LoadingScreen';
import { isMobileDevice } from '../utils/device';

interface WordleGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

const ROWS = 6;
const COLS = 5;

const WordleGame: React.FC<WordleGameProps> = ({ onBackToHub }) => {
    const [targetWord, setTargetWord] = useState('');
    const [guesses, setGuesses] = useState<string[]>([]);
    const [currentGuess, setCurrentGuess] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState('');
    const [shakeRow, setShakeRow] = useState(-1);
    const [streak, setStreak] = useState(0);
    const [hardMode, setHardMode] = useState(false);
    const [pressedKey, setPressedKey] = useState<string | null>(null);
    const [wordQueue, setWordQueue] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const startNewGame = useCallback(async () => {
        setIsLoading(true);
        let currentQueue = [...wordQueue];
        if (currentQueue.length === 0) {
            currentQueue = await aiService.generateWordleWords(5);
        }
        
        const word = currentQueue.shift() || 'TACOS';
        setWordQueue(currentQueue);
        setTargetWord(word);
        setGuesses([]);
        setCurrentGuess('');
        setGameOver(false);
        setMessage('');
        setIsLoading(false);
        incrementGamePlays('wordle');
    }, [wordQueue]);

    // Initial load
    useEffect(() => {
        startNewGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const handleKeyPress = useCallback((key: string) => {
        if (gameOver) return;

        setPressedKey(key);
        setTimeout(() => setPressedKey(null), 100);

        if (key === 'ENTER') {
            if (currentGuess.length !== COLS) {
                setMessage('Not enough letters');
                setShakeRow(guesses.length);
                setTimeout(() => setShakeRow(-1), 500);
                setTimeout(() => setMessage(''), 1500);
                return;
            }

            if (hardMode && guesses.length > 0) {
                const lastGuess = guesses[guesses.length - 1];
                for (let i = 0; i < COLS; i++) {
                    const status = getLetterStatus(lastGuess[i], i, lastGuess);
                    if (status === 'correct' && currentGuess[i] !== lastGuess[i]) {
                        setMessage(`Must use ${lastGuess[i]} in position ${i + 1}`);
                        setShakeRow(guesses.length);
                        setTimeout(() => setShakeRow(-1), 500);
                        setTimeout(() => setMessage(''), 1500);
                        return;
                    }
                    if (status === 'present' && !currentGuess.includes(lastGuess[i])) {
                        setMessage(`Must contain ${lastGuess[i]}`);
                        setShakeRow(guesses.length);
                        setTimeout(() => setShakeRow(-1), 500);
                        setTimeout(() => setMessage(''), 1500);
                        return;
                    }
                }
            }
            
            const newGuesses = [...guesses, currentGuess];
            setGuesses(newGuesses);
            setCurrentGuess('');

            if (currentGuess === targetWord) {
                setGameOver(true);
                setMessage('You won!');
                setStreak(s => s + 1);
            } else if (newGuesses.length >= ROWS) {
                setGameOver(true);
                setMessage(`Game Over! The word was ${targetWord}`);
                setStreak(0);
            }
        } else if (key === 'BACKSPACE') {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (/^[A-Z]$/.test(key) && currentGuess.length < COLS) {
            setCurrentGuess(prev => prev + key);
        }
    }, [currentGuess, gameOver, guesses, targetWord, hardMode]);

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
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#000] text-white font-['Inter'] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 2px, transparent 2px), radial-gradient(circle at 80% 70%, #fff 2px, transparent 2px)', backgroundSize: '100px 100px' }}></div>
            
            <div className="flex justify-between items-center w-full max-w-md p-4 z-10">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
                <div className="flex flex-col items-center">
                    <h1 className="text-2xl font-bold font-['Press_Start_2P'] text-[#57a863]">WORDLE</h1>
                    <div className="text-xs text-[#aaa] mt-1 flex gap-4">
                        <span>Streak: {streak}</span>
                        <button 
                            onClick={() => setHardMode(!hardMode)}
                            className={`px-2 py-1 rounded transition-colors ${hardMode ? 'bg-red-900 text-white' : 'bg-[#333] text-[#aaa]'}`}
                            disabled={guesses.length > 0 && !gameOver}
                        >
                            Hard Mode: {hardMode ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>
                <div className="w-8"></div>
            </div>

            {message && !gameOver && (
                <div className="absolute top-24 bg-white text-black px-4 py-2 rounded font-bold z-20 animate-pop-in">
                    {message}
                </div>
            )}

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center z-10 w-full">
                    <LoadingScreen text="Loading words..." color="#57a863" />
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-2 mb-8 z-10 mt-4">
                {Array.from({ length: ROWS }).map((_, rowIndex) => {
                    const guess = guesses[rowIndex] || (rowIndex === guesses.length ? currentGuess : '');
                    const isSubmitted = rowIndex < guesses.length;

                    return (
                        <div key={rowIndex} className={`flex gap-2 ${shakeRow === rowIndex ? 'animate-shake' : ''}`}>
                            {Array.from({ length: COLS }).map((_, colIndex) => {
                                const letter = guess[colIndex] || '';
                                let bgColor = 'bg-transparent';
                                let borderColor = 'border-[#3a3a3c]';
                                
                                if (isSubmitted) {
                                    const status = getLetterStatus(letter, colIndex, guess);
                                    if (status === 'correct') { bgColor = 'bg-[#538d4e]'; borderColor = 'border-[#538d4e]'; }
                                    else if (status === 'present') { bgColor = 'bg-[#b59f3b]'; borderColor = 'border-[#b59f3b]'; }
                                    else { bgColor = 'bg-[#3a3a3c]'; borderColor = 'border-[#3a3a3c]'; }
                                } else if (letter) {
                                    borderColor = 'border-[#565758]';
                                }

                                return (
                                    <div 
                                        key={colIndex} 
                                        className={`w-14 h-14 md:w-16 md:h-16 border-2 flex items-center justify-center text-2xl md:text-3xl font-bold uppercase ${bgColor} ${borderColor} transition-colors duration-500 ${isSubmitted ? 'animate-flip-in-x' : letter ? 'animate-pop-in' : ''}`}
                                        style={{ animationDelay: isSubmitted ? `${colIndex * 0.1}s` : '0s' }}
                                    >
                                        {letter}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col gap-2 w-full max-w-lg px-2 z-10">
                {keyboardRows.map((row, i) => (
                    <div key={i} className="flex justify-center gap-1 md:gap-2">
                        {row.map(key => {
                            const status = getKeyStatus(key);
                            let bgColor = 'bg-[#818384]';
                            if (status === 'correct') bgColor = 'bg-[#538d4e]';
                            else if (status === 'present') bgColor = 'bg-[#b59f3b]';
                            else if (status === 'absent') bgColor = 'bg-[#3a3a3c]';

                            const isPressed = pressedKey === key;

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleKeyPress(key)}
                                    className={`${bgColor} hover:opacity-80 text-white font-bold rounded ${key.length > 1 ? 'px-2 md:px-4 text-xs md:text-sm' : 'w-8 md:w-10 text-sm md:text-base'} h-12 md:h-14 flex items-center justify-center transition-all ${isPressed ? 'scale-90 brightness-150' : ''}`}
                                >
                                    {key === 'BACKSPACE' ? '⌫' : key}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {gameOver && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1b] border border-[#3a3a3c] rounded-lg p-8 max-w-sm w-full flex flex-col items-center gap-6 animate-pop-in shadow-2xl">
                        <h2 className="text-2xl font-bold font-['Press_Start_2P'] text-center text-white">
                            {message === 'You win!' ? 'YOU WIN!' : 'GAME OVER'}
                        </h2>
                        
                        <div className="text-center">
                            <p className="text-[#aaa] mb-2">The word was</p>
                            <div className="text-3xl font-bold text-[#538d4e] tracking-widest uppercase">
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
                                className="flex-1 py-3 bg-[#538d4e] text-white font-bold rounded hover:bg-[#468a4f] transition-colors font-['Press_Start_2P'] text-xs"
                            >
                                REPLAY
                            </button>
                        </div>
                    </div>
                </div>
            )}
                </>
            )}
        </div>
    );
};

export default WordleGame;
