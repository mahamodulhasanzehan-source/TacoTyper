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
        <div className="fixed inset-0 w-full h-full bg-black z-50 overflow-hidden">
            <button 
                onClick={onBackToHub}
                className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-[60] text-lg sm:text-2xl hover:scale-110 active:scale-95 transition-transform bg-neutral-900/90 hover:bg-neutral-800 p-1.5 sm:p-2.5 rounded-full border border-neutral-700 backdrop-blur-md shadow-lg cursor-pointer flex items-center justify-center"
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
