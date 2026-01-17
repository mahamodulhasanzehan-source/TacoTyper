import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SPEED_TEST_TEXTS } from '../constants';

class AIService {
  private ai: GoogleGenAI;
  // Using gemini-3-flash-preview for basic text tasks as per guidelines
  private modelId = 'gemini-3-flash-preview'; 

  constructor() {
    // API Key must be obtained exclusively from process.env.API_KEY
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateSpeedText(): Promise<string> {
    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: this.modelId,
        contents: "Generate a paragraph of about 40-50 words about a random interesting food or cooking fact. Do not include a title. Just the fact.",
      });
      return response.text || this.getFallbackText();
    } catch (error) {
      console.warn("AI Generation failed, using fallback.", error);
      return this.getFallbackText();
    }
  }

  async generateSpeedComment(wpm: number, cpm: number, accuracy: number): Promise<string> {
    try {
      const prompt = `A player just finished a typing game with ${wpm} WPM and ${accuracy}% accuracy. Write a short 1-sentence witty comment as a strict chef judge.`;
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: this.modelId,
        contents: prompt,
      });
      return response.text || "Keep cooking!";
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