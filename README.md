# KINETIX // 11 — 3D Synth-Grid Arcade Vault

**KINETIX // 11** is a unified, zero-allocation 3D WebGL arcade game hub built with **React 19**, **Three.js**, **TypeScript**, and **Tailwind CSS**. Every game runs inside a continuous, shared 3D synth-grid stage with smooth camera choreography, dynamic per-game lighting atmospheres, procedural 3D geometry, synthesized Web Audio sound effects, and full desktop keyboard + mobile touch/gesture support.

---

## ✨ Key Features

- **11 Complete 3D Arcade Games in One Persistent Stage**: Instant camera transitions between the orbital 3D Hub Carousel and any of the 11 arenas without page reloads or canvas teardown.
- **Arcade Gauntlet Blitz (3-Game Relay Mode)**: High-stakes 3-stage survival relay with escalating score multipliers (**`1.0×` → `1.5×` → `2.5×`**), inter-stage warp transitions, shufflable game lineups, and dedicated Gauntlet High Score tracking.
- **Dynamic Per-Game 3D Atmosphere**: Smooth 60fps RGB interpolation (`THREE.Color.lerp`) of key lights, rim lights, ground grid lines, orbital rings, and exponential fog tailored to each game's signature palette (plus Crimson/Amber overdrive lighting during Gauntlet Blitz).
- **Procedural 3D Models & Zero-Allocation Particle Pooling**: Custom `ExtrudeGeometry` starfighters, articulated serpents, neon mazes, and pre-allocated `InstancedMesh` voxel/explosion pools for locked 60fps performance.
- **Synthesized Web Audio & Haptics**: Pure Web Audio API procedural sound effects (no external audio files required) paired with mobile vibration feedback.
- **Progression, Daily Directives & Achievements**: Local persistent player profile with XP, rank titles, 18 unlockable achievements, per-game high scores, and rotating daily challenges.
- **Adaptive Desktop & Mobile Controls**: Supports keyboard (`WASD` / Arrow keys / `Space`), direct 3D raycast pointer/touch dragging, swipe gestures, and a collapsible on-screen `TouchArcadeDock` whose visibility persists across sessions.

---

## 🎮 The 11 Arcade Arenas

| # | Arena | Genre | Highlights & Mechanics |
| :--- | :--- | :--- | :--- |
| **01** | **Prism Drop** | 3D Block Stacker | 10×20 vertical matrix, 3D ghost piece projection, next-piece preview, hold/rotate, and multi-line combos. |
| **02** | **Quantum Grid** | 3D Tactical X-O | Classic 3×3 or Expanded 4×4 boards, **Neon Decay** rule (oldest mark vanishes after 3 active pieces), Local 2P, or Minimax AI. |
| **03** | **Viper Pulse** | 3D Cyber Serpent | 17×17 arena, smooth segment interpolation, plasma overdrive boost, and 3 speed tiers (`Normal`, `Turbo`, `Hyper`). |
| **04** | **Aegis Breaker** | 3D Brick Shatter | Multi-hit armored crystal bricks, falling power-up capsules (`Wide Paddle`, `Twin Laser`, `Multi-Ball`), and pointer tracking. |
| **05** | **Vector Pong** | 3D Cyber Air-Hockey | High-velocity 3D puck deflection, spin physics, central speed-boost gate, and adaptive AI or 2P Local Versus. |
| **06** | **Gravity Drop 4** | 3D Connect Four | 7×6 vertical neon rack, physical gravity disc drop animations, 4-in-a-row detection, and Tactical AI or 2P Local mode. |
| **07** | **Hexa Pulse 2048** | 3D Monolith Merge | 4×4 spatial grid where merging power-of-two cubes grow into towering glowing 3D skyscrapers, complete with tactical Undo. |
| **08** | **Void Runner** | 3D Trench Flight | 3-lane endless synthwave starfighter run with custom swept-wing jet geometry, jump thrusters, and hyper-boost gates. |
| **09** | **Cyber Mines** | 3D Tactical Sweeper | 8×8 hazard vault with guaranteed safe first tap, recursive flood-fill, numeric hologram projections, and radar hints. |
| **10** | **Nova Invaders** | 3D Space Defense | Stepped alien formation waves, destructible crystal shield bunkers, mystery UFO motherships, and row-clearing EMP blasts. |
| **11** | **Cyber Pac** | 3D Neon Labyrinth | 15×15 neon maze with wrap-around warp tunnels, 4 autonomous hunter drones, Overdrive Power Cores, and Phase Dash charges. |

---

## 🕹️ Controls Reference

| Input Method | Primary Actions | Secondary / Special Actions |
| :--- | :--- | :--- |
| **Keyboard (Desktop)** | `Arrow Keys` or `W A S D` — Move / Steer / Slide | `Space` — Hard Drop / Launch / Fire / Jump / Phase Dash<br>`Up` or `W` — Rotate Piece (Prism Drop) / Jump (Void Runner)<br>`E` or `Shift` — EMP Bomb / Radar Scan / Undo |
| **Mouse / Touch Drag** | Click/Tap cells (Quantum Grid, Gravity Drop 4, Cyber Mines) or drag directly on the 3D arena (Aegis Breaker, Vector Pong, Nova Invaders) | Swipe in 4 directions on the 3D stage (Viper Pulse, Hexa Pulse 2048, Void Runner, Cyber Pac) |
| **On-Screen Arcade Dock** | D-Pad + Contextual Action Buttons at the bottom of the screen | Click **Hide Controls / Show Controls** to toggle Zen Cinema mode (persisted in `localStorage`) |

---

## 🏗️ Project Structure

```text
├── index.html                  # App entry point, fonts & OpenGraph metadata
├── metadata.json               # App capability & manifest metadata
├── vite.config.ts              # Vite + Tailwind v4 + PWA configuration
└── src/
    ├── App.tsx                 # Main application shell, HUD, Gauntlet relay & modals
    ├── main.tsx                # React 19 root mount
    ├── types/
    │   └── arcade.ts           # Shared TypeScript interfaces for games, HUD, and Gauntlet
    ├── components/
    │   └── TouchArcadeDock.tsx # Collapsible context-aware bottom control deck
    ├── services/
    │   ├── profileStore.ts     # Persistent XP, achievements, high scores & daily directives
    │   └── soundAndHaptics.ts  # Procedural Web Audio API synthesizer & vibration controller
    ├── three/
    │   ├── ArcadeStage3D.tsx   # Unified Three.js WebGL stage, camera rig & atmosphere engine
    │   └── proceduralModels.ts # Custom procedural 3D geometries & starfighter assemblies
    └── games/
        ├── tetrisEngine.ts     # 01. Prism Drop engine
        ├── xoEngine.ts         # 02. Quantum Grid X-O & Minimax AI engine
        ├── snakeEngine.ts      # 03. Viper Pulse engine
        ├── breakerEngine.ts    # 04. Aegis Breaker physics & capsule engine
        ├── pongEngine.ts       # 05. Vector Pong physics & AI engine
        ├── connect4Engine.ts   # 06. Gravity Drop 4 & heuristic AI engine
        ├── merge2048Engine.ts  # 07. Hexa Pulse 2048 spatial merge engine
        ├── runnerEngine.ts     # 08. Void Runner 3-lane starfighter engine
        ├── minesEngine.ts      # 09. Cyber Mines flood-fill & radar engine
        ├── invadersEngine.ts   # 10. Nova Invaders wave & bunker engine
        └── pacEngine.ts        # 11. Cyber Pac maze & hunter drone AI engine
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `>= 18` (or **Bun**)

### Installation & Development

```bash
# Install dependencies
npm install

# Start the development server on http://localhost:3000
npm run dev
```

### Production Build & Type Check

```bash
# Run TypeScript type checking
npm run lint

# Build production bundle into dist/
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Deployment (GitHub Pages)

This project is pre-configured for automated deployment to **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`).

- **Expected GitHub Pages URL**: [`https://samstone86.github.io/kinetix/`](https://samstone86.github.io/kinetix/)
- **Base Path Handling**:
  - When building in **GitHub Actions** (`GITHUB_ACTIONS=true`), Vite automatically sets `base: '/kinetix/'` and updates the PWA manifest (`id`, `start_url`, `scope`, and icon paths) plus HTML icon references (`%BASE_URL%`) so all assets resolve under `/kinetix/`.
  - During **local development** (`bun run dev` / `npm run dev`), the base path remains `/`.
- **CI Workflow**:
  - Triggered automatically on pushes to `main` (or manually via `workflow_dispatch`).
  - Uses **Bun** (`oven-sh/setup-bun@v2` + `bun install --frozen-lockfile`) and runs `bun run build` before uploading `./dist` and deploying with the official `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages` actions.

### Manual GitHub Repository Setup
1. Open your repository on GitHub and navigate to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push to the `main` branch (or trigger the **Deploy to GitHub Pages** workflow from the **Actions** tab) to publish the live build.

