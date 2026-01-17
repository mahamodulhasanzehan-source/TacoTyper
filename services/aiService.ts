
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
      
      // Dynamic Prompting to avoid cache/repetition
      const topics = ["obscure culinary history", "molecular gastronomy physics", "ancient grain farming", "coffee fermentation chemistry", "the evolution of silverware", "fungi in cheese making"];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const seed = Math.floor(Math.random() * 10000);

      const prompt = `Generate two distinct, detailed paragraphs (about 50-60 words each) about ${randomTopic} or a similarly obscure food fact.
      Do not use the word 'Saffron' or 'Taco'.
      Do not include a title. Just the raw text.
      Random Seed: ${seed}`; // Seed forces fresh generation

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text || text.length < 50) return this.getFallbackText();
      return text;
    } catch (error) {
      console.warn("AI Generation failed, using fallback.", error);
      return this.getFallbackText();
    }
  }

  async generateSpeedComment(wpm: number, cpm: number, accuracy: number): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelId });
      const prompt = `A player just finished a typing game with ${wpm} WPM and ${accuracy}% accuracy. Write a short 1-sentence witty comment as a strict chef judge. If accuracy is low, insult the mess.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text() || "Keep cooking!";
    } catch (error) {
      if (accuracy < 90) return "You're making a mess of my kitchen!";
      if (wpm > 60) return "Fast hands, Chef!";
      return "Practice your knife skills.";
    }
  }

  async generateCompetitiveScore(stats: SessionStats, speedTest?: { wpm: number, accuracy: number }): Promise<{ score: number, title: string }> {
    try {
        const model = this.genAI.getGenerativeModel({ 
            model: this.modelId,
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        let prompt = "";

        if (speedTest) {
            prompt = `
                You are the Head Judge of a Typing Speed Kitchen.
                Calculate a 'Quality Score' (0-100) based on WPM and Accuracy.
                
                CRITICAL RULES:
                - Accuracy is King. High WPM with low accuracy is Garbage.
                - If Accuracy < 80%, Score MUST be below 40.
                - If Accuracy < 50%, Score MUST be 0.
                - To get 90+, player needs >90 WPM AND >95% Accuracy.
                - To get 100, player needs >120 WPM AND >98% Accuracy.
                
                Stats:
                - WPM: ${speedTest.wpm}
                - Accuracy: ${speedTest.accuracy}%

                Return JSON: { "score": number, "title": string }
                Example Titles: "Dishwasher", "Line Cook", "Sous Chef", "Speed Demon", "Master Chef".
            `;
        } else {
             prompt = `
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
        }

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
        
        // Fallback Logic
        if (speedTest) {
            // Strict Formula: WPM * (Accuracy/100)^3
            // If Accuracy < 80, cap at 40.
            let rawScore = speedTest.wpm * Math.pow(speedTest.accuracy / 100, 3);
            if (speedTest.accuracy < 80) rawScore = Math.min(rawScore, 40);
            if (speedTest.accuracy < 50) rawScore = 0;
            // Normalize roughly (120 wpm = 100 pts)
            let score = Math.round((rawScore / 120) * 100);
            return { score: Math.min(100, score), title: "Line Cook (Offline)" };
        } else {
            // General Fallback
            let score = 50 + (stats.totalScore / 500) - (stats.mistakes * 2) - (stats.ingredientsMissed * 5);
            if (stats.levelReached > 3) score += 10;
            if (stats.levelReached > 5) score += 20;
            score = Math.min(100, Math.max(0, Math.round(score)));
            return { score, title: "Line Cook (Offline)" };
        }
    }
  }

  private getFallbackText() {
    // Return random fallback from expanded list
    const p1 = SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
    let p2 = SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
    // Ensure distinct paragraphs
    let retries = 0;
    while (p1 === p2 && retries < 5) {
        p2 = SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
        retries++;
    }
    return `${p1}\n\n${p2}`;
  }
}

export const aiService = new AIService();
