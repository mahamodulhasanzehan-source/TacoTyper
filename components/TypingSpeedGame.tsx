
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
  const [timeLeft, setTimeLeft] = useState(60); // Changed to 60s for longer texts
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
        const mins = safeElapsed / 60;
        
        const stats = calculateStats(inputText, targetText);
        
        const words = stats.correctChars / 5;
        const currentCpm = Math.round(stats.correctChars / mins);
        
        setWpm(Math.round(words / mins));
        setCpm(currentCpm);
    }
  }, [inputText, timeLeft, startTime]);

  const calculateStats = (input: string, target: string) => {
      // Split by spaces to compare word by word
      // Handle the fact that input might have a trailing space if user just finished a word
      const inputWords = input.split(' ');
      const targetWords = target.split(' ');
      
      let correctChars = 0;
      
      for (let i = 0; i < inputWords.length; i++) {
          const inputWord = inputWords[i];
          const targetWord = targetWords[i];
          
          if (!targetWord) break; // Typed more words than target

          // Case 1: Completed word (not the last in list, OR last in list but user typed space at end)
          // Actually split(' ') with trailing space produces empty string at end.
          
          if (i < inputWords.length - 1) {
              // This is a completed word
              if (inputWord === targetWord) {
                  correctChars += inputWord.length + 1; // +1 for the space
              }
          } else {
              // This is the current word being typed (or last word)
              // We credit characters that match the prefix of the target word
              // This ensures CPM/WPM isn't 0 while typing a long word
              for (let j = 0; j < inputWord.length; j++) {
                  if (j < targetWord.length && inputWord[j] === targetWord[j]) {
                      correctChars++;
                  } else {
                      break; // Stop counting chars once a mismatch occurs in the current word
                  }
              }
              // If exact match of full word (and it's the very last word of text), credit it fully
              if (inputWord === targetWord && i === targetWords.length - 1) {
                  // No space to add
              }
          }
      }
      return { correctChars };
  };

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

      // If timeUp, force it to exactly 60s (or whatever the limit was)
      if (timeUp) durationSecs = 60;
      
      // Ensure no division by zero or extremely small numbers
      durationSecs = Math.max(durationSecs, 0.1);

      const mins = durationSecs / 60;
      
      const stats = calculateStats(inputText, targetText);

      const words = stats.correctChars / 5;
      const finalWpm = Math.round(words / mins);
      const finalCpm = Math.round(stats.correctChars / mins);

      // Calculate final accuracy based on Total Characters Typed (Keystrokes)
      let correctRaw = 0;
      const minLen = Math.min(inputText.length, targetText.length);
      for (let i = 0; i < minLen; i++) {
          if (inputText[i] === targetText[i]) correctRaw++;
      }
      
      const totalTyped = totalKeystrokesRef.current > 0 ? totalKeystrokesRef.current : 1;
      const accuracy = Math.round((correctRaw / totalTyped) * 100);
      
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
              // Delay finish to allow render update
              setTimeout(() => finishGame(false), 50);
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
                <span className="text-[#aaa] text-sm mb-2">NET WPM</span>
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
