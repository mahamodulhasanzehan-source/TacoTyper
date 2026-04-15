import React, { useEffect, useState } from 'react';
import { incrementGamePlays } from '../services/firebase';

interface ColorMemoryProps {
    onBackToHub: () => void;
}

export default function ColorMemoryComponent({ onBackToHub }: ColorMemoryProps) {
    useEffect(() => {
        incrementGamePlays('color_memory');
    }, []);

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
                src="/ColorMemory.html" 
                className="w-full h-full border-none"
                title="Color Memory"
                allow="fullscreen"
            />
        </div>
    );
}
