
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
  | 'hub'
  | 'start' 
  | 'username-setup'
  | 'mode-select'
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
export type PlayStyle = 'unrated' | 'competitive';

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

export interface SessionStats {
  mistakes: number;
  timeTaken: number; // in seconds
  ingredientsMissed: number; // lives lost basically
  rottenWordsTyped: number;
  totalScore: number;
  levelReached: number;
}

export interface LeaderboardEntry {
  id: string;
  uid: string;
  username: string;
  score: number; // AI Calculated or Raw
  title: string; // AI Given title
  stats: SessionStats;
  timestamp: number;
  levelReached: number;
  mode: string;
  accuracy?: number; // Specific for Speed Test
}

export type ActiveApp = 
  | 'hub'
  | 'taco'
  | 'iq-test'
  | 'minesweeper'
  | 'wordle'
  | 'angle'
  | 'spelling-bee'
  | 'tic-tac-toe'
  | 'connect-4'
  | 'gun-game'
  | 'color-memory'
  | 'particle-physics'
  | 'fruit-merge'
  | 'checkers'
  | 'dots-and-boxes';

export interface GlobalGameStats {
  taco_typer_plays: number;
  iq_test_plays: number;
  minesweeper_plays: number;
  wordle_plays: number;
  angle_plays: number;
  spelling_bee_plays: number;
  tic_tac_toe_plays: number;
  connect_4_plays: number;
  gun_game_plays: number;
  color_memory_plays: number;
  particle_physics_plays: number;
  more_less_plays?: number;
  fruit_merge_plays?: number;
  checkers_plays?: number;
  dots_and_boxes_plays?: number;
}
