
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
      // Updated prompt for 2 paragraphs
      const result = await model.generateContent("Generate two distinct, detailed paragraphs (about 50-60 words each) about a random interesting food history or cooking science fact. Do not include a title. Just the text.");
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
        
        // Updated prompt for 0-100 score
        const prompt = `
            You are the Head Judge of the Culinary Olympics. A player has completed a run.
            Evaluate their performance and assign a Score from 0 to 100 (Integer) and a Rank Title.

            Stats:
            - Level Reached: ${stats.levelReached} (Max 6)
            - Mistakes: ${stats.mistakes}
            - Time: ${stats.timeTaken.toFixed(1)}s
            - Ingredients Dropped: ${stats.ingredientsMissed}
            - Rotten Eaten: ${stats.rottenWordsTyped}
            - Raw Points: ${stats.totalScore}

            Scoring Guide:
            - 90-100: Perfection. Fast, no mistakes, high levels.
            - 70-89: Good solid performance.
            - 50-69: Average, some mistakes or drops.
            - 0-49: Poor performance, many drops or rotten food.

            Return JSON: { "score": number, "title": string }
            Example Titles: "Sous Chef", "Line Cook", "Executive Chef", "Taco Legend", "Kitchen Disaster".
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const json = JSON.parse(text);
        
        return {
            score: Math.min(100, Math.max(0, json.score || 0)),
            title: json.title || "Kitchen Porter"
        };

    } catch (error) {
        console.error("AI Score Generation failed", error);
        // Fallback calculation 0-100
        // Base 50 + (Points/1000) - Penalties
        let score = 50 + (stats.totalScore / 500) - (stats.mistakes * 2) - (stats.ingredientsMissed * 5);
        if (stats.levelReached > 3) score += 10;
        if (stats.levelReached > 5) score += 20;
        
        score = Math.min(100, Math.max(0, Math.round(score)));
        return { score, title: "Line Cook (Offline)" };
    }
  }

  private getFallbackText() {
    // Fallback: Return two concatenated strings from pool to simulate 2 paragraphs
    const p1 = SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
    let p2 = SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
    while (p1 === p2) {
        p2 = SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
    }
    return `${p1}\n\n${p2}`;
  }
}

export const aiService = new AIService();
