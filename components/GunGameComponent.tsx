import React, { useEffect } from 'react';
import { incrementGamePlays } from '../services/firebase';

interface GunGameProps {
    onBackToHub: () => void;
}

export default function GunGameComponent({ onBackToHub }: GunGameProps) {
    useEffect(() => {
        incrementGamePlays('gun_game');
        
        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'escape_pressed') {
                onBackToHub();
            }
        };
        
        window.addEventListener('message', handleMessage);
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onBackToHub();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onBackToHub]);

    return (
        <div className="fixed inset-0 w-full h-full bg-black z-50">
            <button 
                onClick={onBackToHub}
                className="absolute top-4 left-4 z-[60] text-2xl hover:scale-110 transition-transform bg-white/10 p-2 rounded-full backdrop-blur-sm"
                title="Back to Hub"
            >
                🏠
            </button>
            <iframe 
                src="/GunGame.html" 
                className="w-full h-full border-none"
                title="Gun Game"
            />
        </div>
    );
}
