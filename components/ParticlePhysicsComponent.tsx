import React, { useEffect } from 'react';
import { incrementGamePlays } from '../services/firebase';

interface ParticlePhysicsProps {
    onBackToHub: () => void;
}

export default function ParticlePhysicsComponent({ onBackToHub }: ParticlePhysicsProps) {
    useEffect(() => {
        incrementGamePlays('particle_physics');
    }, []);

    return (
        <div className="w-full h-full bg-black relative overflow-hidden">
            <button 
                onClick={onBackToHub}
                className="absolute top-4 left-4 z-[60] w-9 h-9 hover:scale-105 active:scale-95 transition-all bg-neutral-900/90 hover:bg-neutral-800 rounded-lg backdrop-blur-md border border-neutral-700/80 hover:border-neutral-500 shadow-lg text-neutral-200 hover:text-white flex items-center justify-center cursor-pointer"
                title="Back to Hub"
            >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            </button>
            <iframe 
                src="/ParticlePhysics.html" 
                className="w-full h-full border-none"
                title="Particle Physics"
                allow="fullscreen; microphone"
            />
        </div>
    );
}
