
import React, { useState, useEffect } from 'react';
import ChatWidget from './ChatWidget';
import { User } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { SettingsModal as SharedSettingsModal, FriendsModal } from './Overlays'; 
import { isMobileDevice } from '../utils/device';

interface HubScreenProps {
    user: User;
    onLaunchGame: () => void;
    onLaunchIQ: () => void;
    onLogout: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
}

const HubScreen: React.FC<HubScreenProps> = ({ user, onLaunchGame, onLaunchIQ, onLogout, username, onUpdateUsername }) => {
    const [showSettings, setShowSettings] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // Fallback name
    const displayableName = username || user.displayName || 'Chef';

    useEffect(() => {
        setIsMobile(isMobileDevice());
    }, []);

    return (
        <div className="flex h-full w-full bg-[#000] text-white overflow-hidden relative font-['Press_Start_2P']">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-4 md:p-8 relative z-10 overflow-y-auto custom-scrollbar">
                
                {/* Header */}
                <div className="flex justify-between items-start md:items-center mb-8 flex-col md:flex-row gap-4">
                    <RandomReveal distance={20} className="flex flex-col gap-1">
                        <h1 className="text-xl md:text-3xl text-[#f4b400]">
                            <RandomText text="Taco Hub" />
                        </h1>
                        <span className="text-[10px] md:text-xs text-[#aaa]">Welcome back, {displayableName}</span>
                    </RandomReveal>
                    
                    <div className="flex gap-4 self-end md:self-auto">
                        {/* Mobile: Hide Friends Button */}
                        {!isMobile && (
                            <RandomReveal delay={0.1} distance={20}>
                                <button 
                                    onClick={() => setShowFriends(true)}
                                    className="text-2xl hover:scale-110 transition-transform duration-300 ease-[var(--ease-spring)]"
                                    title="Social Kitchen"
                                >
                                    👥
                                </button>
                            </RandomReveal>
                        )}
                        <RandomReveal delay={0.2} distance={20}>
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

                {/* Grid of Apps */}
                <div className={`grid gap-6 auto-rows-min ${isMobile ? 'grid-cols-1 pb-10' : 'grid-cols-1 md:grid-cols-2 pr-2'}`}>
                    
                    {/* Taco Typer Card */}
                    <RandomReveal delay={0.3} distance={40} className="group relative bg-[#111] border-4 border-white aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-[#f4b400] transition-colors duration-300 min-h-[200px] hover-scale" onClick={onLaunchGame}>
                        <div className="text-5xl md:text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 ease-[var(--ease-spring)]">🌮</div>
                        <h2 className="text-base md:text-xl text-center group-hover:text-[#f4b400] transition-colors duration-300">Taco Typer</h2>
                        <div className="text-[10px] text-[#555] mt-2">The Original</div>
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-sm">
                            <span className="bg-[#f4b400] text-black px-4 py-2 text-xs border-2 border-white transform scale-90 group-hover:scale-100 transition-transform duration-300 ease-[var(--ease-spring)]">PLAY</span>
                        </div>
                    </RandomReveal>

                    {/* IQ Test Card */}
                    <RandomReveal delay={0.4} distance={40} className="group relative bg-[#111] border-4 border-white aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-[#4facfe] transition-colors duration-300 min-h-[200px] hover-scale" onClick={onLaunchIQ}>
                        <div className="text-5xl md:text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 ease-[var(--ease-spring)]">🧠</div>
                        <h2 className="text-base md:text-xl text-center group-hover:text-[#4facfe] transition-colors duration-300">IQ Test</h2>
                        <div className="text-[10px] text-[#555] mt-2">Logic & Patterns</div>
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-sm">
                            <span className="bg-[#4facfe] text-black px-4 py-2 text-xs border-2 border-white transform scale-90 group-hover:scale-100 transition-transform duration-300 ease-[var(--ease-spring)]">START</span>
                        </div>
                    </RandomReveal>

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
