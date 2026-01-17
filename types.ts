export type WordType = 'normal' | 'rotten' | 'heart';

export interface WordEntity {
  id: string;
  text: string;
  type: WordType;
  x: number;
  y: number;
  typed: string;
}

export type GameScreen = 
  | 'start' 
  | 'level-select' 
  | 'infinite-select' 
  | 'playing' 
  | 'speed-test-playing'
  | 'speed-test-result'
  | 'paused' 
  | 'level-complete' 
  | 'boss-intro' 
  | 'game-over';

export type GameMode = 'standard' | 'infinite' | 'boss' | 'universal' | 'speed-test';

export type StreakState = 'normal' | 'fiesta' | 'spicy';

export interface LevelConfig {
  name: string;
  goal: number;
  words: string[];
  traps: string[];
  emoji: string;
}

export interface InfiniteConfig {
  speedMult: number;
  difficultyIncrease: number;
  wordsTyped: number;
}

export interface UniversalConfig {
  wordCount: number;
  maxWordLength: number;
  forcedWordsLeft: number;
}