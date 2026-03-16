import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../services/firebase';
import { aiService } from '../services/aiService';

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
    }, []);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    const handleChoice = (choice: 'higher' | 'lower') => {
        if (gameOver || !item1 || !item2) return;

        setShowValue(true);
        const isCorrect = choice === 'higher' ? item2.value >= item1.value : item2.value <= item1.value;
        setIsCorrectGuess(isCorrect);

        setTimeout(() => {
            if (isCorrect) {
                setScore(prevScore => {
                    const newScore = prevScore + 1;
                    if (newScore >= 7) {
                        setWin(true);
                        setGameOver(true);
                    } else {
                        setItem1(item2);
                        setItem2(itemsQueue[newScore + 1]);
                        setShowValue(false);
                        setIsCorrectGuess(null);
                    }
                    return newScore;
                });
            } else {
                setGameOver(true);
            }
        }, 1500);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#000] text-white font-['Inter'] relative overflow-hidden">
            {/* Random Doodles */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #ff2a2a 2px, transparent 2px), radial-gradient(circle at 70% 80%, #ff2a2a 2px, transparent 2px)', backgroundSize: '120px 120px' }}></div>
            
            <div className="flex justify-between items-center w-full max-w-md p-4 z-10 absolute top-0">
                <button onClick={onBackToHub} className="text-2xl hover:scale-110 transition-transform">⬅️</button>
                <h1 className="text-xl md:text-2xl font-bold font-['Press_Start_2P'] text-[#ff2a2a]">MORE / LESS</h1>
                <div className="text-xl font-bold">Score: {score}/7</div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center z-10">
                    <div className="loading-spinner"></div>
                </div>
            ) : !gameOver && item1 && item2 ? (
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-4xl px-4 z-10 mt-16 overflow-hidden">
                    <div key={item1.name} className="flex flex-col items-center justify-center w-full md:w-1/2 h-64 bg-[#111] border-4 border-[#333] rounded-xl p-4 animate-slide-in-right">
                        <div className="text-6xl mb-4">{item1.image}</div>
                        <h2 className="text-2xl font-bold text-center">{item1.name}</h2>
                        <div className="text-xl text-[#aaa] mt-2">has a value of</div>
                        <div className="text-3xl font-bold text-[#ff2a2a] mt-2">{item1.value.toLocaleString()}</div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-[#333] rounded-full flex items-center justify-center font-bold text-xl">VS</div>
                    </div>

                    <div key={item2.name} className={`flex flex-col items-center justify-center w-full md:w-1/2 h-64 bg-[#111] border-4 rounded-xl p-4 animate-slide-in-right transition-colors duration-500 ${isCorrectGuess === true ? 'border-[#57a863] bg-[#1a3320]' : isCorrectGuess === false ? 'border-[#ff2a2a] bg-[#331111] animate-shake' : 'border-[#333]'}`}>
                        <div className="text-6xl mb-4">{item2.image}</div>
                        <h2 className="text-2xl font-bold text-center">{item2.name}</h2>
                        <div className="text-xl text-[#aaa] mt-2">has a value of</div>
                        
                        {showValue ? (
                            <div className={`text-3xl font-bold mt-2 animate-pop-in ${isCorrectGuess ? 'text-[#57a863]' : 'text-[#ff2a2a]'}`}>
                                {item2.value.toLocaleString()}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 mt-4 w-full">
                                <button 
                                    onClick={() => handleChoice('higher')}
                                    className="w-full py-2 bg-[#57a863] text-white font-bold rounded hover:bg-[#468a4f] transition-colors"
                                >
                                    ⬆️ HIGHER
                                </button>
                                <button 
                                    onClick={() => handleChoice('lower')}
                                    className="w-full py-2 bg-[#ff2a2a] text-white font-bold rounded hover:bg-[#cc0000] transition-colors"
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

                    <button 
                        onClick={startNewGame}
                        className="mt-8 px-6 py-3 bg-[#57a863] text-white font-bold rounded hover:bg-[#468a4f] transition-colors z-10 font-['Press_Start_2P'] text-sm"
                    >
                        PLAY AGAIN
                    </button>
                </div>
            ) : null}
        </div>
    );
};

export default MoreLessGame;
