
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { SPEED_TEST_TEXTS } from '../constants';
import { SessionStats } from '../types';

class AIService {
  private genAI: GoogleGenerativeAI;
  private modelId = 'gemini-1.5-flash'; 

  constructor() {
    // @ts-ignore
    this.genAI = new GoogleGenerativeAI(process.env.API_KEY as string);
  }

  async generateSpeedText(): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelId });
      const result = await model.generateContent("Generate a paragraph of about 40-50 words about a random interesting food or cooking fact. Do not include a title. Just the fact.");
      const response = await result.response;
      return response.text() || this.getFallbackText();
    } catch (error) {
      console.warn("AI Generation failed, using fallback.", error);
      return this.getFallbackText();
    }
  }

  async generateSpeedComment(wpm: number, cpm: number, accuracy: number): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelId });
      const prompt = `A player just finished a typing game with ${wpm} WPM and ${accuracy}% accuracy. Write a short 1-sentence witty comment as a strict chef judge.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text() || "Keep cooking!";
    } catch (error) {
      console.warn("AI Generation failed, using fallback.", error);
      if (accuracy < 90) return "Watch your accuracy, Chef!";
      if (wpm > 60) return "You are a speed demon in the kitchen!";
      return "Keep practicing to become a Master Chef.";
    }
  }

  async generateCompetitiveScore(stats: SessionStats): Promise<{ score: number, title: string }> {
    try {
        const model = this.genAI.getGenerativeModel({ 
            model: this.modelId,
            generationConfig: {
                responseMimeType: "application/json",
            }
        });
        
        const prompt = `
            You are the Head Judge of the Culinary Olympics. A player has completed a run in the cooking competition.
            They reached Level ${stats.levelReached} (Max is 6).

            Evaluate their performance based on these statistics and assign a Score (0 to 10000) and a Rank Title.

            Stats:
            - Level Reached: ${stats.levelReached}
            - Mistakes (Typos): ${stats.mistakes} (Lower is better)
            - Total Time Taken: ${stats.timeTaken} seconds (Lower is better)
            - Ingredients Dropped / Lives Lost: ${stats.ingredientsMissed} (Lower is better)
            - Rotten Ingredients Typed (Bad): ${stats.rottenWordsTyped} (Lower is better)
            - Raw Game Score: ${stats.totalScore} (Higher is better)

            Scoring Logic:
            - The most important factor is 'Level Reached'. The score you give is the *performance within that level context*.
            - Heavily penalize 'Rotten Ingredients Typed' and 'Ingredients Dropped'.
            - Reward speed (Time Taken) and low Mistakes.
            - Raw Game Score is a baseline, but you must normalize it into a competitive 0-10000 scale.
            
            Return JSON format: { "score": number, "title": string }
            Example Titles: "Sous Chef", "Line Cook", "Executive Chef", "Taco Legend", "Kitchen Disaster", "Dishwasher".
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const json = JSON.parse(text);
        
        return {
            score: json.score || 0,
            title: json.title || "Kitchen Porter"
        };

    } catch (error) {
        console.error("AI Score Generation failed", error);
        // Fallback calculation
        let score = Math.max(0, stats.totalScore - (stats.mistakes * 50) - (stats.timeTaken * 2) - (stats.ingredientsMissed * 200));
        score = Math.min(10000, score);
        return { score, title: "Line Cook (Offline)" };
    }
  }

  private getFallbackText() {
    return SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
  }
}

export const aiService = new AIService();
