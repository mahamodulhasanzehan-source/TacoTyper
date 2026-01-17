
import React from 'react';
import { COLORS } from '../constants';
import { Button } from './Overlays';

interface LoginScreenProps {
  onLogin: () => void;
  isLoading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-black text-white z-50 animate-fade-in p-4">
        <h1 className="text-3xl md:text-5xl mb-6 md:mb-8 text-[#f4b400] text-center leading-normal" style={{ textShadow: `4px 4px 0px ${COLORS.accent}` }}>
            Typing for<br/>Tacos
        </h1>
        
        <div className="border-4 border-white p-4 md:p-8 bg-[#111] flex flex-col items-center w-full max-w-md">
            <p className="mb-6 md:mb-8 text-center leading-loose text-xs md:text-sm text-[#aaa]">
                Welcome Chef!<br/>
                Please sign in to access the kitchen.
            </p>
            
            {isLoading ? (
                <div className="loading-spinner"></div>
            ) : (
                <Button onClick={onLogin} className="w-full text-xs md:text-base">
                    Sign In with Google
                </Button>
            )}
        </div>
        
        <div className="mt-8 text-[10px] md:text-xs text-[#555]">
            v1.1.0 • Mobile & Desktop
        </div>
    </div>
  );
};

export default LoginScreen;
