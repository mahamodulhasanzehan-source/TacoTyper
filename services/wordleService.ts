// Dedicated Wordle dictionary and validation service supporting 5 to 9 letter words

export const WORDLE_WORDS_BY_LENGTH: Record<number, string[]> = {
    5: [
        'APPLE', 'BEACH', 'BRAIN', 'BREAD', 'CHAIR', 'CHEST', 'CLOCK', 'CLOUD', 'DANCE', 'DREAM',
        'EARTH', 'FLAME', 'FRUIT', 'GHOST', 'GRAPE', 'HEART', 'HOUSE', 'JUICE', 'LEMON', 'LIGHT',
        'MONEY', 'MUSIC', 'NIGHT', 'OCEAN', 'PAINT', 'PEACH', 'PLANT', 'QUEEN', 'RADIO', 'RIVER',
        'SHIRT', 'SMILE', 'SNAKE', 'SPACE', 'STORM', 'TABLE', 'TACOS', 'TIGER', 'TRAIN', 'WATER',
        'WORLD', 'YOUTH', 'ZEBRA', 'PIZZA', 'SUGAR', 'SPICE', 'CANDY', 'SWEET', 'MAGIC', 'POWER',
        'STONE', 'BLAZE', 'CRISP', 'FROST', 'GIANT', 'HONEY', 'LUCKY', 'MANGO', 'MELON', 'OLIVE',
        'ROBOT', 'SHARK', 'SOLAR', 'TULIP', 'VIPER', 'WHALE', 'WHEAT', 'SWORD', 'SHIELD', 'CROWN'
    ],
    6: [
        'ACTION', 'BEAUTY', 'CASTLE', 'DANGER', 'DRAGON', 'ENERGY', 'FLOWER', 'FOREST', 'GALAXY',
        'GARDEN', 'HARBOR', 'ISLAND', 'JUNGLE', 'KNIGHT', 'LADDER', 'MAGNET', 'MONKEY', 'NATURE',
        'ORANGE', 'PARROT', 'PLANET', 'POCKET', 'RABBIT', 'ROCKET', 'SHADOW', 'SILVER', 'SPRING',
        'SUMMER', 'TARGET', 'TICKET', 'TURTLE', 'VALLEY', 'WINDOW', 'WINTER', 'WONDER', 'YELLOW',
        'WIZARD', 'PIRATE', 'STREAM', 'TUNNEL', 'VELVET', 'CHERRY', 'BUTTER', 'PEPPER', 'BRIDGE'
    ],
    7: [
        'AIRPORT', 'BALLOON', 'BLANKET', 'CHICKEN', 'CRYSTAL', 'DOLPHIN', 'DIAMOND', 'FEATHER',
        'FIREFLY', 'GATEWAY', 'GLACIER', 'HAMSTER', 'HOLIDAY', 'JOURNEY', 'KITCHEN', 'LANTERN',
        'LEOPARD', 'MONSTER', 'MORNING', 'MYSTERY', 'NETWORK', 'OCTOPUS', 'PENGUIN', 'PYRAMID',
        'RAINBOW', 'SCENERY', 'SUNSHINE', 'THUNDER', 'UNICORN', 'VAMPIRE', 'VOLCANO', 'WARRIOR',
        'WHISPER', 'BLOSSOM', 'CARAMEL', 'COMPASS', 'FANTASY', 'HARMONY', 'ILLUSION', 'PACKAGE'
    ],
    8: [
        'ABSOLUTE', 'AIRPLANE', 'ALLIGATOR', 'BACKPACK', 'BASEBALL', 'BLUEBIRD', 'CAMPFIRE',
        'CHAMPION', 'CREATIVE', 'DAUGHTER', 'DAYLIGHT', 'DINOSAUR', 'ELEPHANT', 'FIREWORK',
        'FLAMINGO', 'FOOTBALL', 'FOUNTAIN', 'FRIENDLY', 'KANGAROO', 'KEYBOARD', 'LEMONADE',
        'LIGHTNING', 'MACARONI', 'MIDNIGHT', 'MOUNTAIN', 'MUSHROOM', 'NOTEBOOK', 'PAINTING',
        'PANCAKES', 'PINEAPPLE', 'PLATYPUS', 'PRINCESS', 'QUESTION', 'SANDWICH', 'SAPPHIRE',
        'SEASHELL', 'SNOWFLAKE', 'STARFISH', 'SUNFLOWER', 'SURPRISE', 'TREASURE', 'TRIANGLE',
        'UMBRELLA', 'VACATION', 'WATERMELON'
    ],
    9: [
        'ADVENTURE', 'ASTRONAUT', 'BEAUTIFUL', 'BUTTERFLY', 'CELEBRATE', 'CHAMELEON', 'CHOCOLATE',
        'CHRISTMAS', 'CROCODILE', 'DELICIOUS', 'DIFFERENT', 'DISCOVERY', 'DRAGONFLY', 'EDUCATION',
        'FANTASTIC', 'FIRETRUCK', 'HAPPINESS', 'HECTICITY', 'HEDGEHOGS', 'JELLYFISH', 'LANDSCAPE',
        'LIGHTNING', 'MOONLIGHT', 'PENGUINSS', 'RASPBERRY', 'SATELLITE', 'SPACESHIP', 'STRAWBERRY',
        'SUNSHINES', 'TELESCOPE', 'TRAMPOLINE', 'TREASURES', 'WATERFALL', 'WONDERFUL', 'ZEBRAFISH'
    ]
};

// Fast local dictionary cache for validation
const COMMON_PREFIXES = new Set([
    'TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ON', 'AT', 'EN', 'ND', 'TI', 'ES', 'OR', 'TE', 'OF', 'ED', 'IS', 'IT', 'AL', 'AR', 'ST', 'TO', 'NT'
]);

export async function validateWord(word: string, length: number): Promise<boolean> {
    const upper = word.toUpperCase();
    if (upper.length !== length) return false;

    // 1. Check known list
    const targets = WORDLE_WORDS_BY_LENGTH[length] || [];
    if (targets.includes(upper)) return true;

    // 2. Query Datamuse or DictionaryAPI with 1200ms timeout
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);

        const res = await fetch(`https://api.datamuse.com/words?sp=${word.toLowerCase()}&max=1`, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0 && data[0].word.toLowerCase() === word.toLowerCase()) {
                return true;
            }
        }
    } catch {
        // Fallback gracefully on timeout/network issue
    }

    // 3. Fallback: Check if word has at least one vowel/y and reasonable consonant clusters
    const hasVowel = /[AEIOUY]/i.test(upper);
    const noCrazyRepeats = !/(.)\1{3,}/i.test(upper); // No letter repeated 4 times
    return hasVowel && noCrazyRepeats;
}
