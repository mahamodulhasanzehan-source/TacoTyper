import { LevelConfig } from './types';

// Colors
export const COLORS = {
  background: '#000000',
  gameBorder: '#990000',
  text: '#ffffff',
  accent: '#e55934',
  correct: '#57a863',
  warn: '#f4b400',
  secondaryBtn: '#7f8c8d',
  pro: '#ff0055',
  comboRed: '#ff2a2a',
  comboPurple: '#d900ff',
  universal: '#4facfe',
};

// Game Constants
export const EXTRA_BUFFER = 3;
export const BOSS_WORD_COUNT = 15;
export const COMBO_FIESTA = 21;
export const COMBO_SPICY = 42;

// Levels
export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: {
    name: "Taco Time",
    goal: 7,
    words: ['beef', 'lettuce', 'cheese', 'salsa', 'shell', 'corn', 'lime', 'beans', 'guac', 'onion', 'cilantro', 'steak'],
    traps: ['mold', 'fly', 'hair', 'dirt'],
    emoji: '🌮'
  },
  2: {
    name: "Burger Flip",
    goal: 8,
    words: ['bun', 'patty', 'ketchup', 'mustard', 'pickle', 'onion', 'tomato', 'bacon', 'mayo', 'cheese', 'lettuce', 'bbq'],
    traps: ['burnt', 'raw', 'soggy', 'stale'],
    emoji: '🍔'
  },
  3: {
    name: "Noodle Night",
    goal: 9,
    words: ['noodle', 'broth', 'egg', 'pork', 'shrimp', 'garlic', 'soy', 'chili', 'bok choy', 'scallion', 'sesame', 'tofu'],
    traps: ['salty', 'cold', 'spill', 'hair'],
    emoji: '🍝'
  },
  4: {
    name: "Arabian Prep",
    goal: 10,
    words: ['wash rice', 'boil water', 'chop onion', 'slice meat', 'peel carrot', 'fry nuts', 'soak rice', 'mix spice', 'sharpen', 'clean pot', 'measure'],
    traps: ['cut finger', 'drop knife', 'spill water', 'burn hand'],
    emoji: '🍲'
  },
  5: {
    name: "Kabsa Feast",
    goal: 15,
    words: ['camel', 'rice', 'saffron', 'cardamom', 'cinnamon', 'cloves', 'raisins', 'almonds', 'chicken', 'lamb', 'ghee', 'stock', 'simmer', 'steam', 'serve', 'onion', 'carrot'],
    traps: ['burnt', 'bitter', 'raw', 'salty', 'dry'],
    emoji: '🍛'
  }
};

export const INFINITE_POOL = [
  ...LEVEL_CONFIGS[1].words,
  ...LEVEL_CONFIGS[2].words,
  ...LEVEL_CONFIGS[3].words
];

export const TRAP_WORDS = ['mold', 'hair', 'fly', 'dirt', 'soap', 'rust', 'dust', 'bug', 'worm', 'ash'];
export const BOSS_WORDS = ['socialize', 'party', 'dance', 'laugh', 'gossip', 'music', 'drinks', 'friends', 'mingle', 'chat', 'vibes', 'hosting', 'cheers', 'toast', 'guests'];

export const UNIVERSAL_DICTIONARY = [
  // 3-5
  'cat', 'dog', 'run', 'sky', 'sun', 'red', 'blue', 'map', 'key', 'cup', 'box', 'fox', 'gem', 'hat', 'joy',
  'lamp', 'moon', 'nest', 'owl', 'pig', 'rug', 'sea', 'top', 'van', 'web', 'yak', 'zoo', 'ant', 'bee',
  'star', 'tree', 'book', 'door', 'fish', 'goat', 'hill', 'kite', 'lion', 'milk', 'nose', 'pear', 'rain',
  'sand', 'tent', 'vest', 'wolf', 'yarn', 'zero', 'atom', 'baby', 'city', 'desk', 'echo', 'frog', 'gold',
  'hope', 'iron', 'jump', 'king', 'leaf', 'mars', 'note', 'open', 'park', 'quiz', 'road', 'ship', 'time',
  'unit', 'view', 'wall', 'xray', 'yoga', 'zone', 'apple', 'beach', 'cloud', 'dance', 'eagle', 'flame',
  // 6-8
  'planet', 'rocket', 'stream', 'tunnel', 'velvet', 'winter', 'yellow', 'anchor', 'bridge', 'castle',
  'dinner', 'engine', 'forest', 'garden', 'hammer', 'island', 'jungle', 'knight', 'ladder', 'magnet',
  'number', 'ocean', 'pencil', 'quartz', 'rabbit', 'silver', 'ticket', 'umbrella', 'valley', 'window',
  'balloon', 'camera', 'desert', 'energy', 'farmer', 'galaxy', 'harbor', 'insect', 'jacket', 'kangaroo',
  'laptop', 'museum', 'napkin', 'orange', 'parrot', 'quiver', 'radish', 'sensor', 'target', 'unicorn',
  'vacuum', 'waiter', 'yogurt', 'zombie', 'airport', 'biology', 'chicken', 'diamond', 'elephant',
  'festival', 'gateway', 'holiday', 'journey', 'kitchen', 'library', 'monster', 'network',
  // 9+
  'adventure', 'beautiful', 'chocolate', 'dangerous', 'education', 'fantastic', 'generator', 'happiness',
  'important', 'jellyfish', 'knowledge', 'landscape', 'mountain', 'notebook', 'operation', 'pineapple',
  'question', 'raspberry', 'satellite', 'telephone', 'umbrella', 'vacation', 'waterfall', 'xylophone',
  'yesterday', 'zookeeper', 'basketball', 'challenge', 'discovery', 'everything', 'friendship',
  'government', 'helicopter', 'incredible', 'journalism', 'laboratory', 'management', 'navigation',
  'observation', 'photograph', 'quarantine', 'reflection', 'strawberry', 'television', 'university',
  'volleyball', 'wonderland', 'acceleration', 'biodiversity', 'conversation'
];

export const INGREDIENT_MAP: Record<string, string> = {
  // Taco
  'beef': '🥩', 'lettuce': '🥬', 'cheese': '🧀', 'salsa': '🍅', 'shell': '🌮', 'corn': '🌽', 'lime': '🍋', 'beans': '🫘', 'guac': '🥑', 'onion': '🧅', 'cilantro': '🌿', 'steak': '🥩',
  // Burger
  'bun': '🍞', 'patty': '🥩', 'ketchup': '🍅', 'mustard': '🟡', 'pickle': '🥒', 'tomato': '🍅', 'bacon': '🥓', 'mayo': '⚪', 'bbq': '🟤',
  // Noodle
  'noodle': '🍜', 'broth': '🍲', 'egg': '🥚', 'pork': '🍖', 'shrimp': '🍤', 'garlic': '🧄', 'soy': '⚫', 'chili': '🌶️', 'bok choy': '🥬', 'scallion': '🌿', 'sesame': '🌱', 'tofu': '🧊',
  // Kabsa
  'camel': '🐪', 'rice': '🍚', 'saffron': '🌺', 'cardamom': '🌰', 'cinnamon': '🪵', 'cloves': '🤎', 'raisins': '🍇', 'almonds': '🥜', 'lamb': '🍖', 'chicken': '🍗', 'ghee': '🧈', 'carrot': '🥕',
  // Prep
  'wash rice': '🍚', 'boil water': '💧', 'chop onion': '🔪', 'slice meat': '🥩', 'peel carrot': '🥕', 'fry nuts': '🥜', 'soak rice': '🍚', 'mix spice': '🧂', 'sharpen': '🔪', 'clean pot': '🧼', 'measure': '📏',
  // Special
  'heart': '💖', 'default': '🥘'
};