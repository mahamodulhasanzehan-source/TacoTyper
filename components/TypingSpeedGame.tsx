import React, { useEffect, useState, useRef } from 'react';
import { COLORS } from '../constants';
import { audioService } from '../services/audioService';

interface TypingSpeedGameProps {
  targetText: string;
  onComplete: (wpm: number, cpm: number, accuracy: number) => void;
  onQuit: () => void;
}

const TypingSpeedGame: React.FC<TypingSpeedGameProps> = ({ targetText, onComplete, onQuit }) => {
  const [inputText, setInputText] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [wpm, setWpm] = useState(0);
  const [cpm, setCpm] = useState(0);
  
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const totalKeystrokesRef = useRef(0);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    // Start timer on first keypress
    if (startTime !== null && timeLeft > 0) {
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime]);

  // Watch for timeout independently
  useEffect(() => {
    if (timeLeft === 0 && startTime !== null) {
        finishGame(true);
    }
  }, [timeLeft, startTime]);

  // Real-time WPM Calculation (Approximate for display)
  useEffect(() => {
    if (startTime && timeLeft > 0) {
        const elapsedSecs = (Date.now() - startTime) / 1000;
        const safeElapsed = Math.max(elapsedSecs, 1);
        const chars = inputText.length;
        const words = chars / 5;
        const mins = safeElapsed / 60;
        setWpm(Math.round(words / mins));
        setCpm(Math.round(chars / mins));
    }
  }, [inputText, timeLeft, startTime]);

  const finishGame = (timeUp = false) => {
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Precise calculation using Date.now()
      const now = Date.now();
      let durationSecs = 0;
      
      if (startTime) {
          durationSecs = (now - startTime) / 1000;
      } else {
          durationSecs = 1;
      }

      // If timeUp, force it to exactly 30s (or whatever the limit was)
      if (timeUp) durationSecs = 30;
      
      // Ensure no division by zero or extremely small numbers
      durationSecs = Math.max(durationSecs, 0.1);

      const mins = durationSecs / 60;
      const chars = inputText.length;
      const words = chars / 5;
      
      const finalWpm = Math.round(words / mins);
      const finalCpm = Math.round(chars / mins);

      // Calculate final accuracy based on Total Characters Typed (Keystrokes)
      let correct = 0;
      for (let i = 0; i < inputText.length; i++) {
          if (inputText[i] === targetText[i]) correct++;
      }
      
      const totalTyped = totalKeystrokesRef.current > 0 ? totalKeystrokesRef.current : 1;
      const accuracy = Math.round((correct / totalTyped) * 100);
      
      onComplete(finalWpm, finalCpm, accuracy);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onQuit();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (startTime === null) setStartTime(Date.now());
      
      const val = e.target.value;
      if (val.length <= targetText.length) {
          // Track total keystrokes (additions only) for accuracy calculation
          if (val.length > inputText.length) {
             const addedCount = val.length - inputText.length;
             totalKeystrokesRef.current += addedCount;

             // Play sound
             const char = val.slice(-1);
             const targetChar = targetText[val.length - 1];
             if (char === targetChar) audioService.playSound('type');
             else audioService.playSound('rotten_penalty');
          }
          
          setInputText(val);

          // Auto-scroll
          if (textContainerRef.current) {
              const cursorEl = document.getElementById('cursor-ref');
              if (cursorEl) {
                  const containerRect = textContainerRef.current.getBoundingClientRect();
                  const cursorRect = cursorEl.getBoundingClientRect();
                  // Adjusted threshold for text-6xl (approx 60px line height + gap)
                  if (cursorRect.bottom > containerRect.bottom - 80) {
                      textContainerRef.current.scrollTop += 80;
                  }
              }
          }

          if (val.length === targetText.length) {
              setTimeout(() => finishGame(false), 0);
          }
      }
  };

  // Render text with highlighting
  const renderText = () => {
      return targetText.split('').map((char, index) => {
          let color = '#555'; // Future text
          let bg = 'transparent';
          let isCursor = index === inputText.length;

          if (index < inputText.length) {
              if (inputText[index] === char) {
                  color = COLORS.correct;
              } else {
                  color = '#ff0000';
                  bg = 'rgba(255,0,0,0.2)';
              }
          }

          return (
              <span 
                key={index} 
                id={isCursor ? 'cursor-ref' : undefined}
                style={{ color, backgroundColor: bg }}
                className={`relative ${isCursor ? 'border-b-8 border-[#f4b400] animate-pulse' : ''}`}
              >
                {char}
              </span>
          );
      });
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-black flex flex-col items-center pt-10 z-50 animate-fade-in">
        <h2 className="text-[#f4b400] text-3xl mb-6">Speed Chef Mode</h2>
        
        {/* Stats Bar */}
        <div className="flex gap-12 mb-8 text-2xl border-4 border-[#333] p-6 bg-[#111]">
            <div className="flex flex-col items-center">
                <span className="text-[#aaa] text-sm mb-2">TIME</span>
                <span className={timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}>{timeLeft}s</span>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[#aaa] text-sm mb-2">WPM</span>
                <span className="text-[#4facfe]">{wpm}</span>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[#aaa] text-sm mb-2">CPM</span>
                <span className="text-[#e55934]">{cpm}</span>
            </div>
        </div>

        {/* Text Area - text-6xl for high zoom */}
        <div 
            ref={textContainerRef}
            className="w-[90%] h-[60%] bg-[#111] border-4 border-white p-8 overflow-y-auto leading-relaxed text-6xl font-mono relative shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
            onClick={() => inputRef.current?.focus()}
        >
            {renderText()}
        </div>

        {/* Hidden Input */}
        <input 
            ref={inputRef}
            value={inputText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="opacity-0 absolute top-0 left-0 h-0 w-0"
            autoFocus
        />

        <div className="mt-8 text-[#aaa] text-sm">Start typing to begin timer • ESC to Quit</div>
    </div>
  );
};

export default TypingSpeedGame;