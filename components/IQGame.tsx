
import React, { useState, useEffect, useRef } from 'react';
import { 
  COLORS, 
  IQ_QUESTIONS, 
  IQ_POINTS_MAP, 
  IQ_INFO,
  Question
} from '../constants';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { LeaderboardWidget, SettingsModal, FriendsModal, Button } from './Overlays';
import ChatWidget from './ChatWidget';
import { isMobileDevice } from '../utils/device';

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
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
    
    // Game State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [timerSeconds, setTimerSeconds] = useState(600);
    const [chosenOption, setChosenOption] = useState<string | null>(null);
    
    // Animation States - Using opacity/transform classes for transitions
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    // End Screen State
    const [finalScore, setFinalScore] = useState(0);
    const [finalComment, setFinalComment] = useState("");
    const [finalPercent, setFinalPercent] = useState("");
    const [correctCount, setCorrectCount] = useState(0);
    const [ringOffset, setRingOffset] = useState(339.29);

    const timerRef = useRef<number | null>(null);

    const displayableName = username || user.displayName || 'Chef';

    useEffect(() => {
        setIsMobile(isMobileDevice());
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

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
        // Track play
        incrementGamePlays('iq_test');

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

    const nextStep = (updatedAnswers: Record<number, string>) => {
        // Transition Animation Trigger
        setIsTransitioning(true);
        
        setTimeout(() => {
            if (currentQuestionIndex >= questions.length - 1) {
                endGame(updatedAnswers); 
            } else {
                setCurrentQuestionIndex(prev => prev + 1);
                setChosenOption(null);
                // Allow the DOM to update with new content while hidden, then fade back in
                setTimeout(() => setIsTransitioning(false), 50);
            }
        }, 300); // Wait for fade out
    };

    const processAnswer = () => {
        if (!chosenOption) {
            alert("Please select an option!");
            return;
        }
        const newAnswers = { ...userAnswers, [currentQuestionIndex]: chosenOption };
        setUserAnswers(newAnswers);
        nextStep(newAnswers);
    };

    const skipQuestion = () => {
        const newAnswers = { ...userAnswers, [currentQuestionIndex]: 'Skipped' };
        setUserAnswers(newAnswers);
        nextStep(newAnswers);
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
            
            {/* --- Right Sidebar (Desktop Only) --- */}
            {!isMobile && (
                <div className="flex flex-col absolute top-0 right-0 h-full w-[300px] z-[50] border-l border-[#333] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <LeaderboardWidget className="h-[66%] border-b-0" allowedModes={['iq-test']} defaultMode="iq-test" />
                    <ChatWidget user={user} className="h-[34%]" />
                </div>
            )}

            {/* --- Mobile Leaderboard Toggle & Modal --- */}
            {isMobile && (
                <>
                    <div className="absolute top-4 right-4 z-[60]">
                        <button 
                            onClick={() => setShowMobileLeaderboard(true)} 
                            className="text-2xl hover:scale-110 transition-transform bg-[#111] p-2 rounded-full border border-[#f4b400]"
                            title="Leaderboard"
                        >
                            🏆
                        </button>
                    </div>

                    {showMobileLeaderboard && (
                        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-[#f4b400] text-xl font-bold">Top Minds</h2>
                                <button onClick={() => setShowMobileLeaderboard(false)} className="text-red-500 text-2xl font-bold p-2">✕</button>
                            </div>
                            <LeaderboardWidget className="flex-1 border-none shadow-none p-0" allowedModes={['iq-test']} defaultMode="iq-test" />
                        </div>
                    )}
                </>
            )}

            {/* --- Top Left Nav --- */}
            <div className="absolute top-4 left-4 flex gap-4 z-[60]">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform duration-300 ease-[var(--ease-spring)]" title="Back to Hub">🏠</button>
                <button onClick={() => setShowSettings(true)} className="text-2xl hover:rotate-90 transition-transform duration-500 ease-[var(--ease-smooth)]" title="Settings">⚙️</button>
                <div className="flex items-center gap-2">
                     {!isMobile && <span className="text-[#aaa] text-xs font-['Press_Start_2P']">{displayableName}</span>}
                </div>
            </div>

             {/* Friends Button (Desktop Only) */}
             {!isMobile && (
                 <div className="absolute top-4 right-[320px] z-[60] hidden md:block">
                     <button onClick={() => setShowFriends(true)} className="text-2xl hover:scale-110 transition-transform duration-300 ease-[var(--ease-spring)]" title="Social Kitchen">👥</button>
                 </div>
             )}

            {/* --- Modals --- */}
            {showSettings && (
                <SettingsModal 
                    onClose={() => setShowSettings(false)} 
                    username={displayableName} 
                    onUpdateUsername={onUpdateUsername}
                    onLogout={onLogout} 
                />
            )}
            {showFriends && !isMobile && (
                <FriendsModal 
                    onClose={() => setShowFriends(false)} 
                    currentUser={user} 
                />
            )}


            {/* --- Main Game Area --- */}
            <div className={`flex-1 flex flex-col items-center justify-center p-4 relative z-10 ${isMobile ? '' : 'md:mr-[300px]'}`}>
                
                {/* WELCOME SCREEN */}
                {screen === 'welcome' && (
                    <RandomReveal className="bg-[#111] border border-[#333] p-8 rounded-xl max-w-md w-full text-center shadow-2xl mt-12 md:mt-0 animate-fade-in">
                        <div className="text-6xl mb-4 animate-spicy-pulse">🧠</div>
                        <h1 className="text-4xl font-bold mb-2 text-[var(--color-warn)]">IQ Test</h1>
                        <p className="text-gray-400 mb-8">Logic, Verbal, Spatial & Patterns.</p>
                        <Button onClick={setupGame} className="w-full text-lg hover-scale">Start Test</Button>
                    </RandomReveal>
                )}

                {/* PLAYING SCREEN */}
                {screen === 'playing' && (
                    <div className="w-full max-w-lg flex flex-col h-[85vh] mt-12 md:mt-0 animate-fade-in">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs md:text-sm text-gray-500 font-bold tracking-widest">TEST PROGRESS</span>
                             <span className={`text-base md:text-lg font-bold font-mono transition-colors duration-300 ${timerSeconds < 60 ? 'text-red-500 animate-pulse' : 'text-[var(--color-accent)]'}`}>
                                 {Math.floor(timerSeconds/60)}:{String(timerSeconds%60).padStart(2, '0')}s
                             </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[#222] h-2 rounded-full mb-4 md:mb-6 overflow-hidden shrink-0">
                            <div 
                                className="h-full bg-[var(--color-universal)] transition-all duration-500 ease-[var(--ease-smooth)]"
                                style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }}
                            />
                        </div>

                        {/* Question Card */}
                        <div 
                            className={`flex-1 bg-[#111] border border-[#222] rounded-xl p-4 md:p-6 flex flex-col overflow-y-auto 
                            transform transition-all duration-300 ease-[var(--ease-out-expo)]
                            ${isTransitioning ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}
                        >
                            <div className="flex gap-3 mb-4 md:mb-6">
                                <span className="text-[var(--color-universal)] font-bold text-lg md:text-xl">{currentQuestionIndex + 1}.</span>
                                <span className="text-white font-semibold text-base md:text-lg leading-relaxed">
                                    {questions[currentQuestionIndex]?.question}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2 md:gap-3 mb-4">
                                {questions[currentQuestionIndex]?.options.map((opt) => {
                                    const optKey = opt.trim().charAt(0); // 'A', 'B'...
                                    const isSelected = chosenOption === optKey;
                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => setChosenOption(optKey)}
                                            className={`text-left p-3 md:p-4 rounded-lg border transition-all duration-200 text-sm md:text-base
                                                ${isSelected 
                                                    ? 'bg-[var(--color-universal)] border-[var(--color-universal)] text-white font-bold transform scale-[1.02] shadow-[0_0_15px_rgba(79,172,254,0.3)]' 
                                                    : 'bg-[#1a1a1a] border-[#333] text-gray-300 hover:border-[var(--color-universal)] hover:bg-[#252525]'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-auto pt-4 md:pt-6 flex gap-3 md:gap-4">
                                <button 
                                    onClick={skipQuestion} 
                                    className="flex-1 py-3 md:py-3 rounded-lg bg-[#222] text-gray-400 hover:bg-[#333] font-bold border border-[#333] text-sm md:text-base transition-colors"
                                >
                                    Skip
                                </button>
                                <button 
                                    onClick={processAnswer}
                                    className="flex-[2] py-3 md:py-3 rounded-lg bg-[var(--color-universal)] text-white font-bold hover:brightness-110 shadow-lg text-sm md:text-base transition-transform active:scale-95"
                                >
                                    {currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* END SCREEN */}
                {screen === 'end' && (
                    <RandomReveal className="bg-[#111] border border-[#333] p-8 rounded-xl max-w-md w-full text-center shadow-2xl flex flex-col items-center mt-12 md:mt-0 animate-fade-in">
                        <h1 className="text-xl md:text-2xl font-bold mb-6 text-white">Result Analysis</h1>
                        
                        {/* Circle SVG */}
                        <div className="relative w-[120px] h-[120px] mb-6">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="#333" strokeWidth="8" />
                                <circle 
                                    cx="60" cy="60" r="54" fill="none" stroke="var(--color-universal)" strokeWidth="8"
                                    strokeDasharray="339.29"
                                    strokeDashoffset={ringOffset}
                                    style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white animate-pop-in" style={{ animationDelay: '1s' }}>
                                {finalScore}
                            </div>
                        </div>

                        <RandomReveal delay={0.5}>
                            <p className="text-[var(--color-universal)] font-bold text-lg mb-1">{finalPercent}</p>
                            <p className="text-gray-500 text-sm mb-4">Correct: {correctCount} / {questions.length}</p>
                        </RandomReveal>
                        
                        <p className="text-gray-300 italic text-base mb-8 px-4 animate-fade-in" style={{ animationDelay: '1.5s' }}>"{finalComment}"</p>

                        <Button onClick={() => setScreen('welcome')} variant="accent" className="w-full hover-scale">Restart</Button>
                    </RandomReveal>
                )}

            </div>
        </div>
    );
};

export default IQGame;
