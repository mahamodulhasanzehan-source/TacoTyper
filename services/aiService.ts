import { SessionStats } from '../types';
import { 
  getDeterministicSpeedText, 
  getDeterministicSpeedComment, 
  getDeterministicCompetitiveScore 
} from './tacoEngine';
import { getTriviaItemsBatch, TriviaItem } from './triviaDataset';
import { generateSpellingBeeBatch, SpellingBeeWord } from './spellingBeeEngine';
import { evaluateIQPerformanceDeterministic, IQEvaluationResult } from './iqEngine';
import { WORDLE_WORDS_BY_LENGTH } from './wordleService';

/**
 * AIService (Deterministic & Free Offline Engine)
 * Replaces all paid/quota-limited Gemini API calls with instant, factual,
 * zero-latency algorithms, curated datasets, and free zero-auth public APIs.
 */
class AIService {
  async generateSpeedText(): Promise<string> {
    return getDeterministicSpeedText();
  }

  async generateSpeedComment(wpm: number, _cpm: number, accuracy: number): Promise<string> {
    return getDeterministicSpeedComment(wpm, accuracy).comment;
  }

  async generateCompetitiveScore(stats: SessionStats, speedTest?: { wpm: number, accuracy: number }): Promise<{ score: number, title: string }> {
    return getDeterministicCompetitiveScore(stats, speedTest);
  }

  async generateSpellingBeeWordsBatch(count: number, difficulty: number): Promise<SpellingBeeWord[]> {
    return generateSpellingBeeBatch(count, difficulty);
  }

  async generateMoreLessItems(count: number = 8): Promise<TriviaItem[]> {
    return getTriviaItemsBatch(count);
  }

  async evaluateIQPerformance(score: number, correct: number, total: number, timeTakenSeconds: number): Promise<{ comment: string, analysis: string }> {
    const res: IQEvaluationResult = evaluateIQPerformanceDeterministic(score, correct, total, timeTakenSeconds);
    return {
      comment: res.comment,
      analysis: res.analysis
    };
  }

  async generateWordleWords(count: number, length: number = 5): Promise<string[]> {
    const pool = WORDLE_WORDS_BY_LENGTH[length] || WORDLE_WORDS_BY_LENGTH[5] || [];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export const aiService = new AIService();
