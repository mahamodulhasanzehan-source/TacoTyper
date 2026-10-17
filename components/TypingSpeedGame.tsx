import React, { useEffect, useState, useRef } from 'react';
import { COLORS } from '../constants';
import { audioService } from '../services/audioService';
import { RandomText } from './Visuals';

interface TypingSpeedGameProps {
  targetText: string;
  onComplete: (wpm: number, cpm: number, accuracy: number) => void;
  onQuit: () => void;
}

const TypingSpeedGame: React.FC<TypingSpeedGameProps> = ({ targetText, onComplete, onQuit }) => {
  const [inputText, setInputText] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
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

  useEffect(() => {
    if (timeLeft === 0 && startTime !== null) {
      finishGame(true);
    }
  }, [timeLeft, startTime]);

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
    const inputWords = input.split(' ');
    const targetWords = target.split(' ');
    let correctChars = 0;

    for (let i = 0; i < inputWords.length; i++) {
      const inputWord = inputWords[i];
      const targetWord = targetWords[i];
      if (!targetWord) break;
      if (i < inputWords.length - 1) {
        if (inputWord === targetWord) {
          correctChars += inputWord.length + 1;
        }
      } else {
        for (let j = 0; j < inputWord.length; j++) {
          if (j < targetWord.length && inputWord[j] === targetWord[j]) {
            correctChars++;
          } else {
            break;
          }
        }
      }
    }
    return { correctChars };
  };

  const finishGame = (timeUp = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const now = Date.now();
    let durationSecs = 0;
    if (startTime) durationSecs = (now - startTime) / 1000;
    else durationSecs = 1;

    if (timeUp) durationSecs = 60;
    durationSecs = Math.max(durationSecs, 0.1);

    const mins = durationSecs / 60;
    const stats = calculateStats(inputText, targetText);
    const words = stats.correctChars / 5;
    const finalWpm = Math.round(words / mins);
    const finalCpm = Math.round(stats.correctChars / mins);

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
      if (val.length > inputText.length) {
        const addedCount = val.length - inputText.length;
        totalKeystrokesRef.current += addedCount;
        const char = val.slice(-1);
        const targetChar = targetText[val.length - 1];
        if (char === targetChar) audioService.playSound('type');
        else audioService.playSound('rotten_penalty');
      }

      setInputText(val);

      if (textContainerRef.current) {
        const cursorEl = document.getElementById('cursor-ref');
        if (cursorEl) {
          const containerRect = textContainerRef.current.getBoundingClientRect();
          const cursorRect = cursorEl.getBoundingClientRect();
          if (cursorRect.bottom > containerRect.bottom - 40) {
            textContainerRef.current.scrollTop += 60;
          } else if (cursorRect.top < containerRect.top + 20) {
            textContainerRef.current.scrollTop -= 60;
          }
        }
      }

      if (val.length === targetText.length) {
        setTimeout(() => finishGame(false), 50);
      }
    }
  };

  const renderWords = () => {
    const words = targetText.split(' ');
    let globalIndex = 0;

    return words.map((word, wordIndex) => {
      const wordChars = word.split('');
      const wordStartIndex = globalIndex;
      globalIndex += wordChars.length;

      const hasSpace = wordIndex < words.length - 1;
      const spaceIndex = globalIndex;
      if (hasSpace) {
        globalIndex += 1;
      }

      return (
        <span key={wordIndex} className="inline-block whitespace-nowrap mr-1.5 md:mr-2.5 my-0.5">
          {wordChars.map((char, cIdx) => {
            const index = wordStartIndex + cIdx;
            let color = '#555';
            let bg = 'transparent';
            const isCursor = index === inputText.length;

            if (index < inputText.length) {
              if (inputText[index] === char) {
                color = COLORS.correct;
              } else {
                color = '#ff4444';
                bg = 'rgba(255, 68, 68, 0.25)';
              }
            }

            return (
              <span
                key={index}
                style={{ color, backgroundColor: bg }}
                className={`relative inline-block transition-colors duration-75 ${
                  isCursor ? 'border-b-2 md:border-b-4 border-[#f4b400] animate-pulse' : ''
                }`}
              >
                <span id={isCursor ? 'cursor-ref' : undefined}>{char}</span>
              </span>
            );
          })}
          {hasSpace && (() => {
            let spaceColor = '#555';
            let spaceBg = 'transparent';
            const isSpaceCursor = spaceIndex === inputText.length;

            if (spaceIndex < inputText.length) {
              if (inputText[spaceIndex] === ' ') {
                spaceColor = COLORS.correct;
              } else {
                spaceColor = '#ff4444';
                spaceBg = 'rgba(255, 68, 68, 0.3)';
              }
            }

            return (
              <span
                key={`space-${spaceIndex}`}
                style={{ color: spaceColor, backgroundColor: spaceBg }}
                className={`relative inline-block transition-colors duration-75 ${
                  isSpaceCursor ? 'border-b-2 md:border-b-4 border-[#f4b400] animate-pulse' : ''
                }`}
              >
                <span id={isSpaceCursor ? 'cursor-ref' : undefined}>&nbsp;</span>
              </span>
            );
          })()}
        </span>
      );
    });
  };

  return (
    <div 
      className="absolute top-0 left-0 w-full h-full bg-black flex flex-col items-center p-3 md:p-6 pb-4 md:pb-6 z-50 animate-fade-in select-none"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="w-full max-w-5xl flex items-center justify-between mb-2 md:mb-3 px-1">
        <h2 className="text-[#f4b400] text-lg md:text-2xl font-bold tracking-wider font-mono">
          <RandomText text="Speed Chef Mode" />
        </h2>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuit();
          }}
          className="text-xs md:text-sm text-[#888] hover:text-white px-3 py-1 rounded border border-[#333] hover:border-[#666] transition-colors uppercase font-mono cursor-pointer"
        >
          ESC / Quit
        </button>
      </div>

      <div className="w-full max-w-5xl flex gap-4 md:gap-8 justify-around mb-2 md:mb-3 text-base md:text-xl border-2 md:border-4 border-[#333] p-2.5 md:p-3.5 bg-[#111] rounded-lg">
        <div className="flex flex-col items-center">
          <span className="text-[#888] text-[10px] md:text-xs tracking-wider mb-0.5">TIME</span>
          <span className={`font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#888] text-[10px] md:text-xs tracking-wider mb-0.5">NET WPM</span>
          <span className="font-mono font-bold text-[#4facfe]">{wpm}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#888] text-[10px] md:text-xs tracking-wider mb-0.5">CPM</span>
          <span className="font-mono font-bold text-[#e55934]">{cpm}</span>
        </div>
      </div>

      <div
        ref={textContainerRef}
        className="w-full max-w-5xl flex-1 min-h-0 bg-[#0d0d0d] border-2 md:border-4 border-white/80 rounded-lg p-3 md:p-6 overflow-y-auto leading-relaxed md:leading-loose text-base sm:text-lg md:text-2xl lg:text-3xl font-mono relative shadow-[0_0_25px_rgba(255,255,255,0.06)] cursor-text select-text"
        style={{ fontFamily: 'monospace' }}
        onClick={() => inputRef.current?.focus()}
      >
        {renderWords()}
      </div>

      <input
        ref={inputRef}
        value={inputText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute top-0 left-0 h-0 w-0 pointer-events-none"
        autoFocus
      />

      <div className="mt-2 md:mt-3 text-[#777] text-xs md:text-sm text-center font-mono">
        Start typing to begin • Click to focus • ESC to Quit
      </div>
    </div>
  );
};

export default TypingSpeedGame;
