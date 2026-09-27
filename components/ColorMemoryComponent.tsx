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
                    className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-[60] text-lg sm:text-2xl hover:scale-110 active:scale-95 transition-transform bg-neutral-900/90 hover:bg-neutral-800 p-1.5 sm:p-2.5 rounded-full border border-neutral-700 backdrop-blur-md shadow-lg cursor-pointer flex items-center justify-center"
                    title="Back to Hub"
                >
                    🏠
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
