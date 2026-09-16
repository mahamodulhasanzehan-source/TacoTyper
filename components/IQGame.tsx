import React, { useState, useEffect, useRef } from 'react';
import { 
  IQ_QUESTIONS, 
  IQ_POINTS_MAP, 
  IQ_INFO,
  Question
} from '../constants';
import { User, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import { audioService } from '../services/audioService';

interface IQGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

type IQScreen = 'welcome' | 'playing' | 'end';

const IQGame: React.FC<IQGameProps> = ({ user, onBackToHub, username }) => {
    const [screen, setScreen] = useState<IQScreen>('welcome');
    
    // Game State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [timerSeconds, setTimerSeconds] = useState(600);
    const [chosenOption, setChosenOption] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    // End Screen State
    const [finalScore, setFinalScore] = useState(0);
    const [finalComment, setFinalComment] = useState("");
    const [finalPercent, setFinalPercent] = useState("");
    const [correctCount, setCorrectCount] = useState(0);
    const [ringOffset, setRingOffset] = useState(339.29);

    const timerRef = useRef<number | null>(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

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
        audioService.playSound('button_click');
        incrementGamePlays('iq_test');

        // 5 Easy, 10 Med, 5 Hard
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
        setIsTransitioning(true);
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setChosenOption(updatedAnswers[currentQuestionIndex + 1] || null);
            } else {
                endGame(updatedAnswers);
            }
            setIsTransitioning(false);
        }, 200);
    };

    const processAnswer = () => {
        if (!chosenOption) return;
        audioService.playSound('button_click');
        const updatedAnswers = { ...userAnswers, [currentQuestionIndex]: chosenOption };
        setUserAnswers(updatedAnswers);
        nextStep(updatedAnswers);
    };

    const skipQuestion = () => {
        audioService.playSound('button_click');
        nextStep(userAnswers);
    };

    const endGame = async (finalAnswers = userAnswers) => {
        if (timerRef.current) clearInterval(timerRef.current);

        let calculatedIQ = 60;
        let cCount = 0;

        questions.forEach((q, idx) => {
            const userChoice = finalAnswers[idx];
            if (userChoice && userChoice === q.correctAnswer) {
                cCount++;
                calculatedIQ += IQ_POINTS_MAP[q.difficulty] || 0;
            }
        });

        calculatedIQ = Math.min(160, Math.round(calculatedIQ));
        setFinalScore(calculatedIQ);
        setCorrectCount(cCount);

        const thresholds = Object.keys(IQ_INFO).map(Number).sort((a,b) => a - b);
        let chosenKey = thresholds[0];
        for (let t of thresholds) {
            if (calculatedIQ >= t) {
                chosenKey = t;
            }
        }
        setFinalComment(IQ_INFO[chosenKey.toString()].comment);
        setFinalPercent(IQ_INFO[chosenKey.toString()].percentage);

        setScreen('end');
        audioService.playSound('correct_answer');

        // Animate circular meter
        const percentage = (calculatedIQ - 60) / 100;
        setTimeout(() => {
            setRingOffset(339.29 - (percentage * 339.29));
        }, 300);

        await saveLeaderboardScore(
            user,
            username || user.displayName || 'Chef',
            calculatedIQ,
            calculatedIQ >= 130 ? 'Genius Mind' : calculatedIQ >= 115 ? 'Superior Intellect' : 'Logical Thinker',
            { mistakes: questions.length - cCount, timeTaken: 600 - timerSeconds, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: calculatedIQ, levelReached: cCount },
            'iq_test'
        );
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#050508] text-white relative overflow-y-auto custom-scrollbar p-4 select-none font-sans">
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #3b82f6 2px, transparent 2px), radial-gradient(circle at 80% 20%, #3b82f6 2px, transparent 2px)', backgroundSize: '80px 80px' }}></div>
            
            {/* Top Bar */}
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
                    <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-wide">
                        IQ TEST
                    </h1>
                </div>

                <div className="w-16 flex justify-end">
                    {screen === 'playing' && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold border ${timerSeconds < 60 ? 'bg-red-950 text-red-400 border-red-700 animate-pulse' : 'bg-neutral-900 text-blue-400 border-neutral-700'}`}>
                            {Math.floor(timerSeconds/60)}:{String(timerSeconds%60).padStart(2, '0')}
                        </span>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl z-10">
                {/* WELCOME SCREEN */}
                {screen === 'welcome' && (
                    <div className="bg-neutral-900/90 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl animate-fade-in flex flex-col items-center">
                        <div className="text-6xl mb-4 animate-bounce">🧠</div>
                        <h2 className="text-2xl sm:text-3xl font-black mb-2 text-blue-400">IQ Assessment</h2>
                        <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                            20 questions covering Logic, Verbal Reasoning, Spatial Visualization, and Number Sequences.
                        </p>
                        <div className="w-full space-y-2 mb-6 text-xs text-neutral-400 bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-left">
                            <div>⏱️ <strong>Time Limit:</strong> 10 Minutes</div>
                            <div>🎯 <strong>Difficulty:</strong> Adaptive (Easy to Hard)</div>
                            <div>🏆 <strong>Scoring:</strong> Certified Distribution (60-160)</div>
                        </div>
                        <button 
                            onClick={setupGame} 
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-transform active:scale-95 shadow-lg"
                        >
                            START TEST
                        </button>
                    </div>
                )}

                {/* PLAYING SCREEN */}
                {screen === 'playing' && questions.length > 0 && (
                    <div className="w-full flex flex-col animate-fade-in">
                        {/* Progress */}
                        <div className="w-full bg-neutral-800 h-2 rounded-full mb-4 overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                            />
                        </div>

                        {/* Card */}
                        <div className={`bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-7 shadow-2xl transition-all duration-200 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800">
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                </span>
                                <span className="text-xs text-neutral-400 font-bold">
                                    {questions[currentQuestionIndex]?.difficulty}
                                </span>
                            </div>

                            <p className="text-white font-bold text-base sm:text-lg leading-relaxed mb-6">
                                {questions[currentQuestionIndex]?.question}
                            </p>

                            <div className="grid grid-cols-1 gap-2.5 mb-6">
                                {questions[currentQuestionIndex]?.options.map((opt) => {
                                    const optKey = opt.trim().charAt(0);
                                    const isSelected = chosenOption === optKey;
                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => {
                                                audioService.playSound('button_click');
                                                setChosenOption(optKey);
                                            }}
                                            className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all duration-150 text-sm sm:text-base font-bold flex items-center gap-3 ${
                                                isSelected 
                                                    ? 'bg-blue-600/30 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                                                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                                            }`}
                                        >
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                                                {optKey}
                                            </span>
                                            <span>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={skipQuestion} 
                                    className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-400 hover:bg-neutral-700 font-bold text-sm transition-colors"
                                >
                                    Skip
                                </button>
                                <button 
                                    onClick={processAnswer}
                                    disabled={!chosenOption}
                                    className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black shadow-lg text-sm transition-transform active:scale-95"
                                >
                                    {currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next Question'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* END SCREEN */}
                {screen === 'end' && (
                    <div className="bg-neutral-900/90 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl flex flex-col items-center animate-fade-in">
                        <h2 className="text-xl sm:text-2xl font-black mb-6 text-white">Assessment Results</h2>
                        
                        {/* Circular Score Display */}
                        <div className="relative w-[130px] h-[130px] mb-6">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="65" cy="65" r="54" fill="none" stroke="#222" strokeWidth="8" />
                                <circle 
                                    cx="65" cy="65" r="54" fill="none" stroke="#3b82f6" strokeWidth="8"
                                    strokeDasharray="339.29"
                                    strokeDashoffset={ringOffset}
                                    style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl sm:text-4xl font-black text-white">{finalScore}</span>
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">IQ Score</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="text-blue-400 font-black text-lg mb-1">{finalPercent}</p>
                            <p className="text-neutral-400 text-xs font-bold">Solved: {correctCount} / {questions.length} Questions</p>
                        </div>
                        
                        <p className="text-neutral-300 italic text-sm mb-6 px-4 bg-neutral-950 p-3 rounded-xl border border-neutral-800 w-full">
                            "{finalComment}"
                        </p>

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
                                onClick={setupGame} 
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-transform active:scale-95 shadow-lg text-sm"
                            >
                                Retake
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IQGame;
