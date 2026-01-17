import { GoogleGenerativeAI } from "@google/generative-ai";
import { SPEED_TEST_TEXTS } from '../constants';

class AIService {
  private genAI: GoogleGenerativeAI;
  // Using gemini-1.5-flash which is standard for this SDK version
  private modelId = 'gemini-1.5-flash'; 

  constructor() {
    // API Key must be obtained exclusively from process.env.API_KEY
    // @ts-ignore - process.env is polyfilled in vite config
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

  private getFallbackText() {
    return SPEED_TEST_TEXTS[Math.floor(Math.random() * SPEED_TEST_TEXTS.length)];
  }
}

export const aiService = new AIService();