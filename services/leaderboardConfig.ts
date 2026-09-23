import { AppId } from '../types';

export interface GameLeaderboardConfig {
  title: string;
  modes: string[];
  labels: Record<string, string>;
  metricType: 'streak' | 'time' | 'score' | 'cps' | 'iq';
  scoreLabel: string;
  defaultMode?: string;
  isDesktopOnly?: boolean;
}

export const GAME_LEADERBOARD_CONFIGS: Partial<Record<AppId, GameLeaderboardConfig>> = {
  // Group A: Win Streak
  'tic-tac-toe': {
    title: 'Tic Tac Toe Masters',
    modes: ['tic_tac_toe-medium', 'tic_tac_toe-hard'],
    labels: { 'tic_tac_toe-medium': 'MEDIUM', 'tic_tac_toe-hard': 'HARD' },
    metricType: 'streak',
    scoreLabel: 'STREAK',
    defaultMode: 'tic_tac_toe-medium'
  },
  'wordle': {
    title: 'Wordle Streaks',
    modes: ['wordle-5', 'wordle-6', 'wordle-7', 'wordle-8', 'wordle-9'],
    labels: { 'wordle-5': '5 LTR', 'wordle-6': '6 LTR', 'wordle-7': '7 LTR', 'wordle-8': '8 LTR', 'wordle-9': '9 LTR' },
    metricType: 'streak',
    scoreLabel: 'STREAK',
    defaultMode: 'wordle-5'
  },
  'angle': {
    title: 'Angle Snipers',
    modes: ['angle'],
    labels: { 'angle': 'STREAK' },
    metricType: 'streak',
    scoreLabel: 'STREAK',
    defaultMode: 'angle'
  },
  'dots-and-boxes': {
    title: 'Dots & Boxes Champions',
    modes: ['dots_and_boxes-4', 'dots_and_boxes-5', 'dots_and_boxes-6'],
    labels: { 'dots_and_boxes-4': '4x4', 'dots_and_boxes-5': '5x5', 'dots_and_boxes-6': '6x6' },
    metricType: 'streak',
    scoreLabel: 'STREAK',
    defaultMode: 'dots_and_boxes-4'
  },
  'nim': {
    title: 'Nim Duelists',
    modes: ['nim'],
    labels: { 'nim': 'DUEL' },
    metricType: 'streak',
    scoreLabel: 'STREAK',
    defaultMode: 'nim'
  },
  'pong': {
    title: 'Pong Ralliers',
    modes: ['pong-medium', 'pong-hard'],
    labels: { 'pong-medium': 'MEDIUM', 'pong-hard': 'HARD' },
    metricType: 'streak',
    scoreLabel: 'STREAK',
    defaultMode: 'pong-medium'
  },

  // Group B: Fastest Time
  'mine': {
    title: 'Top Defusers',
    modes: ['minesweeper-beginner', 'minesweeper-intermediate', 'minesweeper-expert'],
    labels: { 'minesweeper-beginner': 'BEG', 'minesweeper-intermediate': 'INT', 'minesweeper-expert': 'EXP' },
    metricType: 'time',
    scoreLabel: 'TIME',
    defaultMode: 'minesweeper-beginner'
  },
  'ultimate-tictactoe': {
    title: 'Ultimate Speedrunners',
    modes: ['ultimate_tictactoe-medium', 'ultimate_tictactoe-hard', 'ultimate_tictactoe-master'],
    labels: { 'ultimate_tictactoe-medium': 'MED', 'ultimate_tictactoe-hard': 'HARD', 'ultimate_tictactoe-master': 'MAST' },
    metricType: 'time',
    scoreLabel: 'TIME',
    defaultMode: 'ultimate_tictactoe-medium'
  },
  'reversi': {
    title: 'Reversi Grandmasters',
    modes: ['reversi-medium', 'reversi-hard'],
    labels: { 'reversi-medium': 'MEDIUM', 'reversi-hard': 'HARD' },
    metricType: 'time',
    scoreLabel: 'TIME',
    defaultMode: 'reversi-medium'
  },
  'checkers': {
    title: 'Checkers Speed Wins',
    modes: ['checkers-medium', 'checkers-hard'],
    labels: { 'checkers-medium': 'MEDIUM', 'checkers-hard': 'HARD' },
    metricType: 'time',
    scoreLabel: 'TIME',
    defaultMode: 'checkers-medium'
  },

  // Group C: High Score / Progression
  'knife-flip': {
    title: 'Knife Throwers',
    modes: ['knife_flip'],
    labels: { 'knife_flip': 'BLADES' },
    metricType: 'score',
    scoreLabel: 'BLADES',
    defaultMode: 'knife_flip'
  },
  'snake': {
    title: 'Longest Serpents',
    modes: ['snake'],
    labels: { 'snake': 'LENGTH' },
    metricType: 'score',
    scoreLabel: 'LEN',
    defaultMode: 'snake'
  },
  'brick-breaker': {
    title: 'Brick Breaker Legends',
    modes: ['brick_breaker'],
    labels: { 'brick_breaker': 'SCORE' },
    metricType: 'score',
    scoreLabel: 'PTS',
    defaultMode: 'brick_breaker'
  },
  'color-memory': {
    title: 'Color Perception',
    modes: ['color_memory'],
    labels: { 'color_memory': 'ACC' },
    metricType: 'score',
    scoreLabel: 'ACC',
    defaultMode: 'color_memory'
  },
  'fruit-merge': {
    title: 'Fruit Harvesters',
    modes: ['fruit_merge'],
    labels: { 'fruit_merge': 'SCORE' },
    metricType: 'score',
    scoreLabel: 'PTS',
    defaultMode: 'fruit_merge'
  },
  'simon': {
    title: 'Memory Sequence',
    modes: ['simon'],
    labels: { 'simon': 'SEQ' },
    metricType: 'score',
    scoreLabel: 'STEPS',
    defaultMode: 'simon'
  },
  'tower-stacker': {
    title: 'Skyscraper Builders',
    modes: ['tower_stacker'],
    labels: { 'tower_stacker': 'FLOORS' },
    metricType: 'score',
    scoreLabel: 'FLOORS',
    defaultMode: 'tower_stacker'
  },
  'tetris': {
    title: 'Tetris Hall of Fame',
    modes: ['tetris'],
    labels: { 'tetris': 'SCORE' },
    metricType: 'score',
    scoreLabel: 'PTS',
    defaultMode: 'tetris'
  },
  'game-2048': {
    title: '2048 Architects',
    modes: ['game_2048-3', 'game_2048-4', 'game_2048-5'],
    labels: { 'game_2048-3': '3x3', 'game_2048-4': '4x4', 'game_2048-5': '5x5' },
    metricType: 'score',
    scoreLabel: 'PTS',
    defaultMode: 'game_2048-4'
  },
  'iq': {
    title: 'Top Minds',
    modes: ['iq-test'],
    labels: { 'iq-test': 'IQ' },
    metricType: 'iq',
    scoreLabel: 'IQ',
    defaultMode: 'iq-test'
  },

  // Group D: Multi-Metric & Custom Mechanics
  'connect-4': {
    title: 'Connect 4 Champions',
    modes: ['connect_4-time', 'connect_4-streak'],
    labels: { 'connect_4-time': 'FASTEST', 'connect_4-streak': 'STREAK' },
    metricType: 'time',
    scoreLabel: 'TIME',
    defaultMode: 'connect_4-time'
  },
  'quick-draw': {
    title: 'Quick Draw Legends',
    modes: ['quick_draw-medium-time', 'quick_draw-medium-streak', 'quick_draw-hard-time', 'quick_draw-hard-streak'],
    labels: {
      'quick_draw-medium-time': 'MED TIME',
      'quick_draw-medium-streak': 'MED STRK',
      'quick_draw-hard-time': 'HRD TIME',
      'quick_draw-hard-streak': 'HRD STRK'
    },
    metricType: 'time',
    scoreLabel: 'TIME',
    defaultMode: 'quick_draw-medium-time'
  },
  'finger-sumo': {
    title: 'Finger Sumo Kings',
    modes: ['finger_sumo-medium', 'finger_sumo-hard'],
    labels: { 'finger_sumo-medium': 'MEDIUM', 'finger_sumo-hard': 'HARD' },
    metricType: 'cps',
    scoreLabel: 'CPS',
    defaultMode: 'finger_sumo-medium'
  },
  'taco': {
    title: 'Top Chefs',
    modes: ['competitive', 'universal', 'speed'],
    labels: { 'competitive': 'COMP', 'universal': 'UNIV', 'speed': 'SPEED' },
    metricType: 'score',
    scoreLabel: 'PTS',
    defaultMode: 'competitive',
    isDesktopOnly: true
  },
  'chess': {
    title: 'Chess Grandmasters',
    modes: ['chess-easy', 'chess-medium', 'chess-hard'],
    labels: { 'chess-easy': 'EASY', 'chess-medium': 'MED', 'chess-hard': 'HARD' },
    metricType: 'streak',
    scoreLabel: 'STREAK',
    defaultMode: 'chess-medium'
  },
  'battleship': {
    title: 'Naval Admirals',
    modes: ['battleship-easy', 'battleship-medium', 'battleship-hard'],
    labels: { 'battleship-easy': 'EASY', 'battleship-medium': 'MED', 'battleship-hard': 'HARD' },
    metricType: 'streak',
    scoreLabel: 'STREAK',
    defaultMode: 'battleship-medium'
  },
  'more-less': {
    title: 'Higher Lower Streaks',
    modes: ['more_less'],
    labels: { 'more_less': 'STREAK' },
    metricType: 'streak',
    scoreLabel: 'STREAK',
    defaultMode: 'more_less'
  },
  'spelling-bee': {
    title: 'Spelling Bee Champions',
    modes: ['spelling_bee'],
    labels: { 'spelling_bee': 'WORDS' },
    metricType: 'score',
    scoreLabel: 'WORDS',
    defaultMode: 'spelling_bee'
  }
};
