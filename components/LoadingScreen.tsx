import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
    text?: string;
    color?: string;
    compact?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ text = "Loading...", color = "#f4b400", compact = false }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Simulate a progress bar that goes up to 90% and waits
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                // Random increment between 5 and 15
                return prev + Math.floor(Math.random() * 10) + 5;
            });
        }, 300);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex flex-col items-center justify-center w-full h-full z-50 p-4 ${compact ? 'scale-75' : ''}`}>
            <div className={`${compact ? 'text-sm md:text-base' : 'text-xl md:text-2xl'} font-bold mb-6 animate-pulse font-['Press_Start_2P']`} style={{ color }}>
                {text}
            </div>
            <div className={`w-full ${compact ? 'max-w-[200px] h-4' : 'max-w-md h-6'} bg-[#222] rounded-full overflow-hidden border-2 border-[#444]`}>
                <div 
                    className="h-full transition-all duration-300 ease-out"
                    style={{ 
                        width: `${progress}%`, 
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`
                    }}
                ></div>
            </div>
            <div className={`mt-2 ${compact ? 'text-xs' : 'text-sm'} text-[#aaa] font-mono`}>{progress}%</div>
        </div>
    );
};
