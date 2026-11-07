# Arcade Gauntlet 3-Game Blitz Mode & Dynamic 3D Stage Atmosphere

Transform **Lumina Arcade** from a single-game launcher into a high-stakes multi-game tournament arena by introducing **Arcade Gauntlet (3-Game Blitz Mode)** with escalating score multipliers (`1.0× → 1.5× → 2.5×`) alongside **Dynamic Per-Game 3D WebGL Lighting & Grid Chromatics** that smoothly morph the entire 3D stage atmosphere as players browse or play each of the 11 games.

## User Review & Critical Decisions

> [!IMPORTANT]
> Both core innovation directions have been confirmed and designed to integrate seamlessly with all 11 existing 3D games and mobile/desktop viewports.

- **Confirmed Decision 1 — Arcade Gauntlet 3-Game Blitz Mode**: Players can launch a curated or randomized 3-stage Gauntlet Relay directly from the Hub, chaining 3 distinct 3D games back-to-back with escalating score multipliers (`Stage 1: 1.0×`, `Stage 2: 1.5×`, `Stage 3: 2.5×`), instant inter-stage warp transitions, and dedicated Gauntlet high-score & XP rewards.
- **Confirmed Decision 2 — Dynamic Per-Game 3D Lighting & Grid Colors**: The 3D WebGL environment (key/rim directional lights, central point light, procedural floor grid tint, and exponential distance fog) smoothly interpolates to match the signature neon palette of whichever game is selected in the Hub or active in gameplay—shifting to intense overdrive crimson-gold during Gauntlet Blitz runs.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Arcade Gauntlet (3-Game Blitz Mode)**: Adds a one-tap **Gauntlet Blitz** launch action in the Hub that drafts a 3-game relay across the 11-game library. Each completed or survived stage feeds into the next with an escalating multiplier (`1.0× → 1.5× → 2.5×`), culminating in a Championship Summary screen with combined Gauntlet Score, bonus XP, and a new *Gauntlet Grandmaster* achievement.
  2. **Dynamic Per-Game 3D Stage Atmosphere**: Replaces static cyan-only stage lighting with a real-time 60fps color-interpolation engine in Three.js. Selecting *Viper Pulse* bathes the 3D floor grid, rim lighting, and atmospheric fog in bio-emerald; *Cyber Pac* shifts the arena into warm electric gold; *Aegis Breaker* and *Hexa 2048* ignite ultraviolet-magenta lighting; and *Gauntlet Blitz* activates a high-contrast overdrive aura.
- **Target Audience / Persona**: Arcade players on mobile and desktop who want both instant discovery (visceral visual differentiation as they swipe through the 11 games) and a high-replayability meta-loop that rewards mastery across multiple game genres.
- **Key Value**: Dramatically increases Hub-to-gameplay conversion by giving players a compelling one-tap tournament mode while making every game selection in the Hub feel like stepping into a distinct 3D world.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Dynamic 3D Hub Browsing**: As the player cycles through the 11 games via the orbital carousel, arrow keys, or clicking 3D pedestals, the Three.js stage smoothly cross-fades its directional rim lights, point light aura, and floor grid emissive hue over `350ms` to the selected game's signature color.
  2. **One-Tap Gauntlet Blitz Launch**: Next to the primary game launch CTA in the Hub, a dedicated **3-Game Blitz** button previews the 3 drafted games (with an option to re-roll the 3-game slate) and launches directly into Stage 1 at `1.0×` multiplier.
  3. **Inter-Stage Relay Transition**: When Stage 1 or Stage 2 ends, instead of returning to a static Game Over screen, a **Stage Complete — Warp to Next Arena** overlay displays the stage score, locks in the next multiplier (`1.5×` or `2.5×`), triggers a 3D particle burst, and warps directly into the next 3D game.
  4. **Gauntlet Finale & Progression**: Completing all 3 stages displays the **Gauntlet Blitz Finale** modal with a breakdown of all 3 stages, total multiplied score, personal best comparison, and XP/achievement unlocks.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-craft dark-ui 3D spatial arcade with zero-pill metadata discipline and low-occlusion perimeter HUDs.
  - *Color Palette & Mood*: Deep obsidian void (`#07090E`) and tactical slate surfaces (`#0B0F19/90`) paired with per-game 3D WebGL lighting palettes:
    - **Prism Drop / Void Runner / Nova Invaders**: Electric Cyan (`#06B6D4` / `#22D3EE`)
    - **Quantum X-O / Cyber Mines**: Crimson Rose (`#F43F5E`)
    - **Viper Pulse**: Bio-Emerald (`#10B981`)
    - **Aegis Breaker**: Ultraviolet (`#8B5CF6`)
    - **Vector Pong**: Sky Laser (`#38BDF8`)
    - **Gravity Drop 4 / Cyber Pac**: Solar Amber & Gold (`#F59E0B` / `#FACC15`)
    - **Hexa Pulse 2048**: Hyper Fuchsia (`#D946EF`)
  - *Typography & Hierarchy*: `Outfit` display headers (`text-wrap: balance`), `Plus Jakarta Sans` UI controls (`whitespace-nowrap`), and `JetBrains Mono` (`tabular-nums`) for live scores, stage multipliers, and streak counters.
  - *Component Styling & Layout*: Keeps the center 75%+ of the viewport completely unobstructed on both mobile and desktop. The Gauntlet stage progress indicator sits cleanly in the top perimeter HUD (`STAGE 2/3 · 1.5× MULT`) using unboxed text with `·` separators.
- **Interactive Feedback & Motion**:
  - Smooth `THREE.Color.lerp` transitions on scene lights, fog tint, and floor grid material at 60fps with zero runtime object allocations.
  - Synthesizer fanfare and haptic pulse on Gauntlet stage advancement and multiplier escalation.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Seamless 3-Stage Relay vs. Elimination on Loss**
  - *Chosen Approach*: All 3 stages in a Gauntlet Blitz are always played to completion, with each stage's score multiplied by the stage tier (`1.0×`, `1.5×`, `2.5×`) plus a +500 point Victory Bonus for winning turn-based/objective games (*Quantum X-O*, *Vector Pong*, *Gravity Drop 4*, *Cyber Mines*).
  - *Why*: Ensures every Gauntlet run delivers a complete, satisfying 3-game arc regardless of whether a survival game (*Tetris*, *Snake*, *Void Runner*, *Cyber Pac*) ends via Game Over or a tactical game ends via Victory.
  - *Alternatives Considered*: Sudden-death elimination on Stage 1 would conflict with endless high-score games like *Prism Drop* or *Void Runner* where matches naturally conclude when the player tops out or crashes.
- **Decision 2: Zero-Allocation Three.js Color Interpolation**
  - *Chosen Approach*: Pre-allocate reusable `THREE.Color` scratch instances inside the WebGL render loop and interpolate light colors, grid emissive tint, and fog color each frame using frame-rate-independent damping (`1 - Math.exp(-4.5 * dt)`).
  - *Why*: Delivers silky-smooth atmospheric lighting shifts across all 11 games without creating garbage-collection pauses on mobile GPUs.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        App Shell & Gauntlet State                       │
│  • Active Mode: Standard Single-Game OR 3-Game Gauntlet Blitz Relay     │
│  • Gauntlet State: [Game 1 (1.0×), Game 2 (1.5×), Game 3 (2.5×)]        │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│     3D WebGL Stage (ArcadeStage3D)    │ │   Low-Occlusion Perimeter UI  │
│  • Per-Game Atmosphere Palette Map    │ │  • Hub Quick-Blitz Launcher   │
│  • 60fps Light/Grid/Fog Color Lerp    │ │  • Top HUD Stage & Multiplier │
│  • 11 Game Engines + Particle Bursts  │ │  • Inter-Stage Warp Modal     │
└───────────────────────────────────────┘ └───────────────┬───────────────┘
                                                          │
                                                          ▼
                                          ┌───────────────────────────────┐
                                          │   Profile & Progression Store │
                                          │  • Gauntlet Best Score & Runs │
                                          │  • "Gauntlet Grandmaster" Ach │
                                          └───────────────────────────────┘
```

- **Data Model & State**:
  - **Gauntlet Session State**: Tracks `active: boolean`, `games: [GameId, GameId, GameId]`, `currentStageIndex: 0 | 1 | 2`, `stageScores: number[]`, and `totalScore: number`.
  - **Player Profile Persistence**: Extends `PlayerProfile.highScores` in `localStorage` with `gauntletBestScore: number` and `gauntletRunsCompleted: number` (with safe fallback defaults for existing profiles) plus the `gauntlet_champion` achievement.
- **Interactive Component & State Mapping**:
  - **Hub Blitz Controls**: Clicking **3-Game Blitz** in the Hub immediately starts Stage 1 of the 3-game slate; clicking the adjacent shuffle button drafts a fresh 3-game combination and previews the 3 game names inline.
  - **Stage Transition Handler**: When `handleGameEnd` fires during an active Gauntlet run and `currentStageIndex < 2`, the app records the multiplied stage score, transitions to an inter-stage relay summary banner, and lets the player warp into the next game with one tap (or `Enter`/`Space`).
  - **Atmosphere Controller**: `ArcadeStage3D` reads `selectedGame` and Gauntlet state on every frame, smoothly interpolating `rimLight1.color`, `rimLight2.color`, `centerPointLight.color`, `floorMesh` material emissive/color, and `scene.fog.color` toward the active game's palette.
