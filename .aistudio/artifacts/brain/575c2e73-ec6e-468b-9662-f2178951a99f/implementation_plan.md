# Replacement Plan: Gemini API to Deterministic Algorithms & Free Datasets

A systematic strategy to transition all remaining Gemini API dependencies across the site into zero-cost, high-speed deterministic algorithms, broad factual datasets, and free zero-auth public APIs (such as Datamuse / Free Dictionary API).

### User Review & Critical Decisions

> [!IMPORTANT]
> The following directions were confirmed during clarification:
> - **More or Less Trivia**: Transitioned to a broad, curated factual dataset (~150+ items) spanning landmarks, animal records, space milestones, geographical features, and physics constants.
> - **Spelling Bee Word Coverage**: Accommodates an extensive dictionary range. It will use a comprehensive curated tiered dictionary backed by the free, public, zero-auth Free Dictionary API (`https://api.dictionaryapi.dev/api/v2/entries/en/`) and Datamuse API for infinite definitions and sentences without requiring Gemini or API keys.
> - **API & SDK Policy**: All Gemini API calls requiring API keys or billable quotas will be fully replaced. Zero-cost, unauthenticated external resources and client-side algorithms will be retained.

- **Confirmed Decision 1**: Trivia relies on a verified, broad-category dataset (eliminating LLM numerical hallucinations).
- **Confirmed Decision 2**: Spelling Bee uses a rich multi-tier vocabulary base paired with free dictionary lookups for unlimited words and accurate definitions.
- **Confirmed Decision 3**: IQ evaluation and Wordle word generator methods will be cleanly refactored into deterministic algorithms and local dictionary lookups.

---

## 1. Overview & Core Concept

- **What It Achieves**:
  1. **Zero Gemini Dependence**: Removes all calls to `@google/genai` models (`gemini-3.8-flash`) across `MoreLessGame`, `SpellingBeeGame`, `IQGame`, and `WordleGame`.
  2. **Zero Latency & Instant Loading**: Eliminates 1–3 second API round trips and loading spinners; trivia cards, words, and evaluations load in <10ms.
  3. **100% Reliability & No Rate Limits**: Eliminates API key configuration issues, network timeouts, and model JSON parse errors.
  4. **True Factual Accuracy**: Trivia comparisons and dictionary definitions will never suffer from LLM hallucinations or incorrect mathematical values.

- **Target Audience**: All players on the platform who want instant gameplay without requiring API keys or experiencing API downtimes.

---

## 2. Component-by-Component Replacement Strategy

### A. More or Less Trivia Game (`MoreLessGame.tsx`)
- **Current State**: Calls `aiService.generateMoreLessItems(8)` which prompts Gemini to invent comparison items and values.
- **Replacement**:
  - Build `services/triviaDataset.ts` with 160+ verified trivia comparison cards categorized into 5 major themes:
    - *Landmarks & Structures* (Eiffel Tower, Burj Khalifa, Great Pyramid, Hoover Dam, Panama Canal).
    - *Nature & Animals* (Blue Whale weight, Cheetah speed, Falcon dive speed, Redwood tree height, Elephant weight).
    - *Space & Planetary Science* (Moon distance, Mars diameter, Saturn rings width, ISS orbit altitude, Sun surface temperature).
    - *Geography & Earth* (Amazon River length, Mariana Trench depth, Sahara Desert area, Mount Everest elevation).
    - *History & Human Inventions* (Commercial jet cruise speed, Titanic length, human heartbeats/day, Golden Gate Bridge span).
  - Deterministic Shuffler: Uses a Fisher-Yates shuffle with category balance so each match presents a diverse mix of units and topics.

### B. Spelling Bee Game (`SpellingBeeGame.tsx`)
- **Current State**: Calls `aiService.generateSpellingBeeWordsBatch(5, diff)` which calls Gemini to generate words, definitions, and sentences for difficulty tiers 1–10.
- **Replacement**:
  - Implement `services/spellingBeeEngine.ts` containing:
    1. A built-in tiered dictionary covering tiers 1 through 10 with hundreds of words, definitions, and sample sentences (elementary to national championship tier).
    2. Dynamic integration with the completely free, zero-auth public **Free Dictionary API** (`https://api.dictionaryapi.dev/api/v2/entries/en/<word>`) and **Datamuse API** (`https://api.datamuse.com/words?sp=...`) to provide definitions and sentence examples for any English word dynamically without needing Gemini.
    3. Seamless instant fallback to the internal tiered dictionary whenever offline.

### C. IQ Challenge Evaluation (`IQGame.tsx` & `services/aiService.ts`)
- **Current State**: `services/aiService.ts` contains `evaluateIQPerformance()` which invokes Gemini to write 1-sentence comments and 2-sentence analyses (though `IQGame.tsx` already uses local bands).
- **Replacement**:
  - Formalize `services/iqEvaluationEngine.ts` with a deterministic evaluation matrix based on standard cognitive percentiles:
    - Superior / Mensa tier (130+), High Average (115–129), Average (90–114), Developing (<90).
    - Generates tailored analytical breakdown based on speed-per-question, accuracy percentage, and difficulty breakdown.

### D. Wordle Target Words (`services/wordleService.ts`)
- **Current State**: `services/aiService.ts` has an unused `generateWordleWords()` Gemini call.
- **Replacement**:
  - Cleanly retire the unused method in `services/aiService.ts`. `WordleGame.tsx` will continue using its comprehensive local word dictionary in `services/wordleService.ts`.

---

## 3. Key Technical Decisions & Trade-Offs

- **Decision 1: Free Public Dictionary APIs vs. Huge 100k Offline JSON**:
  - *Chosen Approach*: Hybrid approach: a pre-compiled curated core dictionary of hundreds of words spanning tiers 1–10 directly in bundle, augmented by asynchronous fetches to the free public Free Dictionary API / Datamuse API when online.
  - *Why*: Keeps initial bundle small and snappy while giving the user access to "all words in the dictionary" without any API key or billing requirement.
- **Decision 2: Dedicated Modular Services vs. Monolithic `aiService.ts`**:
  - *Chosen Approach*: Split into modular files (`triviaDataset.ts`, `spellingBeeEngine.ts`, `iqEngine.ts`) and re-export unified interfaces from `services/aiService.ts` (or deprecate `aiService.ts` cleanly) to maintain backward compatibility with components.
  - *Why*: Adheres to the principle of small, single-responsibility files and prevents circular imports.

---

## 4. Architecture & System Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Zero-Gemini Game Engine                         │
├───────────────────────────────────┬────────────────────────────────────┤
│         More or Less Game         │          Spelling Bee              │
│       services/triviaDataset.ts   │    services/spellingBeeEngine.ts   │
│  - 160+ Curated Comparison Facts  │  - 10-Tier Curated Core Words      │
│  - Fisher-Yates Randomizer        │  - Free Dictionary API Integration │
│  - 100% Offline, Instant (<1ms)   │  - Zero API Key / Quota Required   │
├───────────────────────────────────┼────────────────────────────────────┤
│            IQ Challenge           │          Taco Typer & Wordle       │
│        services/iqEngine.ts       │   services/wordleService.ts        │
│  - Cognitive Percentile Matrix    │   services/tacoEngine.ts           │
│  - Speed & Accuracy Deductions    │  - Pure deterministic algorithms   │
│  - Template-based Feedback        │  - 100% Offline Static Banks       │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Execution Steps After Approval

1. **Step 1**: Create `services/triviaDataset.ts` with 160+ diverse facts and random batch generator; update `MoreLessGame.tsx` to source from it.
2. **Step 2**: Create `services/spellingBeeEngine.ts` with 10-tier word lists and Free Dictionary API client; update `SpellingBeeGame.tsx` to source from it.
3. **Step 3**: Clean up `services/aiService.ts`, redirecting or replacing all legacy Gemini invocations with these deterministic engines.
4. **Step 4**: Verify compilation, type safety, and instant zero-latency loading across all affected mini-games.
