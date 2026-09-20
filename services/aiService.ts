import { GoogleGenAI, Type } from "@google/genai";
import { SPEED_TEST_TEXTS } from '../constants';
import { SessionStats } from '../types';

class AIService {
  private aiInstance: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI | null {
    if (this.aiInstance) return this.aiInstance;

    const apiKey = 
      (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (import.meta as any).env?.GEMINI_API_KEY ||
      (import.meta as any).env?.API_KEY ||
      '';

    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
      try {
        this.aiInstance = new GoogleGenAI({ apiKey: apiKey.trim() });
      } catch (err) {
        console.warn("Could not instantiate GoogleGenAI client:", err);
      }
    }
    return this.aiInstance;
  }

  async generateSpeedText(): Promise<string> {
    const ai = this.getClient();
    if (!ai) return this.getFallbackText();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: "Generate 2 short, interesting paragraphs about culinary history, exotic ingredients, or food science. The text should be educational and engaging, suitable for a typing test. Total length around 60-80 words. Plain text only, no markdown formatting.",
      });
      return response.text?.trim() || this.getFallbackText();
    } catch (e) {
      console.warn("AI Text Gen fallback activated:", e);
      return this.getFallbackText();
    }
  }

  async generateSpeedComment(wpm: number, cpm: number, accuracy: number): Promise<string> {
    const ai = this.getClient();
    if (!ai) {
      if (accuracy < 90) return "You're making a mess of my kitchen!";
      if (wpm > 60) return "Fast hands, Chef!";
      return "Practice your knife skills.";
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Act as a strict but fair head chef. A line cook just completed a prep task (typing test). Stats: ${wpm} WPM, ${accuracy}% Accuracy. Give a one-sentence feedback comment. If accuracy is low, be critical about sloppy work. If fast and accurate, praise them.`,
      });
      return response.text?.trim() || "Back to the station, Chef.";
    } catch {
      return "Keep cooking, Chef.";
    }
  }

  async generateCompetitiveScore(stats: SessionStats, speedTest?: { wpm: number, accuracy: number }): Promise<{ score: number, title: string }> {
    const ai = this.getClient();
    if (!ai) {
      return this.calculateFallbackScore(stats, speedTest);
    }

    try {
      const prompt = speedTest 
        ? `Evaluate this speed typing performance: ${speedTest.wpm} WPM, ${speedTest.accuracy}% Accuracy. Assign a score (0-100) and a creative kitchen rank title (e.g. "Sous Chef", "Dishwasher", "Line Cook", "Executive Chef").`
        : `Evaluate this cooking game session: 
           Mistakes: ${stats.mistakes}, 
           Time: ${stats.timeTaken.toFixed(1)}s, 
           Ingredients Missed: ${stats.ingredientsMissed}, 
           Rotten Food Typed: ${stats.rottenWordsTyped}, 
           Total Score: ${stats.totalScore}, 
           Level Reached: ${stats.levelReached}.
           Assign a performance score (0-100) and a creative kitchen rank title.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              title: { type: Type.STRING }
            },
            required: ['score', 'title']
          }
        }
      });
      
      const jsonStr = response.text;
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        return { score: Number(data.score) || 75, title: String(data.title) || "Taco Virtuoso" };
      }
      return this.calculateFallbackScore(stats, speedTest);
    } catch (e) {
      console.warn("AI Scoring fallback activated:", e);
      return this.calculateFallbackScore(stats, speedTest);
    }
  }

  private spellingBeeUsedWords: Set<string> = new Set();

  private SPELLING_BEE_TIERED_DICTIONARY: Record<number, { word: string, meaning: string, sentence: string }[]> = {
    1: [
      { word: "galaxy", meaning: "A system of millions or billions of stars, together with gas and dust, held together by gravitational attraction.", sentence: "Our solar system resides in the Milky Way galaxy." },
      { word: "meadow", meaning: "A piece of grassland, especially one used for hay or pasture.", sentence: "Wildflowers bloomed across the sunlit meadow." },
      { word: "whisper", meaning: "Speak very softly using one's breath without vibrating the vocal cords.", sentence: "She leaned in close to whisper a secret." },
      { word: "journey", meaning: "An act of traveling from one place to another.", sentence: "The explorers set off on a perilous mountain journey." },
      { word: "crystal", meaning: "A piece of a homogeneous solid substance having a natural geometrically regular form.", sentence: "The cave walls sparkled with quartz crystal." },
      { word: "lantern", meaning: "A lamp with a transparent case protecting the flame or electric bulb.", sentence: "They lit a brass lantern to guide their way through the fog." },
      { word: "breeze", meaning: "A gentle, refreshing wind.", sentence: "A cool coastal breeze rustled through the palm trees." },
      { word: "dolphin", meaning: "A highly intelligent aquatic mammal with a beak-like snout and a curved dorsal fin.", sentence: "A friendly dolphin leaped alongside the boat." },
      { word: "glacier", meaning: "A slowly moving mass or river of ice formed by the accumulation of snow.", sentence: "Hikers marveled at the immense blue glacier." },
      { word: "treasure", meaning: "A quantity of precious metals, gems, or other valuable objects.", sentence: "The divers discovered a sunken treasure chest." },
      { word: "volcano", meaning: "A mountain or hill having a crater through which lava and gas erupt.", sentence: "Ash puffed gently from the active volcano." },
      { word: "feather", meaning: "One of the flat, light structures forming the plumage of birds.", sentence: "The eagle lost a pristine white feather during flight." },
      { word: "compass", meaning: "An instrument containing a magnetized pointer that shows magnetic north.", sentence: "Always check your compass before hiking into the wilderness." },
      { word: "castle", meaning: "A large fortified building typical of medieval times.", sentence: "A stone castle stood proudly atop the rocky cliff." },
      { word: "fossil", meaning: "The preserved remains or traces of a prehistoric organism.", sentence: "The museum displayed a remarkably intact dinosaur fossil." },
      { word: "harvest", meaning: "The process or period of gathering crops.", sentence: "Farmers worked long hours during the autumn apple harvest." },
      { word: "island", meaning: "A piece of land entirely surrounded by water.", sentence: "They sailed to a secluded tropical island." },
      { word: "shadow", meaning: "A dark area or shape produced by a body coming between rays of light and a surface.", sentence: "The tall oak cast a long shadow across the lawn." },
      { word: "velvet", meaning: "A closely woven fabric of silk, cotton, or nylon, that has a thick short pile.", sentence: "The theater curtains were made of deep crimson velvet." },
      { word: "blossom", meaning: "A flower or mass of flowers on a tree or bush.", sentence: "Cherry blossom petals drifted on the spring breeze." }
    ],
    2: [
      { word: "umbrella", meaning: "A device consisting of a circular canopy of cloth on a folding metal frame supported by a central rod.", sentence: "Never forget your umbrella on a cloudy afternoon." },
      { word: "telescope", meaning: "An optical instrument designed to make distant objects appear nearer.", sentence: "We gazed at Saturn's rings through the high-powered telescope." },
      { word: "pyramid", meaning: "A monumental structure with a square base and sloping sides that meet in a point at the top.", sentence: "The Great Pyramid of Giza is an ancient architectural marvel." },
      { word: "avalanche", meaning: "A mass of snow, ice, and rocks falling rapidly down a mountainside.", sentence: "Loud warnings sounded to alert skiers of a potential avalanche." },
      { word: "sanctuary", meaning: "A place of safety, refuge, or nature protection.", sentence: "The wildlife sanctuary provides a haven for endangered tigers." },
      { word: "pendulum", meaning: "A weight hung from a fixed point so that it can swing freely backward and forward.", sentence: "The antique clock ticked steadily as its brass pendulum swung." },
      { word: "symphony", meaning: "An elaborate musical composition for a full orchestra.", sentence: "Beethoven composed his famous ninth symphony in complete deafness." },
      { word: "cinnamon", meaning: "An aromatic spice made from the peeled, dried, and rolled bark of a tree.", sentence: "She sprinkled ground cinnamon over the warm oatmeal." },
      { word: "orchestra", meaning: "A large ensemble of musicians playing string, woodwind, brass, and percussion instruments.", sentence: "The symphony orchestra received a standing ovation." },
      { word: "monastery", meaning: "A building or buildings occupied by a community of monks living under religious vows.", sentence: "The tranquil stone monastery overlooked the misty valley." },
      { word: "labyrinth", meaning: "A complicated irregular network of passages or paths in which it is difficult to find one's way.", sentence: "The minotaur guarded the winding corridors of the ancient labyrinth." },
      { word: "chameleon", meaning: "A small slow-moving Old World lizard with physical camouflage capabilities.", sentence: "The chameleon changed its skin from emerald green to mottled brown." }
    ],
    3: [
      { word: "kaleidoscope", meaning: "A toy consisting of a tube containing mirrors and pieces of colored glass producing changing patterns.", sentence: "Looking through the kaleidoscope revealed dazzling geometric symmetries." },
      { word: "silhouette", meaning: "The dark shape and outline of someone or something visible against a lighter background.", sentence: "The horse stood in sharp silhouette against the setting sun." },
      { word: "hieroglyph", meaning: "A picture of an object representing a word, syllable, or sound, as found in ancient Egyptian writing.", sentence: "Scholars decoded the carved hieroglyph on the tomb wall." },
      { word: "archipelago", meaning: "A group or chain of many islands.", sentence: "Indonesia is the world's largest equatorial archipelago." },
      { word: "boulevard", meaning: "A wide street in a town or city, typically one lined with trees.", sentence: "They strolled leisurely down the Parisian boulevard." },
      { word: "meteorite", meaning: "A piece of rock or metal that has fallen to the earth's surface from outer space.", sentence: "The crater was formed thousands of years ago by an iron meteorite." },
      { word: "cappuccino", meaning: "An Italian coffee drink prepared with espresso, steamed milk, and a thick foam layer.", sentence: "He ordered a hot cappuccino with extra dusted cocoa." },
      { word: "camouflage", meaning: "The disguising of military personnel, equipment, or animals by blending into the environment.", sentence: "The snow leopard's spotted coat is ideal camouflage in rocky peaks." }
    ],
    4: [
      { word: "serendipity", meaning: "The occurrence and development of events by chance in a happy or beneficial way.", sentence: "Finding my dream job while waiting for a train was pure serendipity." },
      { word: "ephemeral", meaning: "Lasting for a very short time; fleeting.", sentence: "The morning mist over the lake created an ephemeral beauty." },
      { word: "ubiquitous", meaning: "Present, appearing, or found everywhere.", sentence: "Smartphones have become ubiquitous across modern society." },
      { word: "cacophony", meaning: "A harsh, discordant mixture of loud sounds.", sentence: "A cacophony of car horns and construction echoed through the city." },
      { word: "magnanimous", meaning: "Very generous or forgiving, especially toward a rival or someone less powerful.", sentence: "The champion was magnanimous in victory, praising his opponent's courage." },
      { word: "soliloquy", meaning: "An act of speaking one's thoughts aloud when by oneself in a play.", sentence: "Hamlet's famous soliloquy begins with the words 'To be, or not to be'." },
      { word: "juxtaposition", meaning: "The fact of two things being seen or placed close together with contrasting effect.", sentence: "The juxtaposition of the ancient temple beside gleaming skyscrapers was striking." },
      { word: "mellifluous", meaning: "A sound that is sweet, smooth, and pleasing to hear.", sentence: "The jazz singer possessed a rich, mellifluous voice." }
    ],
    5: [
      { word: "quintessential", meaning: "Representing the most perfect or typical example of a quality or class.", sentence: "Afternoon tea with scones is the quintessential British tradition." },
      { word: "idiosyncrasy", meaning: "A mode of behavior or way of thought peculiar to an individual.", sentence: "One of his quirky idiosyncrasies was wearing mismatched socks." },
      { word: "clandestine", meaning: "Kept secret or done secretively, especially because illicit.", sentence: "The detectives uncovered a clandestine meeting in the warehouse." },
      { word: "perspicacious", meaning: "Having a ready insight into and understanding of things.", sentence: "Her perspicacious analysis solved the legal dilemma instantly." },
      { word: "superfluous", meaning: "Unnecessary, especially through being more than enough.", sentence: "Avoid adding superfluous adjectives when writing concise reports." },
      { word: "grandiloquent", meaning: "Pompous or extravagant in language, style, or manner.", sentence: "The orator delivered a grandiloquent speech laden with archaic prose." },
      { word: "surreptitious", meaning: "Kept secret, especially because it would not be approved of.", sentence: "She cast a surreptitious glance at the clock during the lecture." },
      { word: "resplendent", meaning: "Attractive and impressive through being richly colorful or shining.", sentence: "The ballroom looked resplendent in shimmering golden chandelier lights." }
    ],
    6: [
      { word: "bourgeoisie", meaning: "The middle class, typically with reference to its perceived materialistic values.", sentence: "Sociologists studied the rising economic influence of the urban bourgeoisie." },
      { word: "paraphernalia", meaning: "Miscellaneous articles, especially the equipment needed for a particular activity.", sentence: "The artist's studio was cluttered with brushes, canvases, and painting paraphernalia." },
      { word: "chrysanthemum", meaning: "A popular plant of the daisy family, having brightly colored decorative flowers.", sentence: "Autumn gardens were adorned with golden chrysanthemum blooms." },
      { word: "reconnaissance", meaning: "Military observation of a region to locate an enemy or ascertain strategic features.", sentence: "The drone completed an aerial reconnaissance mission over the valley." },
      { word: "onomatopoeia", meaning: "The formation of a word from a sound associated with what is named (e.g., sizzle, buzz).", sentence: "Comic books frequently use onomatopoeia like 'zap' and 'boom'." },
      { word: "connoisseur", meaning: "An expert judge in matters of taste and fine arts.", sentence: "As a seasoned coffee connoisseur, she could identify the origin of any bean." },
      { word: "sovereignty", meaning: "Supreme power, supreme authority, or the authority of a state to govern itself.", sentence: "The newly independent nation celebrated its full territorial sovereignty." },
      { word: "anachronism", meaning: "A thing belonging or appropriate to a period other than that in which it exists.", sentence: "Seeing a wristwatch on a gladiator in the movie was a glaring anachronism." }
    ],
    7: [
      { word: "sesquipedalian", meaning: "Characterized by long words; long-winded.", sentence: "The professor had an amusingly sesquipedalian lecturing style." },
      { word: "effervescent", meaning: "Giving off bubbles; fizzy, or vivacious and enthusiastic.", sentence: "Her effervescent personality brightened every room she entered." },
      { word: "acquiesce", meaning: "Accept something reluctantly but without protest.", sentence: "The council chose to acquiesce to the residents' zoning demands." },
      { word: "hemorrhage", meaning: "An escape of blood from a ruptured blood vessel, or a rapid uncontrollable loss.", sentence: "Emergency medics worked swiftly to control the severe hemorrhage." },
      { word: "misdemeanor", meaning: "A minor wrongdoing or non-indictable offense.", sentence: "Jaywalking across a quiet side street is classified as a minor misdemeanor." },
      { word: "millennium", meaning: "A period of a thousand years, especially when calculated from the traditional date of the birth of Christ.", sentence: "Cities worldwide celebrated the dawn of the new millennium." },
      { word: "renaissance", meaning: "A revival of or renewed interest in something, especially art or culture.", sentence: "The historic downtown district is undergoing a remarkable cultural renaissance." },
      { word: "surveillance", meaning: "Close observation, especially of a suspected spy or criminal.", sentence: "High-definition surveillance cameras were positioned throughout the bank vault." }
    ],
    8: [
      { word: "antidisestablishmentarianism", meaning: "Opposition to the withdrawal of state support or recognition from an established church.", sentence: "Antidisestablishmentarianism is famous for being one of the longest words in English." },
      { word: "floccinaucinihilipilification", meaning: "The action or habit of estimating something as worthless.", sentence: "His casual floccinaucinihilipilification of classical art baffled museum curators." },
      { word: "honorificabilitudinitatibus", meaning: "The state of being able to achieve honors.", sentence: "Shakespeare incorporated the Latinate word honorificabilitudinitatibus in Love's Labour's Lost." },
      { word: "counterrevolutionaries", meaning: "Those who take part in or support an effort to reverse a political revolution.", sentence: "The royalist counterrevolutionaries organized secret resistance units." },
      { word: "incomprehensibilities", meaning: "Things that are impossible or extremely difficult to understand.", sentence: "Quantum mechanics presents baffling incomprehensibilities to lay observers." },
      { word: "psychoneuroimmunology", meaning: "The study of the effect of the mind on health and the immune system.", sentence: "Medical researchers in psychoneuroimmunology examined the biological impacts of stress." }
    ]
  };

  private getFallbackSpellingBeeBatch(count: number, difficulty: number): { word: string, meaning: string, sentence: string }[] {
    const tier = Math.min(8, Math.max(1, Math.round(difficulty * 0.8)));
    const pool = this.SPELLING_BEE_TIERED_DICTIONARY[tier] || this.SPELLING_BEE_TIERED_DICTIONARY[1];
    
    // Filter out recently used words if possible
    let available = pool.filter(item => !this.spellingBeeUsedWords.has(item.word.toLowerCase()));
    if (available.length < count) {
      // If pool is exhausted, reset used words for this tier
      pool.forEach(item => this.spellingBeeUsedWords.delete(item.word.toLowerCase()));
      available = [...pool];
    }

    // Shuffle
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    selected.forEach(item => this.spellingBeeUsedWords.add(item.word.toLowerCase()));
    return selected;
  }

  async generateSpellingBeeWordsBatch(count: number, difficulty: number): Promise<{ word: string, meaning: string, sentence: string }[]> {
    const ai = this.getClient();
    if (!ai) {
      return this.getFallbackSpellingBeeBatch(count, difficulty);
    }

    try {
      const randomTopics = ["astronomy", "geology", "botany", "mythology", "architecture", "musicology", "oceanography", "linguistics", "chemistry", "medieval", "meteorology", "archaeology", "philosophy", "culinary", "zoology", "literature"];
      const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
      const randomSeed = Math.floor(Math.random() * 1000000);
      const usedArray = Array.from(this.spellingBeeUsedWords).slice(-20);

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate exactly ${count} spelling bee words for difficulty level ${difficulty}/10. 
        Topic theme: "${randomTopic}". Seed: ${randomSeed}.
        CRITICAL RULES:
        - Words MUST NOT be simple common words like 'restaurant', 'ingredient', 'recipe', 'kitchen', 'avocado', 'seasoning'.
        - Do NOT include any of these recently used words: [${usedArray.join(', ')}].
        - Match difficulty ${difficulty}: level 1-2 (elementary), 3-4 (middle school), 5-6 (high school), 7-8 (national bee), 9-10 (championship).
        - For each word, include a concise definition and a complete example sentence using the word.
        - Return ONLY a JSON array.`,
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                meaning: { type: Type.STRING },
                sentence: { type: Type.STRING }
              },
              required: ['word', 'meaning', 'sentence']
            }
          }
        }
      });
      
      const jsonStr = response.text;
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((d: any) => ({ 
            word: String(d.word).toLowerCase().trim(), 
            meaning: String(d.meaning), 
            sentence: String(d.sentence) 
          })).filter(item => item.word.length >= 3 && /^[a-z]+$/.test(item.word));

          if (formatted.length > 0) {
            formatted.forEach(item => this.spellingBeeUsedWords.add(item.word));
            return formatted.slice(0, count);
          }
        }
      }
      return this.getFallbackSpellingBeeBatch(count, difficulty);
    } catch (e) {
      console.warn("AI Spelling Bee fallback activated:", e);
      return this.getFallbackSpellingBeeBatch(count, difficulty);
    }
  }

  async evaluateIQPerformance(score: number, correct: number, total: number, timeTakenSeconds: number): Promise<{ comment: string, analysis: string }> {
    const fallbackComment = score >= 130 ? "Exceptional pattern recognition and rapid cognitive processing!" :
      score >= 115 ? "Superior analytical reasoning and spatial deduction." :
      score >= 100 ? "Solid cognitive acuity and balanced problem-solving speed." :
      "Good effort! Cognitive agility sharpens with consistent practice.";
    
    const fallbackAnalysis = `Completed ${correct} out of ${total} problems in ${Math.round(timeTakenSeconds)}s. Your percentile places you firmly in the competitive tier.`;

    const ai = this.getClient();
    if (!ai) {
      return { comment: fallbackComment, analysis: fallbackAnalysis };
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Evaluate an IQ Challenge performance: Estimated IQ score: ${score}, Correct answers: ${correct}/${total}, Time taken: ${timeTakenSeconds.toFixed(1)} seconds. Provide an insightful 1-sentence assessment comment and a 2-sentence cognitive analysis highlight.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              comment: { type: Type.STRING },
              analysis: { type: Type.STRING }
            },
            required: ['comment', 'analysis']
          }
        }
      });

      const jsonStr = response.text;
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        return {
          comment: String(data.comment) || fallbackComment,
          analysis: String(data.analysis) || fallbackAnalysis
        };
      }
      return { comment: fallbackComment, analysis: fallbackAnalysis };
    } catch (e) {
      console.warn("AI IQ Evaluation fallback activated:", e);
      return { comment: fallbackComment, analysis: fallbackAnalysis };
    }
  }

  async generateWordleWords(count: number, length: number = 5): Promise<string[]> {
    const ai = this.getClient();
    if (!ai) {
      return this.getWordleFallbacks(count, length);
    }

    try {
      const randomSeed = Math.floor(Math.random() * 1000000);
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate a list of exactly ${count} completely random, unique, standard ${length}-letter English dictionary words in uppercase. Use seed ${randomSeed}. Return ONLY a JSON array of strings.`,
        config: {
          temperature: 1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      
      const jsonStr = response.text;
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        if (Array.isArray(data) && data.length > 0) {
          const words = data
            .map(w => String(w).toUpperCase().trim())
            .filter(w => w.length === length);
          if (words.length > 0) return words;
        }
      }
      return this.getWordleFallbacks(count, length);
    } catch (e) {
      console.warn("AI Wordle Gen fallback activated:", e);
      return this.getWordleFallbacks(count, length);
    }
  }

  private getWordleFallbacks(count: number, length: number = 5): string[] {
    const wordsByLen: Record<number, string[]> = {
      5: ["HELLO", "WORLD", "REACT", "GAMES", "TACOS", "BIRDS", "BEARS", "APPLE", "HOUSE", "WATER", "TRAIN", "PLANT", "GHOST", "SMILE", "BRAIN", "CLOCK", "CHAIR", "TABLE", "PHONE", "MOUSE", "LIGHT", "STORM", "BEACH", "RIVER", "BREAD"],
      6: ["ORANGE", "MONKEY", "PLANET", "ROCKET", "CASTLE", "GUITAR", "DRAGON", "FOREST", "PURPLE", "SILVER", "SPRING", "WINTER", "GARDEN", "YELLOW", "BRIDGE"],
      7: ["FREEDOM", "CRYSTAL", "PYRAMID", "DOLPHIN", "RAINBOW", "MONSTER", "JOURNEY", "FANTASY", "DIAMOND", "LANTERN", "THUNDER", "MORNING", "KITCHEN"],
      8: ["MOUNTAIN", "SANDWICH", "NOTEBOOK", "UNIVERSE", "ELEPHANT", "TREASURE", "FIREWORK", "HOSPITAL", "STARSHIP", "WARRIORS", "PLATFORM"],
      9: ["ASTRONAUT", "CHOCOLATE", "ADVENTURE", "CHAMPIONS", "BEAUTIFUL", "FIREPLACE", "DISCOVERY", "WONDERFUL", "LIGHTNING", "CROCODILE"]
    };

    const pool = wordsByLen[length] || wordsByLen[5];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private calculateFallbackScore(stats: SessionStats, speedTest?: { wpm: number, accuracy: number }) {
    if (speedTest) {
      let rawScore = speedTest.wpm * Math.pow(speedTest.accuracy / 100, 3);
      if (speedTest.accuracy < 80) rawScore = Math.min(rawScore, 40);
      if (speedTest.accuracy < 50) rawScore = 0;
      let score = Math.round((rawScore / 120) * 100);
      return { score: Math.min(100, score), title: "Line Cook (Unranked)" };
    } else {
      let score = 50 + (stats.totalScore / 500) - (stats.mistakes * 2) - (stats.ingredientsMissed * 5);
      if (stats.levelReached > 3) score += 10;
      if (stats.levelReached > 5) score += 20;
      score = Math.min(100, Math.max(0, Math.round(score)));
      return { score, title: "Line Cook (Unranked)" };
    }
  }

  async generateMoreLessItems(count: number = 8): Promise<{ name: string; value: number; image: string }[]> {
    const ai = this.getClient();
    if (!ai) {
      return this.getMoreLessFallbacks(count);
    }

    try {
      const randomSeed = Math.floor(Math.random() * 1000000);
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate a list of exactly ${count} interesting trivia items for a "Higher or Lower" trivia comparison game. Each item must have:
- "name": Concise description of the item and its unit, e.g. "Mount Everest (Height in m)" or "Tokyo (Population)" or "Cheetah (Top speed km/h)"
- "value": An integer numerical value for comparison
- "image": A single appropriate emoji representing the item, e.g. "🏔️", "🏙️", "🐆"
Use seed ${randomSeed}. Return ONLY a JSON array of objects.`,
        config: {
          temperature: 1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.INTEGER },
                image: { type: Type.STRING }
              },
              required: ['name', 'value', 'image']
            }
          }
        }
      });

      const jsonStr = response.text;
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        if (Array.isArray(data) && data.length >= count) {
          return data.slice(0, count).map((item: any) => ({
            name: String(item.name),
            value: Number(item.value) || 0,
            image: String(item.image) || "❓"
          }));
        }
      }
      return this.getMoreLessFallbacks(count);
    } catch (e) {
      console.warn("AI More/Less Gen fallback activated:", e);
      return this.getMoreLessFallbacks(count);
    }
  }

  private getMoreLessFallbacks(count: number = 8): { name: string; value: number; image: string }[] {
    const pool = [
      { name: "Mount Everest (Height in m)", value: 8849, image: "🏔️" },
      { name: "Burj Khalifa (Height in m)", value: 828, image: "🏙️" },
      { name: "Eiffel Tower (Height in m)", value: 330, image: "🗼" },
      { name: "Statue of Liberty (Height in m)", value: 93, image: "🗽" },
      { name: "Great Wall of China (Length in km)", value: 21196, image: "🧱" },
      { name: "Amazon River (Length in km)", value: 6400, image: "🌊" },
      { name: "Titanic (Length in m)", value: 269, image: "🚢" },
      { name: "Golden Gate Bridge (Length in m)", value: 2737, image: "🌉" },
      { name: "Moon Distance from Earth (km)", value: 384400, image: "🌙" },
      { name: "International Space Station (Altitude in km)", value: 408, image: "🛰️" },
      { name: "Blue Whale (Weight in kg)", value: 150000, image: "🐋" },
      { name: "African Elephant (Weight in kg)", value: 6000, image: "🐘" },
      { name: "Tyrannosaurus Rex (Weight in kg)", value: 8000, image: "🦖" },
      { name: "Cheetah (Top Speed in km/h)", value: 120, image: "🐆" },
      { name: "Commercial Jet (Speed in km/h)", value: 900, image: "✈️" },
      { name: "Speed of Sound (km/h)", value: 1235, image: "🔊" },
      { name: "Tokyo (Population)", value: 14000000, image: "🏙️" },
      { name: "Sahara Desert (Area in sq km)", value: 9200000, image: "🏜️" },
      { name: "Human Heartbeats Per Day", value: 100000, image: "❤️" },
      { name: "Days to Orbit Sun (Earth)", value: 365, image: "🌍" },
      { name: "Mariana Trench (Depth in m)", value: 11034, image: "🌊" }
    ];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private getFallbackText() {
    const p1 = SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
    let p2 = SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
    let retries = 0;
    while (p1 === p2 && retries < 5) {
      p2 = SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
      retries++;
    }
    return `${p1}\n\n${p2}`;
  }
}

export const aiService = new AIService();
