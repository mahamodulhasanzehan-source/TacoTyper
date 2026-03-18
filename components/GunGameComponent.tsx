import React, { useEffect, useState } from 'react';
import { incrementGamePlays } from '../services/firebase';

interface GunGameProps {
    onBackToHub: () => void;
}

export default function GunGameComponent({ onBackToHub }: GunGameProps) {
    const [showHomeButton, setShowHomeButton] = useState(true);

    useEffect(() => {
        incrementGamePlays('gun_game');
        
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'pointer_lock_change') {
                setShowHomeButton(!event.data.isLocked);
            }
        };
        
        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    return (
        <div className="fixed inset-0 w-full h-full bg-black z-50">
            {showHomeButton && (
                <button 
                    onClick={onBackToHub}
                    className="absolute top-4 left-4 z-[60] text-2xl hover:scale-110 transition-transform bg-white/10 p-2 rounded-full backdrop-blur-sm"
                    title="Back to Hub"
                >
                    🏠
                </button>
            )}
            <iframe 
                src="/GunGame.html" 
                className="w-full h-full border-none"
                title="Gun Game"
            />
        </div>
    );
}
