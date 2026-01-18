
import React, { useState } from 'react';
import ChatWidget from './ChatWidget';
import { User } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { SettingsModal as SharedSettingsModal, FriendsModal } from './Overlays'; 

interface HubScreenProps {
    user: User;
    onLaunchGame: () => void;
    onLogout: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
}

const HubScreen: React.FC<HubScreenProps> = ({ user, onLaunchGame, onLogout, username, onUpdateUsername }) => {
    const [showSettings, setShowSettings] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    
    // Fallback name
    const displayableName = username || user.displayName || 'Chef';

    return (
        <div className="flex h-full w-full bg-[#000] text-white overflow-hidden relative font-['Press_Start_2P']">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-4 md:p-8 relative z-10">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <RandomReveal distance={200} className="flex flex-col gap-1">
                        <h1 className="text-xl md:text-3xl text-[#f4b400]">
                            <RandomText text="Taco Hub" />
                        </h1>
                        <span className="text-[10px] md:text-xs text-[#aaa]">Welcome back, {displayableName}</span>
                    </RandomReveal>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowFriends(true)}
                            className="text-2xl hover:scale-110 transition-transform duration-300"
                            title="Social Kitchen"
                        >
                            👥
                        </button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min overflow-y-auto pr-2 custom-scrollbar">
                    
                    {/* Taco Typer Card */}
                    <RandomReveal delay={0.1} className="group relative bg-[#111] border-4 border-white aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-[#f4b400] transition-colors" onClick={onLaunchGame}>
                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🌮</div>
                        <h2 className="text-lg md:text-xl text-center group-hover:text-[#f4b400]">Taco Typer</h2>
                        <div className="text-[10px] text-[#555] mt-2">The Original</div>
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="bg-[#f4b400] text-black px-4 py-2 text-xs border-2 border-white">PLAY</span>
                        </div>
                    </RandomReveal>

                </div>
            </div>

            {/* Sidebar Chat - Full Height */}
            <div className="w-[300px] border-l-4 border-white h-full relative z-20 hidden md:block">
                <ChatWidget user={user} className="h-full border-none" />
            </div>

            {/* Modals */}
            {showSettings && (
                <SharedSettingsModal 
                    onClose={() => setShowSettings(false)} 
                    username={displayableName} 
                    onUpdateUsername={onUpdateUsername}
                    onLogout={onLogout} 
                />
            )}

            {showFriends && (
                <FriendsModal 
                    onClose={() => setShowFriends(false)} 
                    currentUser={user} 
                />
            )}
        </div>
    );
};

export default HubScreen;
