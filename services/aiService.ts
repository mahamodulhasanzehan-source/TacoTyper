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

  async generateSpellingBeeWordsBatch(count: number, difficulty: number): Promise<{ word: string, meaning: string, sentence: string }[]> {
    const fallbacks = [
      { word: "restaurant", meaning: "A place where people pay to sit and eat meals that are cooked and served on the premises.", sentence: "We had dinner at a nice Italian restaurant." },
      { word: "ingredient", meaning: "Any of the foods or substances that are combined to make a particular dish.", sentence: "Pork is an important ingredient in many Chinese dishes." },
      { word: "delicious", meaning: "Highly pleasant to the taste.", sentence: "The cake was absolutely delicious." },
      { word: "kitchen", meaning: "A room or area where food is prepared and cooked.", sentence: "The chef is in the kitchen." },
      { word: "recipe", meaning: "A set of instructions for preparing a particular dish.", sentence: "I followed the recipe exactly." },
      { word: "avocado", meaning: "A pear-shaped fruit with a rough green skin and oily edible flesh.", sentence: "Fresh avocado makes the best guacamole." },
      { word: "seasoning", meaning: "Salt, herbs, or spices added to food to enhance the flavor.", sentence: "Taste the soup and adjust the seasoning." }
    ];

    const ai = this.getClient();
    if (!ai) {
      return fallbacks.slice(0, count);
    }

    try {
      const randomTopics = ["science", "nature", "history", "technology", "art", "literature", "geography", "music", "food", "space", "animals", "emotions", "architecture", "sports", "philosophy", "medicine", "botany", "astronomy", "mythology", "oceanography"];
      const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
      const randomSeed = Math.floor(Math.random() * 10000);

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate a list of exactly ${count} unique spelling bee words for difficulty level ${difficulty} (1 is easy, 10 is very hard). To ensure variety, focus on words related to the topic of "${randomTopic}" or use random seed ${randomSeed}. The words MUST NOT be the same common words you always pick. For each word, return the word, its meaning, and an example sentence. Return ONLY a JSON array of objects.`,
        config: {
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
          return data.map((d: any) => ({ 
            word: String(d.word).toLowerCase().trim(), 
            meaning: String(d.meaning), 
            sentence: String(d.sentence) 
          }));
        }
      }
      return fallbacks.slice(0, count);
    } catch (e) {
      console.warn("AI Spelling Bee fallback activated:", e);
      return fallbacks.slice(0, count);
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
