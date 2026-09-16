
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
    onLaunchWordle: () => void;
    onLaunchAngle: () => void;
    onLaunchSpellingBee: () => void;
    onLaunchTicTacToe: () => void;
    onLaunchConnect4: () => void;
    onLaunchGunGame: () => void;
    onLaunchColorMemory: () => void;
    onLaunchParticlePhysics: () => void;
    onLogout: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
    onGoogleSignIn?: () => Promise<void>;
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

const HubScreen: React.FC<HubScreenProps> = ({ 
    user, 
    onLaunchGame, 
    onLaunchIQ, 
    onLaunchMinesweeper, 
    onLaunchWordle, 
    onLaunchAngle, 
    onLaunchSpellingBee, 
    onLaunchTicTacToe, 
    onLaunchConnect4, 
    onLaunchGunGame, 
    onLaunchColorMemory, 
    onLaunchParticlePhysics, 
    onLogout, 
    username, 
    onUpdateUsername,
    onGoogleSignIn 
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [stats, setStats] = useState<GlobalGameStats>({ taco_typer_plays: 0, iq_test_plays: 0, minesweeper_plays: 0, wordle_plays: 0, angle_plays: 0, spelling_bee_plays: 0, tic_tac_toe_plays: 0, connect_4_plays: 0, gun_game_plays: 0, color_memory_plays: 0, particle_physics_plays: 0 });
    const [sortedGames, setSortedGames] = useState<GameCard[]>([]);
    
    const displayableName = username || user.displayName || 'Chef';

    useEffect(() => {
        setIsMobile(isMobileDevice());
        
        const loadStats = async () => {
            const s = await getGlobalGameStats();
            setStats(s);
        };
        loadStats();
    }, []);

    useEffect(() => {
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
            },
            {
                id: 'wordle',
                title: 'Wordle',
                description: 'Guess the Hidden Word',
                icon: '📝',
                color: '#57a863',
                plays: stats.wordle_plays || 0,
                action: onLaunchWordle
            },
            {
                id: 'angle',
                title: 'Angle',
                description: 'Estimate the Angle',
                icon: '📐',
                color: '#d900ff',
                plays: stats.angle_plays || 0,
                action: onLaunchAngle
            },
            {
                id: 'spellingbee',
                title: 'Spelling Bee',
                description: 'Listen and Spell',
                icon: '🐝',
                color: '#f4b400',
                plays: stats.spelling_bee_plays || 0,
                action: onLaunchSpellingBee
            },
            {
                id: 'tictactoe',
                title: 'Tic Tac Toe',
                description: 'Classic 3x3 Strategy',
                icon: '❌',
                color: '#4facfe',
                plays: stats.tic_tac_toe_plays || 0,
                action: onLaunchTicTacToe
            },
            {
                id: 'connect4',
                title: 'Connect 4',
                description: 'Drop and Connect',
                icon: '🔴',
                color: '#ff2a2a',
                plays: stats.connect_4_plays || 0,
                action: onLaunchConnect4
            },
            {
                id: 'gungame',
                title: 'Gun Game',
                description: '3D Target Practice',
                icon: '🔫',
                color: '#57a863',
                plays: stats.gun_game_plays || 0,
                action: onLaunchGunGame
            },
            {
                id: 'colormemory',
                title: 'Color Memory',
                description: 'Match the Target Color',
                icon: '🎨',
                color: '#d900ff',
                plays: stats.color_memory_plays || 0,
                action: onLaunchColorMemory
            },
            {
                id: 'particlephysics',
                title: 'Particle Physics',
                description: 'Satisfying Flow & Collision Sim',
                icon: '⚛️',
                color: '#00f2fe',
                plays: stats.particle_physics_plays || 0,
                action: onLaunchParticlePhysics
            }
        ];

        games.sort((a, b) => b.plays - a.plays);
        setSortedGames(games);

    }, [stats, onLaunchGame, onLaunchIQ, onLaunchMinesweeper, onLaunchWordle, onLaunchAngle, onLaunchSpellingBee, onLaunchTicTacToe, onLaunchConnect4, onLaunchGunGame, onLaunchColorMemory, onLaunchParticlePhysics, isMobile]);

    return (
        <div className="flex h-full w-full bg-[#000] text-white overflow-hidden relative font-['Press_Start_2P']">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 40% 60%, #fff 2px, transparent 2px), radial-gradient(circle at 60% 40%, #fff 2px, transparent 2px)', backgroundSize: '150px 150px' }}></div>
            
            <div className="flex-1 flex flex-col p-4 md:p-8 relative z-10 overflow-y-auto custom-scrollbar">
                
                <div className="flex justify-between items-start md:items-center mb-8 flex-col md:flex-row gap-4">
                    <RandomReveal distance={200} className="flex flex-col gap-1">
                        <h1 className="text-xl md:text-3xl text-[#f4b400]">
                            <RandomText text="Taco Hub" />
                        </h1>
                        <span className="text-[10px] md:text-xs text-[#aaa]">Welcome back, {displayableName}</span>
                    </RandomReveal>
                    
                    <div className="flex items-center gap-3 self-end md:self-auto">
                        {onGoogleSignIn && (user.isAnonymous || user.uid.startsWith('guest_')) && (
                            <RandomReveal delay={0.05} distance={200}>
                                <button
                                    onClick={async () => {
                                        try {
                                            await onGoogleSignIn();
                                        } catch (err) {
                                            console.warn("Sign in error:", err);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border-2 border-amber-400/70 hover:border-amber-400 rounded text-[10px] text-amber-300 font-bold transition-all hover:scale-105 shadow-sm cursor-pointer"
                                    title="Sign in with Google to save your high scores"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                                        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"/>
                                        <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                                    </svg>
                                    <span>Sign In</span>
                                </button>
                            </RandomReveal>
                        )}
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
                                className="group relative flex items-center justify-center p-0.5 rounded-full hover:scale-110 transition-transform duration-300 ease-[var(--ease-smooth)]"
                                title="Settings & Profile"
                            >
                                {user.photoURL ? (
                                    <img 
                                        src={user.photoURL} 
                                        alt={user.displayName || "Profile"} 
                                        className="w-8 h-8 rounded-full border-2 border-[#f4b400] object-cover shadow-sm group-hover:border-white transition-colors"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <span className="text-2xl hover:rotate-90 transition-transform duration-500 ease-[var(--ease-smooth)] inline-block">
                                        ⚙️
                                    </span>
                                )}
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
