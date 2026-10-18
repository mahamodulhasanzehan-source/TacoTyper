import { SessionStats } from '../types';

export interface HeadChefEvaluation {
  score: number;
  title: string;
  comment: string;
  outcomeCategory: string;
}

import { SPEED_TEST_TEXTS } from '../constants';

export const DIVERSE_SPEED_TEXTS: string[] = [
  ...SPEED_TEST_TEXTS,
  "The concept of zero as both a placeholder and a numerical value emerged independently across ancient civilizations, notably in Babylonian astronomical tables and Mayan calendars. However, its formalization into mathematical arithmetic occurred in seventh-century India with mathematician Brahmagupta, paving the way for algebra and calculus.",
  "Deep in the heart of our cells, deoxyribonucleic acid coils into elegant double-helix structures. Encoded within just four chemical bases is the molecular blueprint for every protein that sustains life, testifying to billions of years of biological evolution.",
  "Mount Everest, standing at over eight thousand eight hundred meters above sea level, was formed by the violent collision of the Indian and Eurasian tectonic plates fifty million years ago. Even today, the mighty range continues to climb several millimeters each year as the continental landmasses grind together.",
  "In 1915, Albert Einstein published his general theory of relativity, proposing that gravity is not a traditional force, but rather the curvature of spacetime produced by mass and energy. The historic theory was dramatically confirmed four years later during a total solar eclipse.",
  "Coral reefs represent some of the most biodiverse and fragile ecosystems on Earth. Though they cover less than one percent of the ocean floor, these bustling marine cities provide shelter, breeding grounds, and sustenance for more than a quarter of all known marine species."
];

let lastTextIndex = -1;

export function getDeterministicSpeedText(): string {
  let idx = Math.floor(Math.random() * DIVERSE_SPEED_TEXTS.length);
  if (idx === lastTextIndex && DIVERSE_SPEED_TEXTS.length > 1) {
    idx = (idx + 1) % DIVERSE_SPEED_TEXTS.length;
  }
  lastTextIndex = idx;
  return DIVERSE_SPEED_TEXTS[idx];
}

const CHEF_CRITIQUES = {
  michelinVirtuoso: [
    "Gordon Ramsay is weeping tears of joy! The tortillas are flying, the salsa is singing, and you just earned three Michelin stars in sixty seconds flat!",
    "Absolute perfection, Chef! Your knife speed broke the sound barrier and not a single cilantro leaf was out of place. Sensational work!",
    "Magnífico! The entire kitchen froze just to watch you prep. That wasn't just typing, that was culinary poetry!",
    "Three Michelin stars! Customers are standing up and applauding your prep line right now. Take the rest of the night off as kitchen royalty!"
  ],
  executiveChef: [
    "Outstanding line work! Your fingers move faster than a veteran sous chef during a brutal Friday dinner rush. Immaculate plating!",
    "Now THAT is how a professional runs a service! Razor-sharp precision, blistering tempo, and pure swagger. Take a bow!",
    "Incredible rhythm, Chef! Every taco was folded to golden ratio precision at lightning speed. You run this kitchen now!",
    "Flawless execution! You prepped orders before the ticket machine even finished printing. Keep this up and you'll own the restaurant!"
  ],
  sousChef: [
    "Solid shift on the line! Quick hands, crisp carnitas, and zero dropped orders. The head chef actually smiled—a true miracle!",
    "Impressive technique! You handled that dinner rush with cool confidence and sharp timing. Very respectable service!",
    "Great speed and clean execution! The grill didn't smoke, the guests are satisfied, and your prep station is shining. Good work!",
    "Hot plate, coming through! Dependable, fast, and accurate. You're the backbone of this kitchen tonight!"
  ],
  lineCook: [
    "Order up! You survived the dinner rush without setting the kitchen on fire. Keep your elbows tucked and sharpen those knives!",
    "Not bad at all! You got the tacos out on time. Work on shaving half a second off your chop and you'll be unstoppable.",
    "Respectable effort! The flavors are good and the plates are moving. Keep building that muscle memory!",
    "A steady shift! You didn't crack under the heat. A little more fire in your fingers and you'll climb to Sous Chef in no time."
  ],
  prepCook: [
    "You're still chopping onions while the dining room is packed! Decent accuracy, but you need a double espresso and faster hands!",
    "The technique is there, rookie, but the customers are checking their watches! Pick up the tempo before the guac turns brown!",
    "Steady, but too slow for a Friday night rush! Put some rhythm in your wrists and don't double-guess every key!",
    "You didn't drop the tray, which is something. Now let's see you double that prep speed before the dinner rush hits!"
  ],
  panicInKitchen: [
    "IT'S RAW! You typed faster than your brain was cooking! We ordered street tacos and you sent out alphabet confetti! Slow down and read the ticket!",
    "Look at this kitchen disaster! You flew through the orders like a tornado and spilled sour cream over everyone! Speed means nothing without precision!",
    "Who taught you how to prep?! You're moving at eighty miles an hour in the wrong direction! Slow down, check your seasoning, and respect the ingredients!",
    "Stop! Just stop! You chopped through the cutting board, the table, and the customer's napkin! Take a breath and aim for accuracy!"
  ],
  guacamoleStalling: [
    "Meticulous presentation, Chef... but Table 4 has been waiting for their chips and salsa since last Tuesday! Pick up the tempo!",
    "Your accuracy is majestic, but snails are passing your station! Food needs to be delicious AND hot. Move those fingers!",
    "Museum-grade precision, but this is a street taco stand, not the Louvre! Don't spend twenty seconds arranging a single coriander leaf!",
    "Every letter was pristine, but the entire restaurant fell asleep waiting for the entree! Let's inject some adrenaline into that typing!"
  ],
  kitchenCatastrophe: [
    "Shut it down! Even the microwave cooks faster than this, and with better spelling! Put down the spatula, wipe your station, and let's restart!",
    "Disaster! You burned the tortillas, misspelled the salsa, and locked the head chef in the freezer! Deep breath, wash your hands, and try again!",
    "My grandmother chops jalapenos faster than this, and she's legally blind! Drink a glass of water, shake out your fingers, and step back up to the line!",
    "The smoke alarm is going off and the ticket machine is jammed! Today is not your day on the line, but every great chef starts with a burnt taco. Back to practice!"
  ]
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getDeterministicSpeedComment(wpm: number, accuracy: number): { comment: string, category: string } {
  // Case 1: Ultra High Performance (Michelin Virtuoso)
  if (wpm >= 95 && accuracy >= 95) {
    return { comment: pickRandom(CHEF_CRITIQUES.michelinVirtuoso), category: 'Michelin Virtuoso' };
  }

  // Case 2: Executive Head Chef (80+ WPM, 90%+ Accuracy)
  if (wpm >= 80 && accuracy >= 90) {
    return { comment: pickRandom(CHEF_CRITIQUES.executiveChef), category: 'Executive Chef' };
  }

  // Case 3: Panic in the Kitchen (High speed, sloppy accuracy)
  if (wpm >= 60 && accuracy < 78) {
    return { comment: pickRandom(CHEF_CRITIQUES.panicInKitchen), category: 'Panic in Kitchen' };
  }

  // Case 4: Seasoned Sous Chef (60-79 WPM, 85%+ Accuracy)
  if (wpm >= 60 && accuracy >= 85) {
    return { comment: pickRandom(CHEF_CRITIQUES.sousChef), category: 'Sous Chef' };
  }

  // Case 5: Guacamole Stalling (Very slow, but ultra high accuracy)
  if (wpm < 35 && accuracy >= 95) {
    return { comment: pickRandom(CHEF_CRITIQUES.guacamoleStalling), category: 'Guacamole Stalling' };
  }

  // Case 6: Reliable Line Cook (45-59 WPM, 80%+ Accuracy)
  if (wpm >= 45 && accuracy >= 78) {
    return { comment: pickRandom(CHEF_CRITIQUES.lineCook), category: 'Line Cook' };
  }

  // Case 7: Kitchen Catastrophe (Under 35 WPM, Low Accuracy)
  if (wpm < 35 && accuracy < 75) {
    return { comment: pickRandom(CHEF_CRITIQUES.kitchenCatastrophe), category: 'Kitchen Catastrophe' };
  }

  // Case 8: Prep Cook in Training (Catch-all for 30-44 WPM or medium accuracy)
  if (wpm >= 30) {
    return { comment: pickRandom(CHEF_CRITIQUES.prepCook), category: 'Prep Cook' };
  }

  // Case 9: Low speed catch-all
  return { comment: pickRandom(CHEF_CRITIQUES.kitchenCatastrophe), category: 'Kitchen Catastrophe' };
}

export function getDeterministicCompetitiveScore(
  stats?: SessionStats,
  speedTest?: { wpm: number; accuracy: number }
): { score: number; title: string } {
  if (speedTest) {
    const safeWpm = Math.max(0, speedTest.wpm);
    const safeAcc = Math.max(0, Math.min(100, speedTest.accuracy));
    // Score exponential curve: WPM scaled by accuracy^2.2
    const accFactor = Math.pow(safeAcc / 100, 2.2);
    const calculatedScore = Math.round(Math.min(100, safeWpm * accFactor));

    let title = "Dishwasher Apprentice";
    if (calculatedScore >= 95) title = "Executive Chef";
    else if (calculatedScore >= 85) title = "Chef de Cuisine";
    else if (calculatedScore >= 75) title = "Sous Chef";
    else if (calculatedScore >= 60) title = "Senior Line Cook";
    else if (calculatedScore >= 45) title = "Line Cook";
    else if (calculatedScore >= 30) title = "Prep Cook";

    return { score: calculatedScore, title };
  }

  if (stats) {
    let score = 50;
    const mistakes = stats.mistakes || 0;
    const rotten = stats.rottenWordsTyped || 0;
    const missed = stats.ingredientsMissed || 0;
    const level = stats.levelReached || 1;

    score += Math.min(30, level * 5);
    score -= mistakes * 2;
    score -= rotten * 4;
    score -= missed * 3;
    score = Math.max(10, Math.min(100, Math.round(score)));

    let title = "Line Cook";
    if (score >= 90) title = "Master Chef";
    else if (score >= 80) title = "Sous Chef";
    else if (score >= 65) title = "Station Chef";
    else if (score >= 50) title = "Line Cook";
    else if (score >= 35) title = "Prep Cook";
    else title = "Dishwasher Apprentice";

    return { score, title };
  }

  return { score: 70, title: "Line Cook" };
}
