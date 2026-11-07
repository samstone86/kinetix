// Nova Invaders: Aegis Descent — 3D Space Invaders Engine
// Features: Stepped March Formation, 3 Alien Classes, Breakable Crystal Bunkers, Mystery UFO Mothership, EMP Bomb

export interface AlienUnit {
  id: number;
  row: number; // 0 = Dreadnought (top), 1 = Cruiser (mid), 2 = Scout (front)
  col: number; // 0..7
  x: number;
  z: number;
  hp: number;
  colorHex: number;
  scoreVal: number;
  alive: boolean;
}

export interface InvaderBunker {
  id: number;
  colIndex: number;
  x: number;
  z: number;
  segments: {
    offsetX: number;
    offsetZ: number;
    hp: number;
    alive: boolean;
  }[];
}

export interface BulletProjectile {
  id: number;
  x: number;
  z: number;
  vz: number;
  isPlayer: boolean;
  active: boolean;
}

export interface MothershipUFO {
  x: number;
  z: number;
  vx: number;
  active: boolean;
  scoreVal: number;
}

export const NOVA_BOUNDS_X = 6.2;
export const CANNON_Z = 7.0;
export const INVADER_COLS = 8;
export const INVADER_ROWS = 4;

export class NovaInvadersEngine {
  public playerX = 0;
  public cannonWidth = 1.8;
  public lives = 3;
  public score = 0;
  public wave = 1;
  public empCharges = 1;

  public aliens: AlienUnit[] = [];
  public bunkers: InvaderBunker[] = [];
  public bullets: BulletProjectile[] = [];
  public ufo: MothershipUFO = { x: 0, z: -8.8, vx: 0, active: false, scoreVal: 300 };

  public marchDir: 1 | -1 = 1;
  public marchOffsetZ = 0;
  public marchStepTimer = 0;
  public alienFireTimer = 0;
  public ufoTimer = 0;
  public playerFireCooldown = 0;
  public warmupTimer = 1.25;

  public isGameOver = false;
  public isVictory = false;

  private nextBulletId = 1;

  constructor() {
    this.reset();
  }

  public reset() {
    this.playerX = 0;
    this.lives = 3;
    this.score = 0;
    this.wave = 1;
    this.empCharges = 1;
    this.isGameOver = false;
    this.isVictory = false;
    this.bullets = [];
    this.ufo.active = false;
    this.ufoTimer = 8;
    this.playerFireCooldown = 0;
    this.warmupTimer = 1.25;
    this.buildBunkers();
    this.buildWaveAliens();
  }

  public buildBunkers() {
    this.bunkers = [];
    // 3 Destructible Crystal Bunkers across X = -3.8, 0, 3.8 at Z = 5.2
    const bunkerXPositions = [-3.8, 0, 3.8];
    bunkerXPositions.forEach((bx, bIdx) => {
      const segments: InvaderBunker['segments'] = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          // Leave open arch in center bottom
          if (r === 1 && c === 1) continue;
          segments.push({
            offsetX: (c - 1) * 0.45,
            offsetZ: (r - 0.5) * 0.45,
            hp: 3,
            alive: true,
          });
        }
      }
      this.bunkers.push({
        id: bIdx,
        colIndex: bIdx,
        x: bx,
        z: 5.2,
        segments,
      });
    });
  }

  public buildWaveAliens() {
    this.aliens = [];
    this.marchDir = 1;
    this.marchOffsetZ = -6.4 + (this.wave - 1) * 0.35;
    this.marchStepTimer = 0;
    this.alienFireTimer = 0;

    let id = 1;
    // Row 0: Dreadnoughts (Crimson / Rose, 100pts)
    // Rows 1-2: Cruisers (Ultraviolet / Purple, 50pts)
    // Row 3: Scouts (Cyan, 30pts)
    for (let r = 0; r < INVADER_ROWS; r++) {
      const colorHex = r === 0 ? 0xf43f5e : r < 3 ? 0x8b5cf6 : 0x06b6d4;
      const scoreVal = r === 0 ? 100 : r < 3 ? 50 : 30;
      for (let c = 0; c < INVADER_COLS; c++) {
        const x = (c - (INVADER_COLS - 1) / 2) * 1.35;
        const z = this.marchOffsetZ + r * 1.1;
        this.aliens.push({
          id: id++,
          row: r,
          col: c,
          x,
          z,
          hp: 1,
          colorHex,
          scoreVal,
          alive: true,
        });
      }
    }
  }

  public movePlayer(deltaX: number) {
    if (this.isGameOver) return;
    this.warmupTimer = 0;
    const limit = NOVA_BOUNDS_X - this.cannonWidth / 2;
    this.playerX = Math.max(-limit, Math.min(limit, this.playerX + deltaX));
  }

  public setPlayerTargetX(worldX: number) {
    if (this.isGameOver) return;
    this.warmupTimer = 0;
    const limit = NOVA_BOUNDS_X - this.cannonWidth / 2;
    this.playerX = Math.max(-limit, Math.min(limit, worldX));
  }

  public fireLaser(): boolean {
    if (this.isGameOver || this.playerFireCooldown > 0) return false;
    this.warmupTimer = 0;
    // Max 2 simultaneous player bullets on screen
    const activePlayerBullets = this.bullets.filter((b) => b.isPlayer && b.active).length;
    if (activePlayerBullets >= 2) return false;

    this.playerFireCooldown = 0.22;
    this.bullets.push({
      id: this.nextBulletId++,
      x: this.playerX,
      z: CANNON_Z - 0.7,
      vz: -22.0,
      isPlayer: true,
      active: true,
    });
    return true;
  }

  public triggerEmpBomb(): { triggered: boolean; hits: { x: number; z: number; colorHex: number }[] } {
    if (this.isGameOver || this.empCharges <= 0) return { triggered: false, hits: [] };
    this.empCharges--;
    const hits: { x: number; z: number; colorHex: number }[] = [];

    // Vaporize lowest alive row of invaders and clear all enemy bullets
    this.bullets = this.bullets.filter((b) => b.isPlayer);

    const alive = this.aliens.filter((a) => a.alive);
    if (alive.length > 0) {
      const maxZ = Math.max(...alive.map((a) => a.z));
      alive.forEach((a) => {
        if (Math.abs(a.z - maxZ) < 0.6) {
          a.alive = false;
          this.score += a.scoreVal;
          hits.push({ x: a.x, z: a.z, colorHex: a.colorHex });
        }
      });
    }

    return { triggered: true, hits };
  }

  public getMarchInterval(): number {
    const aliveCount = this.aliens.filter((a) => a.alive).length;
    const total = this.aliens.length;
    const ratio = Math.max(0.12, aliveCount / total);
    return Math.max(0.08, ratio * 0.75 - (this.wave - 1) * 0.05);
  }

  public update(dt: number): {
    alienKilled: { x: number; z: number; colorHex: number; points: number } | null;
    ufoKilled: { x: number; z: number; points: number } | null;
    playerHit: boolean;
    bunkerHit: { x: number; z: number } | null;
    marchStepped: boolean;
  } {
    let alienKilled: { x: number; z: number; colorHex: number; points: number } | null = null;
    let ufoKilled: { x: number; z: number; points: number } | null = null;
    let playerHit = false;
    let bunkerHit: { x: number; z: number } | null = null;
    let marchStepped = false;

    if (this.isGameOver) {
      return { alienKilled, ufoKilled, playerHit, bunkerHit, marchStepped };
    }

    if (this.playerFireCooldown > 0) {
      this.playerFireCooldown = Math.max(0, this.playerFireCooldown - dt);
    }

    if (this.warmupTimer > 0) {
      this.warmupTimer = Math.max(0, this.warmupTimer - dt);
      return { alienKilled, ufoKilled, playerHit, bunkerHit, marchStepped };
    }

    // 1. UFO Mothership spawn & movement
    this.ufoTimer -= dt;
    if (this.ufoTimer <= 0 && !this.ufo.active) {
      this.ufo.active = true;
      const fromLeft = Math.random() < 0.5;
      this.ufo.x = fromLeft ? -NOVA_BOUNDS_X - 1 : NOVA_BOUNDS_X + 1;
      this.ufo.z = -8.6;
      this.ufo.vx = fromLeft ? 6.2 : -6.2;
      this.ufo.scoreVal = Math.random() < 0.3 ? 500 : 300;
      this.ufoTimer = 16 + Math.random() * 8;
    }

    if (this.ufo.active) {
      this.ufo.x += this.ufo.vx * dt;
      if (Math.abs(this.ufo.x) > NOVA_BOUNDS_X + 2.5) {
        this.ufo.active = false;
      }
    }

    // 2. Invader Stepped March Formation
    this.marchStepTimer += dt;
    const stepInterval = this.getMarchInterval();
    if (this.marchStepTimer >= stepInterval) {
      this.marchStepTimer -= stepInterval;
      marchStepped = true;

      const aliveAliens = this.aliens.filter((a) => a.alive);
      if (aliveAliens.length > 0) {
        const minX = Math.min(...aliveAliens.map((a) => a.x));
        const maxX = Math.max(...aliveAliens.map((a) => a.x));

        let hitBoundary = false;
        if (this.marchDir === 1 && maxX + 0.55 >= NOVA_BOUNDS_X - 0.2) {
          hitBoundary = true;
        } else if (this.marchDir === -1 && minX - 0.55 <= -NOVA_BOUNDS_X + 0.2) {
          hitBoundary = true;
        }

        if (hitBoundary) {
          this.marchDir = (this.marchDir === 1 ? -1 : 1) as 1 | -1;
          this.aliens.forEach((a) => {
            a.z += 0.42;
          });
        } else {
          const stepDelta = this.marchDir * 0.38;
          this.aliens.forEach((a) => {
            a.x += stepDelta;
          });
        }

        // Invaders reached bunker / cannon defense line
        const lowestZ = Math.max(...aliveAliens.map((a) => a.z));
        if (lowestZ >= CANNON_Z - 0.8) {
          this.isGameOver = true;
          this.lives = 0;
          return { alienKilled, ufoKilled, playerHit: true, bunkerHit, marchStepped };
        }
      }
    }

    // 3. Alien projectile fire
    this.alienFireTimer += dt;
    const fireInterval = Math.max(0.65, 1.4 - (this.wave - 1) * 0.15);
    if (this.alienFireTimer >= fireInterval) {
      this.alienFireTimer = 0;
      const aliveAliens = this.aliens.filter((a) => a.alive);
      if (aliveAliens.length > 0) {
        // Pick random bottom-most alien from a column
        const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
        this.bullets.push({
          id: this.nextBulletId++,
          x: shooter.x,
          z: shooter.z + 0.4,
          vz: 8.8 + (this.wave - 1) * 0.6,
          isPlayer: false,
          active: true,
        });
      }
    }

    // 4. Bullets Update & Collisions
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.z += b.vz * dt;

      // Offscreen cull
      if (b.z < -10 || b.z > 9.5) {
        b.active = false;
        continue;
      }

      // Bunker collisions (both player & alien bullets damage bunkers)
      for (const bunker of this.bunkers) {
        for (const seg of bunker.segments) {
          if (!seg.alive) continue;
          const sx = bunker.x + seg.offsetX;
          const sz = bunker.z + seg.offsetZ;
          if (Math.abs(b.x - sx) < 0.32 && Math.abs(b.z - sz) < 0.28) {
            b.active = false;
            seg.hp--;
            if (seg.hp <= 0) seg.alive = false;
            bunkerHit = { x: sx, z: sz };
            break;
          }
        }
        if (!b.active) break;
      }

      if (!b.active) continue;

      // Player bullet collisions
      if (b.isPlayer) {
        // Alien hits
        for (const alien of this.aliens) {
          if (!alien.alive) continue;
          if (Math.abs(b.x - alien.x) < 0.58 && Math.abs(b.z - alien.z) < 0.45) {
            b.active = false;
            alien.alive = false;
            this.score += alien.scoreVal;
            alienKilled = {
              x: alien.x,
              z: alien.z,
              colorHex: alien.colorHex,
              points: alien.scoreVal,
            };
            break;
          }
        }

        // UFO mothership hit
        if (b.active && this.ufo.active) {
          if (Math.abs(b.x - this.ufo.x) < 1.1 && Math.abs(b.z - this.ufo.z) < 0.55) {
            b.active = false;
            this.ufo.active = false;
            this.score += this.ufo.scoreVal;
            this.empCharges = Math.min(3, this.empCharges + 1);
            ufoKilled = { x: this.ufo.x, z: this.ufo.z, points: this.ufo.scoreVal };
          }
        }
      } else {
        // Alien bullet hitting player cannon
        if (Math.abs(b.x - this.playerX) < this.cannonWidth * 0.48 && Math.abs(b.z - CANNON_Z) < 0.42) {
          b.active = false;
          this.lives--;
          playerHit = true;
          if (this.lives <= 0) {
            this.isGameOver = true;
          }
        }
      }
    }

    this.bullets = this.bullets.filter((b) => b.active);

    // 5. Check Wave Clear
    if (this.aliens.every((a) => !a.alive)) {
      this.wave++;
      this.score += 800;
      this.empCharges = Math.min(3, this.empCharges + 1);
      if (this.wave > 3) {
        this.isVictory = true;
        this.isGameOver = true;
      } else {
        this.buildWaveAliens();
      }
    }

    return { alienKilled, ufoKilled, playerHit, bunkerHit, marchStepped };
  }
}
