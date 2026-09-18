
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
    accentGlow: string;
    tag: string;
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
                color: '#ff9900',
                accentGlow: 'rgba(255, 153, 0, 0.5)',
                tag: 'TYPING',
                plays: stats.taco_typer_plays,
                action: onLaunchGame
            },
            {
                id: 'iq',
                title: 'IQ Test',
                description: 'Logic & Patterns Assessment',
                icon: '🧠',
                color: '#00d0ff',
                accentGlow: 'rgba(0, 208, 255, 0.5)',
                tag: 'BRAIN',
                plays: stats.iq_test_plays,
                action: onLaunchIQ
            },
            {
                id: 'mine',
                title: 'Minesweeper',
                description: 'Classic Strategic Survival',
                icon: '💣',
                color: '#00ff66',
                accentGlow: 'rgba(0, 255, 102, 0.5)',
                tag: 'SURVIVAL',
                plays: stats.minesweeper_plays,
                action: onLaunchMinesweeper
            },
            {
                id: 'wordle',
                title: 'Wordle',
                description: 'Guess the Hidden Word',
                icon: '📝',
                color: '#bbf000',
                accentGlow: 'rgba(187, 240, 0, 0.5)',
                tag: 'WORD PUZZLE',
                plays: stats.wordle_plays || 0,
                action: onLaunchWordle
            },
            {
                id: 'angle',
                title: 'Angle',
                description: 'Estimate the Angle',
                icon: '📐',
                color: '#ff1493',
                accentGlow: 'rgba(255, 20, 147, 0.5)',
                tag: 'GEOMETRY',
                plays: stats.angle_plays || 0,
                action: onLaunchAngle
            },
            {
                id: 'spellingbee',
                title: 'Spelling Bee',
                description: 'Listen and Spell',
                icon: '🐝',
                color: '#ffd000',
                accentGlow: 'rgba(255, 208, 0, 0.5)',
                tag: 'VOCABULARY',
                plays: stats.spelling_bee_plays || 0,
                action: onLaunchSpellingBee
            },
            {
                id: 'tictactoe',
                title: 'Tic Tac Toe',
                description: 'Classic 3x3 Strategy',
                icon: '❌',
                color: '#7b61ff',
                accentGlow: 'rgba(123, 97, 255, 0.5)',
                tag: 'CLASSIC',
                plays: stats.tic_tac_toe_plays || 0,
                action: onLaunchTicTacToe
            },
            {
                id: 'connect4',
                title: 'Connect 4',
                description: 'Drop and Connect',
                icon: '🔴',
                color: '#ff2255',
                accentGlow: 'rgba(255, 34, 85, 0.5)',
                tag: 'STRATEGY',
                plays: stats.connect_4_plays || 0,
                action: onLaunchConnect4
            },
            {
                id: 'gungame',
                title: 'Gun Game',
                description: '3D Target Practice',
                icon: '🔫',
                color: '#00f5d4',
                accentGlow: 'rgba(0, 245, 212, 0.5)',
                tag: '3D ACTION',
                plays: stats.gun_game_plays || 0,
                action: onLaunchGunGame
            },
            {
                id: 'colormemory',
                title: 'Color Memory',
                description: 'Match the Target Color',
                icon: '🎨',
                color: '#d946ef',
                accentGlow: 'rgba(217, 70, 239, 0.5)',
                tag: 'MEMORY',
                plays: stats.color_memory_plays || 0,
                action: onLaunchColorMemory
            },
            {
                id: 'particlephysics',
                title: 'Particle Physics',
                description: 'Flow & Collision Sim',
                icon: '⚛️',
                color: '#00f0ff',
                accentGlow: 'rgba(0, 240, 255, 0.5)',
                tag: 'SANDBOX',
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
            
            <div className="flex-1 flex flex-col p-3 sm:p-5 md:p-8 relative z-10 overflow-y-auto custom-scrollbar">
                
                <div className="flex justify-between items-start md:items-center mb-6 sm:mb-8 flex-col md:flex-row gap-4">
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

                {/* Featured / Most Played Game at the Top */}
                {sortedGames.length > 0 && (
                    <div className="mb-4 sm:mb-5">
                        <div className="flex items-center justify-between mb-2">
                            <div 
                                className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold tracking-wider"
                                style={{ color: sortedGames[0].color }}
                            >
                                <span>🔥</span>
                                <span>MOST PLAYED</span>
                            </div>
                            <span 
                                className="text-[10px] font-mono font-bold"
                                style={{ color: sortedGames[0].color }}
                            >
                                {sortedGames[0].plays.toLocaleString()} plays
                            </span>
                        </div>

                        <RandomReveal 
                            key={`featured-${sortedGames[0].id}`} 
                            delay={0.25} 
                            distance={200}
                            className="group relative w-full min-h-[86px] sm:min-h-[105px] text-white rounded-xl sm:rounded-2xl border-2 flex items-center p-2.5 sm:p-4.5 cursor-pointer transition-all duration-300 hover-scale shadow-2xl overflow-hidden backdrop-blur-md"
                            style={{ 
                                borderColor: sortedGames[0].color,
                                background: `linear-gradient(135deg, ${sortedGames[0].color}25 0%, rgba(16, 16, 22, 0.88) 45%, rgba(0, 0, 0, 0.96) 100%)`,
                                boxShadow: `0 6px 30px ${sortedGames[0].accentGlow}, inset 0 0 20px ${sortedGames[0].color}20`,
                                '--accent-color': sortedGames[0].color,
                                '--accent-glow': sortedGames[0].accentGlow
                            } as React.CSSProperties}
                            onClick={sortedGames[0].action}
                        >
                            {/* Radial Glow Highlight */}
                            <div 
                                className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-90 transition-opacity duration-500"
                                style={{ background: `radial-gradient(circle at 85% 50%, ${sortedGames[0].accentGlow} 0%, transparent 60%)` }}
                            />

                            {/* Watermark Icon */}
                            <div className="absolute -right-2 -bottom-2 text-7xl sm:text-8xl opacity-10 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500 pointer-events-none select-none">
                                {sortedGames[0].icon}
                            </div>

                            {/* Crown / Top Badge */}
                            <div 
                                className="absolute top-2 right-2.5 flex items-center gap-1 px-2 py-0.5 text-black text-[7px] sm:text-[8px] font-black rounded-full border border-black shadow-sm z-10"
                                style={{ backgroundColor: sortedGames[0].color }}
                            >
                                <span>👑</span>
                                <span>#1 POPULAR</span>
                            </div>

                            {/* Icon Frame */}
                            <div 
                                className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl border flex items-center justify-center text-2xl sm:text-4xl md:text-[40px] leading-none mr-2.5 sm:mr-4 group-hover:scale-105 transition-all duration-300 shrink-0 shadow-inner z-10"
                                style={{ 
                                    backgroundColor: `${sortedGames[0].color}28`,
                                    borderColor: sortedGames[0].color,
                                    boxShadow: `0 0 14px ${sortedGames[0].accentGlow}`
                                }}
                            >
                                {sortedGames[0].icon}
                            </div>
                            
                            {/* Middle Info */}
                            <div className="flex-1 flex flex-col justify-center min-w-0 z-10 pr-2">
                                <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                                    <span 
                                        className="text-[7px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded border backdrop-blur-sm"
                                        style={{ 
                                            borderColor: sortedGames[0].color,
                                            backgroundColor: `${sortedGames[0].color}25`,
                                            color: sortedGames[0].color 
                                        }}
                                    >
                                        {sortedGames[0].tag}
                                    </span>
                                    <div 
                                        className="text-[7px] sm:text-[9px] font-bold flex items-center gap-1 font-mono"
                                        style={{ color: sortedGames[0].color }}
                                    >
                                        <span 
                                            className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                                            style={{ backgroundColor: sortedGames[0].color }}
                                        />
                                        <span>{sortedGames[0].plays.toLocaleString()}</span>
                                    </div>
                                </div>
                                <h2 
                                    className="text-xs sm:text-base md:text-lg text-white group-hover:text-[var(--accent-color)] transition-colors duration-300 leading-snug truncate font-black"
                                >
                                    {sortedGames[0].title}
                                </h2>
                                <div className="text-[8px] sm:text-[10px] md:text-xs text-neutral-300 leading-tight font-sans font-medium line-clamp-1 mt-0.5">
                                    {sortedGames[0].description}
                                </div>
                            </div>
                            
                            {/* Play Action */}
                            <div className="flex items-center shrink-0 z-10 pl-1">
                                <span 
                                    className="text-black font-black px-3 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-xs rounded-lg sm:rounded-xl border shadow-md transition-all group-hover:scale-105 flex items-center gap-1"
                                    style={{ 
                                        backgroundColor: sortedGames[0].color,
                                        borderColor: sortedGames[0].color,
                                        boxShadow: `0 0 12px ${sortedGames[0].accentGlow}`
                                    }}
                                >
                                    <span>PLAY</span>
                                    <span className="text-[8px] group-hover:translate-x-0.5 transition-transform">▶</span>
                                </span>
                            </div>
                        </RandomReveal>
                    </div>
                )}

                {/* 2-Column Game Grid for Remaining Games (2 Columns even on mobile phones) */}
                {sortedGames.length > 1 && (
                    <div className="flex flex-col gap-2.5 sm:gap-3 pb-10">
                        <div className="flex items-center gap-2 text-[#aaa] text-[10px] md:text-xs mb-1">
                            <span>🎮</span>
                            <span>ALL GAMES</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
                            {sortedGames.slice(1).map((game, index) => (
                                <RandomReveal 
                                    key={game.id} 
                                    delay={0.3 + (index * 0.05)} 
                                    distance={200}
                                    className="group relative w-full min-h-[76px] sm:min-h-[92px] text-white rounded-xl sm:rounded-2xl border-2 flex items-center p-2 sm:p-3.5 cursor-pointer transition-all duration-300 hover-scale shadow-lg overflow-hidden backdrop-blur-md"
                                    style={{ 
                                        borderColor: `${game.color}99`,
                                        background: `linear-gradient(135deg, ${game.color}20 0%, rgba(12, 12, 16, 0.85) 45%, rgba(4, 4, 6, 0.96) 100%)`,
                                        boxShadow: `0 4px 20px ${game.accentGlow}, inset 0 0 15px ${game.color}15`,
                                        '--accent-color': game.color,
                                        '--accent-glow': game.accentGlow 
                                    } as React.CSSProperties}
                                    onClick={game.action}
                                >
                                    {/* Radial Glow on Hover */}
                                    <div 
                                        className="absolute inset-0 pointer-events-none opacity-30 group-hover:opacity-90 transition-opacity duration-500"
                                        style={{ background: `radial-gradient(circle at 90% 50%, ${game.accentGlow} 0%, transparent 65%)` }}
                                    />

                                    {/* Subtle Watermark Icon */}
                                    <div className="absolute -right-2 -bottom-2 text-5xl sm:text-7xl opacity-10 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500 pointer-events-none select-none">
                                        {game.icon}
                                    </div>

                                    {/* Left: Icon Frame */}
                                    <div 
                                        className="w-8 h-8 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-lg sm:rounded-xl flex items-center justify-center border text-[20px] sm:text-[28px] md:text-[32px] leading-none mr-2 sm:mr-3 group-hover:scale-105 transition-transform duration-300 shadow-inner shrink-0 z-10"
                                        style={{ 
                                            backgroundColor: `${game.color}28`,
                                            borderColor: `${game.color}bb`,
                                            boxShadow: `0 0 10px ${game.accentGlow}`
                                        }}
                                    >
                                        {game.icon}
                                    </div>

                                    {/* Middle: Tag, Title, Description, Player Count */}
                                    <div className="flex-1 flex flex-col justify-center min-w-0 z-10 pr-1 sm:pr-2">
                                        <div className="flex items-center gap-1 sm:gap-2 mb-0.5">
                                            <span 
                                                className="text-[6.5px] sm:text-[8px] font-black tracking-wider uppercase px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded border backdrop-blur-sm truncate"
                                                style={{ 
                                                    borderColor: game.color,
                                                    backgroundColor: `${game.color}30`,
                                                    color: game.color 
                                                }}
                                            >
                                                {game.tag}
                                            </span>

                                            <div 
                                                className="text-[6.5px] sm:text-[8px] font-bold flex items-center gap-0.5 sm:gap-1 font-mono shrink-0"
                                                style={{ color: game.color }}
                                            >
                                                <span 
                                                    className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse"
                                                    style={{ backgroundColor: game.color }}
                                                />
                                                <span>{game.plays.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <h2 
                                            className="text-[9px] sm:text-sm md:text-base text-white group-hover:text-[var(--accent-color)] transition-colors duration-300 truncate leading-tight font-black"
                                        >
                                            {game.title}
                                        </h2>

                                        <div className="text-[7.5px] sm:text-[9px] md:text-[10px] text-neutral-300 line-clamp-1 leading-tight font-sans font-medium mt-0.5 hidden xs:block">
                                            {game.description}
                                        </div>
                                    </div>

                                    {/* Right: PLAY Action Button */}
                                    <div className="flex items-center shrink-0 z-10 pl-0.5 sm:pl-1">
                                        <span 
                                            className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[7px] sm:text-[9px] font-black rounded-md sm:rounded-lg border shadow-sm transition-all group-hover:scale-105 flex items-center gap-1"
                                            style={{ 
                                                backgroundColor: `${game.color}35`,
                                                borderColor: game.color,
                                                color: '#fff',
                                                boxShadow: `0 0 8px ${game.accentGlow}`
                                            }}
                                        >
                                            <span className="hidden sm:inline">PLAY</span>
                                            <span className="text-[7px] sm:text-[8px] group-hover:translate-x-0.5 transition-transform">▶</span>
                                        </span>
                                    </div>
                                </RandomReveal>
                            ))}
                        </div>
                    </div>
                )}
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
