
import { GoogleGenAI, Type } from "@google/genai";
import { SPEED_TEST_TEXTS } from '../constants';
import { SessionStats } from '../types';

// Mock AI Service replaced with Gemini API integration
class AIService {
  private ai: GoogleGenAI | null = null;
  
  constructor() {
    // Initialize Gemini client if API key is present
    if (process.env.API_KEY) {
        try {
            this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (error) {
            console.error("Failed to initialize Gemini:", error);
        }
    } else {
        console.warn("API_KEY missing. AI features will use fallback.");
    }
  }

  async generateSpeedText(): Promise<string> {
    if (!this.ai) return this.getFallbackText();

    try {
        const response = await this.ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Generate 2 short, interesting paragraphs about culinary history, exotic ingredients, or food science. The text should be educational and engaging, suitable for a typing test. Total length around 60-80 words. Plain text only, no markdown formatting.",
        });
        return response.text?.trim() || this.getFallbackText();
    } catch (e) {
        console.error("AI Text Gen Error:", e);
        return this.getFallbackText();
    }
  }

  async generateSpeedComment(wpm: number, cpm: number, accuracy: number): Promise<string> {
    if (!this.ai) {
        if (accuracy < 90) return "You're making a mess of my kitchen!";
        if (wpm > 60) return "Fast hands, Chef!";
        return "Practice your knife skills.";
    }

    try {
        const response = await this.ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Act as a strict but fair head chef. A line cook just completed a prep task (typing test). Stats: ${wpm} WPM, ${accuracy}% Accuracy. Give a one-sentence feedback comment. If accuracy is low, be critical about sloppy work. If fast and accurate, praise them.`,
        });
        return response.text?.trim() || "Back to the station, Chef.";
    } catch (e) {
        return "Keep cooking, Chef.";
    }
  }

  async generateCompetitiveScore(stats: SessionStats, speedTest?: { wpm: number, accuracy: number }): Promise<{ score: number, title: string }> {
     // Use AI to calculate a "Vibe Score" and Title
     if (!this.ai) {
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

         const response = await this.ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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
             return { score: data.score, title: data.title };
         }
         throw new Error("Empty AI response");
     } catch (e) {
         console.error("AI Scoring Error:", e);
         return this.calculateFallbackScore(stats, speedTest);
     }
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
