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
        <div className="fixed inset-0 w-full h-full bg-black z-50 overflow-hidden">
            <button 
                onClick={onBackToHub}
                className="absolute top-4 left-4 z-[60] text-2xl hover:scale-110 active:scale-95 transition-transform bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md border border-white/20 shadow-lg text-white"
                title="Back to Hub"
            >
                🏠
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
