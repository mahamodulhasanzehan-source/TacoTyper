export interface IQEvaluationResult {
  comment: string;
  analysis: string;
  tier: string;
  percentile: number;
}

export function evaluateIQPerformanceDeterministic(
  score: number,
  correct: number,
  total: number,
  timeTakenSeconds: number
): IQEvaluationResult {
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const timePerQuestion = total > 0 ? timeTakenSeconds / total : 0;

  let tier = "Average";
  let percentile = 50;
  let comment = "Solid cognitive acuity and balanced problem-solving speed.";

  if (score >= 135) {
    tier = "Genius / Mensa Tier";
    percentile = 99;
    comment = "Phenomenal fluid intelligence, rapid spatial abstraction, and flawless deductive logic!";
  } else if (score >= 125) {
    tier = "Superior";
    percentile = 95;
    comment = "Exceptional pattern recognition and rapid cognitive processing under time constraints.";
  } else if (score >= 115) {
    tier = "High Average";
    percentile = 84;
    comment = "Strong analytical reasoning, keen matrix perception, and efficient problem solving.";
  } else if (score >= 100) {
    tier = "Average";
    percentile = 60;
    comment = "Consistent cognitive processing and solid performance on complex reasoning tasks.";
  } else if (score >= 85) {
    tier = "Low Average";
    percentile = 30;
    comment = "Good effort! Focus and pattern deduction sharpen steadily with consistent practice.";
  } else {
    tier = "Developing";
    percentile = 15;
    comment = "Persevered through challenging puzzles; practice with geometric matrices will build spatial acuity.";
  }

  const speedDescriptor = timePerQuestion < 8 ? "at blistering speed" : timePerQuestion < 18 ? "with measured precision" : "deliberately and thoughtfully";
  const analysis = `Solved ${correct} out of ${total} problems (${Math.round(accuracy)}% accuracy) ${speedDescriptor} in ${Math.round(timeTakenSeconds)}s. Your cognitive performance places you in the top ${100 - percentile <= 1 ? "1%" : `${Math.max(1, 100 - percentile)}%`} percentile.`;

  return { comment, analysis, tier, percentile };
}
