# Dead Trigger 3D Survival Arena Integration

Integrating the standalone 3D zombie arena shooter into the Taco Hub minigame portal as a solo survival experience featuring realistic 3D weapon models, client-side zombie AI waves, tactical movement, and responsive HUD overlays.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed via interactive consultation:

- **Confirmed Mode & Networking**: Solo survival arena with authoritative client-side zombie AI. The local Node.js WebSocket/tunnel dependencies (`server.js`, `start_arena.bat`, `tunnelmole`) are decommissioned, allowing seamless in-browser play directly inside the applet.
- **Confirmed Brand & Title**: Game title is `Dead Trigger`, cataloged under the action/shooter category in the game selector and global stats.
- **Confirmed Asset Organization**: The 3D model assets are linked and served via `/public/models` so GLTF/GLB models (AK-47, M1911, Kar98k, etc.) load smoothly in the browser, while the game logic is cleanly structured inside `components/deadtrigger/`.

---

## 1. Overview & Core Concept

- **What It Does**: A fast-paced first-person 3D zombie survival shooter running on Three.js. Players spawn into an expansive tactical arena, wield 20+ realistic weapons (pistols, SMGs, assault rifles, marksman, and heavy specials), manage ammunition and stamina, and battle escalating waves of distinct zombie archetypes (Walkers, Runners, Bloaters, Brutes, Fire Demons, and Phantoms).
- **Target Audience**: Players on desktop and laptop browsers seeking high-intensity 3D arcade action with full pointer-lock mouse aiming, smooth WASD movement, sliding, aiming-down-sights (ADS), weapon reload mechanics, and wave survival.
- **Key Value**: Delivers console-like 3D FPS gameplay directly within the browser without external servers, complex launchers, or network configuration.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Hub Launch**: From the central Minigame Hub, players click the `Dead Trigger` game card with custom 3D card artwork.
2. **Arena Briefing & Controls Overlay**: Players see the title bar with Hub navigation, current high score, wave tracker, and a clean "Click to Enter Arena" prompt explaining mouse aiming (Pointer Lock), WASD movement, Left-Click (Shoot), Right-Click (ADS), R (Reload), Shift (Sprint), and Space/C (Jump/Slide).
3. **Gameplay & Wave Progression**:
   - As zombies rise from the earth, the HUD displays real-time health (with damage vignette flashes), current weapon stats (ammo in mag / reserve), crosshair with hit markers, and floating damage numbers.
   - Killing all zombies in a wave triggers a brief respite, armory replenishment, and the start of the next escalating wave.
4. **Game Over & Leaderboard**: On death, final wave reached and total kills are summarized with options to retry or return to the Hub.

### Visual Identity & Theme

- **Aesthetic Direction**: Gritty military-survival horror with high-contrast tactical HUD elements.
- **Color Palette**:
  - Dominant Canvas: Deep obsidian (`#07080d`) and dark asphalt textures.
  - Atmosphere: Directional sunlight with cool atmospheric fog (`scene.fog`) matching horizon values.
  - Accents: Combat amber (`#f59e0b`), biohazard blood red (`#ef4444`), and tactical cyan (`#06b6d4`).
- **Typography & Hierarchy**:
  - Headings & Wave Counters: High-impact condensed sans / monospace (`Chakra Petch`, `font-mono tabular-nums`).
  - Ammo & Health Readouts: Clean tabular figures with high legibility.
- **Responsive Layout**:
  - Title bar complies with the responsive header standard (compact icons, abbreviated labels on mobile, zero overflow).
  - Canvas fills 100% of the game container with zero unwanted scrollbars.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Zombie AI vs. Local Server**:
  - *Chosen Approach*: Port server zombie wave generation and chasing physics into a client-side tick loop integrated with Three.js `requestAnimationFrame`.
  - *Why*: Eliminates the need to run batch files or separate Node.js processes, enabling instant playability in any modern browser.
  - *Alternatives Considered*: Retaining the WebSocket server would require users to run `start_arena.bat` locally, which fails in the cloud development/production environment.

- **Decision 2: 3D Model Assets Placement**:
  - *Chosen Approach*: Move `DeadTrigger/public/models` to root `/public/models`.
  - *Why*: Vite serves static files in `/public` at root URL (`/models/...`), matching the hardcoded asset paths in weapon definitions (`/models/ak47/AK47.glb`, `/models/M1911/M1911.glb`, etc.) with zero path rewrite overhead.

- **Decision 3: Procedural Fallback Verification**:
  - *Chosen Approach*: Preserve the procedural weapon generation pipeline in `ProceduralWeapons.ts`.
  - *Why*: Guarantees that if any individual GLB fails verification or takes time to load, the game immediately renders a procedural 3D weapon without crashing or showing blank hands.

---

## 4. Technical Architecture & Data Strategy

### System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              TACO MINIGAME HUB                         │
│                  (components/HubScreen.tsx & Game.tsx)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ activeApp === 'dead-trigger'
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        components/DeadTriggerGame.tsx                  │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Responsive Title Bar (← Hub | Dead Trigger | Wave | Kills)     │   │
│   └────────────────────────────────────────────────────────────────┘   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 3D Viewport (<canvas ref={canvasRef} />)                       │   │
│   │   ├── Three.js WebGLRenderer & Engine                          │   │
│   │   ├── Player Controller (Camera, Yaw/Pitch, WASD, ADS, Slide)  │   │
│   │   ├── Weapons Subsystem (GLTF Models + Procedural Fallbacks)   │   │
│   │   ├── Client Zombie Manager & Behavior Loop                    │   │
│   │   └── Particle Systems (Muzzle flash, blood, tracers, smoke)   │   │
│   └────────────────────────────────────────────────────────────────┘   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Tactical HUD Layer (Health bar, Ammo counter, Reticle, Waves)  │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & File Mapping

1. **Assets**: Relocate `DeadTrigger/public/models` into `/public/models`.
2. **Game Core Engine**: Place ported logic in `components/deadtrigger/`:
   - `core/`: Engine, Input, Camera, Lighting.
   - `entities/`: ZombieManager, ZombieBehaviors, ZombieModelFactory, Particles.
   - `weapons/`: WeaponBuilder, ProceduralWeapons, Recoil.
   - `config/`: weapons.ts, zombies.ts, Gunposition.ts.
   - `audio/`: Web Audio procedural sound generation (firing, reload, zombie screams, steps).
3. **App Integration**:
   - `types.ts`: Register `'dead-trigger'` in `AppId` and `GlobalGameStats`.
   - `components/games.config.ts`: Add game metadata entry for `Dead Trigger`.
   - `components/Game.tsx`: Add route case and render `DeadTriggerGame`.
   - `components/GameArtwork.tsx`: Add custom SVG card artwork for Dead Trigger.
