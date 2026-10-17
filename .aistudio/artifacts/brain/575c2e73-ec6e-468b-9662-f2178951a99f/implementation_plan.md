# Taco Typer: Offline Algorithm & Multi-Outcome Chef Critique Engine

Transform Taco Typer's typing test and evaluation systems by replacing external AI API calls with instant, 100% offline algorithms. This includes an expanded curated library of culinary passages, a deterministic competitive scoring model, and a multi-case humorous Head Chef critique matrix delivering fiery critiques, sharp commentary, and high praise tailored to player performance.

> [!IMPORTANT]
> **User Review & Confirmed Decisions**
> - **Critique Personality Tone**: Humorous culinary chef inspired by fiery kitchen masters (e.g. Gordon Ramsay style banter) with dynamic tiers ranging from kitchen catastrophe roasting to Michelin-star reverence.
> - **AI Integration**: Replace entirely with offline algorithms and prewritten pools for 0ms latency, zero API rate-limits, 100% offline reliability, and fair leaderboard scoring.
> - **Comprehensive Outcome Coverage**: Distinct outcome matrices covering Ultra Speed & Accuracy, High Speed & Low Accuracy ("Panic in the Kitchen"), Low Speed & High Accuracy ("Guacamole Stalling"), Balanced Line Cook tiers, and catastrophic kitchen fails, each with randomized dialogue variations to prevent repetition.

---

## 1. Overview & Core Concept

### What It Does
Replaces the 3 cloud AI functions in Taco Typer (`generateSpeedText`, `generateSpeedComment`, `generateCompetitiveScore`) with self-contained client-side algorithms:
1. **Curated Culinary Passage Engine**: Replaces slow text generation with an extensive pool of diverse, high-interest culinary and food history passages (taco heritage, sourdough microbiology, volcanic molcajetes, street taco techniques) with dynamic word-count and difficulty selections.
2. **Multi-Case Head Chef Critique Matrix**: Evaluates player WPM and Accuracy into distinct performance quadrants, producing lively, humorous commentary with fiery roasts for sloppy speed, witty impatience for slow perfection, and Michelin-star commendations for master chefs.
3. **Deterministic Fair Ranking Engine**: Standardizes score calculation (0–100) and kitchen rank titles (`Dishwasher Apprentice` up to `Executive Chef`), ensuring 100% competitive fairness where identical performance yields identical ranks across all players on the global leaderboard.

### Target Audience & Persona
Typing test enthusiasts, casual gamers, and speedrunners who want immediate round starts, instant post-match results, and repeatable, fair competitive rankings without waiting on external LLM response times.

### Key Value
- **Instantaneous (0ms) Round Transitions**: Eliminates the loading spinners and API waits when starting speed tests and generating post-test evaluations.
- **Fair Competitive Integrity**: Eliminates erratic LLM scoring variance; players are ranked purely by algorithmic metrics.
- **Zero Cost & Infinite Offline Play**: Functions completely without API keys, network access, or backend token costs.

---

## 2. User Experience & Visual Design

### Key User Flows

#### A. Instant Speed Test Launch
- Player taps **Speed Test** in Taco Typer.
- A passage is instantly selected from the expanded culinary library based on varied thematic categories (Street Food Lore, Fermentation Science, Ancient Recipes, Spice Chemistry).
- The countdown triggers immediately with **zero loading lag** or spinner.

#### B. In-Game Typing & Real-Time Metrics
- Keystrokes are tracked live: WPM, CPM, and real-time accuracy percentages.
- Audio cues trigger seamlessly on correct keystrokes and mistakes.

#### C. Multi-Outcome Head Chef Results Screen
- Upon timer expiry or text completion, the results screen opens instantaneously.
- The player receives:
  - **Head Chef Assessment**: Humorous, animated critique box matching their specific outcome quadrant.
  - **Performance Score (0–100)**: Mathematically calculated based on WPM and accuracy curve.
  - **Kitchen Rank Badge**: Clearly rendered title with distinctive chef badges.
  - **Stats Grid**: Tabular metrics for WPM, CPM, Accuracy, and duration.
  - **Instant Leaderboard Submission**: Immediate persistence to the local and Firestore leaderboards.

### Chef Outcome Matrix & Scenarios

| Outcome Quadrant | Condition | Chef Tone & Example Critique |
| :--- | :--- | :--- |
| **Michelin Virtuoso** | WPM $\ge$ 95, Acc $\ge$ 96% | *Praise & Awe*: "Gordon Ramsay is weeping tears of joy. The tortillas are flying, the salsa is singing, and you just earned three Michelin stars in 60 seconds flat!" |
| **Executive Head Chef** | WPM 80–94, Acc $\ge$ 92% | *High Professional Praise*: "Phenomenal line work! Your fingers move faster than a seasoned sous chef during Friday dinner rush. Immaculate plating!" |
| **Solid Sous Chef** | WPM 60–79, Acc $\ge$ 88% | *Approving Master*: "Solid shift on the line. Crispy carnitas, sharp timing, and no spilled sauce. Take a bow, chef!" |
| **Reliable Line Cook** | WPM 45–59, Acc $\ge$ 80% | *Constructive Grit*: "Order up! You survived the dinner rush without burning down the kitchen. Keep those hands moving and tighten your station." |
| **Prep Cook in Training** | WPM 30–44, Acc $\ge$ 75% | *Grumpy Chef*: "You're still chopping onions while the dining room is full! Decent accuracy, but you need double espresso and quicker fingers." |
| **Panic in the Kitchen** | WPM $\ge$ 65, Acc $<$ 75% | *Fiery Roast (Sloppy Speed)*: "IT'S RAW! We ordered street tacos and you sent out alphabet confetti! Slow down, breathe, and actually read the ticket before firing!" |
| **Guacamole Stalling** | WPM $<$ 30, Acc $\ge$ 95% | *Impatient Sarcasm (Slow Perfection)*: "Meticulous presentation, chef... but Table 4 has been waiting for their chips since last Tuesday! Pick up the tempo!" |
| **Kitchen Catastrophe** | WPM $<$ 30, Acc $<$ 70% | *Full Kitchen Meltdown*: "Shut it down! Even the microwave cooks faster than this, and with better spelling! Put the spatula down, wipe your station, and try again!" |

*Each outcome category includes 3–5 randomized variations to ensure fresh experiences on replay.*

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Pure Local Module vs. Hybrid AI Fallback
- **Chosen Approach**: Replace the async Gemini calls in `aiService.ts` with direct synchronous algorithmic generators for `generateSpeedText`, `generateSpeedComment`, and `generateCompetitiveScore`.
- **Why**: Eliminates 1–3 second API delays, avoids network failures and quota limits, and delivers the requested snappy arcade experience.
- **Trade-Off**: Texts and critiques are drawn from pre-composed algorithmic pools rather than novel AI sentences. However, by providing 20+ varied culinary texts and 30+ contextual chef lines with template variations, the experience feels rich and authentic.

### Decision 2: Deterministic Scoring Curve for Leaderboard Integrity
- **Chosen Approach**: 
  $$\text{Score} = \text{round}\left( \min\left(100, \text{WPM} \times \left(\frac{\text{Accuracy}}{100}\right)^{2.2}\right) \right)$$
- **Why**: Exponentially penalizes low accuracy (preventing spam-typing high WPM) while rewarding high-speed precision fairly. Ensures that every player with identical stats gets identical ranks.

---

## 4. Technical Architecture & Data Strategy

### System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Taco Typer Game Flow                            │
│                                                                        │
│   ┌─────────────────────┐            ┌─────────────────────────────┐   │
│   │   TypingSpeedGame   │            │        TacoGame.tsx         │   │
│   │   - Keystroke input │            │   - Speed Test Screen       │   │
│   │   - Live WPM/CPM    │            │   - Game Over / Victory     │   │
│   └──────────┬──────────┘            └──────────────┬──────────────┘   │
└──────────────┼──────────────────────────────────────┼──────────────────┘
               │                                      │
               ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                Deterministic Culinary Game Engine                      │
│                     (services/tacoEngine.ts)                           │
│                                                                        │
│   ┌──────────────────────────┐    ┌────────────────────────────────┐   │
│   │  Culinary Text Library   │    │   Head Chef Critique Matrix    │   │
│   │  - 20+ Themed Passages   │    │   - 8 Outcome Quadrants        │   │
│   │  - Balanced word counts  │    │   - 35+ Fiery / High-Praise    │   │
│   │  - History & food trivia │    │     contextual voice lines     │   │
│   └──────────┬───────────────┘    └────────────────┬───────────────┘   │
│              │                                     │                   │
│              ▼                                     ▼                   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Deterministic Ranking Engine                   │   │
│   │  - Exponential Accuracy Weighting: WPM * (Acc/100)^2.2         │   │
│   │  - Clean Title Resolution: Executive Chef down to Apprentice   │   │
│   │  - 0ms Execution Time (Zero API Dependencies)                  │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Persistence & Live Leaderboard Sync                      │
│   - Instant write to Firestore & local storage                         │
│   - Real-time rank update without latency                              │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & File Changes

1. **`services/tacoEngine.ts` (New Focused Engine)**:
   - Houses the comprehensive culinary text corpus (25+ authentic culinary paragraphs).
   - Houses the multi-case chef commentary selector covering all 8 performance quadrants with randomized voice lines.
   - Houses the deterministic competitive scoring algorithm and rank title resolver.
2. **`services/aiService.ts`**:
   - Re-exports or delegates `generateSpeedText`, `generateSpeedComment`, and `generateCompetitiveScore` directly to `tacoEngine.ts`, ensuring zero breaking changes for existing components.
3. **`components/TacoGame.tsx` & `components/TypingSpeedGame.tsx`**:
   - Removes unnecessary loading spinners (`isGenerating`, `isEvaluating`) when starting speed test or rendering results, making transitions feel instantaneous.
   - Preserves all leaderboard score saving and stats tracking.
