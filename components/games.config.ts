import { AppId, GlobalGameStats } from '../types';

export interface GameMetadata {
  id: AppId;
  title: string;
  description: string;
  icon: string;
  color: string;
  accentGlow: string;
  tag: string;
  statsKey: keyof GlobalGameStats;
}

export const GAMES_REGISTRY: GameMetadata[] = [
  {
    id: 'taco',
    title: 'Taco Typer',
    description: 'The Original Typing Challenge',
    icon: '🌮',
    color: '#ff9900',
    accentGlow: 'rgba(255, 153, 0, 0.5)',
    tag: 'TYPING',
    statsKey: 'taco_typer_plays'
  },
  {
    id: 'iq',
    title: 'IQ Test',
    description: 'Logic & Patterns Assessment',
    icon: '🧠',
    color: '#00d0ff',
    accentGlow: 'rgba(0, 208, 255, 0.5)',
    tag: 'BRAIN',
    statsKey: 'iq_test_plays'
  },
  {
    id: 'mine',
    title: 'Minesweeper',
    description: 'Classic Strategic Survival',
    icon: '💣',
    color: '#00ff66',
    accentGlow: 'rgba(0, 255, 102, 0.5)',
    tag: 'SURVIVAL',
    statsKey: 'minesweeper_plays'
  },
  {
    id: 'wordle',
    title: 'Wordle',
    description: 'Guess the Hidden Word',
    icon: '📝',
    color: '#bbf000',
    accentGlow: 'rgba(187, 240, 0, 0.5)',
    tag: 'WORD PUZZLE',
    statsKey: 'wordle_plays'
  },
  {
    id: 'angle',
    title: 'Angle',
    description: 'Estimate the Angle',
    icon: '📐',
    color: '#ff1493',
    accentGlow: 'rgba(255, 20, 147, 0.5)',
    tag: 'GEOMETRY',
    statsKey: 'angle_plays'
  },
  {
    id: 'spelling-bee',
    title: 'Spelling Bee',
    description: 'Listen and Spell',
    icon: '🐝',
    color: '#ffd000',
    accentGlow: 'rgba(255, 208, 0, 0.5)',
    tag: 'VOCABULARY',
    statsKey: 'spelling_bee_plays'
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    description: 'Classic 3x3 Strategy',
    icon: '❌',
    color: '#7b61ff',
    accentGlow: 'rgba(123, 97, 255, 0.5)',
    tag: 'CLASSIC',
    statsKey: 'tic_tac_toe_plays'
  },
  {
    id: 'connect-4',
    title: 'Connect 4',
    description: 'Drop and Connect',
    icon: '🔴',
    color: '#ff2255',
    accentGlow: 'rgba(255, 34, 85, 0.5)',
    tag: 'STRATEGY',
    statsKey: 'connect_4_plays'
  },
  {
    id: 'color-memory',
    title: 'Color Memory',
    description: 'Match the Target Color',
    icon: '🎨',
    color: '#d946ef',
    accentGlow: 'rgba(217, 70, 239, 0.5)',
    tag: 'MEMORY',
    statsKey: 'color_memory_plays'
  },
  {
    id: 'particle-physics',
    title: 'Particle Physics',
    description: 'Flow & Collision Sim',
    icon: '⚛️',
    color: '#00f0ff',
    accentGlow: 'rgba(0, 240, 255, 0.5)',
    tag: 'SANDBOX',
    statsKey: 'particle_physics_plays'
  },
  {
    id: 'fruit-merge',
    title: 'Fruit Merge',
    description: 'Suika Watermelon Evolution',
    icon: '🍉',
    color: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.5)',
    tag: 'PHYSICS',
    statsKey: 'fruit_merge_plays'
  },
  {
    id: 'checkers',
    title: 'Checkers',
    description: 'Classic Strategy Draughts',
    icon: '👑',
    color: '#f43f5e',
    accentGlow: 'rgba(244, 63, 94, 0.5)',
    tag: 'BOARD',
    statsKey: 'checkers_plays'
  },
  {
    id: 'dots-and-boxes',
    title: 'Dots & Boxes',
    description: 'Grid Line Capture Battle',
    icon: '📦',
    color: '#0ea5e9',
    accentGlow: 'rgba(14, 165, 233, 0.5)',
    tag: 'LOGIC',
    statsKey: 'dots_and_boxes_plays'
  },
  {
    id: 'snake',
    title: 'Snake',
    description: 'Classic Grid & Speed Scaling',
    icon: '🐍',
    color: '#22c55e',
    accentGlow: 'rgba(34, 197, 94, 0.5)',
    tag: 'ARCADE',
    statsKey: 'snake_plays'
  },
  {
    id: 'brick-breaker',
    title: 'Brick Breaker',
    description: 'Paddle Physics & Laser Barrage',
    icon: '🧱',
    color: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.5)',
    tag: 'ARCADE',
    statsKey: 'brick_breaker_plays'
  },
  {
    id: 'game-2048',
    title: '2048',
    description: 'Tile Merger & Number Puzzle',
    icon: '🔢',
    color: '#eab308',
    accentGlow: 'rgba(234, 179, 8, 0.5)',
    tag: 'PUZZLE',
    statsKey: 'game_2048_plays'
  },
  {
    id: 'ultimate-tictactoe',
    title: 'Ultimate Tic-Tac-Toe',
    description: '9x9 Nested Strategic Battle',
    icon: '⚔️',
    color: '#8b5cf6',
    accentGlow: 'rgba(139, 92, 246, 0.5)',
    tag: 'STRATEGY',
    statsKey: 'ultimate_tictactoe_plays'
  },
  {
    id: 'simon',
    title: 'Simon',
    description: 'Rhythm & Sequence Memory',
    icon: '🔴',
    color: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.5)',
    tag: 'MEMORY',
    statsKey: 'simon_plays'
  },
  {
    id: 'quick-draw',
    title: 'Quick Draw',
    description: 'Reaction Standoff vs Bot',
    icon: '🤠',
    color: '#f97316',
    accentGlow: 'rgba(249, 115, 22, 0.5)',
    tag: 'REACTION',
    statsKey: 'quick_draw_plays'
  },
  {
    id: 'finger-sumo',
    title: 'Finger Sumo',
    description: 'Tug of War Button Smasher',
    icon: '🤼',
    color: '#e11d48',
    accentGlow: 'rgba(225, 29, 72, 0.5)',
    tag: 'TAP DUEL',
    statsKey: 'finger_sumo_plays'
  },
  {
    id: 'pong',
    title: 'Pong',
    description: 'Classic 2D Table Tennis',
    icon: '🏓',
    color: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.5)',
    tag: 'RETRO ARCADE',
    statsKey: 'pong_plays'
  },
  {
    id: 'knife-flip',
    title: 'Knife Flip',
    description: 'Target Dart & Blade Precision',
    icon: '🎯',
    color: '#ec4899',
    accentGlow: 'rgba(236, 72, 153, 0.5)',
    tag: 'PRECISION',
    statsKey: 'knife_flip_plays'
  },
  {
    id: 'reversi',
    title: 'Reversi / Othello',
    description: '8x8 Flanking Strategy',
    icon: '⚪',
    color: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.5)',
    tag: 'STRATEGY',
    statsKey: 'reversi_plays'
  },
  {
    id: 'battleship',
    title: 'Battleship',
    description: 'Naval Radar & Fleet Combat',
    icon: '🚢',
    color: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.5)',
    tag: 'TACTICAL',
    statsKey: 'battleship_plays'
  },
  {
    id: 'nim',
    title: 'Nim Matchstick',
    description: 'Mathematical Logic Duel',
    icon: '🥢',
    color: '#eab308',
    accentGlow: 'rgba(234, 179, 8, 0.5)',
    tag: 'MATH DUEL',
    statsKey: 'nim_plays'
  },
  {
    id: 'tower-stacker',
    title: 'Tower Stacker',
    description: 'Floor Slice & Timing',
    icon: '🏗️',
    color: '#8b5cf6',
    accentGlow: 'rgba(139, 92, 246, 0.5)',
    tag: 'TIMING',
    statsKey: 'tower_stacker_plays'
  },
  {
    id: 'tetris',
    title: 'Tetris',
    description: '7-Bag Matrix Falling Blocks',
    icon: '🧱',
    color: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.5)',
    tag: 'CLASSIC',
    statsKey: 'tetris_plays'
  }
];
