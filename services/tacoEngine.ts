import { SessionStats } from '../types';

export interface HeadChefEvaluation {
  score: number;
  title: string;
  comment: string;
  outcomeCategory: string;
}

export const CULINARY_SPEED_TEXTS: string[] = [
  "Nixtamalization is the ancient Mesoamerican process where dried corn is soaked and cooked in an alkaline solution, usually limewater. This chemical miracle softens the maize pericarp, unlocks bound niacin, and releases the unmistakable fragrant aroma of fresh masa for heirloom tortillas.",
  "Molcajetes are traditional Mexican mortars carved from a single block of porous basalt volcanic rock. Grinding roasted serrano chilies, charred garlic, and ripe avocados against the volcanic basalt releases essential aromatic oils that a modern steel food processor could never replicate.",
  "Authentic tacos al pastor trace their lineage to Lebanese immigrants who arrived in Mexico City during the early twentieth century. Adapting traditional spit-roasted shawarma, Mexican taqueros substituted pork marinated in achiote paste and dried chilies, crowning the vertical trompo with a roasted pineapple.",
  "Sourdough fermentation relies on a symbiotic colony of wild yeasts and lactic acid bacteria. As the microbes metabolize complex starches, they release carbon dioxide that inflates gluten pockets, while lactic and acetic acids impart that signature tangy flavor and crisp caramelized crust.",
  "Vanilla beans originate from an orchid vine native to the tropical rainforests of Mesoamerica. Before synthetic extracts existed, the Totonac people were legendary custodians of vanilla, hand-pollinating delicate pale flowers that open for merely a few precious hours at daybreak.",
  "Oaxacan mole negro is among the most sophisticated sauces in global gastronomy. Crafting an authentic mole requires over thirty distinct ingredients, including charred chilhuacle chilies, Mexican dark chocolate, plantains, raisins, and aromatic spices, simmered patiently over embers for days.",
  "The Maillard reaction is a chemical phenomenon occurring between amino acids and reducing sugars under dry kitchen heat. Beginning around three hundred degrees Fahrenheit, it creates hundreds of new flavor compounds, responsible for the deep savory crust on seared steaks and roasted seeds.",
  "Birria is a rich, slow-braised stew hailing from the Mexican state of Jalisco. Meat is steeped in an aromatic adobo broth laced with guajillo chilies, cloves, cumin, and Mexican oregano until tender enough to shred, accompanied by a steaming cup of savory spiced consommé.",
  "Saffron consists of the vivid crimson stigmas gathered from the autumn crocus flower. Because each blossom yields only three delicate threads, it takes roughly seventy-five thousand flowers harvested meticulously by hand to produce a single pound of this prized golden spice.",
  "Charring vegetables directly over a smoking comal is the secret soul of rustic Mexican salsas. Blistering plum tomatoes, fiery habaneros, and unpeeled garlic cloves until black spots appear transforms raw vegetal bitterness into sweet, complex caramelization.",
  "Ceviche utilizes the natural acidity of fresh lime juice to chemically denature raw fish proteins. The citric acid alters the molecular structure similarly to thermal cooking, turning the flesh opaque and firm without ever touching an open flame or heated pan.",
  "Carnitas originate from the culinary heartland of Michoacan. Pork cuts are gently confited in pure lard inside copper kettles for hours alongside Mexican cola, bitter orange peel, and warm spices until meltingly tender inside with a crackling golden exterior.",
  "Epazote is a pungent, leafy herb indigenous to Central America, featuring distinctive notes of petroleum, citrus, and mint. Taqueros and home cooks add sprigs to simmering black beans not only for its assertive rustic flavor, but also for its digestive carminative properties.",
  "Cotija cheese is an artisan dry aged cow's milk cheese born in the alpine mountains of Michoacan. Known affectionately as the Parmesan of Mexico, its firm crumbly texture and salty, sharp profile make it the quintessential topping for charred street corn and tacos.",
  "Cacao was revered as divine currency and medicine across the Aztec and Mayan empires. Nobles whipped ground roasted cacao beans with cool spring water, wild honey, allspice, and fiery ground chilies to produce a frothy, energizing elixir fit for warrior royalty.",
  "A proper cast iron skillet is the workhorse of high-heat cooking. Over time, polymerized cooking oils bond chemically to the raw iron surface, creating a mirror-smooth nonstick patina capable of achieving intense sear temperatures without peeling or degrading.",
  "Guacamole purists insist on using Hass avocados at peak softness, mashed with sea salt, finely minced white onion, chopped serrano pepper, fresh cilantro, and a whisper of fresh lime juice. No fillers or sour cream should ever compromise the velvety fruit.",
  "Chiles en nogada is a patriotic culinary masterpiece celebrating Mexican independence. Poblano chilies are stuffed with sweet-savory picadillo pork, blanketed in a velvety walnut cream sauce, and crowned with ruby pomegranate seeds and fresh green parsley.",
  "Tortilla chips, or totopos, originated in ancient Mexico as an economical and delicious method to repurpose yesterday's stale corn tortillas. Cut into triangles and submerged into boiling oil, they emerge rigid, golden, and ready for vibrant salsa.",
  "Tamarind pods contain a sticky, tart pulp packed with natural tartaric acid. Widely celebrated in Mexican aguas frescas and tangy dipping glazes, tamarind provides an electric, lip-smacking contrast against rich, smoky meats and fiery roasted habanero pastes."
];

let lastTextIndex = -1;

export function getDeterministicSpeedText(): string {
  let idx = Math.floor(Math.random() * CULINARY_SPEED_TEXTS.length);
  if (idx === lastTextIndex && CULINARY_SPEED_TEXTS.length > 1) {
    idx = (idx + 1) % CULINARY_SPEED_TEXTS.length;
  }
  lastTextIndex = idx;
  return CULINARY_SPEED_TEXTS[idx];
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
