// Viper Pulse — 3D Cyber Snake Simulation Engine with Turn-Queue Buffering & Boost
import { SnakeSpeed } from '../types/arcade';

export interface GridPoint {
  x: number;
  z: number;
}

export const SNAKE_GRID_SIZE = 17; // -8 to +8 in world grid coordinates

export class ViperPulseEngine {
  public segments: GridPoint[] = [];
  public prevSegments: GridPoint[] = [];
  public dir: GridPoint = { x: 0, z: -1 };
  public food: GridPoint = { x: 0, z: -3 };

  public score = 0;
  public combo = 1;
  public comboTimer = 0;
  public isGameOver = false;
  public isBoosting = false;

  public speedMode: SnakeSpeed = 'normal';
  public wrapWalls = false;
  public moveProgress = 0; // 0..1 interpolation between grid ticks

  private turnQueue: GridPoint[] = [];
  private stepAccumulator = 0;
  public warmupTimer = 0;

  constructor(speedMode: SnakeSpeed = 'normal', wrapWalls = false) {
    this.reset(speedMode, wrapWalls);
  }

  public reset(speedMode: SnakeSpeed = 'normal', wrapWalls = false) {
    this.speedMode = speedMode;
    this.wrapWalls = wrapWalls;
    this.segments = [
      { x: 0, z: 4 },
      { x: 0, z: 5 },
      { x: 0, z: 6 },
      { x: 0, z: 7 },
    ];
    this.prevSegments = this.segments.map((s) => ({ ...s }));
    this.dir = { x: 0, z: -1 };
    this.turnQueue = [];
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.isGameOver = false;
    this.isBoosting = false;
    this.stepAccumulator = 0;
    this.moveProgress = 0;
    this.warmupTimer = 1.25;
    this.spawnFood();
  }

  public queueDirection(nx: number, nz: number): boolean {
    if (this.isGameOver) return false;
    this.warmupTimer = 0;
    const lastPlanned = this.turnQueue.length > 0 ? this.turnQueue[this.turnQueue.length - 1] : this.dir;
    // Prevent 180-degree self reversal or duplicate direction
    if ((lastPlanned.x === -nx && lastPlanned.z === -nz) || (lastPlanned.x === nx && lastPlanned.z === nz)) {
      return false;
    }
    if (this.turnQueue.length < 2) {
      this.turnQueue.push({ x: nx, z: nz });
      return true;
    }
    return false;
  }

  private spawnFood() {
    const half = Math.floor(SNAKE_GRID_SIZE / 2);
    const candidates: GridPoint[] = [];
    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        if (!this.segments.some((s) => s.x === x && s.z === z)) {
          candidates.push({ x, z });
        }
      }
    }
    if (candidates.length > 0) {
      this.food = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  public getBaseStepInterval(): number {
    const base =
      this.speedMode === 'hyper' ? 0.115 : this.speedMode === 'turbo' ? 0.15 : 0.195;
    const lengthSpeedup = Math.min(0.045, (this.segments.length - 4) * 0.002);
    const raw = Math.max(0.08, base - lengthSpeedup);
    return this.isBoosting ? raw * 0.58 : raw;
  }

  public update(dt: number): { ateFood: boolean; died: boolean; eatWorldPos?: GridPoint } {
    if (this.isGameOver) return { ateFood: false, died: false };

    if (this.warmupTimer > 0) {
      this.warmupTimer = Math.max(0, this.warmupTimer - dt);
      return { ateFood: false, died: false };
    }

    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) {
        this.combo = 1;
      }
    }

    const interval = this.getBaseStepInterval();
    this.stepAccumulator += dt;

    let ateFood = false;
    let eatWorldPos: GridPoint | undefined;

    if (this.stepAccumulator >= interval) {
      this.stepAccumulator -= interval;
      this.prevSegments = this.segments.map((s) => ({ ...s }));

      if (this.turnQueue.length > 0) {
        this.dir = this.turnQueue.shift()!;
      }

      const head = this.segments[0];
      let nextX = head.x + this.dir.x;
      let nextZ = head.z + this.dir.z;
      const half = Math.floor(SNAKE_GRID_SIZE / 2);

      if (nextX < -half || nextX > half || nextZ < -half || nextZ > half) {
        if (this.wrapWalls) {
          if (nextX < -half) nextX = half;
          else if (nextX > half) nextX = -half;
          if (nextZ < -half) nextZ = half;
          else if (nextZ > half) nextZ = -half;
        } else {
          this.isGameOver = true;
          return { ateFood: false, died: true };
        }
      }

      // Check collision with body (excluding tail tip unless eating)
      const willEat = nextX === this.food.x && nextZ === this.food.z;
      const checkLimit = willEat ? this.segments.length : this.segments.length - 1;
      for (let i = 0; i < checkLimit; i++) {
        if (this.segments[i].x === nextX && this.segments[i].z === nextZ) {
          this.isGameOver = true;
          return { ateFood: false, died: true };
        }
      }

      this.segments.unshift({ x: nextX, z: nextZ });

      if (willEat) {
        ateFood = true;
        eatWorldPos = { x: nextX, z: nextZ };
        const speedBonus = this.speedMode === 'hyper' ? 25 : this.speedMode === 'turbo' ? 15 : 10;
        this.score += speedBonus * this.combo + (this.isBoosting ? 10 : 0);
        this.combo = Math.min(8, this.combo + 1);
        this.comboTimer = 4.5;
        this.prevSegments.push({ ...this.prevSegments[this.prevSegments.length - 1] });
        this.spawnFood();
      } else {
        this.segments.pop();
      }
    }

    this.moveProgress = Math.min(1, this.stepAccumulator / interval);
    return { ateFood, died: false, eatWorldPos };
  }
}
