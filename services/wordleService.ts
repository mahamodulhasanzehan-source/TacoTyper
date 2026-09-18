// Dedicated Wordle dictionary and validation service supporting 5 to 9 letter words

export const WORDLE_WORDS_BY_LENGTH: Record<number, string[]> = {
    5: [
        'APPLE', 'BEACH', 'BRAIN', 'BREAD', 'CHAIR', 'CHEST', 'CLOCK', 'CLOUD', 'DANCE', 'DREAM',
        'EARTH', 'FLAME', 'FRUIT', 'GHOST', 'GRAPE', 'HEART', 'HOUSE', 'JUICE', 'LEMON', 'LIGHT',
        'MONEY', 'MUSIC', 'NIGHT', 'OCEAN', 'PAINT', 'PEACH', 'PLANT', 'QUEEN', 'RADIO', 'RIVER',
        'SHIRT', 'SMILE', 'SNAKE', 'SPACE', 'STORM', 'TABLE', 'TACOS', 'TIGER', 'TRAIN', 'WATER',
        'WORLD', 'YOUTH', 'ZEBRA', 'PIZZA', 'SUGAR', 'SPICE', 'CANDY', 'SWEET', 'MAGIC', 'POWER',
        'STONE', 'BLAZE', 'CRISP', 'FROST', 'GIANT', 'HONEY', 'LUCKY', 'MANGO', 'MELON', 'OLIVE',
        'ROBOT', 'SHARK', 'SOLAR', 'TULIP', 'VIPER', 'WHALE', 'WHEAT', 'SWORD', 'SHIELD', 'CROWN',
        'ALBUM', 'ALERT', 'ALIEN', 'ANGEL', 'ARROW', 'BAKER', 'BASIC', 'BLOCK', 'BRICK', 'CABIN',
        'CAMEL', 'CHAIN', 'CHAMP', 'CHARM', 'CHIEF', 'CLIFF', 'COAST', 'CORAL', 'CRAFT', 'CRANE',
        'DAILY', 'DELTA', 'DIARY', 'DRAFT', 'EAGLE', 'ELDER', 'EMBER', 'ENTRY', 'EQUAL', 'FAITH',
        'FIBER', 'FIELD', 'FLASH', 'FLEET', 'FLOAT', 'FOCUS', 'FORGE', 'FRAME', 'FRESH', 'FRONT',
        'GLOBE', 'GRAIN', 'GRAND', 'GRASS', 'GRAVE', 'GREAT', 'GREEN', 'GROVE', 'GUARD', 'GUIDE',
        'HAPPY', 'HAVEN', 'HEAVY', 'HORSE', 'HOTEL', 'IMAGE', 'INDEX', 'IVORY', 'LABEL', 'LASER',
        'LEVEL', 'LOGIC', 'LUNAR', 'MAPLE', 'MARCH', 'MEDAL', 'METAL', 'MODEL', 'MOTOR', 'NOBLE',
        'NORTH', 'NOVEL', 'OASIS', 'ORBIT', 'ORGAN', 'PANEL', 'PEARL', 'PHASE', 'PILOT', 'PIVOT',
        'PIXEL', 'PLAZA', 'POLAR', 'PRIDE', 'PRIME', 'PULSE', 'RADAR', 'RANCH', 'RANGE', 'RIDGE',
        'ROBIN', 'ROYAL', 'SCALE', 'SCOPE', 'SHORE', 'SIGHT', 'SKILL', 'SMART', 'SOLID', 'SPARK',
        'SPEED', 'STAGE', 'STEEL', 'TOWER', 'TRACK', 'TRAIL', 'TREND', 'UNCLE', 'UNION', 'VALVE',
        'VAPOR', 'VIRUS', 'VOICE', 'WAGON', 'WATCH'
    ],
    6: [
        'ACTION', 'BEAUTY', 'CASTLE', 'DANGER', 'DRAGON', 'ENERGY', 'FLOWER', 'FOREST', 'GALAXY',
        'GARDEN', 'HARBOR', 'ISLAND', 'JUNGLE', 'KNIGHT', 'LADDER', 'MAGNET', 'MONKEY', 'NATURE',
        'ORANGE', 'PARROT', 'PLANET', 'POCKET', 'RABBIT', 'ROCKET', 'SHADOW', 'SILVER', 'SPRING',
        'SUMMER', 'TARGET', 'TICKET', 'TURTLE', 'VALLEY', 'WINDOW', 'WINTER', 'WONDER', 'YELLOW',
        'WIZARD', 'PIRATE', 'STREAM', 'TUNNEL', 'VELVET', 'CHERRY', 'BUTTER', 'PEPPER', 'BRIDGE',
        'ANIMAL', 'AUTHOR', 'BANANA', 'BASKET', 'BOTTLE', 'CAMERA', 'CANDLE', 'CANYON', 'CARPET',
        'CHANCE', 'CIRCLE', 'CLOVER', 'COFFEE', 'CRADLE', 'DESERT', 'DOCTOR', 'DOLLAR', 'DOLPHIN',
        'ENGINE', 'FAMILY', 'FARMER', 'FATHER', 'FEATHER', 'FINGER', 'FUTURE', 'GUITAR', 'HAMMER',
        'HELMET', 'HUNTER', 'JACKET', 'KITTEN', 'LEADER', 'LEMONS', 'LIZARD', 'MARKET', 'MIRROR',
        'MOTHER', 'MUSEUM', 'PALACE', 'PEANUT', 'PILLOW', 'POLICE', 'POSTER', 'PRISON', 'PUZZLE',
        'RESCUE', 'RIDDLE', 'RIVER', 'SAILOR', 'SCHOOL', 'SCREEN', 'SHADOW', 'SHIELD', 'SIGNAL',
        'SILVER', 'SISTER', 'SPIRIT', 'STATUE', 'STREET', 'SUNSET', 'TEMPLE', 'THREAT', 'TRAVEL',
        'TROPHY', 'VIOLIN', 'WALNUT', 'WEAPON'
    ],
    7: [
        'AIRPORT', 'BALLOON', 'BLANKET', 'CHICKEN', 'CRYSTAL', 'DOLPHIN', 'DIAMOND', 'FEATHER',
        'FIREFLY', 'GATEWAY', 'GLACIER', 'HAMSTER', 'HOLIDAY', 'JOURNEY', 'KITCHEN', 'LANTERN',
        'LEOPARD', 'MONSTER', 'MORNING', 'MYSTERY', 'NETWORK', 'OCTOPUS', 'PENGUIN', 'PYRAMID',
        'RAINBOW', 'SCENERY', 'SUNSHINE', 'THUNDER', 'UNICORN', 'VAMPIRE', 'VOLCANO', 'WARRIOR',
        'WHISPER', 'BLOSSOM', 'CARAMEL', 'COMPASS', 'FANTASY', 'HARMONY', 'ILLUSION', 'PACKAGE',
        'ACADEMY', 'BALANCE', 'BICYCLE', 'BLOSSOM', 'CAPTAIN', 'CARTOON', 'CHAMBER', 'CLIMATE',
        'COMPANY', 'CONCERT', 'COTTAGE', 'COUNCIL', 'COUNTRY', 'CULTURE', 'CURRENT', 'DEFENSE',
        'DESTINY', 'DYNAMIC', 'EMPEROR', 'EXPLORE', 'FANTASY', 'FESTIVE', 'FIREMAN', 'FOREVER',
        'FREEDOM', 'GALAXY', 'GARMENT', 'GRAVITY', 'HABITAT', 'HIGHWAY', 'HORIZON', 'HOSPITAL',
        'KINGDOM', 'LEOPARD', 'LIBERTY', 'MACHINE', 'MAJESTY', 'MANSION', 'MEADOWS', 'MEASURE',
        'MIRACLE', 'MISSION', 'MUSICAL', 'NATURAL', 'NEPTUNE', 'NOTABLE', 'OCEANIC', 'OLYMPIC',
        'OUTDOOR', 'PACIFIC', 'PAINTER', 'PERFECT', 'PHANTOM', 'PIONEER', 'PROMISE', 'PURSUIT',
        'ROOSTER', 'SCIENCE', 'SHELTER', 'STADIUM', 'SUPREME', 'SURVIVE', 'SYMPHONY', 'TEACHER',
        'THEATER', 'TRAFFIC', 'TRIUMPH', 'VILLAGE', 'WEATHER'
    ],
    8: [
        'ABSOLUTE', 'AIRPLANE', 'ALLIGATOR', 'BACKPACK', 'BASEBALL', 'BLUEBIRD', 'CAMPFIRE',
        'CHAMPION', 'CREATIVE', 'DAUGHTER', 'DAYLIGHT', 'DINOSAUR', 'ELEPHANT', 'FIREWORK',
        'FLAMINGO', 'FOOTBALL', 'FOUNTAIN', 'FRIENDLY', 'KANGAROO', 'KEYBOARD', 'LEMONADE',
        'LIGHTNING', 'MACARONI', 'MIDNIGHT', 'MOUNTAIN', 'MUSHROOM', 'NOTEBOOK', 'PAINTING',
        'PANCAKES', 'PINEAPPLE', 'PLATYPUS', 'PRINCESS', 'QUESTION', 'SANDWICH', 'SAPPHIRE',
        'SEASHELL', 'SNOWFLAKE', 'STARFISH', 'SUNFLOWER', 'SURPRISE', 'TREASURE', 'TRIANGLE',
        'UMBRELLA', 'VACATION', 'WATERMELON', 'AQUARIUM', 'ASTRONOM', 'BLIZZARD', 'BOOKMARK',
        'BOUNDARY', 'CALENDAR', 'CARNIVAL', 'CEREMONY', 'CHAMPION', 'CHEETAH', 'CINEMATIC',
        'COLOSSAL', 'COMPUTER', 'CREATURE', 'CRUISING', 'CUSTOMER', 'CYLINDER', 'DARKNESS',
        'DECEMBER', 'DELICATE', 'DELIGHTS', 'DOMESTIC', 'ELECTRIC', 'ELEGANCE', 'ELEVATOR',
        'EMERALDS', 'EMPERORS', 'ENORMOUS', 'ENTRANCE', 'EVERYDAY', 'EXCITING', 'EXTERNAL',
        'FESTIVAL', 'FIREWOOD', 'FLAVORED', 'FOOTSTEP', 'FORCEFUL', 'FORTRESS', 'FRESHMAN',
        'GARDENER', 'GIGANTIC', 'GOLDFISH', 'GOODNESS', 'GOVERNOR', 'GRACEFUL', 'GRANITE',
        'GUARDIAN', 'HANDSOME', 'HARDWARE', 'HARVESTS', 'HEADLINE', 'HERITAGE', 'HISTORIC',
        'HOSPITAL', 'IDENTITY', 'IMAGINED', 'IMPERIAL', 'INFINITY', 'INVENTOR', 'JUDGMENT',
        'KINGDOMS', 'LANDMARK', 'LANGUAGE', 'LAUGHTER', 'MAGAZINE', 'MAJESTIC', 'MARATHON',
        'MATERIAL', 'MEDICINE', 'MEMORIAL', 'METEORIC', 'MIGRATION', 'MILITARY', 'MINERALS'
    ],
    9: [
        'ADVENTURE', 'ASTRONAUT', 'BEAUTIFUL', 'BUTTERFLY', 'CELEBRATE', 'CHAMELEON', 'CHOCOLATE',
        'CHRISTMAS', 'CROCODILE', 'DELICIOUS', 'DIFFERENT', 'DISCOVERY', 'DRAGONFLY', 'EDUCATION',
        'FANTASTIC', 'FIRETRUCK', 'HAPPINESS', 'HEDGEHOGS', 'JELLYFISH', 'LANDSCAPE', 'LIGHTNING',
        'MOONLIGHT', 'RASPBERRY', 'SATELLITE', 'SPACESHIP', 'STRAWBERRY', 'SUNFLOWER', 'TELESCOPE',
        'TRAMPOLINE', 'TREASURES', 'WATERFALL', 'WONDERFUL', 'ZEBRAFISH', 'BRILLIANT', 'CHALLENGE',
        'COMMUNITY', 'FIREWORKS', 'PINEAPPLE', 'NOTEBOOKS', 'ARCHITECT', 'BLUEBERRY', 'BREAKFAST',
        'CHARACTER', 'CLASSROOM', 'COMPANION', 'CONDUCTOR', 'CONFIDENT', 'CREATIVITY', 'DEFENDERS',
        'DELIGHTED', 'DETERMINE', 'DIRECTION', 'DIVERSITY', 'ECCENTRIC', 'ELIZABETH', 'EMOTIONAL',
        'ENCHANTED', 'ENORMOUS', 'ENTHUSIAS', 'ESSENTIAL', 'EVERGREEN', 'EVOLUTION', 'EXCELLENT',
        'EXCLUSIVE', 'EXPLORERS', 'EXPRESSION', 'FANTASTIC', 'FIREPLACE', 'FLASHBACK', 'FLAVORFUL',
        'FOOTPRINTS', 'FORTUNATE', 'FRAMEWORK', 'FREQUENCY', 'FRIENDSHIP', 'GENERATOR', 'GEOGRAPHY',
        'GLADSTONE', 'GOLDSMITH', 'GORGEOUS', 'GOVERNANCE', 'GRANULATE', 'GREATNESS', 'GREENHORN',
        'GREENHOUSE', 'GUARANTEED', 'GUARDIANS', 'GUIDELINE', 'GUMDROPS', 'HANDCRAFT', 'HARMONIOUS',
        'HEADLIGHT', 'HEARTBEAT', 'HERITAGES', 'HIGHLIGHT', 'HISTORIAN', 'HOMEGROWN', 'HOMEMAKER',
        'HORSESHOE', 'HOUSEHOLD', 'HOUSEWIFE', 'HURRICANE', 'HYDROGEN', 'HYPERTEXT', 'ILLUSTRAT'
    ]
};

// Comprehensive fast local set of common English words across lengths
const LOCAL_COMMON_WORDS = new Set<string>();

// Populate set from targets
Object.values(WORDLE_WORDS_BY_LENGTH).forEach(words => {
    words.forEach(w => LOCAL_COMMON_WORDS.add(w.toUpperCase()));
});

// Additional recognized English 5-letter words (official standard Wordle words)
const EXTRA_COMMON_5_LETTER =[
    'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
    'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER',
    'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY',
    'ASIDE', 'ASSET', 'AUDIO', 'AUDIT', 'AVOID', 'AWAIT', 'AWAKE', 'AWARD', 'AWARE', 'BADLY',
    'BAKER', 'BASES', 'BASIC', 'BASIS', 'BEAST', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BILLY',
    'BIRTH', 'BLACK', 'BLAME', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD', 'BOAST', 'BOOST', 'BOOTH',
    'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRIEF', 'BRING',
    'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BUYER', 'CABLE', 'CALIF', 'CARRY', 'CATCH',
    'CAUSE', 'CHAIN', 'CHAIR', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF', 'CHILD',
    'CHINA', 'CHOSE', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLICK', 'CLOCK', 'CLOSE',
    'COACH', 'COAST', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM',
    'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CRUDE', 'CURVE', 'CYCLE', 'DAILY', 'DANCE', 'DATED',
    'DEALT', 'DEATH', 'DEBUT', 'DELAY', 'DEPTH', 'DOING', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAMA',
    'DRAWN', 'DREAM', 'DRESS', 'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DYING', 'EAGER', 'EARLY',
    'EARTH', 'EIGHT', 'ELITE', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR',
    'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FIBER', 'FIELD',
    'FIFTH', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLASH', 'FLEET', 'FLOOR', 'FLUID',
    'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH',
    'FRONT', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE', 'GOING', 'GRACE',
    'GRADE', 'GRAND', 'GRANT', 'GRASS', 'GREAT', 'GREEN', 'GROSS', 'GROUP', 'GROWN', 'GUARD',
    'GUESS', 'GUEST', 'GUIDE', 'HAPPY', 'HARRY', 'HEART', 'HEAVY', 'HENCE', 'HENRY', 'HORSE',
    'HOTEL', 'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JAPAN',
    'JIMMY', 'JOINT', 'JONES', 'JUDGE', 'KNOWN', 'LABEL', 'LARGE', 'LASER', 'LATER', 'LAUGH',
    'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEVEL', 'LEWIS', 'LIGHT', 'LIMIT',
    'LINKS', 'LIVES', 'LOCAL', 'LOGIC', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH', 'LYING', 'MAGIC',
    'MAJOR', 'MAKER', 'MARCH', 'MARIA', 'MATCH', 'MAYBE', 'MAYOR', 'MEANT', 'MEDIA', 'METAL',
    'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT',
    'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NEEDS', 'NEVER', 'NEWLY', 'NIGHT', 'NOISE', 'NORTH',
    'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT',
    'PAINT', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PETER', 'PHASE', 'PHONE', 'PHOTO', 'PIECE',
    'PILOT', 'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND', 'POWER',
    'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE',
    'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH',
    'READY', 'REFER', 'RIGHT', 'RIVAL', 'RIVER', 'ROBIN', 'ROGER', 'ROMAN', 'ROUGH', 'ROUND',
    'ROUTE', 'ROYAL', 'RURAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN',
    'SHALL', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHIRT', 'SHOCK',
    'SHOOT', 'SHORT', 'SHOWN', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP',
    'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND',
    'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT',
    'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL',
    'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF',
    'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH',
    'TEETH', 'TERRY', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK',
    'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'TIGHT', 'TIMES', 'TIRED',
    'TITLE', 'TODAY', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN',
    'TREAT', 'TREND', 'TRIAL', 'TRIED', 'TRIES', 'TRUCK', 'TRULY', 'TRUST', 'TRUTH', 'TWICE',
    'UNDER', 'UNDUE', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL',
    'VALID', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOICE', 'WASTE', 'WATCH', 'WATER',
    'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD',
    'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRITE', 'WRONG', 'WROTE', 'YIELD',
    'YOUNG', 'YOUTH'
];

EXTRA_COMMON_5_LETTER.forEach(w => LOCAL_COMMON_WORDS.add(w));

// In-memory cache for validated words (word -> boolean)
const validationCache = new Map<string, boolean>();

/**
 * Validates whether a word is an authentic, recognized English word with a genuine definition.
 * 1. Checks fast local curated dictionary (instant).
 * 2. Checks Free Dictionary API (verifies real definitions & parts of speech).
 * 3. Falls back to Datamuse definition metadata (`md=d`).
 * Strictly rejects non-words and unknown letter sequences.
 */
export async function validateWord(word: string, length: number): Promise<boolean> {
    if (!word || typeof word !== 'string') return false;
    const clean = word.trim().toUpperCase();
    if (clean.length !== length) return false;
    if (!/^[A-Z]+$/.test(clean)) return false;

    // 1. Check in-memory validation cache
    if (validationCache.has(clean)) {
        return validationCache.get(clean)!;
    }

    // 2. Check local curated English dictionary
    if (LOCAL_COMMON_WORDS.has(clean)) {
        validationCache.set(clean, true);
        return true;
    }

    // 3. Check Dictionary API (verifies genuine English word entry with real definitions)
    const lower = clean.toLowerCase();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1600);

        const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${lower}`, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (dictRes.status === 200) {
            const data = await dictRes.json();
            if (Array.isArray(data) && data.length > 0 && data[0].meanings && data[0].meanings.length > 0) {
                validationCache.set(clean, true);
                return true;
            }
        } else if (dictRes.status === 404) {
            // Word definitively not found in standard English dictionary
            validationCache.set(clean, false);
            return false;
        }
    } catch {
        // Continue to fallback definition check if network/timeout
    }

    // 4. Fallback check using Datamuse with definition requirement ('md=d')
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);

        const res = await fetch(`https://api.datamuse.com/words?sp=${lower}&md=d&max=1`, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            if (
                Array.isArray(data) &&
                data.length > 0 &&
                data[0].word.toLowerCase() === lower &&
                Array.isArray(data[0].defs) &&
                data[0].defs.length > 0 // MUST have at least one defined English definition!
            ) {
                validationCache.set(clean, true);
                return true;
            }
        }
    } catch {
        // Network failed
    }

    // If word is not in local dictionary and not found with a valid definition in either dictionary API, reject it!
    validationCache.set(clean, false);
    return false;
}
