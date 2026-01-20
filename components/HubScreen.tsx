
import React, { useState, useEffect } from 'react';
import ChatWidget from './ChatWidget';
import { User, getGlobalGameStats } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { SettingsModal as SharedSettingsModal, FriendsModal } from './Overlays'; 
import { isMobileDevice } from '../utils/device';
import { GlobalGameStats } from '../types';

interface HubScreenProps {
    user: User;
    onLaunchGame: () => void;
    onLaunchIQ: () => void;
    onLaunchMinesweeper: () => void;
    onLogout: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
}

interface GameCard {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    plays: number;
    action: () => void;
}

const HubScreen: React.FC<HubScreenProps> = ({ user, onLaunchGame, onLaunchIQ, onLaunchMinesweeper, onLogout, username, onUpdateUsername }) => {
    const [showSettings, setShowSettings] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [stats, setStats] = useState<GlobalGameStats>({ taco_typer_plays: 0, iq_test_plays: 0, minesweeper_plays: 0 });
    const [sortedGames, setSortedGames] = useState<GameCard[]>([]);
    
    // Fallback name
    const displayableName = username || user.displayName || 'Chef';

    useEffect(() => {
        setIsMobile(isMobileDevice());
        
        // Fetch stats on mount to determine order
        const loadStats = async () => {
            const s = await getGlobalGameStats();
            setStats(s);
        };
        loadStats();
    }, []);

    useEffect(() => {
        // Define base games
        const games: GameCard[] = [
            {
                id: 'taco',
                title: 'Taco Typer',
                description: 'The Original Typing Challenge',
                icon: '🌮',
                color: '#f4b400',
                plays: stats.taco_typer_plays,
                action: onLaunchGame
            },
            {
                id: 'iq',
                title: 'IQ Test',
                description: 'Logic & Patterns Assessment',
                icon: '🧠',
                color: '#4facfe',
                plays: stats.iq_test_plays,
                action: onLaunchIQ
            },
            {
                id: 'mine',
                title: 'Minesweeper',
                description: 'Classic Strategic Survival',
                icon: '💣',
                color: '#57a863',
                plays: stats.minesweeper_plays,
                action: onLaunchMinesweeper
            }
        ];

        // Sort by plays descending
        games.sort((a, b) => b.plays - a.plays);
        setSortedGames(games);

    }, [stats, onLaunchGame, onLaunchIQ, onLaunchMinesweeper]);

    return (
        <div className="flex h-full w-full bg-[#000] text-white overflow-hidden relative font-['Press_Start_2P']">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-4 md:p-8 relative z-10 overflow-y-auto custom-scrollbar">
                
                {/* Header */}
                <div className="flex justify-between items-start md:items-center mb-8 flex-col md:flex-row gap-4">
                    <RandomReveal distance={200} className="flex flex-col gap-1">
                        <h1 className="text-xl md:text-3xl text-[#f4b400]">
                            <RandomText text="Taco Hub" />
                        </h1>
                        <span className="text-[10px] md:text-xs text-[#aaa]">Welcome back, {displayableName}</span>
                    </RandomReveal>
                    
                    <div className="flex gap-4 self-end md:self-auto">
                        {!isMobile && (
                            <RandomReveal delay={0.1} distance={200}>
                                <button 
                                    onClick={() => setShowFriends(true)}
                                    className="text-2xl hover:scale-110 transition-transform duration-300 ease-[var(--ease-spring)]"
                                    title="Social Kitchen"
                                >
                                    👥
                                </button>
                            </RandomReveal>
                        )}
                        <RandomReveal delay={0.2} distance={200}>
                            <button 
                                onClick={() => setShowSettings(true)}
                                className="text-2xl hover:rotate-90 transition-transform duration-500 ease-[var(--ease-smooth)]"
                                title="Settings"
                            >
                                ⚙️
                            </button>
                        </RandomReveal>
                    </div>
                </div>

                {/* Vertical Game List */}
                <div className="flex flex-col gap-6 pb-10 pr-2">
                    {sortedGames.map((game, index) => (
                        <RandomReveal 
                            key={game.id} 
                            delay={0.3 + (index * 0.1)} 
                            distance={300}
                            className="group relative w-full bg-[#111] border-4 border-white flex items-center p-6 cursor-pointer hover:border-[var(--hover-color)] transition-colors duration-300 min-h-[140px] hover-scale"
                            style={{ '--hover-color': game.color } as React.CSSProperties}
                            onClick={game.action}
                        >
                            <div className="text-4xl md:text-6xl mr-6 group-hover:scale-110 transition-transform duration-300 ease-[var(--ease-spring)]">
                                {game.icon}
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-center">
                                <h2 className="text-sm md:text-xl text-[var(--hover-color)] mb-2 transition-colors duration-300">
                                    {game.title}
                                </h2>
                                <div className="text-[10px] md:text-xs text-[#888]">
                                    {game.description}
                                </div>
                                <div className="text-[8px] text-[#555] mt-2">
                                    {game.plays.toLocaleString()} Players
                                </div>
                            </div>
                            
                            {/* Play Indicator - Moves in from right on hover */}
                            <div className="opacity-0 group-hover:opacity-100 transform translate-x-10 group-hover:translate-x-0 transition-all duration-300 flex items-center">
                                <span 
                                    className="text-black px-4 py-2 text-xs border-2 border-white"
                                    style={{ backgroundColor: game.color }}
                                >
                                    PLAY
                                </span>
                            </div>
                        </RandomReveal>
                    ))}
                </div>
            </div>

            {/* Sidebar Chat - Desktop Only */}
            {!isMobile && (
                <div className="w-[300px] border-l-4 border-white h-full relative z-20 hidden md:block animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <ChatWidget user={user} className="h-full border-none" />
                </div>
            )}

            {/* Modals */}
            {showSettings && (
                <SharedSettingsModal 
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
        </div>
    );
};

export default HubScreen;
