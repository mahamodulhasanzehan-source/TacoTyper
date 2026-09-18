import React, { useState, useEffect, useCallback } from 'react';
import { User, incrementGamePlays } from '../services/firebase';
import { aiService } from '../services/aiService';
import { LoadingScreen } from './LoadingScreen';

interface MoreLessGameProps {
    user: User;
    onBackToHub: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onLogout: () => void;
}

const MoreLessGame: React.FC<MoreLessGameProps> = ({ onBackToHub }) => {
    const [score, setScore] = useState(0);
    const [itemsQueue, setItemsQueue] = useState<{name: string, value: number, image: string}[]>([]);
    const [item1, setItem1] = useState<{name: string, value: number, image: string} | null>(null);
    const [item2, setItem2] = useState<{name: string, value: number, image: string} | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [win, setWin] = useState(false);
    const [showValue, setShowValue] = useState(false);
    const [isCorrectGuess, setIsCorrectGuess] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const startNewGame = useCallback(async () => {
        setIsLoading(true);
        const items = await aiService.generateMoreLessItems(8);
        setItemsQueue(items);
        setItem1(items[0]);
        setItem2(items[1]);
        setScore(0);
        setGameOver(false);
        setWin(false);
        setShowValue(false);
        setIsCorrectGuess(null);
        setIsLoading(false);
        incrementGamePlays('more_less');
    }, []);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    const handleChoice = (choice: 'higher' | 'lower') => {
        if (gameOver || !item1 || !item2 || showValue) return;

        setShowValue(true);
        const isCorrect = choice === 'higher' ? item2.value >= item1.value : item2.value <= item1.value;
        setIsCorrectGuess(isCorrect);

        setTimeout(() => {
            if (isCorrect) {
                const newScore = score + 1;
                setScore(newScore);
                if (newScore >= 7) {
                    setWin(true);
                    setGameOver(true);
                } else {
                    setItem1(item2);
                    setItem2(itemsQueue[newScore + 1]);
                    setShowValue(false);
                    setIsCorrectGuess(null);
                }
            } else {
                setGameOver(true);
            }
        }, 1500);
    };

    return (
        <div className="flex flex-col items-center justify-start sm:justify-center w-full h-full bg-[#000] text-white font-['Inter'] relative overflow-y-auto custom-scrollbar p-3 sm:p-4">
            {/* Random Doodles */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #ff2a2a 2px, transparent 2px), radial-gradient(circle at 70% 80%, #ff2a2a 2px, transparent 2px)', backgroundSize: '120px 120px' }}></div>
            
            <div className="flex justify-between items-center w-full max-w-4xl p-3 sm:p-4 z-10 sticky top-0 bg-black/80 backdrop-blur-sm border-b border-neutral-800/60 mb-2">
                <button onClick={onBackToHub} className="text-xl sm:text-2xl hover:scale-110 transition-transform">⬅️</button>
                <h1 className="text-base sm:text-xl md:text-2xl font-bold font-['Press_Start_2P'] text-[#ff2a2a]">MORE / LESS</h1>
                <div className="text-base sm:text-xl font-bold">Score: {score}/7</div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center z-10 w-full">
                    <LoadingScreen text="Loading items..." color="#ff2a2a" />
                </div>
            ) : !gameOver && item1 && item2 ? (
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-6 md:gap-8 w-full max-w-4xl px-2 z-10 my-auto pb-6">
                    <div key={item1.name} className="flex flex-col items-center justify-center w-full md:w-1/2 min-h-[11rem] sm:min-h-[14rem] md:min-h-[16rem] bg-[#111] border-2 sm:border-4 border-[#333] rounded-xl p-4 sm:p-6 animate-slide-in-right">
                        <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-4">{item1.image}</div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center">{item1.name}</h2>
                        <div className="text-sm sm:text-lg md:text-xl text-[#aaa] mt-1 sm:mt-2">has a value of</div>
                        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#ff2a2a] mt-1 sm:mt-2 text-center break-all">{item1.value.toLocaleString()}</div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-2 shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#333] rounded-full flex items-center justify-center font-bold text-sm sm:text-lg md:text-xl">VS</div>
                    </div>

                    <div key={item2.name} className={`flex flex-col items-center justify-center w-full md:w-1/2 min-h-[11rem] sm:min-h-[14rem] md:min-h-[16rem] bg-[#111] border-2 sm:border-4 rounded-xl p-4 sm:p-6 animate-slide-in-right transition-colors duration-500 ${isCorrectGuess === true ? 'border-[#57a863] bg-[#1a3320]' : isCorrectGuess === false ? 'border-[#ff2a2a] bg-[#331111] animate-shake' : 'border-[#333]'}`}>
                        <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-4">{item2.image}</div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center">{item2.name}</h2>
                        <div className="text-sm sm:text-lg md:text-xl text-[#aaa] mt-1 sm:mt-2">has a value of</div>
                        
                        {showValue ? (
                            <div className={`text-xl sm:text-2xl md:text-3xl font-bold mt-2 text-center break-all animate-pop-in ${isCorrectGuess ? 'text-[#57a863]' : 'text-[#ff2a2a]'}`}>
                                {item2.value.toLocaleString()}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 sm:gap-3 mt-3 sm:mt-4 w-full max-w-[220px]">
                                <button 
                                    onClick={() => handleChoice('higher')}
                                    className="w-full py-2.5 sm:py-3 bg-[#57a863] text-white font-bold rounded-lg hover:bg-[#468a4f] transition-colors shadow-lg active:scale-95 text-sm sm:text-base"
                                >
                                    ⬆️ HIGHER
                                </button>
                                <button 
                                    onClick={() => handleChoice('lower')}
                                    className="w-full py-2.5 sm:py-3 bg-[#ff2a2a] text-white font-bold rounded-lg hover:bg-[#cc0000] transition-colors shadow-lg active:scale-95 text-sm sm:text-base"
                                >
                                    ⬇️ LOWER
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : item1 && item2 ? (
                <div className="flex flex-col items-center justify-center gap-6 z-10 mt-16 animate-pop-in">
                    <h2 className={`text-4xl font-bold font-['Press_Start_2P'] ${win ? 'text-[#57a863]' : 'text-[#ff2a2a]'}`}>
                        {win ? 'YOU WIN!' : 'GAME OVER'}
                    </h2>
                    <div className="text-xl">Final Score: {score}/7</div>
                    
                    <div className="flex flex-col md:flex-row gap-8 mt-8">
                        <div className="flex flex-col items-center">
                            <div className="text-4xl">{item1.image}</div>
                            <div className="font-bold">{item1.name}</div>
                            <div className="text-[#ff2a2a]">{item1.value.toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="text-4xl">{item2.image}</div>
                            <div className="font-bold">{item2.name}</div>
                            <div className="text-[#ff2a2a]">{item2.value.toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button 
                            onClick={onBackToHub}
                            className="px-6 py-3 bg-[#3a3a3c] text-white font-bold rounded hover:bg-[#565758] transition-colors z-10 font-['Press_Start_2P'] text-sm"
                        >
                            HOME
                        </button>
                        <button 
                            onClick={startNewGame}
                            className="px-6 py-3 bg-[#ff2a2a] text-white font-bold rounded hover:bg-[#cc0000] transition-colors z-10 font-['Press_Start_2P'] text-sm"
                        >
                            REPLAY
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default MoreLessGame;
