
import React, { useState, useEffect, useRef } from 'react';
import { 
  COLORS, 
  IQ_QUESTIONS, 
  IQ_POINTS_MAP, 
  IQ_INFO,
  Question
} from '../constants';
import { User, saveLeaderboardScore } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { LeaderboardWidget, SettingsModal, FriendsModal, Button } from './Overlays';
import ChatWidget from './ChatWidget';

interface IQGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

type IQScreen = 'welcome' | 'playing' | 'end';

const IQGame: React.FC<IQGameProps> = ({ user, onBackToHub, username, onUpdateUsername, onLogout }) => {
    const [screen, setScreen] = useState<IQScreen>('welcome');
    const [showSettings, setShowSettings] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    
    // Game State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [timerSeconds, setTimerSeconds] = useState(600);
    const [chosenOption, setChosenOption] = useState<string | null>(null);
    
    // Animation States
    const [contentClass, setContentClass] = useState('animate-fade-in');
    
    // End Screen State
    const [finalScore, setFinalScore] = useState(0);
    const [finalComment, setFinalComment] = useState("");
    const [finalPercent, setFinalPercent] = useState("");
    const [correctCount, setCorrectCount] = useState(0);
    const [ringOffset, setRingOffset] = useState(339.29);

    const timerRef = useRef<number | null>(null);

    const displayableName = username || user.displayName || 'Chef';

    // --- Logic ---
    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setTimerSeconds(prev => {
                if (prev <= 1) {
                    endGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const setupGame = () => {
        // Shuffle and Select (5 Easy, 10 Med, 5 Hard)
        const easyQs = IQ_QUESTIONS.filter(q => q.difficulty === 'Easy').sort(() => 0.5 - Math.random()).slice(0, 5);
        const medQs = IQ_QUESTIONS.filter(q => q.difficulty === 'Medium').sort(() => 0.5 - Math.random()).slice(0, 10);
        const hardQs = IQ_QUESTIONS.filter(q => q.difficulty === 'Hard').sort(() => 0.5 - Math.random()).slice(0, 5);
        
        const selected = [...easyQs, ...medQs, ...hardQs].sort(() => 0.5 - Math.random());
        setQuestions(selected);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setTimerSeconds(600);
        setChosenOption(null);
        setScreen('playing');
        startTimer();
    };

    const processAnswer = () => {
        if (!chosenOption) {
            alert("Please select an option!");
            return;
        }
        
        const newAnswers = { ...userAnswers, [currentQuestionIndex]: chosenOption };
        setUserAnswers(newAnswers);
        
        // Transition Animation
        setContentClass('opacity-0 translate-y-4 transition-all duration-300');
        setTimeout(() => {
            if (currentQuestionIndex >= questions.length - 1) {
                // We need to pass the updated answers to endGame because state update is async
                endGame(newAnswers); 
            } else {
                setCurrentQuestionIndex(prev => prev + 1);
                setChosenOption(null);
                setContentClass('opacity-100 translate-y-0 transition-all duration-300');
            }
        }, 300);
    };

    const skipQuestion = () => {
        const newAnswers = { ...userAnswers, [currentQuestionIndex]: 'Skipped' };
        setUserAnswers(newAnswers);
        
        setContentClass('opacity-0 translate-y-4 transition-all duration-300');
        setTimeout(() => {
            if (currentQuestionIndex >= questions.length - 1) {
                endGame(newAnswers);
            } else {
                setCurrentQuestionIndex(prev => prev + 1);
                setChosenOption(null);
                setContentClass('opacity-100 translate-y-0 transition-all duration-300');
            }
        }, 300);
    };

    const endGame = async (finalAnswers?: Record<number, string>) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const answersToCheck = finalAnswers || userAnswers;

        let calculatedScore = 60; // Base Score
        let correct = 0;

        questions.forEach((q, idx) => {
            const ans = answersToCheck[idx];
            if (ans === q.correctAnswer) {
                correct++;
                calculatedScore += IQ_POINTS_MAP[q.difficulty];
            }
        });

        calculatedScore = Math.floor(calculatedScore);
        
        // Get Info
        let comment = "Result unknown.";
        let percentage = "N/A";
        
        const sortedKeys = Object.keys(IQ_INFO).map(Number).sort((a, b) => a - b);
        for (const scoreKey of sortedKeys) {
            if (calculatedScore <= scoreKey) {
                comment = IQ_INFO[scoreKey.toString()].comment;
                percentage = IQ_INFO[scoreKey.toString()].percentage;
                break;
            }
        }

        setFinalScore(calculatedScore);
        setCorrectCount(correct);
        setFinalComment(comment);
        setFinalPercent(percentage);
        setScreen('end');

        // Visual Ring Calc
        // Max score roughly 150. Base 60. Range 90.
        let percentFill = (calculatedScore - 60) / 90;
        if (percentFill < 0) percentFill = 0;
        if (percentFill > 1) percentFill = 1;
        const circumference = 339.29;
        const offset = circumference - (percentFill * circumference);
        
        // Save to Firebase
        // stats: mistakes (wrong/skipped), timeTaken, etc.
        const mistakes = questions.length - correct;
        const timeTaken = 600 - timerSeconds;
        
        if (user && displayableName) {
            await saveLeaderboardScore(
                user,
                displayableName,
                calculatedScore,
                "IQ Test Subject",
                {
                    mistakes,
                    timeTaken,
                    ingredientsMissed: 0,
                    rottenWordsTyped: 0,
                    totalScore: calculatedScore,
                    levelReached: 1
                },
                'iq-test'
            );
        }

        // Delay ring animation slightly for effect
        setTimeout(() => {
            setRingOffset(offset);
        }, 500);
    };

    // --- Render ---
    return (
        <div className="flex h-full w-full bg-[#000] text-white overflow-hidden relative font-['Inter',_sans-serif]">
            
            {/* --- Right Sidebar (Chat & Leaderboard) --- */}
            <div className="hidden md:flex flex-col absolute top-0 right-0 h-full w-[300px] z-[50] border-l border-[#333]">
                {/* For IQ Game, we force leaderboard to only show IQ mode */}
                <LeaderboardWidget className="h-[66%] border-b-0" allowedModes={['iq-test']} defaultMode="iq-test" />
                <ChatWidget user={user} className="h-[34%]" />
            </div>

            {/* --- Top Left Nav --- */}
            <div className="absolute top-4 left-4 flex gap-4 z-[60]">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform" title="Back to Hub">🏠</button>
                <button onClick={() => setShowSettings(true)} className="text-2xl hover:rotate-90 transition-transform" title="Settings">⚙️</button>
                <div className="flex items-center gap-2">
                     <span className="text-[#aaa] text-xs font-['Press_Start_2P']">{displayableName}</span>
                </div>
            </div>

             {/* Friends Button */}
             <div className="absolute top-4 right-[320px] z-[60] hidden md:block">
                 <button onClick={() => setShowFriends(true)} className="text-2xl hover:scale-110 transition-transform" title="Social Kitchen">👥</button>
             </div>

            {/* --- Modals --- */}
            {showSettings && (
                <SettingsModal 
                    onClose={() => setShowSettings(false)} 
                    username={displayableName} 
                    onUpdateUsername={onUpdateUsername}
                    onLogout={onLogout} 
                />
            )}
            {showFriends && (
                <FriendsModal 
                    onClose={() => setShowFriends(false)} 
                    currentUser={user} 
                />
            )}


            {/* --- Main Game Area --- */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:mr-[300px] relative z-10">
                
                {/* WELCOME SCREEN */}
                {screen === 'welcome' && (
                    <RandomReveal className="bg-[#111] border border-[#333] p-8 rounded-xl max-w-md w-full text-center shadow-2xl">
                        <div className="text-6xl mb-4">🧠</div>
                        <h1 className="text-4xl font-bold mb-2 text-[var(--color-warn)]">IQ Test</h1>
                        <p className="text-gray-400 mb-8">Logic, Verbal, Spatial & Patterns.</p>
                        <Button onClick={setupGame} className="w-full text-lg">Start Test</Button>
                    </RandomReveal>
                )}

                {/* PLAYING SCREEN */}
                {screen === 'playing' && (
                    <div className="w-full max-w-lg flex flex-col h-[80vh]">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-sm text-gray-500 font-bold tracking-widest">TEST PROGRESS</span>
                             <span className={`text-lg font-bold font-mono ${timerSeconds < 60 ? 'text-red-500 animate-pulse' : 'text-[var(--color-accent)]'}`}>
                                 {Math.floor(timerSeconds/60)}:{String(timerSeconds%60).padStart(2, '0')}s
                             </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[#222] h-2 rounded-full mb-6 overflow-hidden">
                            <div 
                                className="h-full bg-[var(--color-universal)] transition-all duration-300"
                                style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }}
                            />
                        </div>

                        {/* Question Card */}
                        <div className={`flex-1 bg-[#111] border border-[#222] rounded-xl p-6 flex flex-col overflow-y-auto ${contentClass}`}>
                            <div className="flex gap-3 mb-6">
                                <span className="text-[var(--color-universal)] font-bold text-xl">{currentQuestionIndex + 1}.</span>
                                <span className="text-white font-semibold text-lg leading-relaxed">
                                    {questions[currentQuestionIndex]?.question}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {questions[currentQuestionIndex]?.options.map((opt) => {
                                    const optKey = opt.trim().charAt(0); // 'A', 'B'...
                                    const isSelected = chosenOption === optKey;
                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => setChosenOption(optKey)}
                                            className={`text-left p-4 rounded-lg border transition-all duration-200
                                                ${isSelected 
                                                    ? 'bg-[var(--color-universal)] border-[var(--color-universal)] text-white font-bold transform scale-[1.02]' 
                                                    : 'bg-[#1a1a1a] border-[#333] text-gray-300 hover:border-[var(--color-universal)] hover:bg-[#252525]'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-auto pt-6 flex gap-4">
                                <button 
                                    onClick={skipQuestion} 
                                    className="flex-1 py-3 rounded-lg bg-[#222] text-gray-400 hover:bg-[#333] font-bold border border-[#333]"
                                >
                                    Skip
                                </button>
                                <button 
                                    onClick={processAnswer}
                                    className="flex-[2] py-3 rounded-lg bg-[var(--color-universal)] text-white font-bold hover:brightness-110 shadow-lg"
                                >
                                    {currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* END SCREEN */}
                {screen === 'end' && (
                    <RandomReveal className="bg-[#111] border border-[#333] p-8 rounded-xl max-w-md w-full text-center shadow-2xl flex flex-col items-center">
                        <h1 className="text-2xl font-bold mb-6 text-white">Result Analysis</h1>
                        
                        {/* Circle SVG */}
                        <div className="relative w-[120px] h-[120px] mb-6">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="#333" strokeWidth="8" />
                                <circle 
                                    cx="60" cy="60" r="54" fill="none" stroke="var(--color-universal)" strokeWidth="8"
                                    strokeDasharray="339.29"
                                    strokeDashoffset={ringOffset}
                                    style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white">
                                {finalScore}
                            </div>
                        </div>

                        <p className="text-[var(--color-universal)] font-bold text-lg mb-1">{finalPercent}</p>
                        <p className="text-gray-500 text-sm mb-4">Correct: {correctCount} / {questions.length}</p>
                        <p className="text-gray-300 italic text-base mb-8 px-4">"{finalComment}"</p>

                        <Button onClick={() => setScreen('welcome')} variant="accent" className="w-full">Restart</Button>
                    </RandomReveal>
                )}

            </div>
        </div>
    );
};

export default IQGame;
