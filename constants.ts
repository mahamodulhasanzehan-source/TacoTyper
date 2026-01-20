
import { LevelConfig } from './types';

// Colors - Using CSS Variables for dynamic theming
export const COLORS = {
  background: 'var(--color-background)',
  gameBorder: 'var(--color-game-border)',
  text: 'var(--color-text)',
  accent: 'var(--color-accent)',
  correct: 'var(--color-correct)',
  warn: 'var(--color-warn)',
  secondaryBtn: 'var(--color-secondary-btn)',
  pro: 'var(--color-pro)',
  comboRed: 'var(--color-combo-red)',
  comboPurple: 'var(--color-combo-purple)',
  universal: 'var(--color-universal)',
};

// Game Constants
export const EXTRA_BUFFER = 3;
export const BOSS_WORD_COUNT = 15;
export const COMBO_FIESTA = 21;
export const COMBO_SPICY = 42;

// Speed Test Content (Replaces AI)
export const SPEED_TEST_TEXTS = [
  "The history of the taco is the history of Mexico itself. It is believed to date back to the 18th century, referring to the little charges of gunpowder used in silver mines. These 'tacos' were pieces of paper wrapped around gunpowder and inserted into holes in the rock face. Today, it represents a culinary explosion of flavor known worldwide.",
  "Saffron is the most expensive spice in the world, derived from the flower of Crocus sativus. It takes about 75,000 flowers to produce just one pound of saffron spice. The labor-intensive harvesting process must be done by hand, making it more valuable by weight than gold in some markets.",
  "The art of fermentation is one of humanity's oldest cooking techniques. From Korean kimchi to German sauerkraut and sourdough bread, cultures around the globe discovered that beneficial bacteria could not only preserve food but unlock complex, savory flavors that fresh ingredients simply cannot match.",
  "Chocolate was once consumed as a bitter, spicy drink by the Maya and Aztecs. It wasn't until it reached Europe and was mixed with sugar and milk that it became the sweet treat we know today. In ancient times, cacao beans were so valuable they were actually used as a currency for trade.",
  "Sushi was originally a method of preserving fish in fermented rice. The rice was thrown away and only the fish was eaten. It wasn't until the Edo period in Japan that fresh fish was served over vinegared rice, creating the modern form of sushi we enjoy today.",
  "Honey is one of the only foods that includes all the substances necessary to sustain life, including enzymes, vitamins, minerals, and water. It is also the only food that does not spoil. Edible honey has been found in ancient Egyptian tombs over 3000 years old.",
  "The Carolina Reaper holds the record for the hottest chili pepper in the world. It averages over 1.6 million Scoville Heat Units. For comparison, a standard Jalapeno pepper measures between 2,500 to 8,000 units. Cooking with it requires protective gear.",
  "Truffles are a type of fungus that grows underground near the roots of certain trees. They are located by using trained pigs or dogs who can smell the distinct aroma from beneath the soil. White truffles from Italy can sell for thousands of dollars per pound.",
  "Wasabi that you eat in most restaurants is actually horseradish dyed green. Real wasabi is made from the root of the Wasabia japonica plant, which is incredibly difficult to grow. True wasabi loses its flavor within 15 minutes of being grated.",
  "Vanilla is the second most expensive spice after saffron because the vanilla orchid is the only orchid of about 25,000 species that produces an edible fruit. In cultivation, each flower must be hand-pollinated within 12 hours of opening."
];

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
  'cat', 'dog', 'run', 'sky', 'sun', 'red', 'blue', 'map', 'key', 'cup', 'box', 'fox', 'gem', 'hat', 'joy',
  'lamp', 'moon', 'nest', 'owl', 'pig', 'rug', 'sea', 'top', 'van', 'web', 'yak', 'zoo', 'ant', 'bee',
  'star', 'tree', 'book', 'door', 'fish', 'goat', 'hill', 'kite', 'lion', 'milk', 'nose', 'pear', 'rain',
  'sand', 'tent', 'vest', 'wolf', 'yarn', 'zero', 'atom', 'baby', 'city', 'desk', 'echo', 'frog', 'gold',
  'hope', 'iron', 'jump', 'king', 'leaf', 'mars', 'note', 'open', 'park', 'quiz', 'road', 'ship', 'time',
  'unit', 'view', 'wall', 'xray', 'yoga', 'zone', 'apple', 'beach', 'cloud', 'dance', 'eagle', 'flame',
  'planet', 'rocket', 'stream', 'tunnel', 'velvet', 'winter', 'yellow', 'anchor', 'bridge', 'castle',
  'dinner', 'engine', 'forest', 'garden', 'hammer', 'island', 'jungle', 'knight', 'ladder', 'magnet',
  'number', 'ocean', 'pencil', 'quartz', 'rabbit', 'silver', 'ticket', 'umbrella', 'valley', 'window',
  'balloon', 'camera', 'desert', 'energy', 'farmer', 'galaxy', 'harbor', 'insect', 'jacket', 'kangaroo',
  'laptop', 'museum', 'napkin', 'orange', 'parrot', 'quiver', 'radish', 'sensor', 'target', 'unicorn',
  'vacuum', 'waiter', 'yogurt', 'zombie', 'airport', 'biology', 'chicken', 'diamond', 'elephant',
  'festival', 'gateway', 'holiday', 'journey', 'kitchen', 'library', 'monster', 'network',
  'adventure', 'beautiful', 'chocolate', 'dangerous', 'education', 'fantastic', 'generator', 'happiness',
  'important', 'jellyfish', 'knowledge', 'landscape', 'mountain', 'notebook', 'operation', 'pineapple',
  'question', 'raspberry', 'satellite', 'telephone', 'umbrella', 'vacation', 'waterfall', 'xylophone',
  'yesterday', 'zookeeper', 'basketball', 'challenge', 'discovery', 'everything', 'friendship',
  'government', 'helicopter', 'incredible', 'journalism', 'laboratory', 'management', 'navigation',
  'observation', 'photograph', 'quarantine', 'reflection', 'strawberry', 'television', 'university',
  'volleyball', 'wonderland', 'acceleration', 'biodiversity', 'conversation'
];

export const INGREDIENT_MAP: Record<string, string> = {
  'beef': '🥩', 'lettuce': '🥬', 'cheese': '🧀', 'salsa': '🍅', 'shell': '🌮', 'corn': '🌽', 'lime': '🍋', 'beans': '🫘', 'guac': '🥑', 'onion': '🧅', 'cilantro': '🌿', 'steak': '🥩',
  'bun': '🍞', 'patty': '🥩', 'ketchup': '🍅', 'mustard': '🟡', 'pickle': '🥒', 'tomato': '🍅', 'bacon': '🥓', 'mayo': '⚪', 'bbq': '🟤',
  'noodle': '🍜', 'broth': '🍲', 'egg': '🥚', 'pork': '🍖', 'shrimp': '🍤', 'garlic': '🧄', 'soy': '⚫', 'chili': '🌶️', 'bok choy': '🥬', 'scallion': '🌿', 'sesame': '🌱', 'tofu': '🧊',
  'camel': '🐪', 'rice': '🍚', 'saffron': '🌺', 'cardamom': '🌰', 'cinnamon': '🪵', 'cloves': '🤎', 'raisins': '🍇', 'almonds': '🥜', 'lamb': '🍖', 'chicken': '🍗', 'ghee': '🧈', 'carrot': '🥕',
  'wash rice': '🍚', 'boil water': '💧', 'chop onion': '🔪', 'slice meat': '🥩', 'peel carrot': '🥕', 'fry nuts': '🥜', 'soak rice': '🍚', 'mix spice': '🧂', 'sharpen': '🔪', 'clean pot': '🧼', 'measure': '📏',
  'heart': '💖', 'default': '🥘'
};

// --- IQ TEST DATA ---
export const IQ_POINTS_MAP: Record<string, number> = {
  "Easy": 3,
  "Medium": 4.5,
  "Hard": 6
};

export const IQ_INFO: Record<string, { comment: string, percentage: string }> = {
  "69": { "comment": "Below Average. A bit slow today?", "percentage": "Bottom 10%" },
  "79": { "comment": "Borderline. Needs more coffee.", "percentage": "Bottom 20%" },
  "89": { "comment": "Low Average. You missed the tricky ones.", "percentage": "Bottom 30%" },
  "99": { "comment": "Average. You function well in society.", "percentage": "Top 50%" },
  "109": { "comment": "High Average. Solid logical thinking.", "percentage": "Top 35%" },
  "119": { "comment": "Superior. Sharp and quick-witted.", "percentage": "Top 15%" },
  "129": { "comment": "Very Superior. Excellent performance.", "percentage": "Top 5%" },
  "139": { "comment": "Gifted. An exceptional logical mind.", "percentage": "Top 2%" },
  "160": { "comment": "Genius. You aced everything.", "percentage": "Top 0.1%" }
};

export interface Question {
  difficulty: "Easy" | "Medium" | "Hard";
  question: string;
  options: string[];
  correctAnswer: string;
}

export const IQ_QUESTIONS: Question[] = [
  // EASY (20 Total)
  { difficulty: "Easy", question: "Pattern: Which letter comes next? S, M, T, W, T, F, ?", options: ["A) S", "B) M", "C) T", "D) W"], correctAnswer: "A" },
  { difficulty: "Easy", question: "Analogy: Finger is to Hand as Leaf is to...", options: ["A) Tree", "B) Branch", "C) Blossom", "D) Bark"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Pattern: Find the odd one out.", options: ["A) Triangle", "B) Square", "C) Circle", "D) Rectangle"], correctAnswer: "C" },
  { difficulty: "Easy", question: "Sequence: What number comes next? 2, 4, 8, 16, ?", options: ["A) 24", "B) 32", "C) 48", "D) 64"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Logic: Which is the odd one out?", options: ["A) Apple", "B) Banana", "C) Carrot", "D) Orange"], correctAnswer: "C" },
  { difficulty: "Easy", question: "Verbal: Which word is opposite of 'Hot'?", options: ["A) Cold", "B) Warm", "C) Boil", "D) Ice"], correctAnswer: "A" },
  { difficulty: "Easy", question: "Logic: What day comes after Friday?", options: ["A) Thursday", "B) Sunday", "C) Saturday", "D) Wednesday"], correctAnswer: "C" },
  { difficulty: "Easy", question: "Math: How many days in a leap year?", options: ["A) 365", "B) 366", "C) 364", "D) 367"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Verbal: 'Up' is to 'Down' as 'Left' is to...", options: ["A) Right", "B) Straight", "C) Back", "D) Turn"], correctAnswer: "A" },
  { difficulty: "Easy", question: "Pattern: Which shape has 4 sides?", options: ["A) Triangle", "B) Circle", "C) Square", "D) Hexagon"], correctAnswer: "C" },
  { difficulty: "Easy", question: "Logic: If you rearrange the letters 'BARK', you get a type of:", options: ["A) Fruit", "B) Sound", "C) Color", "D) Vehicle"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Analogy: Book is to Reading as Fork is to...", options: ["A) Writing", "B) Eating", "C) Sleeping", "D) Running"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Sequence: 5, 10, 15, 20, ?", options: ["A) 22", "B) 25", "C) 30", "D) 35"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Logic: Which word is a color?", options: ["A) Table", "B) Green", "C) Quick", "D) Heavy"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Visual: How many legs does a typical spider have?", options: ["A) 4", "B) 6", "C) 8", "D) 10"], correctAnswer: "C" },
  { difficulty: "Easy", question: "Verbal: What is the plural of 'Child'?", options: ["A) Childs", "B) Children", "C) Childrens", "D) Childes"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Logic: If 1+1=2, then 2+2=?", options: ["A) 3", "B) 4", "C) 5", "D) 6"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Pattern: O, T, T, F, F, S, S, E, ?", options: ["A) T", "B) N", "C) E", "D) Z"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Analogy: Water is to Liquid as Ice is to...", options: ["A) Gas", "B) Solid", "C) Steam", "D) Juice"], correctAnswer: "B" },
  { difficulty: "Easy", question: "Logic: Which month has 28 days?", options: ["A) February", "B) March", "C) All of them", "D) January"], correctAnswer: "C" },

  // MEDIUM (20 Total)
  { difficulty: "Medium", question: "Logic: Some kings are queens. All queens are beautiful. Therefore...", options: ["A) All kings are beautiful", "B) Some kings are beautiful", "C) No kings are beautiful", "D) All queens are kings"], correctAnswer: "B" },
  { difficulty: "Medium", question: "Spatial: If you rotate 'b' 180 degrees clockwise, what letter is it?", options: ["A) p", "B) d", "C) q", "D) g"], correctAnswer: "C" },
  { difficulty: "Medium", question: "Verbal: Opposite of 'Candid'?", options: ["A) Honest", "B) Secretive", "C) Frank", "D) Open"], correctAnswer: "B" },
  { difficulty: "Medium", question: "Logic: 5 machines make 5 widgets in 5 minutes. 100 machines make 100 widgets in?", options: ["A) 100 minutes", "B) 20 minutes", "C) 5 minutes", "D) 1 minute"], correctAnswer: "C" },
  { difficulty: "Medium", question: "Sequence: 1, 1, 2, 3, 5, 8, ?", options: ["A) 11", "B) 12", "C) 13", "D) 14"], correctAnswer: "C" },
  { difficulty: "Medium", question: "Logic: Mary's father has 5 daughters: Nana, Nene, Nini, Nono. The 5th is?", options: ["A) Nunu", "B) Nina", "C) Mary", "D) Nancy"], correctAnswer: "C" },
  { difficulty: "Medium", question: "Math: Bat + Ball = $1.10. Bat is $1.00 more than Ball. Cost of Ball?", options: ["A) $0.10", "B) $0.05", "C) $0.01", "D) $0.15"], correctAnswer: "B" },
  { difficulty: "Medium", question: "Logic: Rearrange \"CIFAIPC\". It is a(n):", options: ["A) City", "B) Animal", "C) Ocean", "D) Country"], correctAnswer: "C" },
  { difficulty: "Medium", question: "Verbal: Anagram of 'LISTEN'?", options: ["A) SILENT", "B) LISTED", "C) TENSE", "D) NETS"], correctAnswer: "A" },
  { difficulty: "Medium", question: "Sequence: 10, 8, 6, 4, ?", options: ["A) 3", "B) 2", "C) 1", "D) 0"], correctAnswer: "B" },
  { difficulty: "Medium", question: "Math: A baker has 17 cookies. All but 9 are sold. How many are left?", options: ["A) 8", "B) 9", "C) 17", "D) 0"], correctAnswer: "B" },
  { difficulty: "Medium", question: "Verbal: Which word does not belong? Whale, Shark, Dolphin, Seal", options: ["A) Whale", "B) Shark", "C) Dolphin", "D) Seal"], correctAnswer: "B" },
  { difficulty: "Medium", question: "Logic: If A=1, B=2, C=3, what is (A+B+C) / 2?", options: ["A) 2", "B) 3", "C) 4", "D) 6"], correctAnswer: "B" },
  { difficulty: "Medium", question: "Spatial: Which comes next? Up, Right, Down, ?", options: ["A) Up", "B) Right", "C) Left", "D) North"], correctAnswer: "C" },
  { difficulty: "Medium", question: "Logic: If you follow me, you are second. If you lead me, you are first. What am I?", options: ["A) A Shadow", "B) A Dream", "C) A Leader", "D) A Follower"], correctAnswer: "A" },
  { difficulty: "Medium", question: "Pattern: 1, 4, 9, 16, 25, ?", options: ["A) 30", "B) 36", "C) 42", "D) 49"], correctAnswer: "B" },
  { difficulty: "Medium", question: "Verbal: What is to 'Humble' as 'Arrogant' is to 'Proud'?", options: ["A) Modest", "B) Loud", "C) Mean", "D) Fast"], correctAnswer: "A" },
  { difficulty: "Medium", question: "Logic: A clock shows 3:15. What is the angle between the hands?", options: ["A) 0°", "B) 7.5°", "C) 15°", "D) 90°"], correctAnswer: "B" },
  { difficulty: "Medium", question: "Math: 2x + 10 = 20. What is x?", options: ["A) 5", "B) 10", "C) 15", "D) 2"], correctAnswer: "A" },
  { difficulty: "Medium", question: "Verbal: Synonm for 'Gregarious'?", options: ["A) Shy", "B) Sociable", "C) Angry", "D) Lazy"], correctAnswer: "B" },

  // HARD (20 Total)
  { difficulty: "Hard", question: "Sequence: 2, 6, 12, 20, 30, ?", options: ["A) 40", "B) 42", "C) 44", "D) 46"], correctAnswer: "B" },
  { difficulty: "Hard", question: "Logic: All A are B. All B are C. Therefore...", options: ["A) All C are A", "B) Some C are not B", "C) All A are C", "D) No A is C"], correctAnswer: "C" },
  { difficulty: "Hard", question: "Analogy: 'Melt' is to 'Liquid' as 'Freeze' is to...", options: ["A) Ice", "B) Solid", "C) Water", "D) Cold"], correctAnswer: "B" },
  { difficulty: "Hard", question: "Spatial: Face North. Turn 90 Right, 180 Left. Facing?", options: ["A) West", "B) East", "C) South", "D) North"], correctAnswer: "A" },
  { difficulty: "Hard", question: "Sequence: 1, 2, 6, 24, 120, ?", options: ["A) 360", "B) 720", "C) 500", "D) 600"], correctAnswer: "B" },
  { difficulty: "Hard", question: "Pattern: 27, 64, 100, 125. Odd one out?", options: ["A) 27", "B) 64", "C) 100", "D) 125"], correctAnswer: "C" },
  { difficulty: "Hard", question: "Logic: If yesterday was tomorrow, today would be Friday. What day is it?", options: ["A) Friday", "B) Sunday", "C) Wednesday", "D) Saturday"], correctAnswer: "B" },
  { difficulty: "Hard", question: "Sequence: 3, 4, 7, 11, 18, 29, ?", options: ["A) 43", "B) 45", "C) 47", "D) 49"], correctAnswer: "C" },
  { difficulty: "Hard", question: "Math: If 3 cats kill 3 rats in 3 minutes, how long for 100 cats to kill 100 rats?", options: ["A) 100", "B) 3", "C) 30", "D) 1"], correctAnswer: "B" },
  { difficulty: "Hard", question: "Pattern: What number fits? 14, 28, 20, 40, 32, 64, ?", options: ["A) 52", "B) 56", "C) 96", "D) 128"], correctAnswer: "B" },
  { difficulty: "Hard", question: "Logic: A is taller than B. C is shorter than A. Who is the tallest?", options: ["A) A", "B) B", "C) C", "D) Cannot tell"], correctAnswer: "A" },
  { difficulty: "Hard", question: "Math: Which is larger? 25% of 80 or 80% of 25?", options: ["A) 25% of 80", "B) 80% of 25", "C) They are equal", "D) 25% of 25"], correctAnswer: "C" },
  { difficulty: "Hard", question: "Spatial: A cube has 6 faces. How many vertices does it have?", options: ["A) 6", "B) 8", "C) 10", "D) 12"], correctAnswer: "B" },
  { difficulty: "Hard", question: "Logic: If 5+3=28, 9+1=810, 2+1=13, then 5+4=?", options: ["A) 19", "B) 9", "C) 11", "D) 10"], correctAnswer: "A" },
  { difficulty: "Hard", question: "Verbal: Find the word that can be added to the front of: LIGHT, BREAK, FAST", options: ["A) DAY", "B) SUN", "C) NIGHT", "D) STAR"], correctAnswer: "A" },
  { difficulty: "Hard", question: "Math: 0.5, 0.25, 0.125, ?", options: ["A) 0.0625", "B) 0.05", "C) 0.1", "D) 0.0125"], correctAnswer: "A" },
  { difficulty: "Hard", question: "Logic: What comes next? A1, C3, E5, G7, ?", options: ["A) H8", "B) I9", "C) J10", "D) K11"], correctAnswer: "B" },
  { difficulty: "Hard", question: "Spatial: How many triangles are in a Star of David?", options: ["A) 2", "B) 4", "C) 6", "D) 8"], correctAnswer: "D" },
  { difficulty: "Hard", question: "Sequence: 8, 2, 4, 1, 2, 0.5, ?", options: ["A) 1", "B) 0.25", "C) 0.5", "D) 0"], correctAnswer: "A" },
  { difficulty: "Hard", question: "Logic: If 1=3, 2=3, 3=5, 4=4, 5=4, then 6=?", options: ["A) 3", "B) 4", "C) 5", "D) 6"], correctAnswer: "A" }
];
