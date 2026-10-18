export interface SpellingBeeWord {
  word: string;
  meaning: string;
  sentence: string;
  difficulty?: number;
}

export const SPELLING_BEE_TIERED_DICTIONARY: Record<number, SpellingBeeWord[]> = {
  1: [
    { word: "galaxy", meaning: "A system of millions or billions of stars, together with gas and dust, held by gravity.", sentence: "Our solar system resides inside the vast Milky Way galaxy." },
    { word: "meadow", meaning: "A piece of grassland, especially one used for hay or pasture.", sentence: "Colorful wildflowers bloomed across the sunlit mountain meadow." },
    { word: "whisper", meaning: "Speak very softly using one's breath without vibrating vocal cords.", sentence: "She leaned in close to whisper a secret during the play." },
    { word: "journey", meaning: "An act of traveling from one place to another.", sentence: "The brave explorers set off on a perilous arctic journey." },
    { word: "crystal", meaning: "A piece of a homogeneous solid substance having a natural regular form.", sentence: "The ancient cave walls sparkled with purple quartz crystal." },
    { word: "lantern", meaning: "A lamp with a transparent case protecting the flame or electric bulb.", sentence: "They lit a brass lantern to guide their way through the dark forest." },
    { word: "breeze", meaning: "A gentle, refreshing wind.", sentence: "A cool coastal breeze rustled through the tall palm trees." },
    { word: "dolphin", meaning: "A highly intelligent aquatic mammal with a curved dorsal fin.", sentence: "A friendly dolphin leaped playfully alongside the sailing vessel." },
    { word: "glacier", meaning: "A slowly moving mass or river of ice formed by snow accumulation.", sentence: "Hikers marveled at the immense, shimmering blue glacier." },
    { word: "treasure", meaning: "A quantity of precious metals, gems, or valuable historical objects.", sentence: "Deep sea divers discovered a sunken wooden treasure chest." },
    { word: "volcano", meaning: "A mountain or hill having a crater through which lava and gas erupt.", sentence: "Plumes of white vapor drifted gently from the dormant volcano." },
    { word: "feather", meaning: "One of the flat, light structures forming the plumage of birds.", sentence: "The soaring eagle shed a pristine white feather mid-flight." },
    { word: "compass", meaning: "An instrument containing a magnetized pointer that shows magnetic north.", sentence: "Always calibrate your compass before hiking into untamed wilderness." },
    { word: "castle", meaning: "A large fortified building typical of the medieval era.", sentence: "A medieval stone castle stood proudly atop the rugged limestone cliff." },
    { word: "fossil", meaning: "The preserved remains or traces of a prehistoric organism.", sentence: "The paleontology museum unveiled a remarkably intact dinosaur fossil." },
    { word: "harvest", meaning: "The process or period of gathering agricultural crops.", sentence: "Generations of farmers gathered together for the autumn apple harvest." },
    { word: "island", meaning: "A piece of land entirely surrounded by water.", sentence: "They dropped anchor beside a tranquil, secluded tropical island." },
    { word: "shadow", meaning: "A dark shape produced by an object blocking rays of light.", sentence: "The tall oak tree cast a comforting afternoon shadow over the lawn." },
    { word: "velvet", meaning: "A closely woven luxurious fabric with a soft, thick pile.", sentence: "The concert hall curtains were crafted from deep crimson velvet." },
    { word: "blossom", meaning: "A flower or mass of flowers on a tree or flowering shrub.", sentence: "Delicate cherry blossom petals drifted softly on the spring wind." }
  ],
  2: [
    { word: "umbrella", meaning: "A folding canopy supported by metal ribs used as protection against rain.", sentence: "Never leave home without a sturdy umbrella on an overcast morning." },
    { word: "telescope", meaning: "An optical instrument designed to make distant celestial objects appear nearer.", sentence: "We observed the ice rings of Saturn through a modern telescope." },
    { word: "pyramid", meaning: "A monumental structure with a square base and triangular sloping sides.", sentence: "The Great Pyramid of Giza remains an enduring architectural wonder." },
    { word: "avalanche", meaning: "A mass of snow, ice, and rock falling rapidly down a mountainside.", sentence: "Emergency sirens sounded to alert alpine skiers of a sudden avalanche." },
    { word: "sanctuary", meaning: "A consecrated place of safety, refuge, or wildlife protection.", sentence: "The nature sanctuary provides a vital habitat for endangered snow leopards." },
    { word: "pendulum", meaning: "A suspended weight that swings freely back and forth under gravity.", sentence: "The grandfather clock chimed as its brass pendulum swung rhythmically." },
    { word: "symphony", meaning: "An elaborate musical composition for a full orchestral ensemble.", sentence: "Beethoven composed his triumphant Ninth Symphony in complete silence." },
    { word: "cinnamon", meaning: "An aromatic spice made from the peeled, dried bark of cinnamomum trees.", sentence: "She dusted freshly ground cinnamon over the warm apple pastry." },
    { word: "orchestra", meaning: "A large ensemble of musicians playing strings, woodwinds, brass, and percussion.", sentence: "The metropolitan orchestra received a rousing standing ovation." },
    { word: "monastery", meaning: "A building or complex occupied by a community of monks living under vows.", sentence: "The serene stone monastery overlooked the misty mountain valley." },
    { word: "labyrinth", meaning: "A complicated irregular network of passages in which it is difficult to find a path.", sentence: "Legend tells of a mythical minotaur trapped within the Cretan labyrinth." },
    { word: "chameleon", meaning: "A small lizard known for its specialized camouflage and color-changing skin.", sentence: "The chameleon shifted from bright emerald to patterned bark brown." }
  ],
  3: [
    { word: "kaleidoscope", meaning: "An optical tube with mirrors producing symmetrical colored geometric patterns.", sentence: "Peering through the antique kaleidoscope revealed shifting symmetrical mandalas." },
    { word: "silhouette", meaning: "The dark shape and outline of a figure visible against a brighter background.", sentence: "The wild stallion stood in bold silhouette against the fiery sunset." },
    { word: "hieroglyph", meaning: "A stylized picture or symbol representing a word, syllable, or sound in ancient writing.", sentence: "Linguists decoded the intricate hieroglyph carved onto the limestone obelisk." },
    { word: "archipelago", meaning: "An extensive group or chain of scattered islands across an open sea.", sentence: "Indonesia forms the world's largest equatorial archipelago." },
    { word: "boulevard", meaning: "A wide urban thoroughfare typically lined with mature shade trees.", sentence: "Shoppers strolled leisurely along the cobblestone Parisian boulevard." },
    { word: "meteorite", meaning: "A piece of cosmic rock or metal that has fallen to Earth from space.", sentence: "Geologists analyzed rare extraterrestrial isotopes within the nickel meteorite." },
    { word: "cappuccino", meaning: "An espresso-based coffee beverage prepared with steamed milk and thick foam.", sentence: "He ordered a steaming cappuccino dusted with freshly grated dark cocoa." },
    { word: "camouflage", meaning: "Protective coloration or disguise blending an organism with its surroundings.", sentence: "The arctic hare relies on pure white camouflage against predators." }
  ],
  4: [
    { word: "serendipity", meaning: "The occurrence of events by chance in a happy or beneficial way.", sentence: "Discovering that historic first edition manuscript was pure serendipity." },
    { word: "ephemeral", meaning: "Lasting for a remarkably short duration; fleeting.", sentence: "The shimmering morning rainbow proved as ephemeral as the morning dew." },
    { word: "ubiquitous", meaning: "Present, appearing, or encountered everywhere simultaneously.", sentence: "Digital pocket cameras have become ubiquitous throughout modern life." },
    { word: "cacophony", meaning: "A harsh, discordant, and deafening mixture of sounds.", sentence: "A cacophony of sirens, horns, and jackhammers filled the bustling intersection." },
    { word: "magnanimous", meaning: "Generous or forgiving, especially toward a rival or subordinate.", sentence: "The chess grandmaster was magnanimous in victory, applauding his adversary." },
    { word: "soliloquy", meaning: "An act of speaking one's innermost thoughts aloud when alone on stage.", sentence: "The Shakespearean actor delivered Hamlet's poignant soliloquy with raw intensity." },
    { word: "juxtaposition", meaning: "The fact of two contrasting things being placed side by side for effect.", sentence: "The striking juxtaposition of ancient cobblestones against glass skyscrapers inspired artists." },
    { word: "mellifluous", meaning: "A sweet, smooth, and pleasant sound or tone.", sentence: "The jazz vocalist possessed a rich, mellifluous voice that captivated audiences." }
  ],
  5: [
    { word: "quintessential", meaning: "Representing the most perfect or typical embodiment of a quality or class.", sentence: "A piping cup of English breakfast tea is the quintessential morning ritual." },
    { word: "idiosyncrasy", meaning: "A behavioral attribute or quirk peculiar to an individual.", sentence: "One endearing idiosyncrasy of the professor was wearing mismatched colorful socks." },
    { word: "clandestine", meaning: "Executed in secrecy or concealed deliberately from public view.", sentence: "Intelligence officers monitored the clandestine rendezvous at the abandoned dock." },
    { word: "perspicacious", meaning: "Having keen insight, mental discernment, and deep understanding.", sentence: "Her perspicacious appraisal of market trends saved the firm from insolvency." },
    { word: "superfluous", meaning: "Exceeding what is necessary, required, or useful; redundant.", sentence: "A skilled editor mercilessly eliminates superfluous adjectives from draft essays." },
    { word: "grandiloquent", meaning: "Pompous, bombastic, or extravagant in speech, style, or diction.", sentence: "The courtroom orator adopted a grandiloquent tone to sway the skeptical jury." },
    { word: "surreptitious", meaning: "Obtained or executed through stealth, deception, or clandestine methods.", sentence: "She darted a surreptitious glance toward the antique clock during the ceremony." },
    { word: "resplendent", meaning: "Impressively glowing, dazzling, or richly colorful.", sentence: "The grand ballroom looked resplendent illuminated by hundreds of crystal candelabras." }
  ],
  6: [
    { word: "bourgeoisie", meaning: "The socio-economic middle class, often with reference to materialistic norms.", sentence: "Historians examined the burgeoning influence of the nineteenth-century merchant bourgeoisie." },
    { word: "paraphernalia", meaning: "Miscellaneous equipment, gear, or articles associated with a specific craft.", sentence: "The alchemist's workshop was crowded with glassware, scales, and brass paraphernalia." },
    { word: "chrysanthemum", meaning: "A popular autumn garden plant bearing vibrant, densely petaled blossoms.", sentence: "Golden chrysanthemum arrangements adorned the temple gardens during the festival." },
    { word: "reconnaissance", meaning: "Military observation or preliminary survey to gather intelligence.", sentence: "The reconnaissance aircraft scouted strategic mountain passes before daybreak." },
    { word: "onomatopoeia", meaning: "The formation of a word from a sound associated with what is named.", sentence: "Comic books rely extensively on onomatopoeia such as bam, sizzle, and wham." },
    { word: "connoisseur", meaning: "An expert judge in matters of fine art, gastronomy, or refined taste.", sentence: "As a seasoned culinary connoisseur, she instantly recognized the origin of the olive oil." },
    { word: "sovereignty", meaning: "Supreme autonomous authority or independence of a nation to govern itself.", sentence: "The newly established republic vigorously defended its territorial sovereignty." },
    { word: "anachronism", meaning: "A thing belonging or appropriate to a period other than that in which it exists.", sentence: "Spotting an electronic wristwatch on a medieval knight was an amusing anachronism." }
  ],
  7: [
    { word: "sesquipedalian", meaning: "Characterized by the use of unusually long or polysyllabic words.", sentence: "The academician was renowned for his amusingly sesquipedalian lecture delivery." },
    { word: "effervescent", meaning: "Giving off bubbly vapor, or possessing a vivacious, sparkling personality.", sentence: "Her effervescent disposition energized every colleague working on the challenging project." },
    { word: "acquiesce", meaning: "Accept or consent to something reluctantly without verbal protest.", sentence: "The committee chairman finally decided to acquiesce to the revised environmental protocol." },
    { word: "hemorrhage", meaning: "A copious or uncontrolled discharge of blood from a ruptured vessel.", sentence: "Trauma surgeons acted decisively to stem the critical internal hemorrhage." },
    { word: "misdemeanor", meaning: "A minor legal infraction or non-indictable civil offense.", sentence: "Jaywalking across an empty residential street is treated as a minor misdemeanor." },
    { word: "millennium", meaning: "A chronological span of one thousand calendar years.", sentence: "Historians gathered to commemorate the dawn of the third modern millennium." },
    { word: "renaissance", meaning: "A fervent revival of classical art, literature, and scholarly inquiry.", sentence: "The historic waterfront district is experiencing a vibrant cultural renaissance." },
    { word: "surveillance", meaning: "Continuous close observation of a suspect, facility, or region.", sentence: "State-of-the-art surveillance satellites monitored changes across the polar ice cap." }
  ],
  8: [
    { word: "antidisestablishmentarianism", meaning: "Historical opposition to the withdrawal of state patronage from the church.", sentence: "Antidisestablishmentarianism remains famous as one of the longest non-technical English words." },
    { word: "floccinaucinihilipilification", meaning: "The habitual action of estimating something as completely valueless.", sentence: "His cynical floccinaucinihilipilification of contemporary poetry confounded literary critics." },
    { word: "honorificabilitudinitatibus", meaning: "The state or condition of being able to achieve high honors.", sentence: "Shakespeare incorporated the rhythmic Latinate word honorificabilitudinitatibus in Love's Labour's Lost." },
    { word: "counterrevolutionaries", meaning: "Partisans who organize or participate in efforts to reverse a political revolution.", sentence: "Exiled counterrevolutionaries coordinated clandestine operations from across the border." },
    { word: "incomprehensibilities", meaning: "Concepts, conditions, or phenomena that defy human comprehension.", sentence: "Theoretical physics grapples with the strange incomprehensibilities of quantum entanglement." },
    { word: "psychoneuroimmunology", meaning: "The biomedical study of how emotional states influence the immune system.", sentence: "Pioneering researchers in psychoneuroimmunology demonstrated the physical impacts of chronic stress." }
  ],
  9: [
    { word: "pneumonoultramicroscopicsilicovolcanoconiosis", meaning: "A chronic lung affliction caused by inhaling ultrafine silicate or volcanic particles.", sentence: "Miners were examined thoroughly for signs of pneumonoultramicroscopicsilicovolcanoconiosis." },
    { word: "hippopotomonstrosesquippedaliophobia", meaning: "The paradoxical humorous term for an irrational fear of long words.", sentence: "It is an ironic cruelty that hippopotomonstrosesquippedaliophobia is itself thirty-six letters long." },
    { word: "pseudopseudohypoparathyroidism", meaning: "An inherited disorder characterized by physical traits of pseudohypoparathyroidism without biochemical abnormalities.", sentence: "The geneticist identified a rare clinical presentation of pseudopseudohypoparathyroidism." },
    { word: "spectrophotofluorometrically", meaning: "Describing chemical measurement using light absorption and emission spectra.", sentence: "The pharmaceutical compound was analyzed spectrophotofluorometrically in the analytical lab." }
  ],
  10: [
    { word: "supercalifragilisticexpialidocious", meaning: "Extraordinarily wonderful; used when you have nothing else to say.", sentence: "The Broadway performance was celebrated as truly supercalifragilisticexpialidocious." },
    { word: "dichlorodiphenyltrichloroethane", meaning: "A synthetic crystalline chemical compound historically deployed as a potent insecticide.", sentence: "Environmental scientists traced synthetic residues of dichlorodiphenyltrichloroethane in aquatic sediments." },
    { word: "hepaticocholangiocholecystenterostomies", meaning: "Surgical gall-bladder and hepatic duct anastomoses performed in gastroenterology.", sentence: "The surgical manual documented intricate techniques for hepaticocholangiocholecystenterostomies." }
  ]
};

const usedWordsGlobal = new Set<string>();

/**
 * Free Dictionary API lookup (100% free, zero authentication / zero API key required)
 * https://api.dictionaryapi.dev/api/v2/entries/en/<word>
 */
async function fetchOnlineDefinition(word: string): Promise<{ meaning: string; sentence: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s quick timeout
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    let meaning = "";
    let example = "";

    if (Array.isArray(entry.meanings)) {
      for (const m of entry.meanings) {
        if (Array.isArray(m.definitions)) {
          for (const d of m.definitions) {
            if (!meaning && d.definition) meaning = d.definition;
            if (!example && d.example) example = d.example;
            if (meaning && example) break;
          }
        }
        if (meaning && example) break;
      }
    }

    if (!meaning) return null;
    return {
      meaning,
      sentence: example || `The word "${word}" was used in formal English discourse.`
    };
  } catch {
    return null;
  }
}

/**
 * Generates spelling bee words for the given count and difficulty tier.
 * Completely deterministic and offline-first, augmented by free online dictionaries when available.
 */
export async function generateSpellingBeeBatch(count: number, difficulty: number): Promise<SpellingBeeWord[]> {
  const tier = Math.min(10, Math.max(1, Math.round(difficulty)));
  const pool = SPELLING_BEE_TIERED_DICTIONARY[tier] || SPELLING_BEE_TIERED_DICTIONARY[1];

  let available = pool.filter(w => !usedWordsGlobal.has(w.word.toLowerCase()));
  if (available.length < count) {
    pool.forEach(w => usedWordsGlobal.delete(w.word.toLowerCase()));
    available = [...pool];
  }

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  selected.forEach(w => usedWordsGlobal.add(w.word.toLowerCase()));

  // Attempt to enrich with fresh definition from free public dictionary if network is active
  const enriched = await Promise.all(
    selected.map(async (item) => {
      try {
        const online = await fetchOnlineDefinition(item.word);
        if (online) {
          return {
            word: item.word,
            meaning: online.meaning || item.meaning,
            sentence: online.sentence || item.sentence,
            difficulty: tier
          };
        }
      } catch {
        // Fallback to local
      }
      return { ...item, difficulty: tier };
    })
  );

  return enriched;
}
