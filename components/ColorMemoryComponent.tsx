import React, { useEffect, useState } from 'react';
import { incrementGamePlays, saveLeaderboardScore } from '../services/firebase';
import { isMobileDevice } from '../utils/device';
import { GameLeaderboardSidebar, MobileLeaderboardButton } from './GameLeaderboardSidebar';

interface ColorMemoryProps {
    onBackToHub: () => void;
    user?: any;
    username?: string | null;
}

export default function ColorMemoryComponent({ onBackToHub, user, username }: ColorMemoryProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

    useEffect(() => {
        setIsMobile(isMobileDevice());
        const handleResize = () => setIsMobile(isMobileDevice());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        incrementGamePlays('color_memory');
    }, []);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'COLOR_MEMORY_SCORE') {
                const score = Number(event.data.score);
                if (!isNaN(score) && score > 0) {
                    saveLeaderboardScore(
                        user,
                        username || user?.displayName || 'Chroma Master',
                        score,
                        'Chroma Master',
                        { mistakes: 0, timeTaken: 0, ingredientsMissed: 0, rottenWordsTyped: 0, totalScore: score, levelReached: 1 },
                        'color_memory'
                    );
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, username]);

    return (
        <div className="w-full h-full bg-black relative overflow-hidden flex flex-row">
            <div className="flex-1 h-full relative overflow-hidden min-w-0">
                <button 
                    onClick={onBackToHub}
                    className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-[60] w-8 h-8 sm:w-9 sm:h-9 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 hover:border-neutral-500 rounded-lg backdrop-blur-md shadow-lg cursor-pointer flex items-center justify-center text-neutral-200 hover:text-white transition-all active:scale-95"
                    title="Back to Hub"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </button>
                {isMobile && (
                    <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-[60]">
                        <MobileLeaderboardButton onClick={() => setShowMobileLeaderboard(true)} />
                    </div>
                )}
                <iframe 
                    src="/ColorMemory.html" 
                    className="w-full h-full border-none"
                    title="Color Memory"
                    allow="fullscreen"
                />
            </div>

            <GameLeaderboardSidebar
                mode="color_memory"
                title="Color Masters"
                scoreLabel="SCORE"
                storageKey="color_memory_leaderboard_collapsed"
                isMobile={isMobile}
                showMobileLeaderboard={showMobileLeaderboard}
                onCloseMobileLeaderboard={() => setShowMobileLeaderboard(false)}
            />
        </div>
    );
}
