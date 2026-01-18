
import React, { useState } from 'react';
import ChatWidget from './ChatWidget';
import { User } from '../services/firebase';
import { RandomReveal, RandomText } from './Visuals';
import { SettingsModal as SharedSettingsModal } from './Overlays'; 

interface HubScreenProps {
    user: User;
    onLaunchGame: () => void;
    onLogout: () => void;
    username?: string | null;
    onUpdateUsername: (name: string) => void;
}

const HubScreen: React.FC<HubScreenProps> = ({ user, onLaunchGame, onLogout, username, onUpdateUsername }) => {
    const [showSettings, setShowSettings] = useState(false);
    
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
                    
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="text-2xl hover:rotate-90 transition-transform duration-300"
                        title="Settings"
                    >
                        ⚙️
                    </button>
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

                    {/* Placeholder for future apps to mimic Neal.fun grid */}
                    <RandomReveal delay={0.2} className="bg-[#050505] border-4 border-[#333] aspect-square flex flex-col items-center justify-center opacity-50 cursor-not-allowed">
                        <div className="text-4xl mb-4 grayscale">🍔</div>
                        <h2 className="text-sm text-[#555]">Burger Builder</h2>
                        <div className="text-[8px] text-[#333] mt-2">Coming Soon</div>
                    </RandomReveal>

                     <RandomReveal delay={0.3} className="bg-[#050505] border-4 border-[#333] aspect-square flex flex-col items-center justify-center opacity-50 cursor-not-allowed">
                        <div className="text-4xl mb-4 grayscale">🥗</div>
                        <h2 className="text-sm text-[#555]">Salad Slicer</h2>
                        <div className="text-[8px] text-[#333] mt-2">Coming Soon</div>
                    </RandomReveal>

                </div>
            </div>

            {/* Sidebar Chat - Full Height */}
            <div className="w-[300px] border-l-4 border-white h-full relative z-20 hidden md:block">
                <ChatWidget user={user} className="h-full border-none" />
            </div>

            {/* Mobile Chat Toggle handled within ChatWidget internally if responsive, but for now enforcing desktop sidebar */}
            
            {showSettings && (
                <SharedSettingsModal 
                    onClose={() => setShowSettings(false)} 
                    username={displayableName} 
                    onUpdateUsername={onUpdateUsername}
                    onLogout={onLogout} // Passing logout here
                />
            )}
        </div>
    );
};

export default HubScreen;
