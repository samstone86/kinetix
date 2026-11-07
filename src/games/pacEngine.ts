import { SnakeSpeed } from '../types/arcade';

export const PAC_GRID_SIZE = 15;

// 0 = Empty, 1 = Wall, 2 = Pellet, 3 = Overdrive Power Core, 4 = Warp Tunnel, 5 = Drone Hive Gate
const BASE_MAZE_TEMPLATE: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 3, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 2, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 2, 1, 1, 0, 0, 0, 1, 1, 2, 1, 2, 1],
  [1, 2, 1, 2, 1, 0, 0, 5, 0, 0, 1, 2, 1, 2, 1],
  [4, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 4],
  [1, 2, 1, 2, 1, 0, 1, 1, 1, 0, 1, 2, 1, 2, 1],
  [1, 2, 1, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 2, 2, 0, 2, 2, 2, 1, 1, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 3, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 3, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export interface PacGhost {
  id: number;
  name: string;
  colorHex: number;
  row: number;
  col: number;
  prevRow: number;
  prevCol: number;
  dirRow: number;
  dirCol: number;
  respawnTimer: number;
}

export class CyberPacEngine {
  grid: number[][] = [];
  score = 0;
  lives = 3;
  wave = 1;
  pelletsRemaining = 0;
  totalPelletsEaten = 0;
  dashCharges = 2;
  dashTimer = 0;
  frightenedTimer = 0;
  ghostEatMultiplier = 200;

  playerRow = 11;
  playerCol = 7;
  prevPlayerRow = 11;
  prevPlayerCol = 7;
  dirRow = 0;
  dirCol = -1;
  queuedDirRow = 0;
  queuedDirCol = -1;

  moveProgress = 0;
  stepInterval = 0.165;
  speedMode: SnakeSpeed = 'normal';
  warmupTimer = 1.25;

  ghosts: PacGhost[] = [];
  isGameOver = false;
  isVictory = false;

  constructor() {
    this.reset('normal');
  }

  reset(speed: SnakeSpeed = 'normal'): void {
    this.speedMode = speed;
    this.stepInterval = speed === 'hyper' ? 0.125 : speed === 'turbo' ? 0.145 : 0.17;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.totalPelletsEaten = 0;
    this.dashCharges = 2;
    this.dashTimer = 0;
    this.frightenedTimer = 0;
    this.ghostEatMultiplier = 200;
    this.isGameOver = false;
    this.isVictory = false;
    this.loadWaveMaze();
    this.resetPositions();
  }

  private loadWaveMaze(): void {
    this.pelletsRemaining = 0;
    this.grid = BASE_MAZE_TEMPLATE.map((row) =>
      row.map((cell) => {
        if (cell === 2 || cell === 3) {
          this.pelletsRemaining++;
        }
        return cell;
      })
    );
  }

  private resetPositions(): void {
    this.playerRow = 11;
    this.playerCol = 7;
    this.prevPlayerRow = 11;
    this.prevPlayerCol = 7;
    this.dirRow = 0;
    this.dirCol = -1;
    this.queuedDirRow = 0;
    this.queuedDirCol = -1;
    this.moveProgress = 0;
    this.dashTimer = 0;
    this.warmupTimer = 1.25;

    this.ghosts = [
      {
        id: 0,
        name: 'BLINK-X',
        colorHex: 0xf43f5e,
        row: 5,
        col: 7,
        prevRow: 5,
        prevCol: 7,
        dirRow: 0,
        dirCol: -1,
        respawnTimer: 0,
      },
      {
        id: 1,
        name: 'PINK-V',
        colorHex: 0xd946ef,
        row: 7,
        col: 6,
        prevRow: 7,
        prevCol: 6,
        dirRow: -1,
        dirCol: 0,
        respawnTimer: 0,
      },
      {
        id: 2,
        name: 'VOLT-C',
        colorHex: 0x06b6d4,
        row: 7,
        col: 7,
        prevRow: 7,
        prevCol: 7,
        dirRow: -1,
        dirCol: 0,
        respawnTimer: 0,
      },
      {
        id: 3,
        name: 'PYRO-A',
        colorHex: 0xf59e0b,
        row: 7,
        col: 8,
        prevRow: 7,
        prevCol: 8,
        dirRow: 0,
        dirCol: 1,
        respawnTimer: 0,
      },
    ];
  }

  private canMoveTo(r: number, c: number, isGhost = false): boolean {
    if (r < 0 || r >= PAC_GRID_SIZE) return false;
    const wrappedCol = (c + PAC_GRID_SIZE) % PAC_GRID_SIZE;
    const cell = this.grid[r][wrappedCol];
    if (cell === 1) return false;
    if (cell === 5 && !isGhost) return false;
    return true;
  }

  queueDirection(dRow: number, dCol: number): boolean {
    if (this.isGameOver) return false;
    this.warmupTimer = 0;
    this.queuedDirRow = dRow;
    this.queuedDirCol = dCol;

    // Allow instant 180-degree reversal mid-corridor
    if (dRow === -this.dirRow && dCol === -this.dirCol && (dRow !== 0 || dCol !== 0)) {
      this.dirRow = dRow;
      this.dirCol = dCol;
      return true;
    }
    // If stationary and the queued direction is open, start moving immediately
    if (this.dirRow === 0 && this.dirCol === 0 && this.canMoveTo(this.playerRow + dRow, this.playerCol + dCol, false)) {
      this.dirRow = dRow;
      this.dirCol = dCol;
      return true;
    }
    return true;
  }

  triggerPhaseDash(): boolean {
    if (this.isGameOver || this.dashCharges <= 0 || this.dashTimer > 0) return false;
    this.dashCharges -= 1;
    this.dashTimer = 2.4;
    return true;
  }

  update(dt: number): {
    atePellet: boolean;
    atePowerCore: boolean;
    ateGhost: { x: number; z: number; points: number } | null;
    playerHit: boolean;
    waveCleared: boolean;
  } {
    const out = {
      atePellet: false,
      atePowerCore: false,
      ateGhost: null as { x: number; z: number; points: number } | null,
      playerHit: false,
      waveCleared: false,
    };

    if (this.isGameOver) return out;

    if (this.warmupTimer > 0) {
      this.warmupTimer = Math.max(0, this.warmupTimer - dt);
      return out;
    }

    if (this.frightenedTimer > 0) {
      this.frightenedTimer = Math.max(0, this.frightenedTimer - dt);
    }
    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
    }

    for (let i = 0; i < this.ghosts.length; i++) {
      if (this.ghosts[i].respawnTimer > 0) {
        this.ghosts[i].respawnTimer = Math.max(0, this.ghosts[i].respawnTimer - dt);
      }
    }

    const effectiveInterval =
      this.dashTimer > 0
        ? this.stepInterval * 0.62
        : Math.max(0.11, this.stepInterval - (this.wave - 1) * 0.008);

    this.moveProgress += dt / effectiveInterval;

    while (this.moveProgress >= 1) {
      this.moveProgress -= 1;

      this.prevPlayerRow = this.playerRow;
      this.prevPlayerCol = this.playerCol;

      // Try buffered turn first
      if (
        (this.queuedDirRow !== 0 || this.queuedDirCol !== 0) &&
        this.canMoveTo(this.playerRow + this.queuedDirRow, this.playerCol + this.queuedDirCol, false)
      ) {
        this.dirRow = this.queuedDirRow;
        this.dirCol = this.queuedDirCol;
      }

      // Advance player if open
      if (this.canMoveTo(this.playerRow + this.dirRow, this.playerCol + this.dirCol, false)) {
        this.playerRow += this.dirRow;
        this.playerCol = (this.playerCol + this.dirCol + PAC_GRID_SIZE) % PAC_GRID_SIZE;
      }

      // Check pellet / Overdrive Core consumption
      const tile = this.grid[this.playerRow][this.playerCol];
      if (tile === 2) {
        this.grid[this.playerRow][this.playerCol] = 0;
        this.score += 10;
        this.pelletsRemaining--;
        this.totalPelletsEaten++;
        out.atePellet = true;
        if (this.totalPelletsEaten % 40 === 0 && this.dashCharges < 3) {
          this.dashCharges++;
        }
      } else if (tile === 3) {
        this.grid[this.playerRow][this.playerCol] = 0;
        this.score += 50;
        this.pelletsRemaining--;
        this.totalPelletsEaten++;
        this.frightenedTimer = Math.max(4.5, 7.5 - (this.wave - 1) * 0.5);
        this.ghostEatMultiplier = 200;
        out.atePowerCore = true;
      }

      // Check if wave is cleared
      if (this.pelletsRemaining <= 0) {
        this.score += 500;
        this.wave += 1;
        this.dashCharges = Math.min(3, this.dashCharges + 1);
        out.waveCleared = true;
        this.loadWaveMaze();
        this.resetPositions();
        return out;
      }

      // Check immediate collision after player step
      this.checkGhostCollisions(out);
      if (out.playerHit || this.isGameOver) return out;

      // Step Ghosts
      this.stepGhosts();

      // Check collision after ghost step
      this.checkGhostCollisions(out);
      if (out.playerHit || this.isGameOver) return out;
    }

    return out;
  }

  private stepGhosts(): void {
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i];
      g.prevRow = g.row;
      g.prevCol = g.col;

      if (g.respawnTimer > 0) continue;

      // If inside Hive (row 6 or 7, col 6..8), guide out through gate at (5, 7)
      if (g.row >= 6 && g.row <= 7 && g.col >= 6 && g.col <= 8) {
        if (g.col < 7) {
          g.col += 1;
          g.dirRow = 0;
          g.dirCol = 1;
        } else if (g.col > 7) {
          g.col -= 1;
          g.dirRow = 0;
          g.dirCol = -1;
        } else {
          g.row -= 1;
          g.dirRow = -1;
          g.dirCol = 0;
        }
        continue;
      }

      // Find valid next directions (prevent 180 turn unless dead-end)
      const validDirs: number[][] = [];
      for (let d = 0; d < dirs.length; d++) {
        const [dr, dc] = dirs[d];
        if (dr === -g.dirRow && dc === -g.dirCol) continue;
        const nr = g.row + dr;
        const nc = (g.col + dc + PAC_GRID_SIZE) % PAC_GRID_SIZE;
        // Prevent re-entering hive gate from outside
        if (this.grid[nr]?.[nc] === 5) continue;
        if (this.canMoveTo(nr, nc, true)) {
          validDirs.push([dr, dc]);
        }
      }

      if (validDirs.length === 0) {
        const revR = g.row - g.dirRow;
        const revC = (g.col - g.dirCol + PAC_GRID_SIZE) % PAC_GRID_SIZE;
        if (this.canMoveTo(revR, revC, true)) {
          validDirs.push([-g.dirRow, -g.dirCol]);
        }
      }

      if (validDirs.length > 0) {
        let chosen = validDirs[0];

        if (this.frightenedTimer > 0) {
          // Flee away from player during Overdrive
          let maxDist = -1;
          for (const [dr, dc] of validDirs) {
            const nr = g.row + dr;
            const nc = (g.col + dc + PAC_GRID_SIZE) % PAC_GRID_SIZE;
            const dist = Math.hypot(nr - this.playerRow, nc - this.playerCol) + Math.random() * 1.5;
            if (dist > maxDist) {
              maxDist = dist;
              chosen = [dr, dc];
            }
          }
        } else {
          // Tactical AI targeting per Hunter Drone personality
          let targetR = this.playerRow;
          let targetC = this.playerCol;

          if (g.id === 1) {
            // PINK-V: Ambusher targets 3 tiles ahead of player
            targetR = this.playerRow + this.dirRow * 3;
            targetC = this.playerCol + this.dirCol * 3;
          } else if (g.id === 2) {
            // VOLT-C: Flanker
            targetR = this.playerRow - this.dirRow * 2;
            targetC = this.playerCol + this.dirCol * 2;
          } else if (g.id === 3 && Math.random() < 0.35) {
            // PYRO-A: Wildcard patrol
            targetR = 1;
            targetC = 13;
          }

          let minDist = Infinity;
          for (const [dr, dc] of validDirs) {
            const nr = g.row + dr;
            const nc = (g.col + dc + PAC_GRID_SIZE) % PAC_GRID_SIZE;
            const dist = Math.hypot(nr - targetR, nc - targetC);
            if (dist < minDist) {
              minDist = dist;
              chosen = [dr, dc];
            }
          }
        }

        g.dirRow = chosen[0];
        g.dirCol = chosen[1];
        g.row += g.dirRow;
        g.col = (g.col + g.dirCol + PAC_GRID_SIZE) % PAC_GRID_SIZE;
      }
    }
  }

  private checkGhostCollisions(out: {
    ateGhost: { x: number; z: number; points: number } | null;
    playerHit: boolean;
  }): void {
    const half = (PAC_GRID_SIZE - 1) / 2;

    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i];
      if (g.respawnTimer > 0) continue;

      const sameCell = g.row === this.playerRow && g.col === this.playerCol;
      const crossedPaths =
        g.row === this.prevPlayerRow &&
        g.col === this.prevPlayerCol &&
        g.prevRow === this.playerRow &&
        g.prevCol === this.playerCol;

      if (sameCell || crossedPaths) {
        if (this.frightenedTimer > 0) {
          // Devour vulnerable Hunter Drone!
          const pts = this.ghostEatMultiplier;
          this.score += pts;
          this.ghostEatMultiplier = Math.min(1600, this.ghostEatMultiplier * 2);
          out.ateGhost = {
            x: (g.col - half) * 1.0,
            z: (g.row - half) * 1.0,
            points: pts,
          };
          g.row = 7;
          g.col = 7;
          g.prevRow = 7;
          g.prevCol = 7;
          g.respawnTimer = 2.2;
        } else if (this.dashTimer <= 0) {
          // Player hit by active Hunter Drone
          this.lives -= 1;
          out.playerHit = true;
          if (this.lives <= 0) {
            this.isGameOver = true;
          } else {
            this.resetPositions();
          }
          return;
        }
      }
    }
  }
}
