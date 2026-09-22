import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  COLORS, 
  LEVEL_CONFIGS, 
  BOSS_WORD_COUNT, 
  INGREDIENT_MAP, 
  INFINITE_POOL, 
  BOSS_WORDS, 
  UNIVERSAL_DICTIONARY, 
  TRAP_WORDS, 
  COMBO_FIESTA, 
  COMBO_SPICY
} from '../constants';
import { 
  GameScreen, 
  GameMode, 
  WordEntity, 
  WordType, 
  StreakState, 
  InfiniteConfig, 
  UniversalConfig, 
  PlayStyle, 
  SessionStats 
} from '../types';
import { audioService } from '../services/audioService';
import { aiService } from '../services/aiService';
import { saveGameStats, saveSpeedTestStats, saveUsername, saveLeaderboardScore, incrementGamePlays } from '../services/firebase';
import type { User } from '../services/firebase';
import { isMobileDevice } from '../utils/device';
import WordComponent from './WordComponent';
import TypingSpeedGame from './TypingSpeedGame';
import { 
  StartScreen, 
  LevelSelectScreen, 
  LevelCompleteScreen, 
  GameOverScreen, 
  BossIntroScreen, 
  PauseScreen,
  InfoModal,
  SpeedResultScreen,
  UsernameScreen,
  ModeSelectScreen,
  ExitConfirmScreen,
  GeneratingModal,
  LeaderboardWidget
} from './Overlays';

export interface TacoGameProps {
  user: User;
  onLogout: () => void;
  customUsername?: string | null;
  onUpdateUsername?: (name: string) => void;
  onBackToHub: () => void;
  initialScreen?: GameScreen;
  onScreenChange?: (screen: GameScreen) => void;
}

export default function TacoGame({
  user,
  onLogout,
  customUsername: initialUsername,
  onUpdateUsername,
  onBackToHub,
  initialScreen = 'start',
  onScreenChange
}: TacoGameProps) {
  const [screen, setScreenState] = useState<GameScreen>(initialScreen === 'hub' ? 'start' : initialScreen);
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [playStyle, setPlayStyle] = useState<PlayStyle>('unrated');
  
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0); 
  const [elapsedTime, setElapsedTime] = useState(0); 
  const [sessionHighScore, setSessionHighScore] = useState(0);
  const [showHighScoreAlert, setShowHighScoreAlert] = useState(false);
  
  const [lives, setLives] = useState(3);
  const [fallingWords, setFallingWords] = useState<WordEntity[]>([]);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [streakState, setStreakState] = useState<StreakState>('normal');
  const [ingredientsCollected, setIngredientsCollected] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalText, setInfoModalText] = useState('');
  const [customUsername, setCustomUsername] = useState<string | null>(initialUsername || null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  const [gameDimensions, setGameDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isMobile, setIsMobile] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const [speedTestText, setSpeedTestText] = useState('');
  const [speedTestResult, setSpeedTestResult] = useState<{wpm: number, cpm: number, accuracy: number, comment: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  const [finalAiScore, setFinalAiScore] = useState<number | undefined>(undefined);
  const [finalAiTitle, setFinalAiTitle] = useState<string | undefined>(undefined);

  const [popups, setPopups] = useState<Array<{ id: string, x: number, y: number, text: string, color: string }>>([]);
  const [sparkles, setSparkles] = useState<Array<{ id: string, x: number, y: number, tx: string, ty: string, color: string }>>([]);

  const setScreen = useCallback((scr: GameScreen) => {
    setScreenState(scr);
    if (onScreenChange) onScreenChange(scr);
  }, [onScreenChange]);

  useEffect(() => {
    if (initialUsername !== undefined) {
      setCustomUsername(initialUsername);
    }
  }, [initialUsername]);

  useEffect(() => {
    if (initialScreen && initialScreen !== 'hub' && initialScreen !== screen) {
      setScreenState(initialScreen);
    }
  }, [initialScreen]);

  const stateRef = useRef({
    fallingWords: [] as WordEntity[],
    activeWordId: null as string | null,
    score: 0,
    lives: 3,
    level: 1,
    gameMode: 'standard' as GameMode,
    screen: 'start' as GameScreen,
    streak: 0,
    streakState: 'normal' as StreakState,
    consecutivePerfectWords: 0,
    wordsSpawnedThisLevel: 0,
    ingredientsCount: 0,
    recentWords: [] as string[],
    infiniteConfig: { speedMult: 1.0, difficultyIncrease: 1.1, wordsTyped: 0 } as InfiniteConfig,
    universalConfig: { wordCount: 0, maxWordLength: 5, forcedWordsLeft: 0 } as UniversalConfig,
    lastTime: 0,
    spawnTimer: 0,
    stats: {
        mistakes: 0,
        timeTaken: 0, 
        ingredientsMissed: 0,
        rottenWordsTyped: 0,
        totalScore: 0,
        levelReached: 1
    } as SessionStats,
    levelStartTime: 0,
    gameHeight: window.innerHeight
  });

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
      const handleResize = () => {
          const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
          const currentWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
          
          setGameDimensions({ width: currentWidth, height: currentHeight });
          stateRef.current.gameHeight = currentHeight;
      };
      
      window.addEventListener('resize', handleResize);
      if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', handleResize);
      }
      handleResize();

      return () => {
          window.removeEventListener('resize', handleResize);
          if (window.visualViewport) {
              window.visualViewport.removeEventListener('resize', handleResize);
          }
      };
  }, []);

  useEffect(() => {
      if (screen === 'playing' && isMobile) {
          const focusInterval = setInterval(() => {
              if (hiddenInputRef.current && document.activeElement !== hiddenInputRef.current) {
                  hiddenInputRef.current.focus();
              }
          }, 500);
          return () => clearInterval(focusInterval);
      }
  }, [screen, isMobile]);

  useEffect(() => {
    stateRef.current.screen = screen;
    stateRef.current.gameMode = gameMode;
    stateRef.current.level = level;
  }, [screen, gameMode, level]);

  const requestRef = useRef<number>(0);

  const addPopup = (x: number, y: number, text: string, color: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setPopups(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 800);
  };

  const addSparkles = (x: number, y: number, color: string, count = 5) => {
    const newSparkles = Array.from({length: count}).map(() => ({
        id: Math.random().toString(36).substr(2, 9),
        x, y, color,
        tx: `${(Math.random() - 0.5) * 120}px`,
        ty: `${(Math.random() - 0.5) * 120}px`
    }));
    setSparkles(prev => [...prev, ...newSparkles]);
    setTimeout(() => {
         const ids = newSparkles.map(s => s.id);
         setSparkles(prev => prev.filter(s => !ids.includes(s.id)));
    }, 500);
  };

  const generateWord = useCallback((): WordEntity | null => {
    const state = stateRef.current;
    const width = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    
    let targetIngredients = 7;
    if (state.gameMode === 'standard') {
        targetIngredients = LEVEL_CONFIGS[state.level]?.goal || 7;
        if (state.ingredientsCount >= targetIngredients) return null; 
    } else if (state.gameMode === 'boss') {
        if (state.wordsSpawnedThisLevel >= BOSS_WORD_COUNT) return null;
    }

    const lastWord = state.fallingWords[state.fallingWords.length - 1];
    if (lastWord && lastWord.y < 50) return null;

    let type: WordType = 'normal';
    let text = '';

    if (state.consecutivePerfectWords >= 5 && Math.random() < 0.7) {
        type = 'heart';
        text = 'heart';
        state.consecutivePerfectWords = 0;
    } 
    else if (state.gameMode !== 'universal' && Math.random() < 0.15) {
        type = 'rotten';
        let trapPool = TRAP_WORDS;
        if (state.gameMode === 'standard' && LEVEL_CONFIGS[state.level]) {
            trapPool = LEVEL_CONFIGS[state.level].traps;
        }
        text = trapPool[Math.floor(Math.random() * trapPool.length)];
    } 
    else {
        let pool: string[] = [];
        if (state.gameMode === 'universal') {
            if (state.universalConfig.forcedWordsLeft > 0) {
                pool = UNIVERSAL_DICTIONARY.filter(w => w.length === state.universalConfig.maxWordLength);
                if (pool.length > 0) state.universalConfig.forcedWordsLeft--;
            } else {
                pool = UNIVERSAL_DICTIONARY.filter(w => w.length <= state.universalConfig.maxWordLength);
            }
        } else if (state.gameMode === 'infinite') {
            pool = INFINITE_POOL;
        } else if (state.gameMode === 'boss') {
            pool = BOSS_WORDS;
        } else {
            pool = LEVEL_CONFIGS[state.level]?.words || LEVEL_CONFIGS[1].words;
        }
        
        const availablePool = pool.filter(w => !state.recentWords.includes(w));
        const finalPool = availablePool.length > 0 ? availablePool : pool;
        text = finalPool[Math.floor(Math.random() * finalPool.length)];
        
        state.recentWords.push(text);
        if (state.recentWords.length > 5) state.recentWords.shift();
    }

    state.wordsSpawnedThisLevel++;
    const wordWidthEstimate = text.length * 16;
    const maxX = Math.max(10, width - wordWidthEstimate - 30);
    const x = Math.floor(Math.random() * maxX) + 15;

    let baseSpeed = 1.0;
    if (state.gameMode === 'standard') {
        baseSpeed = LEVEL_CONFIGS[state.level]?.speed || 1.0;
    } else if (state.gameMode === 'infinite') {
        baseSpeed = state.infiniteConfig.speedMult;
    } else if (state.gameMode === 'universal') {
        baseSpeed = 1.2 + (state.universalConfig.maxWordLength * 0.1);
    } else if (state.gameMode === 'boss') {
        baseSpeed = 2.0;
    }

    const randomVariation = (Math.random() * 0.4) - 0.2; 
    const speed = Math.max(0.6, baseSpeed + randomVariation);

    return {
        id: Math.random().toString(36).substr(2, 9),
        text,
        typed: '',
        x,
        y: 0,
        speed,
        type
    };
  }, []);

  const update = useCallback((time: number) => {
    const state = stateRef.current;
    if (state.screen !== 'playing') {
        state.lastTime = time;
        requestRef.current = requestAnimationFrame(update);
        return;
    }

    if (!state.lastTime) state.lastTime = time;
    const delta = (time - state.lastTime) / 1000;

    if (playStyle === 'competitive') {
        setElapsedTime(prev => {
            const next = prev + delta;
            state.stats.timeTaken = next;
            return next;
        });
    }

    let spawnInterval = 2000;
    if (state.gameMode === 'standard') {
        spawnInterval = LEVEL_CONFIGS[state.level]?.spawnRate || 2000;
    } else if (state.gameMode === 'infinite') {
        spawnInterval = Math.max(800, 2000 / state.infiniteConfig.speedMult);
    } else if (state.gameMode === 'boss') {
        spawnInterval = 1200;
    }

    if (time - state.spawnTimer > spawnInterval) {
        const newWord = generateWord();
        if (newWord) {
            state.fallingWords.push(newWord);
            setFallingWords([...state.fallingWords]);
            state.spawnTimer = time;
        }
    }

    let livesChanged = false;
    let scoreChanged = false;
    let activeReset = false;
    let streakReset = false;

    const height = state.gameHeight;
    const nextWords: WordEntity[] = [];

    state.fallingWords.forEach(w => {
        const nextY = w.y + (w.speed * 60 * delta);
        if (nextY >= height - 80) {
            if (w.type === 'normal') {
                state.lives--;
                state.streak = 0;
                state.streakState = 'normal';
                state.stats.ingredientsMissed++;
                addPopup(w.x, height - 100, "MISSED!", COLORS.accent);
                audioService.playSound('rotten_penalty');
                livesChanged = true;
                streakReset = true;
            }

            if (w.id === state.activeWordId) {
                state.activeWordId = null;
                activeReset = true;
            }
        } else {
            nextWords.push({ ...w, y: nextY });
        }
    });

    state.fallingWords = nextWords;
    setFallingWords(nextWords);

    if (livesChanged) {
        setLives(state.lives);
        triggerShake();
        if (state.lives <= 0) {
            gameOver("You dropped the food!");
            return;
        }
    }
    if (scoreChanged && playStyle !== 'competitive') {
        setScore(state.score); 
        if (state.score > sessionHighScore) {
            setSessionHighScore(state.score);
            if (!showHighScoreAlert) {
                setShowHighScoreAlert(true);
                setTimeout(() => setShowHighScoreAlert(false), 2000);
            }
        }
    }
    if (activeReset) setActiveWordId(null);
    if (streakReset) {
        setStreak(0);
        setStreakState('normal');
    }
    
    if (state.gameMode === 'boss' && nextWords.length === 0 && state.wordsSpawnedThisLevel >= BOSS_WORD_COUNT && state.activeWordId === null) {
        victory();
        return;
    }

    state.lastTime = time;
    requestRef.current = requestAnimationFrame(update);
  }, [generateWord, playStyle, sessionHighScore]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  const triggerShake = () => {
      setShake(true);
      setTimeout(() => setShake(false), 500);
  };

  const initGame = (mode: GameMode, startLevel = 1, infiniteMult = 1.0, difficultyInc = 1.1) => {
    incrementGamePlays('taco_typer');
    
    setScore(0);
    setElapsedTime(0);
    setLives(3);
    setStreak(0);
    setStreakState('normal');
    setLevel(startLevel);
    setGameMode(mode);
    setFallingWords([]);
    setActiveWordId(null);
    setIngredientsCollected([]);
    setScreen('playing');
    setPopups([]);
    setSparkles([]);
    setFinalAiScore(undefined);
    setFinalAiTitle(undefined);
    setIsCalculatingScore(false);
    setShowExitConfirm(false);

    stateRef.current.fallingWords = [];
    stateRef.current.activeWordId = null;
    stateRef.current.score = 0;
    stateRef.current.lives = 3;
    stateRef.current.level = startLevel;
    stateRef.current.gameMode = mode;
    stateRef.current.screen = 'playing';
    stateRef.current.streak = 0;
    stateRef.current.streakState = 'normal';
    stateRef.current.consecutivePerfectWords = 0;
    stateRef.current.wordsSpawnedThisLevel = 0;
    stateRef.current.ingredientsCount = 0;
    stateRef.current.recentWords = [];
    stateRef.current.spawnTimer = performance.now();
    stateRef.current.lastTime = performance.now();
    stateRef.current.infiniteConfig = { speedMult: infiniteMult, difficultyIncrease: difficultyInc, wordsTyped: 0 };
    stateRef.current.universalConfig = { wordCount: 0, maxWordLength: 5, forcedWordsLeft: 0 };
    stateRef.current.stats = {
        mistakes: 0,
        timeTaken: 0,
        ingredientsMissed: 0,
        rottenWordsTyped: 0,
        totalScore: 0,
        levelReached: startLevel
    };
    stateRef.current.levelStartTime = Date.now();
    stateRef.current.gameHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    setTimeout(() => {
        if (isMobile && hiddenInputRef.current) hiddenInputRef.current.focus();
    }, 100);
  };

  const handleUsernameSubmit = async (name: string) => {
      setCustomUsername(name);
      if (onUpdateUsername) onUpdateUsername(name);
      try {
          await saveUsername(user.uid, name);
      } catch (err) {
          console.warn("Could not save username remotely:", err);
      }
      setScreen('start');
  };

  const startSpeedTest = async () => {
      incrementGamePlays('taco_typer');
      setIsGenerating(true);
      const text = await aiService.generateSpeedText();
      setIsGenerating(false);
      const cleanText = text.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
      setSpeedTestText(cleanText);
      setScreen('speed-test-playing');
      setGameMode('speed-test');
  };

  const finishSpeedTest = async (wpm: number, cpm: number, accuracy: number) => {
      setIsEvaluating(true);
      const comment = await aiService.generateSpeedComment(wpm, cpm, accuracy);
      const { title: rankTitle } = await aiService.generateCompetitiveScore(stateRef.current.stats, { wpm, accuracy });
      if (user) {
          saveSpeedTestStats(user, wpm, accuracy);
          const usernameToUse = customUsername || 'Chef';
          if (usernameToUse) {
              await saveLeaderboardScore(
                  user, 
                  usernameToUse, 
                  wpm, 
                  rankTitle,
                  stateRef.current.stats, 
                  'speed-test', 
                  { accuracy }
              );
          }
      }
      setSpeedTestResult({ wpm, cpm, accuracy, comment });
      setScreen('speed-test-result');
      setIsEvaluating(false);
  };

  const gameOver = async (reason: string) => {
    setScreen('game-over');
    setInfoModalText(reason);
    const state = stateRef.current;
    if (user && customUsername) {
        state.stats.totalScore = state.score;
        state.stats.levelReached = state.level;
        let finalScore = state.score;
        let title = "Line Cook";
        if (playStyle === 'competitive') {
             finalScore = Math.floor(state.stats.timeTaken);
        }
        setIsCalculatingScore(true);
        const aiResult = await aiService.generateCompetitiveScore(state.stats);
        title = aiResult.title;
        if (playStyle !== 'competitive' && state.gameMode !== 'speed-test') {
            finalScore = aiResult.score;
        }
        setFinalAiScore(finalScore);
        setFinalAiTitle(title);
        setIsCalculatingScore(false);
        let modeToSave = playStyle === 'competitive' ? 'competitive' : state.gameMode;
        if (modeToSave === 'competitive' || modeToSave === 'infinite' || modeToSave === 'universal') {
            await saveLeaderboardScore(user, customUsername, finalScore, title, state.stats, modeToSave);
        }
        saveGameStats(user, state.score, state.gameMode, state.level);
    }
  };

  const victory = async () => {
    setScreen('game-over');
    const state = stateRef.current;
    state.stats.totalScore = state.score;
    state.stats.levelReached = 6;
    let finalScore = state.score;
    let title = "Master Chef";
    setIsCalculatingScore(true);
    const aiResult = await aiService.generateCompetitiveScore(state.stats);
    title = aiResult.title;
    if (playStyle === 'competitive') {
         finalScore = Math.floor(state.stats.timeTaken);
         setInfoModalText("Master Chef Status Achieved!");
    } else {
         finalScore = aiResult.score;
         setInfoModalText("You survived the social hour!");
    }
    setFinalAiScore(finalScore);
    setFinalAiTitle(title);
    setIsCalculatingScore(false);
    if (user && customUsername) {
        let modeToSave = playStyle === 'competitive' ? 'competitive' : 'boss';
        await saveLeaderboardScore(user, customUsername, finalScore, title, state.stats, modeToSave);
        saveGameStats(user, state.score, modeToSave, 6);
    }
  };

  const completeLevel = () => {
      const state = stateRef.current;
      if (playStyle !== 'competitive') {
         const levelTime = (Date.now() - state.levelStartTime) / 1000;
         state.stats.timeTaken += levelTime;
      }
      state.score += 100 * state.level;
      if (playStyle !== 'competitive') {
          setScore(state.score);
          if (state.score > sessionHighScore) setSessionHighScore(state.score);
      }
      if (playStyle === 'competitive') {
          if (state.level < 5) {
             setScreen('level-complete');
          } else {
              setScreen('boss-intro');
          }
      } else {
          if (state.level < 5) setScreen('level-complete');
          else setScreen('boss-intro');
      }
  };

  const nextLevelAction = () => {
      if (playStyle === 'competitive') {
          const nextLvl = stateRef.current.level + 1;
          setLevel(nextLvl);
          setFallingWords([]);
          setActiveWordId(null);
          setIngredientsCollected([]);
          setScreen('playing');
          stateRef.current.fallingWords = [];
          stateRef.current.activeWordId = null;
          stateRef.current.level = nextLvl;
          stateRef.current.stats.levelReached = nextLvl;
          stateRef.current.screen = 'playing';
          stateRef.current.wordsSpawnedThisLevel = 0;
          stateRef.current.ingredientsCount = 0;
          stateRef.current.recentWords = [];
          stateRef.current.spawnTimer = performance.now();
          stateRef.current.lastTime = performance.now();
          stateRef.current.levelStartTime = Date.now();
          if (isMobile && hiddenInputRef.current) setTimeout(() => hiddenInputRef.current?.focus(), 50);
      } else {
          setLevel(l => l + 1);
          initGame('standard', level + 1);
      }
  };

  const handleQuitAttempt = () => {
      if (playStyle === 'competitive' || gameMode === 'speed-test') {
          setScreen('paused'); 
          setShowExitConfirm(true); 
      } else {
          setScreen('start');
      }
  };

  const resetCombo = () => {
      const state = stateRef.current;
      setStreak(0);
      setStreakState('normal');
      state.streak = 0;
      state.streakState = 'normal';
  };

  const increaseCombo = () => {
      const state = stateRef.current;
      state.streak++;
      setStreak(state.streak);
      
      let newState: StreakState = 'normal';
      if (state.streak >= COMBO_SPICY) newState = 'spicy';
      else if (state.streak >= COMBO_FIESTA) newState = 'fiesta';

      if (newState !== state.streakState) {
          state.streakState = newState;
          setStreakState(newState);
          audioService.playSound('fiesta'); 
          addPopup(window.innerWidth / 2, window.innerHeight / 2, newState === 'spicy' ? "SPICY!" : "FIESTA!", newState === 'spicy' ? COLORS.comboPurple : COLORS.comboRed);
      }
  };

  const addIngredient = (wordText: string) => {
      const state = stateRef.current;
      const icon = INGREDIENT_MAP[wordText] || INGREDIENT_MAP['default'];
      setIngredientsCollected(prev => [...prev, icon].slice(-20));
      state.ingredientsCount++;
      
      if (state.gameMode === 'standard') {
          const goal = LEVEL_CONFIGS[state.level]?.goal || 7;
          if (state.ingredientsCount >= goal) {
              completeLevel();
          }
      }
  };

  const processWordCompletion = (word: WordEntity) => {
    const state = stateRef.current;
    const newWords = state.fallingWords.filter(w => w.id !== word.id);
    state.fallingWords = newWords;
    setFallingWords(newWords);
    state.activeWordId = null;
    setActiveWordId(null);

    if (word.type === 'rotten') {
        state.score = Math.max(0, state.score - 50);
        if (playStyle !== 'competitive') setScore(state.score);
        state.stats.rottenWordsTyped++; 
        triggerShake();
        audioService.playSound('rotten_penalty');
        resetCombo();
        state.consecutivePerfectWords = 0;
        addPopup(word.x, word.y, "YUCK!", "#7cfc00");
    } else if (word.type === 'heart') {
        state.lives++;
        setLives(state.lives);
        state.score += 100;
        if (playStyle !== 'competitive') {
            setScore(state.score);
            if (state.score > sessionHighScore) {
                 setSessionHighScore(state.score);
                 if (!showHighScoreAlert) {
                    setShowHighScoreAlert(true);
                    setTimeout(() => setShowHighScoreAlert(false), 2000);
                 }
            }
        }
        audioService.playSound('powerup');
        state.consecutivePerfectWords++;
        increaseCombo();
        addPopup(word.x, word.y, "HEAL!", "#ff69b4");
        addSparkles(word.x + 40, word.y + 20, "#ff69b4", 15);
    } else {
        let mult = 1;
        if (state.streakState === 'spicy') mult = 3;
        else if (state.streakState === 'fiesta') mult = 2;
        const points = (word.text.length * 10) * mult;
        state.score += points;
        if (playStyle !== 'competitive') {
            setScore(state.score);
            if (state.score > sessionHighScore) {
                 setSessionHighScore(state.score);
                 if (!showHighScoreAlert) {
                    setShowHighScoreAlert(true);
                    setTimeout(() => setShowHighScoreAlert(false), 2000);
                 }
            }
        }
        audioService.playSound('hit');
        addPopup(word.x, word.y, `+${points}`, state.streakState === 'spicy' ? COLORS.comboPurple : (state.streakState === 'fiesta' ? COLORS.comboRed : COLORS.text));
        addSparkles(word.x + 40, word.y + 20, COLORS.correct, 10);
        if (state.gameMode !== 'universal') addIngredient(word.text);
        if (state.gameMode === 'infinite') {
            state.infiniteConfig.wordsTyped++;
            if (state.infiniteConfig.wordsTyped % 5 === 0) {
                state.infiniteConfig.speedMult *= 1.3; 
                addPopup(window.innerWidth/2 - 50, window.innerHeight/2, "SPEED UP!", COLORS.warn);
            }
            const w = generateWord();
            if (w) {
                state.fallingWords.push(w);
                setFallingWords([...state.fallingWords]);
                state.spawnTimer = performance.now();
            }
        } else {
            const w = generateWord();
            if (w) {
                state.fallingWords.push(w);
                setFallingWords([...state.fallingWords]);
                state.spawnTimer = performance.now();
            }
        }
        state.consecutivePerfectWords++;
        increaseCombo();
    }
  };

  const handleInputChar = (char: string) => {
    const state = stateRef.current;
    let activeWord = state.fallingWords.find(w => w.id === state.activeWordId);
    if (!activeWord) {
        const matches = state.fallingWords.filter(w => w.text.startsWith(char)).sort((a, b) => b.y - a.y);
        if (matches.length > 0) {
            activeWord = matches[0];
            state.activeWordId = activeWord.id;
            setActiveWordId(activeWord.id);
            activeWord.typed = char;
            setFallingWords([...state.fallingWords]);
            audioService.playSound('type');
            addSparkles(activeWord.x + 20, activeWord.y + 15, COLORS.text, 3);
            if (activeWord.text === char) {
                processWordCompletion(activeWord);
            }
        } else {
            state.consecutivePerfectWords = 0;
        }
        return;
    }
    const nextChar = activeWord.text[activeWord.typed.length];
    if (char === nextChar) {
        activeWord.typed += char;
        setFallingWords([...state.fallingWords]);
        audioService.playSound('type');
        addSparkles(activeWord.x + (activeWord.typed.length * 14), activeWord.y + 15, COLORS.correct, 4);
        if (activeWord.typed === activeWord.text) {
            processWordCompletion(activeWord);
        }
    } else {
        state.consecutivePerfectWords = 0;
        resetCombo();
        audioService.playSound('rotten_penalty');
        triggerShake();
        state.stats.mistakes++;
    }
  };

  const handleBackspace = () => {
      const state = stateRef.current;
      const activeWord = state.fallingWords.find(w => w.id === state.activeWordId);
      if (activeWord && activeWord.typed.length > 0) {
          activeWord.typed = activeWord.typed.slice(0, -1);
          setFallingWords([...state.fallingWords]);
          if (activeWord.typed.length === 0) {
              state.activeWordId = null;
              setActiveWordId(null);
          }
          state.consecutivePerfectWords = 0;
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (screen === 'speed-test-playing' || screen === 'username-setup' || showExitConfirm || isMobile) return;
        
        if (e.key === 'Escape') {
            if (screen === 'playing') {
                if (playStyle === 'competitive') {
                    setScreen('paused');
                    setShowExitConfirm(true);
                } else {
                    setScreen('paused');
                }
            } else if (screen === 'paused') setScreen('playing');
            return;
        }
        if (screen !== 'playing') return;
        if (e.key.length > 1 && e.key !== 'Backspace') return;
        if (e.key === ' ') e.preventDefault();
        if (e.key === 'Backspace') {
            handleBackspace();
        } else {
            handleInputChar(e.key);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, showExitConfirm, isMobile, playStyle]);

  const handleMobileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const nativeEvent = e.nativeEvent as InputEvent;
      const inputType = nativeEvent.inputType;

      if (inputType === 'deleteContentBackward') {
          handleBackspace();
      } else if (val.length > 0) {
          const char = val.slice(-1);
          handleInputChar(char);
      }
      
      if (hiddenInputRef.current) {
          hiddenInputRef.current.value = '';
      }
  };

  const handleManualSelect = (word: WordEntity) => {
      if (stateRef.current.activeWordId !== word.id) {
          stateRef.current.activeWordId = word.id;
          setActiveWordId(word.id);
          if (isMobile && hiddenInputRef.current) {
              hiddenInputRef.current.focus();
          }
      }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getContainerStyles = () => {
      let borderColor = COLORS.gameBorder;
      let boxShadow = '0 0 15px rgba(255, 0, 0, 0.5), inset 0 0 10px rgba(255,255,255,0.1)';
      let animation = shake ? 'shake 0.5s' : '';

      if (gameMode === 'universal') {
          borderColor = COLORS.universal;
          boxShadow = `0 0 15px ${COLORS.universal}, inset 0 0 10px rgba(255,255,255,0.1)`;
      } else if (gameMode === 'speed-test') {
          borderColor = '#ff2a2a';
          boxShadow = '0 0 20px rgba(255, 42, 42, 0.3), inset 0 0 10px rgba(255,255,255,0.1)';
      } else if (streakState === 'fiesta') {
          borderColor = COLORS.comboRed;
          boxShadow = `0 0 30px ${COLORS.comboRed}, inset 0 0 20px rgba(255, 42, 42, 0.2)`;
      } else if (streakState === 'spicy') {
          borderColor = COLORS.comboPurple;
          boxShadow = `0 0 40px ${COLORS.comboPurple}, inset 0 0 30px rgba(217, 0, 255, 0.3)`;
          animation = shake ? 'shake 0.5s' : 'spicyPulse 2s infinite';
      }
      
      return {
          width: '100%',
          height: '100%',
          border: `15px solid ${borderColor}`,
          backgroundColor: COLORS.background,
          boxShadow,
          animation,
          boxSizing: 'border-box' as 'border-box',
      };
  };

  const handleGameTouch = () => {
      if (screen === 'playing' && isMobile && hiddenInputRef.current) {
          hiddenInputRef.current.focus({ preventScroll: true });
      }
  };

  return (
    <div 
        className="flex justify-center items-center w-full bg-black font-['Press_Start_2P'] text-white overflow-hidden relative"
        style={{ height: gameDimensions.height, backgroundColor: COLORS.background, color: COLORS.text }} 
        onTouchStart={handleGameTouch}
    >
        {isMobile && (
            <input 
                ref={hiddenInputRef}
                type="text" 
                className="opacity-0 absolute top-0 left-0 w-1 h-1"
                style={{ transform: 'translate(-1000px, -1000px)' }}
                onChange={handleMobileInput}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />
        )}

        {isGenerating && <GeneratingModal message="Generating text for you to cook..." />}
        {isEvaluating && <GeneratingModal message="Evaluating Performance..." />}

        <div style={getContainerStyles()} className="relative transition-all duration-500 animate-fade-in">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10% 10%, #f4b400 2px, transparent 2px), radial-gradient(circle at 90% 90%, #f4b400 2px, transparent 2px)', backgroundSize: '120px 120px' }}></div>
            
            {sparkles.map(s => (
                <div key={s.id} className="sparkle" style={{ left: s.x, top: s.y, backgroundColor: s.color, '--tx': s.tx, '--ty': s.ty } as any} />
            ))}
            {popups.map(p => (
                <div key={p.id} className="popup-text" style={{ left: p.x, top: p.y, color: p.color, fontSize: '20px' }}>{p.text}</div>
            ))}
            
            {showHighScoreAlert && (
                 <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-[#f4b400] text-xl md:text-2xl animate-bounce z-50 text-center" style={{ textShadow: '2px 2px 0px #000', color: COLORS.warn }}>
                     NEW HIGH SCORE!
                 </div>
            )}

            {!isMobile && (screen === 'start' || screen === 'game-over') && (
                <>
                    <button
                        onClick={() => {
                            audioService.playSound('button_click');
                            setShowLeaderboard(prev => !prev);
                        }}
                        className="absolute top-3 right-3 z-[130] px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-white border border-neutral-700 text-[10px] font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                        title={showLeaderboard ? "Hide Leaderboard" : "Show Leaderboard"}
                    >
                        <span>🏆</span>
                        <span>{showLeaderboard ? "Hide Ranks" : "Leaderboard"}</span>
                    </button>
                    {showLeaderboard && (
                        <div className="absolute top-0 right-0 h-full w-[290px] lg:w-[310px] z-[120] border-l-4 border-white bg-[#0a0a0a] shadow-[-10px_0_30px_rgba(0,0,0,0.8)] animate-fade-in">
                            <LeaderboardWidget className="h-full border-none" allowedModes={['competitive', 'universal', 'speed']} defaultMode={gameMode === 'speed-test' ? 'speed' : 'competitive'} />
                        </div>
                    )}
                </>
            )}

            {screen === 'playing' && (
                <div className="absolute top-0 left-0 w-full p-2 box-border bg-black/40 backdrop-blur-xs z-10 flex flex-col gap-1.5" style={{ color: COLORS.text }}>
                    <div className="flex justify-between items-center w-full text-[10px] md:text-sm font-bold">
                        <button
                            onClick={() => setScreen('paused')}
                            className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 hover:border-white rounded text-[10px] md:text-xs text-white cursor-pointer"
                        >
                            ⏸️ Menu
                        </button>
                        <div>
                            {playStyle === 'competitive' ? `Time: ${formatTimer(elapsedTime)}` : `Score: ${score}`}
                        </div>
                        <div>{'❤️'.repeat(lives)}</div>
                        <div>
                            {gameMode === 'boss' ? 'BOSS' : 
                            (gameMode === 'infinite' || gameMode === 'universal') ? `${stateRef.current.infiniteConfig?.speedMult.toFixed(1)}x` : 
                            `Lvl: ${level}`}
                        </div>
                    </div>
                    {(screen === 'playing' || streak > 0) && (
                        <div className="w-full h-1.5 md:h-2 bg-[#333] border relative" style={{ borderColor: COLORS.text }}>
                            <div 
                                className="h-full transition-all duration-300 ease-out"
                                style={{ 
                                    width: `${Math.min(100, streak < COMBO_FIESTA ? (streak/COMBO_FIESTA)*50 : 50 + ((streak-COMBO_FIESTA)/(COMBO_SPICY-COMBO_FIESTA))*50)}%`,
                                    backgroundColor: streak < COMBO_FIESTA ? '#aaa' : (streak < COMBO_SPICY ? COLORS.comboRed : COLORS.comboPurple)
                                }}
                            />
                            <div className="absolute top-2 md:top-2.5 left-1/2 transform -translate-x-1/2 text-[8px] md:text-[10px] text-[#aaa] shadow-black drop-shadow-md">
                                Streak: {streak}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {gameMode !== 'universal' && gameMode !== 'speed-test' && (
                <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 text-2xl md:text-3xl z-[5] w-[90%] h-[50px] whitespace-nowrap overflow-hidden text-center">
                    {ingredientsCollected.map((icon, i) => (
                        <span key={i} className="inline-block mx-[2px] animate-pop-in">{icon}</span>
                    ))}
                </div>
            )}

            {fallingWords.map(word => (
                <WordComponent 
                    key={word.id} 
                    word={word} 
                    isActive={word.id === activeWordId} 
                    onClick={handleManualSelect}
                />
            ))}

            {screen === 'username-setup' && (
                <UsernameScreen onSubmit={handleUsernameSubmit} />
            )}

            {screen === 'start' && (
                <StartScreen 
                    onStart={() => setScreen('mode-select')}
                    onInfinite={() => {
                        setPlayStyle('unrated');
                        initGame('infinite', 1, 1.0, 1.3);
                    }}
                    onUniversal={() => {
                        setPlayStyle('unrated');
                        initGame('universal');
                    }}
                    onSpeedTest={startSpeedTest}
                    onBackToHub={onBackToHub}
                    user={user}
                    isGenerating={isGenerating}
                    username={customUsername}
                    onUpdateUsername={onUpdateUsername || handleUsernameSubmit}
                    onLogout={onLogout}
                />
            )}

            {screen === 'mode-select' && (
                <ModeSelectScreen 
                    onCompetitive={() => {
                        setPlayStyle('competitive');
                        initGame('standard', 1);
                    }}
                    onUnrated={() => {
                        setPlayStyle('unrated');
                        setScreen('level-select');
                    }}
                    onBack={() => setScreen('start')}
                />
            )}
            
            {screen === 'speed-test-playing' && (
                <TypingSpeedGame 
                    targetText={speedTestText}
                    onComplete={finishSpeedTest}
                    onQuit={handleQuitAttempt}
                />
            )}

            {screen === 'speed-test-result' && speedTestResult && (
                <SpeedResultScreen 
                    wpm={speedTestResult.wpm}
                    cpm={speedTestResult.cpm}
                    accuracy={speedTestResult.accuracy}
                    comment={speedTestResult.comment}
                    onRestart={() => setScreen('start')}
                />
            )}

            {screen === 'level-select' && (
                <LevelSelectScreen 
                    onSelectLevel={(lvl) => initGame('standard', lvl)}
                    onBack={() => setScreen('start')}
                />
            )}

            {screen === 'level-complete' && (
                <LevelCompleteScreen 
                    levelName={level < 5 ? LEVEL_CONFIGS[level]?.name : "Kabsa Feast"}
                    message={playStyle === 'competitive' ? "Ready for next service?" : (level === 3 ? "Delicious noodles! Next up: Prep." : "Level Complete!")}
                    emoji={LEVEL_CONFIGS[level]?.emoji}
                    onNext={nextLevelAction}
                />
            )}

            {screen === 'boss-intro' && (
                <BossIntroScreen onStart={() => initGame('boss', 6)} />
            )}

            {screen === 'game-over' && (
                <GameOverScreen 
                    score={score}
                    message={infoModalText}
                    stats={gameMode === 'infinite' ? `Reached Speed: ${stateRef.current.infiniteConfig.speedMult.toFixed(1)}x` : undefined}
                    onRestart={() => setScreen('start')}
                    onHome={onBackToHub}
                    aiTitle={finalAiTitle}
                    aiScore={finalAiScore}
                    isCalculating={isCalculatingScore}
                    isTimeScore={playStyle === 'competitive'}
                />
            )}

            {screen === 'paused' && !showExitConfirm && (
                <PauseScreen 
                    onResume={() => setScreen('playing')} 
                    onQuit={handleQuitAttempt} 
                    onHome={onBackToHub}
                />
            )}

            {showExitConfirm && (
                <ExitConfirmScreen 
                    onConfirm={() => {
                        setShowExitConfirm(false);
                        setScreen('start');
                    }}
                    onCancel={() => {
                        setShowExitConfirm(false);
                        setScreen('playing');
                    }}
                />
            )}

            {showInfoModal && (
                <InfoModal text={infoModalText} onClose={() => setShowInfoModal(false)} />
            )}
        </div>
    </div>
  );
}
