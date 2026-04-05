import React, { useEffect, useState } from 'react';
import { incrementGamePlays } from '../services/firebase';
import { isMobileDevice } from '../utils/device';

interface GunGameProps {
    onBackToHub: () => void;
}

export default function GunGameComponent({ onBackToHub }: GunGameProps) {
    const [showHomeButton, setShowHomeButton] = useState(true);
    const isMobile = isMobileDevice();

    useEffect(() => {
        incrementGamePlays('gun_game');
        
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'pointer_lock_change') {
                setShowHomeButton(!event.data.isLocked);
            }
        };
        
        window.addEventListener('message', handleMessage);

        const requestFullscreen = async () => {
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                } else if ((document.documentElement as any).webkitRequestFullscreen) {
                    await (document.documentElement as any).webkitRequestFullscreen();
                } else if ((document.documentElement as any).msRequestFullscreen) {
                    await (document.documentElement as any).msRequestFullscreen();
                }
            } catch (err) {
                console.warn("Fullscreen request failed:", err);
            }
        };
        requestFullscreen();
        
        return () => {
            window.removeEventListener('message', handleMessage);
            if (document.fullscreenElement) {
                try {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if ((document as any).webkitExitFullscreen) {
                        (document as any).webkitExitFullscreen();
                    } else if ((document as any).msExitFullscreen) {
                        (document as any).msExitFullscreen();
                    }
                } catch (err) {
                    console.warn("Exit fullscreen failed:", err);
                }
            }
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
                src={isMobile ? "/GunGame.mobile/index.html" : "/GunGame.PC/index.html"} 
                className="w-full h-full border-none"
                title="Gun Game"
                allow="fullscreen"
            />
        </div>
    );
}
