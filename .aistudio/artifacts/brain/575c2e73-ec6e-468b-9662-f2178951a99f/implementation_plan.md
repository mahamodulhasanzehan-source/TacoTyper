# Modern Arcade UI & Real-Time Cloud Leaderboard Sync

Comprehensive plan to upgrade mobile and desktop responsiveness, elevate the arcade game visual identity with bespoke vector artwork inspired by multi-game party apps, and eliminate leaderboard synchronization lag and ghost duplicates through real-time Firestore listeners and multi-score deduplication.

> [!IMPORTANT]
> **User Review & Confirmed Decisions**
> - **Duplicate Handling**: Retain up to the top 3 best scores per player per game mode (enforced client-side and cloud-side; guests retain 1 best score).
> - **Cross-Device Syncing**: Switch from manual / timed polling to live Firestore `onSnapshot` real-time listeners. Any score achieved on any device instantly streams to all active viewports without page reload or stale cache lockouts.
> - **Visual Identity**: Modern arcade dark aesthetic inspired by popular party & 2-player mini-game collections, featuring responsive cards, crisp bespoke SVG thumbnails, unified header hierarchy, and smooth non-blocking interactions.

---

## 1. Overview & Core Concept

### What It Does
Transforms the app into an instant-play party game arcade with seamless cross-device synchronization:
1. **True Real-Time Global Leaderboards**: Connects every game's leaderboard directly to Firestore live streams. As players on phones, tablets, or computers submit scores, rankings update dynamically in real time for everyone viewing the leaderboard.
2. **Deterministic Deduplication**: Eliminates ghost clones and conflicting ranks caused by local storage race conditions, guest/signed-in identifier transitions, and optimistic cache clashes.
3. **Polished Multi-Game Arcade Experience**: Enhances mobile touch ergonomics and desktop wide layouts with vibrant, responsive game tiles, bespoke SVG game thumbnails, unified collapsible sidebars, and clean loading skeletons that never freeze interactivity.

### Target Audience & Persona
Casual players, speed typists, and competitive party gamers playing both solo challenges (Taco Typer, 2048, Minesweeper, Knife Flip) and head-to-head strategy games across mobile phones, tablets, and desktop browsers.

### Key Value
- Zero discrepancies in leaderboards between different devices or login states.
- Immediate visual feedback with zero broken icons or low-resolution textures.
- Effortless switching between games with responsive sidebar controls and thumb-friendly navigation.

---

## 2. User Experience & Visual Design

### Key User Flows

#### A. Browsing & Launching Games (Hub View)
- **Zero-Latency Hub Presentation**: The hub renders immediately with crisp vector thumbnails, play counts, and category tags.
- **Responsive Layout**:
  - *Mobile*: 2-column or 3-column dense arcade grid with high touch targets (touch targets $\ge 48\text{px}$). Featured games highlight current popular modes.
  - *Desktop*: 4-to-6 column fluid arcade bento display with hover micro-elevations, glow accents, and responsive navigation header.
- **Interaction Transitions**: Tapping or clicking any game tile executes smooth transition into the game arena without blocking animations.

#### B. In-Game Play & Live Leaderboard Sidebar
- **Desktop Game Arena**: Full-width or centered game arena with a sleek right-side leaderboard column.
  - Features an intuitive collapse toggle (`▶` collapse to vertical strip, `◀` expand).
  - Displays top 3 entries with gold, silver, and bronze trophies, followed by numerical ranks.
  - Live metric highlights (score, streak, time) in high-contrast tabular monospace font.
- **Mobile Game Arena**: Unobtrusive top HUD keeping screen real estate clear for touch gameplay.
  - Fixed mobile bottom/top modal toggle (`🏆` badge) opening a slide-up leaderboard drawer.
  - Automatically receives live score updates while open.

#### C. Score Submission & Rank Resolution
- On game over or stage completion, the score is calculated and transmitted via an atomic write.
- The player's rank highlights with a subtle pulse.
- If the player already had 3 existing scores on the board, the lowest one is replaced only if the new score surpasses it, preserving their personal best achievements without flooding the board.

### Visual Identity & Theme
- **Color Discipline**:
  - Canvas: `#0a0b10` (deep cosmic obsidian).
  - Surfaces & Panels: `#121520` (subdued arcade slate with 1px border `rgba(255,255,255,0.08)`).
  - Primary Accents: Amber Gold (`#f59e0b` / `#fbbf24`), Emerald (`#10b981`), and Cyber Blue (`#38bdf8`).
- **Typography & Scale**:
  - Display / Titles: `Plus Jakarta Sans` / `Outfit` (bold, energetic arcade feel).
  - Tabular Numbers & Scoreboards: Tabular monospace font (`font-mono tabular-nums`) ensuring column alignment.
  - Clean unboxed metadata with typographic dots (`·`) instead of generic pill tags.
- **Bespoke Vector Thumbnail Artwork**:
  - Each of the 20+ games receives dedicated, handcrafted SVG artwork styled with vibrant game geometry, contrasting color palettes, and distinct iconography (e.g. 2-player split arenas, chess knights, retro lasers, neon tacos, minesweeper grids).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Firestore Real-Time Listener (`onSnapshot`) vs. Polling
- **Chosen Approach**: Use Firestore `onSnapshot` subscriptions with targeted mode queries (`where("mode", "==", currentMode)`).
- **Why**: Guarantees identical ranking and score visibility across all devices within milliseconds. Eliminates stale cached rankings and prevents the need for manual page refreshing.
- **Trade-Off**: Uses active listener connections while the leaderboard is visible. We mitigate read volume by unsubscribing as soon as the user collapses the sidebar or closes the modal.

### Decision 2: Deduplication Engine (Max 3 Entries Per Player)
- **Chosen Approach**:
  - Normalize user tracking keys combining verified `uid` and normalized `username`.
  - Filter streams to keep up to 3 highest-ranking entries for authenticated users, and 1 best entry for unauthenticated guests.
  - Reconcile optimistic local entries with server entries using unique transaction timestamps and match keys so newly submitted scores never render as duplicates before server confirmation.
- **Why**: Prevents leaderboard clutter by active single players while rewarding consistent top performers. Completely resolves user confusion where multiple copies of the exact same score appear.

### Decision 3: SVG Component Artwork vs. External Raster Assets
- **Chosen Approach**: Native inline React SVG artwork with modular geometry for every game thumbnail.
- **Why**: SVGs are zero-bandwidth, instant-loading, infinitely sharp across high-DPI retina mobile screens and 4K desktop displays, and completely impervious to CDN network timeouts or broken image links.

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Interface Layer                          │
│                                                                        │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │   HubScreen.tsx     │   │      GameArena Component             │   │
│   │   - Modern Bento    │   │      (Taco, Knife, Minesweeper, ...) │   │
│   │   - Custom SVG Art  │   └──────────────────┬───────────────────┘   │
│   └──────────┬──────────┘                      │                       │
│              │                                 ▼                       │
│              │                  ┌──────────────────────────────────┐   │
│              │                  │   GameLeaderboardSidebar.tsx     │   │
│              │                  │   - Real-Time Subscription       │   │
│              │                  │   - Smooth Collapse / Expand     │   │
│              │                  │   - Top-3 Player Grouping        │   │
│              │                  └──────────────────┬───────────────┘   │
└──────────────┼─────────────────────────────────────┼───────────────────┘
               │                                     │
               ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     State & Persistence Layer                          │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                   services/firebase.ts                         │   │
│   │                                                                │   │
│   │   • subscribeLeaderboard(mode, callback): UnsubscribeFn        │   │
│   │   • saveLeaderboardScore(user, score, mode, ...): Promise      │   │
│   │   • reconcileAndDeduplicate(remoteEntries, localOptimistic)    │   │
│   │   • filterLeaderboardEntries(entries, maxPerUser = 3)          │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Cloud Firestore (Live Backend)                       │
│                                                                        │
│   Collection: "leaderboard"                                            │
│   - Document Fields: { uid, username, score, sortValue, mode, ... }    │
│   - Real-Time Broadcasts via onSnapshot                                │
│   - Security Rules: firestore.rules (Validation & Access Controls)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Deduplication Schema

```typescript
interface LeaderboardRecord {
  id: string;              // Firestore document ID or temp optimistic ID
  uid: string;             // User UID or stable guest UUID
  username: string;        // Clean display name
  score: number;           // Actual metric score
  sortValue: number;       // Normalized sorting value (time vs points)
  mode: string;            // Game identifier and sub-mode
  stats?: SessionStats;    // Optional game-specific metrics
  timestamp: number;       // Epoch timestamp
}

// User Identity Resolution
function getPlayerIdentityKey(uid?: string, username?: string): string {
  const cleanUser = (username || '').toLowerCase().trim();
  const cleanUid = (uid || '').toLowerCase().trim();
  // Group by UID when authenticated, or clean username if persistent
  if (cleanUid && !cleanUid.startsWith('guest_')) return `auth_${cleanUid}`;
  if (cleanUser && !cleanUser.startsWith('guest#')) return `user_${cleanUser}`;
  return `guest_${cleanUid || 'anon'}`;
}
```

### Component Work Breakdown

1. **`services/firebase.ts`**:
   - Implement `subscribeLeaderboard(mode, onUpdate)` utilizing Firestore `onSnapshot`.
   - Update `filterLeaderboardEntries` to strictly cap at 3 entries per authenticated player and 1 per guest.
   - Implement smart optimistic reconciliation that absorbs newly submitted scores without creating duplicate entries before cloud confirmation.
2. **`components/GameLeaderboardSidebar.tsx` & `components/Overlays.tsx`**:
   - Connect sidebar lifecycle directly to `subscribeLeaderboard`.
   - Add graceful loading skeletons and error states.
   - Support one-click collapse/expand state saved in `localStorage`.
   - Provide mobile bottom-sheet modal with high-contrast readable rankings.
3. **`components/GameArtwork.tsx` & `components/MiniGameCard.tsx`**:
   - Refine all SVG game artwork with rich colors, themed vector graphics, and party-game aesthetics.
   - Polish card layouts to prevent overflow, ensure clear text contrast, and support responsive scaling on narrow devices.
4. **`components/HubScreen.tsx` & Layout Containers**:
   - Standardize viewport containers and safe-area insets for mobile devices.
   - Ensure header controls, authentication status, and settings modals operate smoothly with zero touch lag.
