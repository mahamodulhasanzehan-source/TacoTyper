
import React from 'react';
import { COLORS } from '../constants';
import { Button } from './Overlays';
import { RandomReveal, RandomText } from './Visuals';

interface LoginScreenProps {
  onLogin: () => void;
  isLoading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-black text-white z-50 p-4 overflow-hidden">
        <div className="mb-6 md:mb-8 text-center">
             <h1 className="text-3xl md:text-5xl text-[#f4b400] leading-normal" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>
                <RandomText text="Typing for" />
                <br/>
                <RandomText text="Tacos" />
             </h1>
        </div>
        
        <RandomReveal className="border-4 border-white p-4 md:p-8 bg-[#111] flex flex-col items-center w-full max-w-md" distance={300}>
            <p className="mb-6 md:mb-8 text-center leading-loose text-xs md:text-sm text-[#aaa]">
                <RandomText text="Welcome Chef!" />
                <br/>
                <RandomText text="Please sign in to access the kitchen." />
            </p>
            
            {isLoading ? (
                <div className="loading-spinner"></div>
            ) : (
                <RandomReveal delay={0.5} className="w-full">
                    <Button onClick={onLogin} className="w-full text-xs md:text-base">
                        Sign In with Google
                    </Button>
                </RandomReveal>
            )}
        </RandomReveal>
        
        <RandomReveal className="mt-8 text-[10px] md:text-xs text-[#555]" distance={400}>
            v1.1.0 • Mobile & Desktop
        </RandomReveal>
    </div>
  );
};

export default LoginScreen;
