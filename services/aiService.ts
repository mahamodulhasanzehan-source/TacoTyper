import { GoogleGenAI } from "@google/genai";

class AIService {
  private ai: GoogleGenAI;

  constructor() {
    // Matches the "API_KEY" variable in your Vercel Screenshot
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateSpeedText(): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Write a short, interesting documentary-style fact or story about food history, cooking science, or a specific cuisine. It must be between 100 and 200 words long. Structure it into exactly 2 paragraphs. Do not use markdown formatting (like **bold**). Ensure there is a single blank line between paragraphs.",
      });
      return response.text || "Failed to generate text. Please try again.";
    } catch (error) {
      console.error("AI Generation Error:", error);
      return "Error connecting to the chef's brain. Please check your internet or API key.";
    }
  }

  async generateSpeedComment(wpm: number, cpm: number, accuracy: number): Promise<string> {
    try {
      const prompt = `A player just finished a typing speed test with these stats:
      - Words Per Minute (WPM): ${wpm}
      - Clicks Per Minute (CPM): ${cpm}
      - Accuracy: ${accuracy}%

      Act like a strict but fair head chef evaluating a line cook.
      - If Accuracy is low (< 85%), roast them for making a mess in the kitchen, regardless of their speed.
      - If WPM is low (< 30) and Accuracy is high, tell them they are too slow and the food is getting cold.
      - If both are high (WPM > 60, Accuracy > 95%), praise them as a potential Master Chef.
      - Otherwise, give a balanced critique on how to improve flow.

      Write exactly ONE sentence. Do not mention the specific numbers in the response.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "Your chopping skills need work. Keep practicing to become a master chef.";
    } catch (error) {
      return "Speedy cooking! But there is always room for improvement.";
    }
  }
}

export const aiService = new AIService();