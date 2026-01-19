
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
    onLaunchWhatToDo: () => void;
    onLogout: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
}

const HubScreen: React.FC<HubScreenProps> = ({ user, onLaunchGame, onLaunchIQ, onLaunchWhatToDo, onLogout, username, onUpdateUsername }) => {
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
            <div className="flex-1 flex flex-col p-4 md:p-8 relative z-10 overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-start md:items-center mb-8 flex-col md:flex-row gap-4">
                    <RandomReveal distance={200} className="flex flex-col gap-1">
                        <h1 className="text-xl md:text-3xl text-[#f4b400]">
                            <RandomText text="Taco Hub" />
                        </h1>
                        <span className="text-[10px] md:text-xs text-[#aaa]">Welcome back, {displayableName}</span>
                    </RandomReveal>
                    
                    <div className="flex gap-4 self-end md:self-auto">
                        {/* Mobile: Hide Friends Button */}
                        {!isMobile && (
                            <button 
                                onClick={() => setShowFriends(true)}
                                className="text-2xl hover:scale-110 transition-transform duration-300"
                                title="Social Kitchen"
                            >
                                👥
                            </button>
                        )}
                        <button 
                            onClick={() => setShowSettings(true)}
                            className="text-2xl hover:rotate-90 transition-transform duration-300"
                            title="Settings"
                        >
                            ⚙️
                        </button>
                    </div>
                </div>

                {/* Grid of Apps */}
                <div className={`grid gap-6 auto-rows-min ${isMobile ? 'grid-cols-1 pb-10' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pr-2 custom-scrollbar'}`}>
                    
                    {/* Taco Typer Card */}
                    <RandomReveal delay={0.1} className="group relative bg-[#111] border-4 border-white aspect-square md:aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-[#f4b400] transition-colors min-h-[200px]" onClick={onLaunchGame}>
                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🌮</div>
                        <h2 className="text-lg md:text-xl text-center group-hover:text-[#f4b400]">Taco Typer</h2>
                        <div className="text-[10px] text-[#555] mt-2">The Original</div>
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="bg-[#f4b400] text-black px-4 py-2 text-xs border-2 border-white">PLAY</span>
                        </div>
                    </RandomReveal>

                    {/* IQ Test Card */}
                    <RandomReveal delay={0.2} className="group relative bg-[#111] border-4 border-white aspect-square md:aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-[#4facfe] transition-colors min-h-[200px]" onClick={onLaunchIQ}>
                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🧠</div>
                        <h2 className="text-lg md:text-xl text-center group-hover:text-[#4facfe]">IQ Test</h2>
                        <div className="text-[10px] text-[#555] mt-2">Logic & Patterns</div>
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="bg-[#4facfe] text-black px-4 py-2 text-xs border-2 border-white">START</span>
                        </div>
                    </RandomReveal>

                    {/* What to do Card (New 3D Game) */}
                    <RandomReveal delay={0.3} className="group relative bg-[#111] border-4 border-white aspect-square md:aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-[#4caf50] transition-colors min-h-[200px]" onClick={onLaunchWhatToDo}>
                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🧊</div>
                        <h2 className="text-lg md:text-xl text-center group-hover:text-[#4caf50]">What to do</h2>
                        <div className="text-[10px] text-[#555] mt-2">3D Voxel World</div>
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="bg-[#4caf50] text-black px-4 py-2 text-xs border-2 border-white">EXPLORE</span>
                        </div>
                    </RandomReveal>

                </div>
            </div>

            {/* Sidebar Chat - Desktop Only */}
            {!isMobile && (
                <div className="w-[300px] border-l-4 border-white h-full relative z-20 hidden md:block">
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
