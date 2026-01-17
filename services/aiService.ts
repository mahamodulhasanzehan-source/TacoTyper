import { GoogleGenAI } from "@google/genai";

class AIService {
  private ai: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI | null {
      if (!this.ai) {
          // Static access to ensure bundler replacement
          const key = process.env.API_KEY || process.env.REACT_APP_API_KEY || process.env.VITE_API_KEY;
          
          if (key) {
              this.ai = new GoogleGenAI({ apiKey: key });
          }
      }
      return this.ai;
  }

  async generateSpeedText(): Promise<string> {
    const client = this.getClient();
    if (!client) return "AI Service Unavailable (Missing API Key)";

    try {
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Write a short, interesting documentary-style fact or story about food history. 150 words.",
      });
      return response.text || "Failed to generate text.";
    } catch (error) {
      console.error("AI Generation Error:", error);
      return "Error connecting to the chef's brain.";
    }
  }

  async generateSpeedComment(wpm: number, cpm: number, accuracy: number): Promise<string> {
    const client = this.getClient();
    if (!client) return "Keep cooking! (AI Key missing)";

    try {
      const prompt = `Evaluate a typist with WPM: ${wpm}, Accuracy: ${accuracy}%. Be a strict chef. One sentence.`;
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "Keep practicing!";
    } catch (error) {
      return "Speedy cooking!";
    }
  }
}

export const aiService = new AIService();